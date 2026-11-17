import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import SplittermondCharacterSheet from "module/actor/sheets/character-sheet";
import SplittermondNPCSheet from "module/actor/sheets/npc-sheet";
import { actorCreator } from "module/data/EntityCreator";
import { withActor } from "../fixtures";
import { passesEventually } from "../../util";

export function descriptionTooltipsTest({ it, expect }: QuenchBatchContext) {
    it(
        "shows and removes a description over an NPC feature in the rendered header",
        withActor(
            async (actor) => {
                const [feature] = await actor.createEmbeddedDocuments("Item", [
                    {
                        type: "npcfeature",
                        name: "Tooltip feature",
                        system: { description: "<strong>NPC description</strong>" },
                    },
                ]);
                const sheet = new SplittermondNPCSheet({ document: actor });
                try {
                    await sheet.render({ force: true });
                    sheet.changeTab("inventory", "primary");
                    const name = sheet.element.querySelector<HTMLElement>(
                        `header [data-item-id="${feature.id}"] .taglist-item-name`
                    )!;
                    expect(name, "NPC feature name is present outside the active tab").to.exist;

                    name.dispatchEvent(new MouseEvent("mouseenter"));

                    await passesEventually(() => {
                        const tooltip = sheet.element.querySelector<HTMLElement>(".actor-tooltip")!;
                        expect(tooltip?.querySelector("strong")?.textContent).to.equal("NPC description");
                        expect(tooltip.checkVisibility(), "Description tooltip is visible").to.be.true;
                    });
                    name.dispatchEvent(new MouseEvent("mouseleave"));
                    expect(sheet.element.querySelector(".actor-tooltip")).to.be.null;
                } finally {
                    await sheet.close();
                }
            },
            () => actorCreator.createNpc({ type: "npc", name: "NPC tooltip test", system: {} })
        )
    );

    it(
        "keeps strength and weakness tooltips working after document-driven sheet renders",
        withActor(async (actor) => {
            const items = await actor.createEmbeddedDocuments("Item", [
                {
                    type: "strength",
                    name: "Tooltip strength",
                    system: { description: "<strong>strength description</strong>" },
                },
                {
                    type: "weakness",
                    name: "Tooltip weakness",
                    system: { description: "<strong>weakness description</strong>" },
                },
            ]);
            const sheet = new SplittermondCharacterSheet({ document: actor });
            try {
                await sheet.render({ force: true });
                for (const item of items) {
                    const selector = `[data-item-id="${item.id}"] .name`;
                    const name = sheet.element.querySelector<HTMLElement>(selector)!;
                    expect(name, `${item.type} name is rendered`).to.exist;

                    name.dispatchEvent(new MouseEvent("mouseenter"));

                    await passesEventually(() => {
                        expect(sheet.element.querySelector(".actor-tooltip strong")?.textContent).to.equal(
                            `${item.type} description`
                        );
                    });
                    name.dispatchEvent(new MouseEvent("mouseleave"));
                    expect(sheet.element.querySelector(".actor-tooltip")).to.be.null;

                    await item.update({ "system.description": `<em>Updated ${item.type}</em>` });
                    // Observe the document-driven render; another render would mask a missing lifecycle binding.
                    await passesEventually(() => {
                        expect(name.isConnected, "Old name element was replaced").to.be.false;
                        expect(sheet.element.querySelector(selector), "Updated name is rendered").to.exist;
                    });
                    const updatedName = sheet.element.querySelector<HTMLElement>(selector)!;
                    updatedName.dispatchEvent(new MouseEvent("mouseenter"));
                    await passesEventually(() => {
                        expect(sheet.element.querySelectorAll(".actor-tooltip")).to.have.length(1);
                        expect(sheet.element.querySelector(".actor-tooltip em")?.textContent).to.equal(
                            `Updated ${item.type}`
                        );
                    });
                    updatedName.dispatchEvent(new MouseEvent("mouseleave"));
                    expect(sheet.element.querySelector(".actor-tooltip")).to.be.null;
                }
            } finally {
                await sheet.close();
            }
        })
    );
}

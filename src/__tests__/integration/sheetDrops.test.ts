import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import type { FoundryApplication } from "module/api/Application";
import { foundryApi } from "module/api/foundryApi";
import SplittermondCharacterSheet from "module/actor/sheets/character-sheet";
import SplittermondNPCSheet from "module/actor/sheets/npc-sheet";
import SplittermondItemEffectsSheet from "module/item/sheets/item-effects-sheet";
import SplittermondSpeciesWizard from "module/apps/wizards/species";
import { actorCreator, itemCreator } from "module/data/EntityCreator";
import { isGenerated } from "module/activeEffect/effectBuilder";
import { SplittermondActiveEffect } from "module/activeEffect";
import { droppableCharacterItemTypes, droppableNpcItemTypes } from "module/config/itemTypes";
import { withActor } from "./fixtures";
import { passesEventually } from "../util";

export function sheetDropsTest({ describe, it, expect }: QuenchBatchContext) {
    const itemDrops = {
        character: [
            ["strength", "general"],
            ["weapon", "inventory"],
            ["language", "general"],
            ["spell", "spells"],
            ["weakness", "general"],
            ["armor", "inventory"],
            ["resource", "general"],
            ["mastery", "skills"],
            ["culturelore", "general"],
            ["shield", "inventory"],
            ["statuseffect", "status"],
            ["equipment", "inventory"],
            ["spelleffect", "status"],
        ],
        npc: [
            ["npcattack", "general"],
            ["weapon", "inventory"],
            ["mastery", "general"],
            ["armor", "inventory"],
            ["spell", "spells"],
            ["shield", "inventory"],
            ["statuseffect", "status"],
            ["equipment", "inventory"],
            ["spelleffect", "status"],
            ["npcfeature", "header"],
        ],
    } as const;

    function expectTab(sheet: InstanceType<typeof FoundryApplication>, tab: string, context = tab) {
        const selector = `[data-group="primary"][data-tab="${tab}"].active`;
        expect(sheet.element.querySelector(`nav ${selector}`), `${context}: navigation marks ${tab}`).to.exist;
        expect(sheet.element.querySelector(`section${selector}`), `${context}: ${tab} content is active`).to.exist;
        expect(sheet.element.querySelectorAll('nav [data-group="primary"][data-tab].active'), context).to.have.length(
            1
        );
        expect(
            sheet.element.querySelectorAll('section[data-group="primary"][data-tab].active'),
            context
        ).to.have.length(1);
    }

    function expectHighlight(
        sheet: InstanceType<typeof FoundryApplication>,
        selector: string,
        context = "Dropped entry"
    ) {
        const row = sheet.element.querySelector(selector)?.closest(".list-item, .taglist-item, .effect-card");
        expect(row, `${context} is rendered`).to.exist;
        expect(row!.getClientRects().length, `${context} occupies visible layout space`).to.be.greaterThan(0);
        expect(row!.getAnimations(), `${context} is briefly highlighted`).to.have.length(1);
    }

    for (const actorType of ["character", "npc"] as const) {
        const createActor = () =>
            actorType === "character"
                ? actorCreator.createCharacter({ type: "character", name: "Drop tab test", system: {} })
                : actorCreator.createNpc({ type: "npc", name: "Drop tab test", system: {} });
        const Sheet = actorType === "character" ? SplittermondCharacterSheet : SplittermondNPCSheet;

        describe(`${actorType} sheet drops`, () => {
            it(
                "reveals every supported item in sequence, switching tabs except for always-visible NPC features",
                withActor(async (source) => {
                    const drops = itemDrops[actorType];
                    const allowedTypes =
                        actorType === "character" ? droppableCharacterItemTypes : droppableNpcItemTypes;
                    expect(
                        drops.map(([type]) => type),
                        "Every configured drop type is exercised"
                    ).to.have.same.members(allowedTypes);
                    const actor = await createActor();
                    const sheet = new Sheet({ document: actor });
                    try {
                        await sheet.render({ force: true });
                        let previousTab = "inventory";
                        sheet.changeTab(previousTab, "primary");
                        for (const [type, destination] of drops) {
                            expectTab(sheet, previousTab, `Before ${type}`);
                            const tab = destination === "header" ? previousTab : destination;
                            if (destination !== "header") {
                                expect(tab, `${type} must force a tab change`).to.not.equal(previousTab);
                            }
                            const [item] = await source.createEmbeddedDocuments("Item", [
                                {
                                    name: `Dropped ${type}`,
                                    type,
                                    system: type === "spell" || type === "mastery" ? { skill: "deathmagic" } : {},
                                },
                            ]);
                            await sheet._onDropDocument(new DragEvent("drop"), item);
                            // Observe the document update's render without repairing the sheet with another render.
                            await passesEventually(() => {
                                const created = actor.items.find((entry) => entry.name === item.name);
                                expect(created, `${type} persisted on the target actor`).to.exist;
                                expectTab(sheet, tab, type);
                                const scope = destination === "header" ? "header" : `section[data-tab="${tab}"]`;
                                expectHighlight(sheet, `${scope} [data-item-id="${created?.id}"]`, type);
                            }, 3000);
                            previousTab = tab;
                        }
                    } finally {
                        try {
                            await sheet.close();
                        } finally {
                            await actor.delete();
                        }
                    }
                })
            ).timeout(30000);

            it("opens and highlights a mastery after its skill is assigned", async () => {
                const actor = await createActor();
                const sheet = new Sheet({ document: actor });
                try {
                    const mastery = await itemCreator.createMastery({
                        type: "mastery",
                        name: "World mastery drop test",
                        system: { skill: null, availableIn: "deathmagic", modifier: "deathmagic +1" },
                    });
                    try {
                        await passesEventually(() => {
                            expect(
                                mastery.effects.filter(isGenerated),
                                "Fixture generates a valid effect"
                            ).to.have.length(1);
                        });
                        await sheet.render({ force: true });
                        sheet.changeTab("inventory", "primary");
                        expectTab(sheet, "inventory");
                        await sheet._onDropDocument(new DragEvent("drop"), mastery);
                        const tab = actorType === "character" ? "skills" : "general";
                        await passesEventually(() => {
                            const created = actor.items.find((item) => item.name === mastery.name);
                            expect(created?.system).to.have.property("skill", "deathmagic");
                            expectTab(sheet, tab);
                            expectHighlight(sheet, `section[data-tab="${tab}"] [data-item-id="${created?.id}"]`);
                        }, 3000);
                        sheet.element.querySelector<HTMLElement>(`nav [data-tab="${tab}"]`)?.click();
                        expectTab(sheet, tab);
                    } finally {
                        await mastery.delete();
                    }
                } finally {
                    await sheet.close();
                    await actor.delete();
                }
            }).timeout(10000);

            for (const effectType of ["modifier", "autoGenerated"] as const) {
                it(
                    `opens status for a dropped ${effectType} active effect`,
                    withActor(async (source) => {
                        const actor = await createActor();
                        const sheet = new Sheet({ document: actor });
                        try {
                            const [effect] = await source.createEmbeddedDocuments("ActiveEffect", [
                                { name: "Dropped effect", type: effectType },
                            ]);
                            await sheet.render({ force: true });
                            sheet.changeTab("inventory", "primary");
                            await sheet._onDropDocument(new DragEvent("drop"), effect);
                            await passesEventually(() => {
                                const created = actor.effects.find((entry) => entry.name === effect.name);
                                expect(created?.type).to.equal("modifier");
                                expectTab(sheet, "status");
                                expectHighlight(sheet, `[data-effect-uuid="${created?.uuid}"]`);
                            }, 3000);
                        } finally {
                            await sheet.close();
                            await actor.delete();
                        }
                    })
                ).timeout(10000);
            }
        });
    }

    it(
        "opens and highlights the effects tab when an active effect is dropped on an item",
        withActor(async (actor) => {
            const [item] = await actor.createEmbeddedDocuments("Item", [{ type: "weapon", name: "Target item" }]);
            const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                { name: "Dropped item effect", type: "modifier" },
            ]);
            const sheet = new SplittermondItemEffectsSheet({ document: item });
            try {
                await sheet.render({ force: true });
                sheet.changeTab("properties", "primary");
                expectTab(sheet, "properties");
                if (!(effect instanceof SplittermondActiveEffect)) throw new Error("Expected a Splittermond effect");
                await sheet._onDropActiveEffect(new DragEvent("drop"), effect);
                await passesEventually(() => {
                    const created = item.effects.find((entry) => entry.name === effect.name);
                    expect(created, "Effect persisted on the item").to.exist;
                    expectTab(sheet, "effects");
                    expectHighlight(sheet, `[data-effect-id="${created?.id}"]`);
                }, 3000);
            } finally {
                await sheet.close();
            }
        })
    ).timeout(10000);

    it(
        "opens the species wizard without changing the actor tab or adding a listed item",
        withActor(async (actor) => {
            const species = await foundryApi.createItem({ type: "species", name: "Dropped species", system: {} });
            const sheet = new SplittermondCharacterSheet({ document: actor });
            let wizard: SplittermondSpeciesWizard | undefined;
            try {
                await sheet.render({ force: true });
                sheet.changeTab("inventory", "primary");
                const result = await sheet._onDropDocument(new DragEvent("drop"), species);
                if (!(result instanceof SplittermondSpeciesWizard)) throw new Error("Expected a species wizard");
                wizard = result;
                expect(wizard.rendered).to.be.true;
                expectTab(sheet, "inventory");
                expect(actor.items.some((item) => item.type === "species")).to.be.false;
            } finally {
                await wizard?.close();
                await sheet.close();
                await species.delete();
            }
        })
    ).timeout(10000);
}

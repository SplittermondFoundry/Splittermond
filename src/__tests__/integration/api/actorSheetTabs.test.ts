import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import SplittermondCharacterSheet from "module/actor/sheets/character-sheet";
import SplittermondNPCSheet from "module/actor/sheets/npc-sheet";
import type SplittermondActor from "module/actor/actor";
import { actorCreator, itemCreator } from "module/data/EntityCreator";
import { droppableCharacterItemTypes, droppableNpcItemTypes, type ItemType } from "module/config/itemTypes";
import SplittermondSpeciesWizard from "module/apps/wizards/species";
import { isGenerated } from "module/activeEffect/effectBuilder";
import { withActor } from "../fixtures";
import { passesEventually } from "../../util";

export function actorSheetTabsTest({ describe, it, expect, beforeEach, afterEach }: QuenchBatchContext) {
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

    for (const actorType of ["character", "npc"] as const) {
        describe(`${actorType} sheet tab navigation`, () => {
            let actor: SplittermondActor;
            let sheet: SplittermondCharacterSheet | SplittermondNPCSheet;

            beforeEach(async () => {
                actor =
                    actorType === "character"
                        ? await actorCreator.createCharacter({ type: "character", name: "Drop tab test", system: {} })
                        : await actorCreator.createNpc({ type: "npc", name: "Drop tab test", system: {} });
                const Sheet = actorType === "character" ? SplittermondCharacterSheet : SplittermondNPCSheet;
                sheet = new Sheet({ document: actor });
                await sheet.render({ force: true });
            });

            afterEach(async () => {
                try {
                    await sheet?.close();
                } finally {
                    await actor?.delete();
                }
            });

            function expectActiveTab(tab: string) {
                const selector = `[data-group="primary"][data-tab="${tab}"].active`;
                expect(sheet.element.querySelector(`nav ${selector}`), "Navigation marks the destination").to.exist;
                expect(sheet.element.querySelector(`section${selector}`), "Destination content is active").to.exist;
                expect(sheet.element.querySelectorAll('nav [data-group="primary"][data-tab].active')).to.have.length(1);
                expect(sheet.element.querySelectorAll('section[data-group="primary"][data-tab].active')).to.have.length(
                    1
                );
            }

            function expectHighlighted(selector: string) {
                const row = sheet.element.querySelector(selector)?.closest(".list-item, .taglist-item");
                expect(row, "Dropped entry is rendered").to.exist;
                expect(row!.getAnimations(), "Dropped entry is briefly highlighted").to.have.length(1);
            }

            it("changeTab updates navigation and content and survives rendering", async () => {
                sheet.changeTab("inventory", "primary");
                expectActiveTab("inventory");
                await sheet.render();
                expectActiveTab("inventory");
            });

            it("opens a world spell after its school update without needing another tab click", async () => {
                const spell = await itemCreator.createSpell({
                    type: "spell",
                    name: "World spell drop test",
                    system: { skill: "deathmagic", skillLevel: 1 },
                });
                try {
                    expectActiveTab("general");
                    await sheet._onDropDocument(new DragEvent("drop"), spell);
                    expectActiveTab("spells");
                    const created = actor.items.find((item) => item.name === spell.name);
                    expect(created, "Spell persisted on the actor").to.exist;
                    expect(sheet.element.querySelector(`section[data-tab="spells"] [data-item-id="${created?.id}"]`)).to
                        .exist;
                    sheet.element.querySelector<HTMLElement>('nav [data-tab="spells"]')?.click();
                    expectActiveTab("spells");
                } finally {
                    await spell.delete();
                }
            });

            it("opens and highlights a world mastery after assigning its skill", async () => {
                const mastery = await itemCreator.createMastery({
                    type: "mastery",
                    name: "World mastery drop test",
                    system: { skill: null, availableIn: "deathmagic", modifier: "deathmagic +1" },
                });
                try {
                    await passesEventually(() => {
                        expect(
                            mastery.effects.filter(isGenerated),
                            "Unassigned mastery generates a valid effect"
                        ).to.have.length(1);
                    });
                    sheet.changeTab("inventory", "primary");
                    expectActiveTab("inventory");
                    await sheet._onDropDocument(new DragEvent("drop"), mastery);
                    const tab = actorType === "character" ? "skills" : "general";
                    expectActiveTab(tab);
                    const created = actor.items.find((item) => item.name === mastery.name);
                    expect(created?.system).to.have.property("skill", "deathmagic");
                    expectHighlighted(`section[data-tab="${tab}"] [data-item-id="${created?.id}"]`);
                } finally {
                    await mastery.delete();
                }
            });

            async function dropItemAndExpect(source: SplittermondActor, type: ItemType, tab: string) {
                const [item] = await source.createEmbeddedDocuments("Item", [
                    {
                        name: `Dropped ${type}`,
                        type,
                        system: type === "spell" || type === "mastery" ? { skill: "deathmagic" } : {},
                    },
                ]);
                await sheet._onDropDocument(new DragEvent("drop"), item);
                // The drop awaits its render; inspect that result without repairing the UI with another render.
                await passesEventually(() => {
                    expectActiveTab(tab);
                    const created = actor.items.find((entry) => entry.name === item.name);
                    expect(created, `${type} persisted on target actor`).to.exist;
                    expectHighlighted(
                        `${type === "npcfeature" ? "header" : `section[data-tab="${tab}"]`} [data-item-id="${created?.id}"]`
                    );
                });
            }

            for (const [type, destination] of itemDrops[actorType]) {
                const tab = destination === "header" ? "editor" : destination;
                it(
                    type === "npcfeature"
                        ? "keeps the tab when dropping an always-visible NPC feature"
                        : `shows ${type} in ${tab} after a document drop and rendering`,
                    withActor(async (source) => {
                        sheet.changeTab("editor", "primary");
                        expectActiveTab("editor");
                        await dropItemAndExpect(source, type, tab);
                    })
                );
            }

            it(
                "switches tabs between successive drops of every supported tabbed item on the same sheet",
                withActor(async (source) => {
                    const drops = itemDrops[actorType];
                    const allowedTypes =
                        actorType === "character" ? droppableCharacterItemTypes : droppableNpcItemTypes;
                    expect(
                        drops.map(([type]) => type),
                        "Every configured drop type has a behavior test"
                    ).to.have.same.members(allowedTypes);
                    let previousTab = "inventory";
                    sheet.changeTab(previousTab, "primary");
                    for (const [type, tab] of drops) {
                        expectActiveTab(previousTab);
                        if (tab === "header") {
                            await dropItemAndExpect(source, type, previousTab);
                        } else {
                            expect(tab, `${type} must require a tab change`).to.not.equal(previousTab);
                            await dropItemAndExpect(source, type, tab);
                            previousTab = tab;
                        }
                    }
                })
            ).timeout(20000);

            if (actorType === "character") {
                it(
                    "opens the species wizard without changing the actor tab or adding a listed item",
                    withActor(async (source) => {
                        const [species] = await source.createEmbeddedDocuments("Item", [
                            { type: "species", name: "Dropped species" },
                        ]);
                        sheet.changeTab("inventory", "primary");
                        expectActiveTab("inventory");
                        const wizard = await sheet._onDropDocument(new DragEvent("drop"), species);
                        try {
                            expect(wizard).to.be.instanceOf(SplittermondSpeciesWizard);
                            if (wizard instanceof SplittermondSpeciesWizard) expect(wizard.rendered).to.be.true;
                            expectActiveTab("inventory");
                            expect(actor.items.some((item) => item.type === "species")).to.be.false;
                        } finally {
                            if (wizard instanceof SplittermondSpeciesWizard) await wizard.close();
                        }
                    })
                );
            }

            for (const type of ["modifier", "autoGenerated"] as const) {
                it(
                    `shows a dropped ${type} effect in status`,
                    withActor(async (source) => {
                        const [effect] = await source.createEmbeddedDocuments("ActiveEffect", [
                            {
                                name: "Dropped effect",
                                type,
                            },
                        ]);

                        sheet.changeTab("inventory", "primary");
                        expectActiveTab("inventory");
                        await sheet._onDropDocument(new DragEvent("drop"), effect);
                        await passesEventually(() => {
                            expectActiveTab("status");
                            const created = actor.effects.find((entry) => entry.name === effect.name);
                            expect(created, "Effect persisted on target actor").to.exist;
                            expect(created?.type).to.equal("modifier");
                            expect(
                                sheet.element.querySelector(
                                    `section[data-tab="status"] [data-effect-uuid="${created?.uuid}"]`
                                ),
                                "Dropped effect is listed on the active tab"
                            ).to.exist;
                            expectHighlighted(`[data-effect-uuid="${created?.uuid}"]`);
                        });
                    })
                );
            }
        });
    }
}

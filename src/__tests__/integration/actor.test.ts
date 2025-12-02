import { QuenchBatchContext } from "@ethaks/fvtt-quench";
import sinon from "sinon";
import ItemImporter from "../../module/util/item-importer";
import * as Baumwandler from "../resources/importSamples/GRW/NSC/Baumwandler.resource";
import { foundryApi } from "module/api/foundryApi";
import SplittermondActor from "../../module/actor/actor";
import { actorCreator, itemCreator } from "module/data/EntityCreator";
import * as Cara_Aeternia from "../resources/importSamples/Hexenkönigin/Cara_Aeternia.json";
import { CharacterDataModel } from "module/actor/dataModel/CharacterDataModel";
import SplittermondMasteryItem from "module/item/mastery";
import { MasteryDataModel } from "module/item/dataModel/MasteryDataModel";
import SplittermondSpellItem from "module/item/spell";
import { SpellDataModel } from "module/item/dataModel/SpellDataModel";
import { FoundryDialog } from "module/api/Application";
import SplittermondActorSheet from "../../module/actor/sheets/actor-sheet";
import { withActor } from "./fixtures";
import SplittermondCharacterSheet from "module/actor/sheets/character-sheet";
import { passesEventually } from "../util";
import Modifier from "module/modifiers/impl/modifier";
import { of } from "module/modifiers/expressions/scalar";
import type { DamageMessage } from "module/util/chat/damageChatMessage/DamageMessage";
import type SplittermondWeaponItem from "module/item/weapon";

declare const Actor: any;
declare var Dialog: any;
declare const foundry: any;

export function actorTest(context: QuenchBatchContext) {
    const { it, expect, afterEach, beforeEach, describe } = context;

    describe("Actor import", () => {
        const sandbox = sinon.createSandbox();
        let actorsToDelete: string[] = [];
        beforeEach(() => (actorsToDelete = []));
        afterEach(async () => {
            sandbox.restore();
            await Actor.deleteDocuments(actorsToDelete);
        });

        it("can import an NSC via text import", async () => {
            sandbox.stub(ItemImporter, "_folderDialog").returns(Promise.resolve(""));
            sandbox.stub(ItemImporter, "_skillDialog").returns(Promise.resolve("fightmagic"));
            const actorSpy = sandbox.stub(foundryApi, "createActor");
            let actor: Actor = sandbox.createStubInstance(SplittermondActor);
            actorSpy.callsFake(async (data) => {
                actor = await Actor.create(data);
                actorsToDelete.push(actor.id);
                return Promise.resolve(actor);
            });

            const probe = sandbox.createStubInstance(ClipboardEvent);
            sandbox.stub(probe, "clipboardData").get(() => ({ getData: () => Baumwandler.input }));
            await ItemImporter.pasteEventhandler(probe);

            expect(actor.system.biography).to.deep.contain(Baumwandler.expected.system.biography);
            expect(actor.system.attributes).to.deep.contain(Baumwandler.expected.system.attributes);
            expect(actor.system.derivedAttributes).to.deep.contain(Baumwandler.expected.system.derivedAttributes);
            expect(actor.system.skills).to.deep.contain(Baumwandler.expected.system.skills);
            expect(actor.system.type).to.deep.contain(Baumwandler.expected.system.type);
            expect(actor.system.currency).to.deep.contain(Baumwandler.expected.system.currency);
            expect("img" in actor && actor.img).to.equal("icons/svg/mystery-man.svg");
        });

        it("can import an actor via a json import", async () => {
            const actor = await actorCreator.createCharacter({ type: "character", name: "Cara Aeternia", system: {} });
            actorsToDelete.push(actor.id);

            await actor.importFromJSON(JSON.stringify(Cara_Aeternia), false);
            const system = actor.system as CharacterDataModel;

            const expectedAttributes = Cara_Aeternia.attributes.reduce(
                (acc: Record<string, number>, a) => ({
                    ...acc,
                    [a.id]: a.value,
                }),
                {}
            );
            expect(system.attributes.charisma.initial + system.attributes.charisma.advances, "Comparing AUS").to.equal(
                expectedAttributes.CHARISMA
            );
            expect(system.attributes.agility.initial + system.attributes.agility.advances, "Comparing BEW").to.equal(
                expectedAttributes.AGILITY
            );
            expect(
                system.attributes.intuition.initial + system.attributes.intuition.advances,
                "Comparing INT"
            ).to.equal(expectedAttributes.INTUITION);
            expect(
                system.attributes.constitution.initial + system.attributes.constitution.advances,
                "Comparing KON"
            ).to.equal(expectedAttributes.CONSTITUTION);
            expect(system.attributes.mystic.initial + system.attributes.mystic.advances, "Comparing MYS").to.equal(
                expectedAttributes.MYSTIC
            );
            expect(system.attributes.strength.initial + system.attributes.strength.advances, "Comparing STÄ").to.equal(
                expectedAttributes.STRENGTH
            );
            expect(system.attributes.mind.initial + system.attributes.mind.advances, "Comparing VER").to.equal(
                expectedAttributes.MIND
            );
            expect(
                system.attributes.willpower.initial + system.attributes.willpower.advances,
                "Comparing WIL"
            ).to.equal(expectedAttributes.WILLPOWER);

            // Test skills
            const expectedSkills = Cara_Aeternia.skills.reduce(
                (acc: Record<string, number>, s) => ({
                    ...acc,
                    [s.id]: s.points,
                }),
                {}
            );
            expect(system.skills.melee.points, "Comparing melee").to.equal(expectedSkills.melee);
            expect(system.skills.slashing.points, "Comparing slashing").to.equal(expectedSkills.slashing);
            expect(system.skills.chains.points, "Comparing chains").to.equal(expectedSkills.chains);
            expect(system.skills.blades.points, "Comparing blades").to.equal(expectedSkills.blades);
            expect(system.skills.longrange.points, "Comparing longrange").to.equal(expectedSkills.longrange);
            expect(system.skills.staffs.points, "Comparing staffs").to.equal(expectedSkills.staffs);
            expect(system.skills.throwing.points, "Comparing throwing").to.equal(expectedSkills.throwing);
            expect(system.skills.acrobatics.points, "Comparing acrobatics").to.equal(expectedSkills.acrobatics);
            expect(system.skills.alchemy.points, "Comparing alchemy").to.equal(expectedSkills.alchemy);
            expect(system.skills.leadership.points, "Comparing leadership").to.equal(expectedSkills.leadership);
            expect(system.skills.arcanelore.points, "Comparing arcanelore").to.equal(expectedSkills.arcanelore);
            expect(system.skills.athletics.points, "Comparing athletics").to.equal(expectedSkills.athletics);
            expect(system.skills.performance.points, "Comparing performance").to.equal(expectedSkills.performance);
            expect(system.skills.diplomacy.points, "Comparing diplomacy").to.equal(expectedSkills.diplomacy);
            expect(system.skills.clscraft.points, "Comparing clscraft").to.equal(expectedSkills.clscraft);
            expect(system.skills.empathy.points, "Comparing empathy").to.equal(expectedSkills.empathy);
            expect(system.skills.determination.points, "Comparing determination").to.equal(
                expectedSkills.determination
            );
            expect(system.skills.dexterity.points, "Comparing dexterity").to.equal(expectedSkills.dexterity);
            expect(system.skills.history.points, "Comparing history").to.equal(expectedSkills.history);
            expect(system.skills.craftmanship.points, "Comparing craftmanship").to.equal(expectedSkills.craftmanship);
            expect(system.skills.heal.points, "Comparing heal").to.equal(expectedSkills.heal);
            expect(system.skills.stealth.points, "Comparing stealth").to.equal(expectedSkills.stealth);
            expect(system.skills.hunting.points, "Comparing hunting").to.equal(expectedSkills.hunting);
            expect(system.skills.countrylore.points, "Comparing countrylore").to.equal(expectedSkills.countrylore);
            expect(system.skills.nature.points, "Comparing nature").to.equal(expectedSkills.nature);
            expect(system.skills.eloquence.points, "Comparing eloquence").to.equal(expectedSkills.eloquence);
            expect(system.skills.locksntraps.points, "Comparing locksntraps").to.equal(expectedSkills.locksntraps);
            expect(system.skills.swim.points, "Comparing swim").to.equal(expectedSkills.swim);
            expect(system.skills.seafaring.points, "Comparing seafaring").to.equal(expectedSkills.seafaring);
            expect(system.skills.streetlore.points, "Comparing streetlore").to.equal(expectedSkills.streetlore);
            expect(system.skills.animals.points, "Comparing animals").to.equal(expectedSkills.animals);
            expect(system.skills.survival.points, "Comparing survival").to.equal(expectedSkills.survival);
            expect(system.skills.perception.points, "Comparing perception").to.equal(expectedSkills.perception);
            expect(system.skills.endurance.points, "Comparing endurance").to.equal(expectedSkills.endurance);
            expect(system.skills.antimagic.points, "Comparing antimagic").to.equal(expectedSkills.antimagic);
            expect(system.skills.controlmagic.points, "Comparing controlmagic").to.equal(expectedSkills.controlmagic);
            expect(system.skills.motionmagic.points, "Comparing motionmagic").to.equal(expectedSkills.motionmagic);
            expect(system.skills.insightmagic.points, "Comparing insightmagic").to.equal(expectedSkills.insightmagic);
            expect(system.skills.stonemagic.points, "Comparing stonemagic").to.equal(expectedSkills.stonemagic);
            expect(system.skills.firemagic.points, "Comparing firemagic").to.equal(expectedSkills.firemagic);
            expect(system.skills.healmagic.points, "Comparing healmagic").to.equal(expectedSkills.healmagic);
            expect(system.skills.illusionmagic.points, "Comparing illusionmagic").to.equal(
                expectedSkills.illusionmagic
            );
            expect(system.skills.combatmagic.points, "Comparing combatmagic").to.equal(expectedSkills.combatmagic);
            expect(system.skills.lightmagic.points, "Comparing lightmagic").to.equal(expectedSkills.lightmagic);
            expect(system.skills.naturemagic.points, "Comparing naturemagic").to.equal(expectedSkills.naturemagic);
            expect(system.skills.shadowmagic.points, "Comparing shadowmagic").to.equal(expectedSkills.shadowmagic);
            expect(system.skills.fatemagic.points, "Comparing fatemagic").to.equal(expectedSkills.fatemagic);
            expect(system.skills.protectionmagic.points, "Comparing protectionmagic").to.equal(
                expectedSkills.protectionmagic
            );
            expect(system.skills.enhancemagic.points, "Comparing enhancemagic").to.equal(expectedSkills.enhancemagic);
            expect(system.skills.deathmagic.points, "Comparing deathmagic").to.equal(expectedSkills.deathmagic);
            expect(system.skills.transformationmagic.points, "Comparing transformationmagic").to.equal(
                expectedSkills.transformationmagic
            );
            expect(system.skills.watermagic.points, "Comparing watermagic").to.equal(expectedSkills.watermagic);
            expect(system.skills.windmagic.points, "Comparing windmagic").to.equal(expectedSkills.windmagic);

            // Test items
            expect(actor.items.find((i) => i.type === "moonsign")?.name).to.equal("Omen des schwarzen Mondes");

            expect(actor.items.filter((i) => i.type === "spell").length, "Has number of spells").to.equal(25);
            expect(actor.items.find((i) => i.name === "Blenden")?.system, "Comparing 'Blenden' spell").to.deep.contain({
                costs: "4V1",
                difficulty: "KW",
                skill: "lightmagic",
                skillLevel: 1,
                range: "5m",
                enhancementCosts: "1 EG/+1V1",
                enhancementDescription: "Das Ziel erhält den Zustand Geblendet 2.",
            });

            expect(actor.items.filter((i) => i.type === "strength").length, "Has n strength items").to.equal(5);
            expect(
                actor.items.find((i) => i.name === "Zusätzliche Splitterpunkte")?.system,
                "Comparing strength 'Zusätzliche Splitterpunkte'"
            ).to.deep.contain({
                description:
                    "Das Schicksal ist dem Abenteurer in besonderem Maße gewogen. Er erhält 5 zusätzliche Sammelmünzen.",
                level: 1,
                modifier: "splinterpoints +2",
                multiSelectable: false,
                onCreationOnly: false,
                origin: "",
                quantity: 1,
            });

            expect(actor.items.filter((i) => i.type === "mastery").length, "Has n mastery items").to.equal(17);
            expect(
                actor.items.find((i) => i.name == "Scharfe Zunge")?.system,
                "Comparing mastery 'Scharfe Zunge'"
            ).to.deep.contain({
                description:
                    "Der Abenteurer ist für seine scharfe Zunge berühmt und berüchtigt. Er braucht keine Chilis beim Essen",
                source: "",
                modifier: "",
                availableIn: "",
                skill: "diplomacy",
                isGrandmaster: false,
                isManeuver: false,
                level: 2,
            });

            expect(actor.items.find((i) => i.name === "Dolch")?.system, "Comparing item 'Dolch'").to.deep.contain({
                damage: {
                    stringInput: "1W6+3",
                },
                damageType: "physical",
                costType: "V",
                range: 0,
                weaponSpeed: 5,
                skill: "blades",
                skillMod: 0,
                features: {
                    _document: null,
                    internalFeatureList: [{ name: "Wurffähig", value: 1 }],
                    triedToFindDocument: false,
                },
                attribute1: "agility",
                attribute2: "intuition",
                prepared: false,
                equipped: false,
                secondaryAttack: {
                    skill: "throwing",
                    skillMod: 0,
                    attribute1: "agility",
                    attribute2: "intuition",
                    damage: {
                        stringInput: "1W6+1",
                    },
                    damageType: "physical",
                    costType: "V",
                    range: 5,
                    weaponSpeed: 4,
                    minAttributes: "",
                    features: {
                        _document: null,
                        internalFeatureList: [
                            { name: "Improvisiert", value: 1 },
                            {
                                name: "Nahkampftauglich",
                                value: 1,
                            },
                        ],
                        triedToFindDocument: false,
                    },
                },
            });
        });
    });

    describe("Actor rest methods update document", () => {
        let actor: SplittermondActor;
        let originalDialog: any;
        beforeEach(async () => {
            originalDialog = Dialog;
            actor = await actorCreator.createCharacter({ type: "character", name: "Rest Test", system: {} });
        });
        afterEach(async () => {
            if (actor && actor.id) await Actor.deleteDocuments([actor.id]);
            Dialog = originalDialog;
        });

        it(
            "shortRest persists replenishment of exhausted stats",
            withActor(async (actor) => {
                const systemCopy = new CharacterDataModel((actor.system as CharacterDataModel).toObject());
                systemCopy.focus.updateSource({ exhausted: { value: 10 } });
                systemCopy.health.updateSource({ exhausted: { value: 8 } });
                await actor.update({ system: systemCopy });

                await actor.shortRest();

                // Refetch actor from database to ensure update was persisted
                const updated = foundryApi.getActor(actor.id);
                expect(updated?.system.focus.exhausted.value).to.equal(0);
                expect(updated?.system.health.exhausted.value).to.equal(0);
            })
        );

        it("longRest persists replenishment of consumed stats", async () => {
            const systemCopy = new CharacterDataModel((actor.system as CharacterDataModel).toObject());
            systemCopy.focus.updateSource({ exhausted: { value: 10 } });
            systemCopy.health.updateSource({ exhausted: { value: 8 } });
            systemCopy.focus.updateSource({ consumed: { value: 10 } });
            systemCopy.health.updateSource({ consumed: { value: 8 } });
            systemCopy.updateSource({
                attributes: {
                    ...actor.system.attributes,
                    willpower: { species: 0, initial: 2, advances: 0 },
                    constitution: { species: 0, initial: 3, advances: 0 },
                },
            });
            await actor.update({ system: systemCopy });

            await actor.longRest(true, false);

            // Refetch actor from database to ensure update was persisted
            const updated = foundryApi.getActor(actor.id);
            expect(updated?.system.focus.exhausted.value).to.equal(0);
            expect(updated?.system.health.exhausted.value).to.equal(0);
            // Check that consumed values were reduced
            expect(updated?.system.focus.consumed.value).to.equal(6);
            expect(updated?.system.health.consumed.value).to.equal(2);
        });
    });

    describe("Import of Items into actor", () => {
        let actor: SplittermondActor;
        let originalDialogRender: any;
        let originalPrompt: any;
        let items: (SplittermondMasteryItem | SplittermondSpellItem)[] = [];

        beforeEach(async () => {
            originalDialogRender = foundry.applications.api.DialogV2.prototype.render;
            originalPrompt = FoundryDialog.prompt;
            actor = await actorCreator.createCharacter({ type: "character", name: "Rest Test", system: {} });
        });

        afterEach(async () => {
            foundry.applications.api.DialogV2.prototype.render = originalDialogRender;
            FoundryDialog.prompt = originalPrompt;
            if (actor && actor.id) await Actor.deleteDocuments([actor.id]);
            await Item.deleteDocuments(items.map((i) => i.id));
            items = [];
        });

        async function createSpell(item: Parameters<(typeof itemCreator)["createSpell"]>[0]) {
            const itemData = await itemCreator.createSpell(item);
            items.push(itemData);
            return itemData;
        }

        async function createMastery(item: Parameters<(typeof itemCreator)["createMastery"]>[0]) {
            const itemData = await itemCreator.createMastery(item);
            items.push(itemData);
            return itemData;
        }

        it("import spell without prompting if skill is set", async () => {
            const spell = await createSpell({
                type: "spell",
                name: "Test Spell",
                system: { skill: "deathmagic", skillLevel: 1 },
            });
            const underTest = new SplittermondActorSheet({ document: actor, editable: true });

            await underTest._onDropDocument(new DragEvent("drop"), spell);

            const itemOnActor = actor.items.find((i) => i.name === spell.name);
            expect(itemOnActor).to.exist;
            expect((itemOnActor?.system as SpellDataModel).skill).to.equal(spell.system.skill);
        });

        it("import mastery without prompting if skill is set", async () => {
            const mastery = await createMastery({
                type: "mastery",
                name: "Test Mastery",
                system: { skill: "deathmagic", level: 1 },
            });
            const underTest = new SplittermondActorSheet({ document: actor, editable: true });

            await underTest._onDropDocument(new DragEvent("drop"), mastery);

            const itemOnActor = actor.items.find((i) => i.name === mastery.name);
            expect(itemOnActor).to.exist;
            expect((itemOnActor?.system as MasteryDataModel).skill).to.equal(
                (mastery.system as MasteryDataModel).skill
            );
        });

        it("should prompt for skill if available skills are set", async () => {
            foundry.applications.api.DialogV2.prototype.render = function () {
                //Apparently, foundryvtt maps the list back into a record.
                //Beware, this is an implementation detail and subject to change.
                this.options.buttons.deathmagic.callback();
            };

            const spell = await createSpell({
                type: "spell",
                name: "Spell with School options",
                system: { availableIn: "deathmagic 1, lightmagic 2", skill: "arcanelore", skillLevel: 0 },
            });
            const underTest = new SplittermondActorSheet({ document: actor, editable: true });

            await underTest._onDropDocument(new DragEvent("drop"), spell);

            const itemOnActor = actor.items.find((i) => i.name === spell.name);
            expect(itemOnActor).to.exist;
            expect((itemOnActor?.system as SpellDataModel).skill).to.equal("deathmagic");
            expect((itemOnActor?.system as SpellDataModel).skillLevel).to.equal(1);
        });
    });

    describe("Actor functions", () => {
        it(
            "should increase derived values on hero level up",
            withActor(async (actor) => {
                await actor.update({
                    system: {
                        experience: { spent: 101 },
                        species: { size: 5 },
                        attributes: {
                            mind: { species: 0, initial: 1, advances: 0 },
                            agility: { species: 0, initial: 2, advances: 0 },
                            strength: { species: 0, initial: 3, advances: 0 },
                            willpower: { species: 0, initial: 4, advances: 0 },
                            constitution: { species: 0, initial: 5, advances: 0 },
                        },
                    },
                });
                await actor.prepareBaseData();
                await actor.prepareDerivedData();
                expect((actor.system as CharacterDataModel).experience.heroLevel).to.equal(2);
                expect((actor.system as CharacterDataModel).experience.heroLevel).to.equal(2);
                expect(actor.derivedValues.size.value, "Size value").to.equal(5);
                expect(actor.derivedValues.defense.value, "Defense value").to.equal(19);
                expect(actor.derivedValues.bodyresist.value, "Bodyresist value").to.equal(23);
                expect(actor.derivedValues.mindresist.value, "Mindresist value").to.equal(19);
                expect(actor.splinterpoints.max, "Splinterpoints max value").to.equal(4);
            })
        );
    });

    describe("Actor sheet", () => {
        it(
            "should save acrobatics skill points from sheet",
            withActor(async (actor) => {
                await actor.update({ system: { skills: { acrobatics: { points: 5 } } } });
                const sheet = await new SplittermondCharacterSheet({ document: actor }).render({ force: true });

                const skillInput = sheet.element.querySelector(
                    "input[name='system.skills.acrobatics.points']"
                )! as HTMLInputElement;

                skillInput.value = "8";
                skillInput.dispatchEvent(new Event("input", { bubbles: true }));
                skillInput.dispatchEvent(new Event("change", { bubbles: true }));

                await passesEventually(() =>
                    expect((actor.system as CharacterDataModel).skills.acrobatics.points).to.equal(8)
                );
            })
        );

        it(
            "should post a damage message, on click",
            withActor(async (actor) => {
                await actor.createEmbeddedDocuments("Item", [
                    {
                        name: "Test Attack",
                        type: "npcattack",
                        system: {
                            damage: { stringInput: "1W6+2" },
                            damageType: "physical",
                            costType: "V",
                            range: 0,
                            weaponSpeed: 5,
                        },
                    },
                ]);
                actor.modifier.addModifier(new Modifier("item.damage", of(5), { name: "Test", type: "innate" }));
                const sheet = await new SplittermondCharacterSheet({ document: actor }).render({ force: true });

                const assertion = new Promise((resolve, reject) => {
                    foundryApi.hooks.once("renderChatMessageHTML", (app) => {
                        try {
                            expect(app.type).to.equal("damageMessage");
                            expect((app.system as DamageMessage).damageEvent.formulaToDisplay).to.equal("1W6 + 7");
                            resolve("passed");
                        } catch (e) {
                            reject((e as Error).message);
                        }
                    });
                });
                const damageLink = sheet.element.querySelector(
                    'a.rollable[data-action="roll-damage"][data-damageimplements]'
                );
                damageLink?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
                sheet.close();

                expect(damageLink, "Sheet has a damage link").to.exist;
                expect(await assertion, "Chat message was created successfully").to.equal("passed");
            })
        );
        it(
            "should drag an attack between actors",
            withActor(
                withActor(async (source, target) => {
                    const item: SplittermondWeaponItem = (
                        await source.createEmbeddedDocuments("Item", [
                            { type: "weapon", name: "Drag Test Weapon", system: { equipped: true } },
                        ])
                    )[0];
                    source.prepareBaseData();
                    source.prepareEmbeddedDocuments();
                    source.prepareDerivedData();
                    const sourceSheet = await new SplittermondCharacterSheet({ document: source }).render({
                        force: true,
                    });
                    const targetSheet = await new SplittermondCharacterSheet({ document: target }).render({
                        force: true,
                    });

                    const dataTransfer = new DataTransfer();
                    const dragStart = new DragEvent("dragstart", { bubbles: true, dataTransfer, cancelable: true });
                    const dragStop = new DragEvent("drop", { dataTransfer });
                    sourceSheet.element.querySelector(`[data-attack-id='${item.id}']`)?.dispatchEvent(dragStart);
                    targetSheet.element.dispatchEvent(dragStop);

                    await passesEventually(() => {
                        expect(target.items.map((i) => i.name)).to.include(item.name);
                    });

                    //Pure precaution. Foundry should remove them when the actors get deleted.
                    sourceSheet.close();
                    targetSheet.close();
                })
            )
        );
        it(
            "should drag an item between actors",
            withActor(
                withActor(async (source, target) => {
                    const item: SplittermondWeaponItem = (
                        await source.createEmbeddedDocuments("Item", [
                            { type: "weapon", name: "Drag Test Weapon", system: {} },
                        ])
                    )[0];
                    const sourceSheet = await new SplittermondCharacterSheet({ document: source }).render({
                        force: true,
                    });
                    const targetSheet = await new SplittermondCharacterSheet({ document: target }).render({
                        force: true,
                    });

                    const dataTransfer = new DataTransfer();
                    const dragStart = new DragEvent("dragstart", { bubbles: true, dataTransfer, cancelable: true });
                    const dragStop = new DragEvent("drop", { dataTransfer });
                    sourceSheet.element.querySelector(`[data-item-id='${item.id}']`)?.dispatchEvent(dragStart);
                    targetSheet.element.dispatchEvent(dragStop);

                    await passesEventually(() => {
                        expect(target.items.find((i) => i.name === item.name)).to.exist;
                    });

                    //Pure precaution. Foundry should remove them when the actors get deleted.
                    sourceSheet.close();
                    targetSheet.close();
                })
            )
        );
        it(
            "should retain the hover state of health/focus on rerender",
            withActor(async (actor) => {
                const inputSelector = "input[name='system.health.consumed.value']";
                const sheet = await new SplittermondCharacterSheet({ document: actor }).render({ force: true });
                const healthElement = sheet.element.querySelector("#health")!;

                healthElement.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
                const inputButton = healthElement.querySelector<HTMLButtonElement>(
                    `${inputSelector}~button[data-action='inc-value']`
                );
                inputButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

                await passesEventually(() => expect(actor.system.health.consumed.value).to.equal(1));
                expect(sheet.element.querySelector<HTMLInputElement>(inputSelector)?.value).to.equal("1");
                expect(
                    sheet.element
                        .querySelector("#health .health-focus-data")
                        ?.checkVisibility({ opacityProperty: true, visibilityProperty: true })
                ).to.be.true;
            })
        );

        it(
            "should sort items correctly in prepareContext",
            withActor(async (actor) => {
                // Create items with explicit sort values out of order
                const item1 = (
                    await actor.createEmbeddedDocuments("Item", [
                        { type: "equipment", name: "C Equipment", system: {}, sort: 300000 },
                    ])
                )[0];
                const item2 = (
                    await actor.createEmbeddedDocuments("Item", [
                        { type: "equipment", name: "A Equipment", system: {}, sort: 100000 },
                    ])
                )[0];
                const item3 = (
                    await actor.createEmbeddedDocuments("Item", [
                        { type: "equipment", name: "B Equipment", system: {}, sort: 200000 },
                    ])
                )[0];

                // Verify items were created with the expected sort values (out of order by name)
                expect(item1.sort, "Item1 sort").to.equal(300000);
                expect(item2.sort, "Item2 sort").to.equal(100000);
                expect(item3.sort, "Item3 sort").to.equal(200000);

                const sheet = new SplittermondCharacterSheet({ document: actor });
                const context = await sheet._prepareContext();
                if (!("itemsByType" in context)) {
                    throw new Error("itemsByType not in context");
                }

                // Check that itemsByType.equipment is sorted by the sort property
                expect(context.itemsByType, "Context should have itemsByType").to.exist;
                const equipmentItems = (context.itemsByType as any).equipment;
                expect(equipmentItems, "Should have equipment items").to.exist;
                expect(equipmentItems).to.have.lengthOf(3);

                // Items should be in sort order: item2 (100k), item3 (200k), item1 (300k)
                expect(equipmentItems[0]._id, "First item should be item2").to.equal(item2.id);
                expect(equipmentItems[1]._id, "Second item should be item3").to.equal(item3.id);
                expect(equipmentItems[2]._id, "Third item should be item1").to.equal(item1.id);

                // Verify the sort values are in ascending order
                expect(equipmentItems[0].sort, "First item sort").to.be.lessThan(equipmentItems[1].sort);
                expect(equipmentItems[1].sort, "Second item sort").to.be.lessThan(equipmentItems[2].sort);
            })
        );

        it(
            "should sort spells correctly in prepareContext",
            withActor(async (actor) => {
                // Create items with explicit sort values out of order
                const item1 = (
                    await actor.createEmbeddedDocuments("Item", [
                        { type: "spell", name: "C Spell", system: { skill: "combatmagic" }, sort: 100 },
                    ])
                )[0];
                const item2 = (
                    await actor.createEmbeddedDocuments("Item", [
                        { type: "spell", name: "A Spell", system: { skill: "arcanelore" }, sort: 100000 },
                    ])
                )[0];
                const item3 = (
                    await actor.createEmbeddedDocuments("Item", [
                        { type: "spell", name: "B spell", system: { skill: "arcanelore" }, sort: 200000 },
                    ])
                )[0];

                // Verify items were created with the expected sort values (out of order by name)
                expect(item1.sort, "Item1 sort").to.equal(100);
                expect(item2.sort, "Item2 sort").to.equal(100000);
                expect(item3.sort, "Item3 sort").to.equal(200000);

                const sheet = new SplittermondCharacterSheet({ document: actor });
                const context = await sheet._prepareContext();
                if (
                    !("spellsBySkill" in context) ||
                    !context.spellsBySkill ||
                    typeof context.spellsBySkill !== "object"
                ) {
                    expect.fail("Context should have spellsBySkill");
                    throw new Error("Should have spellsBySkill"); //Satisfy compiler
                }

                const skills = Object.keys(context.spellsBySkill);
                const arcaneLoreSpells = (context.spellsBySkill as Record<string, any>).arcanelore.spells;

                expect(skills[0]).equal("arcanelore");
                expect(skills[1]).equal("combatmagic");
                expect(arcaneLoreSpells[0]._id).to.equal(item2.id);
                expect(arcaneLoreSpells[1]._id).to.equal(item3.id);
            })
        );
    });
}

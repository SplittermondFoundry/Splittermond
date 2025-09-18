import { QuenchBatchContext } from "@ethaks/fvtt-quench";
import sinon from "sinon";
import ItemImporter from "../../module/util/item-importer";
import * as Baumwandler from "../resources/importSamples/GRW/NSC/Baumwandler.resource";
import { foundryApi } from "../../module/api/foundryApi";
import SplittermondActor from "../../module/actor/actor";
import { actorCreator, itemCreator } from "../../module/data/EntityCreator";
import * as Cara_Aeternia from "../resources/importSamples/Hexenkönigin/Cara_Aeternia.json";
import { CharacterDataModel } from "../../module/actor/dataModel/CharacterDataModel";
import SplittermondMasteryItem from "../../module/item/mastery";
import { MasteryDataModel } from "../../module/item/dataModel/MasteryDataModel";
import SplittermondSpellItem from "../../module/item/spell";
import { SpellDataModel } from "../../module/item/dataModel/SpellDataModel";
import { FoundryDialog } from "../../module/api/Application";
import SplittermondActorSheet from "../../module/actor/sheets/actor-sheet";

declare const Actor: any;
declare var Dialog: any;

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

        it("shortRest persists replenishment of exhausted stats", async () => {
            const systemCopy = new CharacterDataModel((actor.system as CharacterDataModel).toObject());
            systemCopy.focus.updateSource({ exhausted: { value: 10 } });
            systemCopy.health.updateSource({ exhausted: { value: 8 } });
            await actor.update({ system: actor.system });

            await actor.shortRest();

            // Refetch actor from database to ensure update was persisted
            const updated = foundryApi.getActor(actor.id);
            expect(updated?.system.focus.exhausted.value).to.equal(0);
            expect(updated?.system.health.exhausted.value).to.equal(0);
        });

        it("longRest persits replenishment of consumed stats", async () => {
            // Simulate dialog auto-confirmation
            Dialog = class {
                constructor(options: any) {
                    if (options?.buttons?.yes) options.buttons.yes.callback();
                }
                render() {}
            };
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

            await actor.longRest();

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
        let originalDialog: any;
        let originalPrompt: any;
        let items: (SplittermondMasteryItem | SplittermondSpellItem)[] = [];

        beforeEach(async () => {
            originalDialog = Dialog;
            originalPrompt = FoundryDialog.prompt;
            actor = await actorCreator.createCharacter({ type: "character", name: "Rest Test", system: {} });

            Dialog = class {
                constructor(options: any) {
                    if (options?.buttons?.yes) options.buttons.yes.callback();
                }
                render() {}
            };
        });

        afterEach(async () => {
            Dialog = originalDialog;
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
            const underTest = new SplittermondActorSheet(actor, { editable: true });

            await underTest._onDropItemCreate(spell);

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
            const underTest = new SplittermondActorSheet(actor, { editable: true });

            await underTest._onDropItemCreate(mastery);

            const itemOnActor = actor.items.find((i) => i.name === mastery.name);
            expect(itemOnActor).to.exist;
            expect((itemOnActor?.system as MasteryDataModel).skill).to.equal(
                (mastery.system as MasteryDataModel).skill
            );
        });

        it("should prompt for skill if available skills are set", async () => {
            Dialog = class {
                constructor(options: any) {
                    if (options?.buttons?.deathmagic) {
                        options.buttons.deathmagic.callback();
                    }
                }
                render() {}
            };
            const spell = await createSpell({
                type: "spell",
                name: "Spell with School options",
                system: { availableIn: "deathmagic 1, lightmagic 2", skill: "arcanelore", skillLevel: 0 },
            });
            const underTest = new SplittermondActorSheet(actor, { editable: true });

            await underTest._onDropItemCreate(spell.toObject());

            const itemOnActor = actor.items.find((i) => i.name === spell.name);
            expect(itemOnActor).to.exist;
            expect((itemOnActor?.system as SpellDataModel).skill).to.equal("deathmagic");
            expect((itemOnActor?.system as SpellDataModel).skillLevel).to.equal(1);
        });
    });

    describe("Actor functions", () => {
        let actorsToDelete: string[] = [];
        beforeEach(() => (actorsToDelete = []));
        afterEach(async () => {
            await Actor.deleteDocuments(actorsToDelete);
        });

        async function createActor() {
            const actor = await actorCreator.createCharacter({ type: "character", name: "Level Up Test", system: {} });
            actorsToDelete.push(actor.id);
            return actor;
        }

        it("should increase derived values on hero level up", async () => {
            const actor = await createActor();
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
            expect(actor.derivedValues.size.value, "Size value").to.equal(5);
            expect(actor.derivedValues.defense.value, "Defense value").to.equal(19);
            expect(actor.derivedValues.bodyresist.value, "Bodyresist value").to.equal(23);
            expect(actor.derivedValues.mindresist.value, "Mindresist value").to.equal(19);
            expect(actor.splinterpoints.max, "Splinterpoints max value").to.equal(4);
        });
    });
}

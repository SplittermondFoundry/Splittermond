import {passesEventually, simplePropertyResolver} from "../util";
import {QuenchBatchContext} from "@ethaks/fvtt-quench";
import type TokenActionBar from "../../module/apps/token-action-bar/token-action-bar";
import type SplittermondActor from "../../module/actor/actor";
import {actorCreator} from "../../module/data/EntityCreator";
import sinon, {type SinonSandbox} from "sinon";
import {splittermond} from "../../module/config";
import {CharacterDataModel} from "../../module/actor/dataModel/CharacterDataModel";
import {foundryUISelectors} from "../../module/apps/tick-bar-hud/tickBarResizing";

declare const game: any;
declare const deepClone: any;

declare class Collection {
}

export function applicationTests(context: QuenchBatchContext) {
    const {describe, it, expect, beforeEach, afterEach} = context;

    describe("foundry API compatibility", () => {
        it("game.packs can be sorted by documentName", () => {
            expect(game.packs.filter).to.be.a("function");
            expect(game.packs.filter((pack: any) => pack.documentName === "Item")).to.have.length.greaterThan(0);
            expect(game.packs.filter((pack: any) => pack.documentName === "Item")).and.to.have.length.lessThan(game.packs.size);
        });

        it("receives an index with objects that have the expected properties", async () => {
            const searchParam = {fields: ["system.skill", "name"]};
            const firstItemCompendium = game.packs.find((p: any) => p.documentName === "Item")
            if (!firstItemCompendium) {
                it.skip("No item compendium found");
            }
            const index = await firstItemCompendium.getIndex(searchParam);
            expect(index).to.be.instanceOf(Collection).and.to.have.length.greaterThan(0);
            const indexKey = index.keys().next().value;
            searchParam.fields.forEach(expectedProperty => {
                expect(simplePropertyResolver(index.get(indexKey), expectedProperty), `Property ${expectedProperty}`)
                    .not.to.be.undefined; //jshint ignore:line
            });
        });

        it("i18n contains a localize function that translates the given string", async () => {
            expect(game.i18n).to.have.property("localize");
            expect(game.i18n.localize("splittermond.skillLabel.deathmagic")).to.equal("Todesmagie");
        });

        it("i18n contains a format function that translates the given string, inserting templateArgs", async () => {
            expect(game.i18n).to.have.property("format");
            expect(game.i18n.format("splittermond.chatCard.spellMessage.tooManyHandlers", {action: "Handlung"}))
                .to.equal("Es gibt mehr als einen eingetragenen Bearbeiter für die Aktion 'Handlung'. Bitte wenden Sie sich an den Entwickler.");
        });

        it("i18n contains a format function ignores strings without templates", async () => {
            expect(game.i18n.format("splittermond.skillLabel.deathmagic", {})).to.equal("Todesmagie");
        });

        it("i18n contains a format function ignores no template args input", async () => {
            expect(game.i18n.format("splittermond.skillLabel.deathmagic")).to.equal("Todesmagie");
        });
    });

    describe("Compendium Browser getData", () => {
        it("should return an object with the expected properties", async () => {
            if (game.packs.length === 0) {
                it.skip("No compendiums found");
            }
            const data = await game.splittermond.compendiumBrowser._prepareContext();
            expect(data).to.have.property("items");
            expect(data.items).to.have.property("mastery");
            expect(data.items).to.have.property("spell");
            expect(data.items).to.have.property("weapon");
        });

    });

    describe("Token Action Bar", () => {
        let sandbox: SinonSandbox;
        const tokenActionBar = game.splittermond.tokenActionBar as TokenActionBar;
        let actors = [] as SplittermondActor[];

        beforeEach(() => sandbox = sinon.createSandbox())

        afterEach(() => {
            Actor.deleteDocuments(actors.map(a => a.id));
            actors = [];
            sandbox.restore()
        })

        async function createActor() {
            const actor = await actorCreator.createCharacter({type: "character", name: "Rest Test", system: {}});
            actors.push(actor);
            return actor;
        }

        function getTestSpell() {
            return {
                type: "spell",
                name: "Test Spell",
                system: {skill: "lightmagic", focusCost: "3V4", castDuration: "1T"},
            }
        }

        function getTestShield() {
            return {
                type: "shield",
                name: "Test Shield",
                system: {equipped: true, defense: 5, bodyresist: 3, mindresist: 2}
            }
        }

        function getTestWeapon() {
            return {
                type: "weapon",
                name: "Test Weapon",
                system: {
                    equipped: true,
                    damage: "1W6",
                    range: "0",
                    speed: 2,
                    skill: null as string|null,
                    attribute1: null as string|null,
                    attribute2: null as string|null,
                }

            }
        }

        ["toggleEquipped", "open-sheet", "prepareSpell", "rollSkill", "rollAttack", "rollSpell", "rollDefense"].forEach((action) => {
            it(`should define action '${action}`, async () => {
                expect(tokenActionBar.options.actions).to.contain.keys([action]);
            });
        });

        it("should forward spell preparation to the current actor", async () => {
            const actor = await createActor();
            game.splittermond.tokenActionBar._currentActor = actor;
            const createdDocuments = await actor.createEmbeddedDocuments("Item", [getTestSpell()]);
            const spell = createdDocuments[0];

            await tokenActionBar.render(true)
            tokenActionBar.element.querySelector("[data-action='prepareSpell']")?.dispatchEvent(new MouseEvent("click", {bubbles: true}));

            await passesEventually(() => expect(actor.getFlag("splittermond", "preparedSpell")).to.equal(spell.id));
        });

        it("should roll for a prepared spell", async () => {
            const actor = await createActor();
            game.splittermond.tokenActionBar._currentActor = actor;
            const createdDocuments = await actor.createEmbeddedDocuments("Item", [getTestSpell()]);
            const spell = createdDocuments[0];
            const rollSpellStub = sandbox.stub(actor, "rollSpell").resolves(true);

            await renderActonBarForActor(actor);
            //prepare the spell
            tokenActionBar.element.querySelector("[data-action='prepareSpell']")?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
            await passesEventually(() => expect(actor.getFlag("splittermond", "preparedSpell")).to.equal(spell.id));
            await renderActonBarForActor(actor);
            const preparedSpell = tokenActionBar.element.querySelector('[data-action="rollSpell"]')
            preparedSpell?.dispatchEvent(new MouseEvent("click", {bubbles: true}));

            await passesEventually(() => expect(actor.getFlag("splittermond", "preparedSpell")).to.be.oneOf([null, undefined]))
            await passesEventually(() => expect(rollSpellStub.callCount).to.equal(1))
            expect(rollSpellStub.lastCall.args).to.deep.equal([spell.id])
        });

        it("should contain items in the action bar", async () => {
            const actor = await createActor();
            const createdDocuments = await actor.createEmbeddedDocuments("Item", [getTestSpell(), getTestWeapon(), getTestShield()]);
            const spell = createdDocuments[0];
            const weapon = createdDocuments[1];
            const shield = createdDocuments[2];

            actor.prepareBaseData();
            await actor.prepareEmbeddedDocuments();
            actor.prepareDerivedData();
            await renderActonBarForActor(actor);

            const allSpellDataSets = getDataSets(tokenActionBar.element.querySelectorAll("[data-action='prepareSpell']"))
            expect(allSpellDataSets.map(d => d.spellId)).to.contain(spell.id)

            const allWeaponDataSets = getDataSets(tokenActionBar.element.querySelectorAll("[data-action='rollAttack']"))
            expect(allWeaponDataSets.map(d => d.attackId)).to.contain.all.members([weapon.id, shield.id])
        });

        ([
            ["longrange", false],
            ["throwing", false],
            ["blades", true],
            ["staffs", true]
        ] as const).forEach(([skill, prepared]) => {
        const preparedTitle = prepared ? "prepared" : "not prepared";
        it(`should display weapons for skill '${skill}' as ${preparedTitle}`, async () => {
            const actor = await createActor();
            const testWeapon = getTestWeapon();
            testWeapon.system.skill = skill
            testWeapon.system.attribute1 = "strength";
            testWeapon.system.attribute2 = "strength";
            await actor.update({system: {skills: {[skill]: {points: 2, value: 6}}}});
            const createdDocuments = await actor.createEmbeddedDocuments("Item", [testWeapon]);
            const weapon = createdDocuments[0];

            actor.prepareBaseData();
            await actor.prepareEmbeddedDocuments();
            actor.prepareDerivedData();
            await renderActonBarForActor(actor);

            const allWeaponDataSets = getDataSets(tokenActionBar.element.querySelectorAll("[data-action='rollAttack']"))
            expect(allWeaponDataSets.map(d => d.attackId)).to.contain(weapon.id)
            expect(allWeaponDataSets.find(d => d.attackId == weapon.id)?.prepared).to.equal(prepared? "true" : "false");
        })
        });

        it("should not contain items that are not equipped", async () => {
            const actor = await createActor();
            const testWeapon = getTestWeapon();
            testWeapon.system.equipped = false;
            const createdDocuments = await actor.createEmbeddedDocuments("Item", [testWeapon]);
            const weapon = createdDocuments[0];

            actor.prepareBaseData();
            await actor.prepareEmbeddedDocuments();
            actor.prepareDerivedData();
            await renderActonBarForActor(actor);

            const allWeaponDataSets = getDataSets(tokenActionBar.element.querySelectorAll("[data-action='rollAttack']"))
            expect(allWeaponDataSets.map(d => d.attackId)).not.to.contain(weapon.id);
        });

        ["defense", "bodyresist", "mindresist"].forEach((defenseType) => {
            it(`should trigger defense dialog for ${defenseType}`, async () => {
                const actor = await createActor();
                const defenseStub  = sandbox.stub(actor,"activeDefenseDialog").resolves();
                splittermond.attributes.forEach(attribute => {
                    (actor.system as CharacterDataModel).attributes[attribute].updateSource({
                        initial: 2,
                        advances: 0,
                        species: 0
                    });
                });

                actor.prepareBaseData();
                await actor.prepareEmbeddedDocuments();
                actor.prepareDerivedData();
                await renderActonBarForActor(actor);

                const defenseElement = tokenActionBar.element.querySelector(`[data-defense-type='${defenseType}'][data-action='rollDefense']`)
                defenseElement?.dispatchEvent(new MouseEvent("click", {bubbles: true}));

                console.log(defenseType, defenseElement?.outerHTML);
                expect(defenseStub.callCount).to.equal(1);
                expect(defenseStub.lastCall.args[0]).to.equal(defenseType)
            });
        });
    });

    describe( "Tick Bar Hud", () => {

    Object.entries(foundryUISelectors).forEach(([key, value]) => {
        it(`should contain a valid selector for ${key}`, () => {
           expect(document.querySelector(value)).to.be.instanceOf(HTMLElement);
        })
    })

    });

}

function getDataSets(nodeList: NodeListOf<HTMLElement>): Record<string, string | undefined>[] {
    const dataSets: Record<string, string | undefined>[] = [];
    nodeList.forEach((node) => {
        dataSets.push(node.dataset)
    });
    return dataSets;
}

/**
 * Overcome the annoying update method by just waiting longer
 * @param actor
 */
async function renderActonBarForActor(actor: SplittermondActor) {
    return new Promise<void>(resolve => {
        setTimeout(async () => {
            game.splittermond.tokenActionBar._currentActor = actor;
            await game.splittermond.tokenActionBar.render(true);
            resolve();
        }, 150);
    });
}
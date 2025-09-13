import {passesEventually, simplePropertyResolver} from "../util";
import {QuenchBatchContext} from "@ethaks/fvtt-quench";
import type TokenActionBar from "../../module/apps/token-action-bar/token-action-bar";
import type SplittermondActor from "../../module/actor/actor";
import {actorCreator} from "module/data/EntityCreator";
import sinon, {type SinonSandbox} from "sinon";
import {splittermond} from "module/config";
import {CharacterDataModel} from "module/actor/dataModel/CharacterDataModel";
import {foundryUISelectors} from "module/apps/tick-bar-hud/tickBarResizing";
import SplittermondCombat from "../../module/combat/combat";
import type {FoundryCombatant} from "module/api/foundryTypes";
import TickBarHud from "../../module/apps/tick-bar-hud/tick-bar-hud";
import {foundryApi} from "module/api/foundryApi";
import {FoundryDragDrop} from "module/api/Application";

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
                system: {skill: "lightmagic", focusCost: "3V4", castDuration: {value: 1, unit: "T"}},
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
                    skill: null as string | null,
                    attribute1: null as string | null,
                    attribute2: null as string | null,
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

            await renderActionBarForActor(actor);
            //prepare the spell
            tokenActionBar.element.querySelector("[data-action='prepareSpell']")?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
            await passesEventually(() => expect(actor.getFlag("splittermond", "preparedSpell")).to.equal(spell.id));
            await renderActionBarForActor(actor);
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
            await renderActionBarForActor(actor);

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
                await renderActionBarForActor(actor);

                const allWeaponDataSets = getDataSets(tokenActionBar.element.querySelectorAll("[data-action='rollAttack']"))
                expect(allWeaponDataSets.map(d => d.attackId)).to.contain(weapon.id)
                expect(allWeaponDataSets.find(d => d.attackId == weapon.id)?.prepared).to.equal(prepared ? "true" : "false");
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
            await renderActionBarForActor(actor);

            const allWeaponDataSets = getDataSets(tokenActionBar.element.querySelectorAll("[data-action='rollAttack']"))
            expect(allWeaponDataSets.map(d => d.attackId)).not.to.contain(weapon.id);
        });

        ["defense", "bodyresist", "mindresist"].forEach((defenseType) => {
            it(`should trigger defense dialog for ${defenseType}`, async () => {
                const actor = await createActor();
                const defenseStub = sandbox.stub(actor, "activeDefenseDialog").resolves();
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
                await renderActionBarForActor(actor);

                const defenseElement = tokenActionBar.element.querySelector(`[data-defense-type='${defenseType}'][data-action='rollDefense']`)
                defenseElement?.dispatchEvent(new MouseEvent("click", {bubbles: true}));

                console.log(defenseType, defenseElement?.outerHTML);
                expect(defenseStub.callCount).to.equal(1);
                expect(defenseStub.lastCall.args[0]).to.equal(defenseType)
            });
        });
    });

    describe("Tick Bar Hud", () => {
        let combats: SplittermondCombat[] = []
        let actors: SplittermondActor[] = []
        let tokens: TokenDocument[] = []
        let sandbox: SinonSandbox;

        beforeEach(() => sandbox = sinon.createSandbox())

        afterEach(() => {
            Combat.deleteDocuments(combats.map(c => c.id));
            Actor.deleteDocuments(actors.map(a => a.id));
            tokens.forEach(t => t.actor?.sheet.close());
            foundryApi.currentScene!.deleteEmbeddedDocuments("Token", tokens.map(t => t.id));
            sandbox.restore();
            combats = [];
            actors = [];
            tokens = [];
        });

        async function createActiveCombat() {
            const combat = await Combat.create({}) as SplittermondCombat;
            combats.push(combat);
            await combat.update({active: true});
            await combat.startCombat()
            return combat;
        }

        async function createCombatant(name: string, combat: SplittermondCombat) {
            const actor = await actorCreator.createCharacter({type: "character", name, system: {}});
            const tokenDocument = (await foundryApi.currentScene!.createEmbeddedDocuments("Token", [{
                type: "base",
                actorId: actor.id,
                x: (foundryApi.currentScene as any)._viewPosition.x,
                y: (foundryApi.currentScene as any)._viewPosition.y,
            }]))[0] as TokenDocument;
            actors.push(actor);
            tokens.push(tokenDocument);
            const combatants = await combat.createEmbeddedDocuments("Combatant", [{
                type: "base",
                actorId: actor.id,
                sceneId: foundryApi.currentScene!.id,
                tokenId: tokenDocument.id,
                defeated: false,
                group: null
            }]);
            const combatant = combatants[0] as FoundryCombatant;
            return {combatant, actor, token: tokenDocument};
        }

        function getCombatantItem(combatantId: string) {
            const combatantItem = document.querySelector(`.tick-bar-hud-combatant-list-item[data-combatant-id="${combatantId}"]`) as HTMLElement;
            expect(combatantItem, `Combatant item ${combatantItem} was found`).to.not.be.null;
            return combatantItem;
        }


        Object.entries(foundryUISelectors).forEach(([key, value]) => {
            it(`should contain a valid selector for ${key}`, () => {
                expect(document.querySelector(value)).to.be.instanceOf(HTMLElement);
            })
        });

        it("should have initialized the tick bar hud", () => {
            expect(game.splittermond.tickBarHud).to.be.instanceOf(TickBarHud);
            expect((game.splittermond.tickBarHud as TickBarHud).element.style.maxWidth).not.to.be.undefined;
        });

        it("should create a combat with combatants", async () => {
            const combat = await createActiveCombat();
            const {combatant, actor, token} = await createCombatant("A", combat);

            expect(combat.combatants.contents).to.have.length(1);
            expect(combatant.combat).to.deep.equal(combat);
            expect(combatant.actor, "comatant actor is actor").to.deep.equal(actor);
            expect(combatant.token, "combatant token is token").to.deep.equal(token);
            expect(combatant.actor.token, "actor token is token").to.deep.equal(token);
            expect((game.splittermond.tickBarHud as TickBarHud).viewed).to.equal(combat);
        });

        describe("_onRender", () => {
            it("should handle double-click to open character sheet", async () => {
                const combat = await createActiveCombat();
                const {combatant, token} = await createCombatant("Test Fighter", combat);
                await combat.setInitiative(combatant.id, 10);

                await (game.splittermond.tickBarHud as TickBarHud).render(false);

                const combatantItem = getCombatantItem(combatant.id);

                // Action: Trigger two clicks within 250ms to simulate double-click
                combatantItem.dispatchEvent(new MouseEvent("click", {bubbles: true}));
                combatantItem.dispatchEvent(new MouseEvent("click", {bubbles: true}));

                await passesEventually(() => expect(token.actor.sheet.rendered, "Actor sheet was rendered").to.be.true, 500);
            });

            it("should handle single-click to control token", async () => {
                // Setup: Create combatant item with token
                const combat = await createActiveCombat();
                const {combatant, token} = await createCombatant("Test Fighter", combat);
                await combat.setInitiative(combatant.id, 10);

                await (game.splittermond.tickBarHud as TickBarHud).render(false);

                const combatantItem = getCombatantItem(combatant.id);

                // Spy on the token control and canvas pan methods
                const controlSpy = sandbox.spy(token.object, 'control');
                const animatePanSpy = sandbox.spy(foundryApi.canvas, 'animatePan');

                await new Promise(resolve => setTimeout(resolve, 300));//Guard against a random click event from elsewhere
                combatantItem.dispatchEvent(new MouseEvent("click", {bubbles: true}));

                expect(controlSpy.calledOnce, "Token control was called").to.be.true;
                expect(controlSpy.calledWith({releaseOthers: true}), "Token control called with correct parameters").to.be.true;
                expect(animatePanSpy.calledOnce, "Canvas animate pan was called").to.be.true;
                expect(animatePanSpy.calledWith({
                    x: token.x,
                    y: token.y
                }), "Canvas pan called with token coordinates").to.be.true;
            });

            it("should hide previous tick button when on current tick", async () => {
                // Setup: Set currentTick equal to viewedTick
                const combat = await createActiveCombat();
                const {combatant} = await createCombatant("Test Fighter", combat);
                await combat.setInitiative(combatant.id, 10);

                const tickBarHud = game.splittermond.tickBarHud as TickBarHud;

                tickBarHud.currentTick = 10;
                tickBarHud.viewedTick = 10;

                await tickBarHud.render(false);

                const previousTickButton = tickBarHud.element.querySelector('.tick-bar-hud-nav-btn[data-action="previous-ticks"]') as HTMLElement;
                expect(previousTickButton).to.not.be.null;
                expect(previousTickButton.style.width).to.equal("0px");
                expect(previousTickButton.style.marginLeft).to.equal("-10px");
                expect(previousTickButton.style.opacity).to.equal("0");
            });
        });

        describe('drag and drop functionality', () => {
            it("should create drag drop handlers with correct configuration", async () => {
                const combat = await createActiveCombat();
                const {combatant} = await createCombatant("Test Fighter", combat);
                await combat.setInitiative(combatant.id, 10);

                const tickBarHud = game.splittermond.tickBarHud as TickBarHud;

                await tickBarHud.render(false);

                expect(tickBarHud.dragDrop).to.be.an('array');
                expect(tickBarHud.dragDrop).to.have.length(1);
                expect(tickBarHud.dragDrop[0]).to.be.instanceOf(FoundryDragDrop);
            });

            it("should set correct permissions for drag drop", async () => {
                const combat = await createActiveCombat();
                const {combatant} = await createCombatant("Test Fighter", combat);
                await combat.setInitiative(combatant.id, 10);

                const tickBarHud = game.splittermond.tickBarHud as TickBarHud;
                await tickBarHud.render(false);

                const dragDropHandler = tickBarHud.dragDrop[0];

                expect(dragDropHandler.permissions?.dragstart("")).to.be.true;
                expect(dragDropHandler.permissions?.drop("")).to.be.true;
            });
        });

        it("should show previous tick button when not on current tick", () => {
            it("should show previous tick button when not on current tick", async () => {
                // Setup: Create combat and set viewedTick different from currentTick
                const combat = await createActiveCombat();
                const {combatant} = await createCombatant("Test Fighter", combat);
                await combat.setInitiative(combatant.id, 10);

                const tickBarHud = game.splittermond.tickBarHud as TickBarHud;
                tickBarHud.currentTick = 10;
                tickBarHud.viewedTick = 8; // Different from current tick

                await tickBarHud.render(false);

                // Action: Call moveScrollbar (assuming it's called during render or explicitly)
                const scrollElement = tickBarHud.element.querySelector('.tick-bar-hud-scroll');
                if (scrollElement) {
                    (tickBarHud as any).moveScrollbar(100); // Some offset value
                }

                // Result: Previous tick button should be visible
                const previousTickButton = tickBarHud.element.querySelector('.tick-bar-hud-nav-btn[data-action="previous-ticks"]') as HTMLElement;
                expect(previousTickButton).to.not.be.null;
                expect(previousTickButton.style.width).to.not.equal("0px");
                expect(previousTickButton.style.marginLeft).to.not.equal("-10px");
                expect(previousTickButton.style.opacity).to.not.equal("0");
            });
        });
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
async function renderActionBarForActor(actor: SplittermondActor) {
    return new Promise<void>(resolve => {
        setTimeout(async () => {
            game.splittermond.tokenActionBar._currentActor = actor;
            await game.splittermond.tokenActionBar.render(true);
            resolve();
        }, 200);
    });
}
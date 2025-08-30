import {afterEach, describe, it} from "mocha";
import {expect} from "chai";
import sinon from "sinon";
import {foundryApi} from "../../../../../module/api/foundryApi";
import SplittermondCombat from "../../../../../module/combat/combat";
import TickBarHud from "../../../../../module/apps/tick-bar-hud/tick-bar-hud";
import type {FoundryCombatant} from "../../../../../module/api/foundryTypes";
import {JSDOM} from "jsdom";
import {createHtml} from "../../../../handlebarHarness";
import {addNewCombatant, createCombat, type MockedCombatant} from "./tickBarHudTestHelpers";

describe('TickBarHud', () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "format").callsFake((str) => str)
        sandbox.stub(foundryApi, "localize").callsFake((str) => str)
    });
    afterEach(() => sandbox.restore());

    describe('combats getter', () => {
        it("should return combats for current scene", () => {
            const sampleCombat = sinon.createStubInstance(SplittermondCombat)
            //@ts-expect-error scene is readonly
            sampleCombat.scene = {id: "sceneId"}
            sandbox.stub(foundryApi, "combats").get(() => [sampleCombat])
            sandbox.stub(foundryApi, "currentScene").get(() => sampleCombat.scene);

            const combats = new TickBarHud().combats;

            expect(combats).to.deep.equal([sampleCombat]);
        });

        it("should include combats with null scene", () => {
            const combatWithNullScene = sinon.createStubInstance(SplittermondCombat);
            //@ts-expect-error scene is readonly
            combatWithNullScene.scene = null;
            const currentScene = {id: "sceneId"};
            sandbox.stub(foundryApi, "combats").get(() => [combatWithNullScene]);
            sandbox.stub(foundryApi, "currentScene").get(() => currentScene);

            const combats = new TickBarHud().combats;

            expect(combats).to.deep.equal([combatWithNullScene]);
        });

        it("should return empty array when no combats exist", () => {
            sandbox.stub(foundryApi, "combats").get(() => []);
            sandbox.stub(foundryApi, "currentScene").get(() => ({id: "sceneId"}));

            const combats = new TickBarHud().combats;

            expect(combats).to.be.empty;
        });
    });

    describe('_prepareContext', () => {
        const currentScene = {id: "sceneId"};
        beforeEach(() => sandbox.stub(foundryApi, "currentScene").get(() => (currentScene)));
        it("should prepare basic context with empty ticks when no combat", async () => {
            sandbox.stub(foundryApi, "combats").get(() => [])


            const context = await new TickBarHud()._prepareContext({parts: []});

            expect(context.ticks).to.be.empty;
            expect(context.wait).to.be.empty;
            expect(context.keepReady).to.be.empty;
        });

        it("should reset viewedTick when combat changes", async () => {
            const oldCombat = createCombat(sandbox, {isActive: true, started: true});
            const newCombat = createCombat(sandbox, {isActive: true, started: true});
            const tickBarHud = new TickBarHud();
            tickBarHud.viewed = oldCombat;
            tickBarHud.viewedTick = 10;
            sandbox.stub(foundryApi, "combats").get(() => [newCombat]);

            await tickBarHud._prepareContext({parts: []});

            expect(tickBarHud.viewedTick).to.equal(0);
        });

        it("should calculate currentTick from active combat turn", async () => {
            // Setup: Mock active combat with specific turn initiative
            const combat = createCombat(sandbox, {isActive: true, started: true, turn: 0});
            const combatant = addNewCombatant(sandbox, combat, {initiative: 15.7});
            addToCombatTurns(combat, combatant);
            sandbox.stub(foundryApi, "combats").get(() => [combat]);

            // Action: Call _prepareContext
            const tickBarHud = new TickBarHud();
            await tickBarHud._prepareContext({parts: []});

            // Result: currentTick should match rounded initiative value
            expect(tickBarHud.currentTick).to.equal(16);
        });

        it("should handle NaN initiative gracefully", async () => {
            // Setup: Mock combat with NaN initiative
            const combat = createCombat(sandbox, {isActive: true, started: true, turn: 0});
            const combatant = addNewCombatant(sandbox, combat, {initiative: NaN});
            addToCombatTurns(combat, combatant);
            sandbox.stub(foundryApi, "combats").get(() => [combat]);

            // Action: Call _prepareContext
            const tickBarHud = new TickBarHud();
            await tickBarHud._prepareContext({parts: []});

            // Result: currentTick should default to 0
            expect(tickBarHud.currentTick).to.equal(0);
        });

        it("should update viewedTick to currentTick when behind", async () => {
            // Setup: Set viewedTick behind currentTick
            const combat = createCombat(sandbox, {isActive: true, started: true, turn: 0});
            const combatant = addNewCombatant(sandbox, combat, {initiative: 20});
            addToCombatTurns(combat, combatant);
            sandbox.stub(foundryApi, "combats").get(() => [combat]);
            const tickBarHud = new TickBarHud();
            tickBarHud.viewedTick = 10;

            // Action: Call _prepareContext
            await tickBarHud._prepareContext({parts: []});

            // Result: viewedTick should be updated to currentTick
            expect(tickBarHud.viewedTick).to.equal(20);
        });

        it("should calculate min and max tick values correctly", async () => {
            // Setup: Mock combat with various initiative values and status effects
            const combat = createCombat(sandbox, {isActive: true, started: true});
            const combatant1 = addNewCombatant(sandbox, combat, {initiative: 10, visible: true});
            const combatant2 = addNewCombatant(sandbox, combat, {initiative: 25, visible: true});
            const combatant3 = addNewCombatant(sandbox, combat, {initiative: 5, visible: true});
            addToCombatTurns(combat, combatant1, combatant2, combatant3);
            combat.combatants.contents.forEach(c => {
                c.actor.getVirtualStatusTokens = () => [];
            });
            sandbox.stub(foundryApi, "combats").get(() => [combat]);

            // Action: Call _prepareContext
            const tickBarHud = new TickBarHud();
            await tickBarHud._prepareContext({parts: []});

            // Result: minTick and maxTick should be calculated from initiatives and status effects
            expect(tickBarHud.minTick).to.equal(5);
            expect(tickBarHud.maxTick).to.be.at.least(50); // At least 50, could be more due to +25 buffer
        });

        it("should populate ticks with combatants", async () => {
            // Setup: Mock combat with combatants having various initiatives
            const combat = createCombat(sandbox, {isActive: true, started: true});
            const combatant1 = addNewCombatant(sandbox, combat, {initiative: 10, visible: true, name: "Fighter"});
            const combatant2 = addNewCombatant(sandbox, combat, {initiative: 15, visible: true, name: "Wizard"});
            addToCombatTurns(combat, combatant1, combatant2);
            combat.combatants.contents.forEach(c => {
                c.actor.getVirtualStatusTokens = () => [];
            });
            sandbox.stub(foundryApi, "combats").get(() => [combat]);

            // Action: Call _prepareContext
            const context = await new TickBarHud()._prepareContext({parts: []});

            // Result: Each tick should contain appropriate combatants
            const tick10 = context.ticks.find(t => t.tickNumber === 10);
            const tick15 = context.ticks.find(t => t.tickNumber === 15);
            expect(tick10?.combatants).to.have.length(1);
            expect(tick10?.combatants[0].name).to.equal("Fighter");
            expect(tick15?.combatants).to.have.length(1);
            expect(tick15?.combatants[0].name).to.equal("Wizard");
        });

        it("should handle wait list combatants (initiative 10000)", async () => {
            // Setup: Mock combat with combatant having initiative 10000
            const combat = createCombat(sandbox, {isActive: true, started: true});
            const waitCombatant = addNewCombatant(sandbox, combat, {initiative: 10000, name: "Waiting Fighter"});
            addToCombatTurns(combat, waitCombatant);
            combat.combatants.contents.forEach(c => {
                c.actor.getVirtualStatusTokens = () => [];
            });
            sandbox.stub(foundryApi, "combats").get(() => [combat]);

            // Action: Call _prepareContext
            const context = await new TickBarHud()._prepareContext({parts: []});

            // Result: Combatant should be added to wait array
            expect(context.wait).to.have.length(1);
            expect(context.wait[0].name).to.equal("Waiting Fighter");
        });

        it("should handle keep ready combatants (initiative 20000)", async () => {
            const combat = createCombat(sandbox, {isActive: true, started: true});
            const readyCombatant = addNewCombatant(sandbox, combat, {initiative: 20000, name: "Ready Fighter"});
            addToCombatTurns(combat, readyCombatant);
            combat.combatants.contents.forEach(c => {
                c.actor.getVirtualStatusTokens = () => [];
            });
            sandbox.stub(foundryApi, "combats").get(() => [combat]);

            const context = await new TickBarHud()._prepareContext({parts: []});

            expect(context.keepReady).to.have.length(1);
            expect(context.keepReady[0].name).to.equal("Ready Fighter");
        });


        it("should exclude defeated and invisible combatants", async () => {
            const sampleCombat = createCombat(sandbox, {isActive: true, started: true});
            const defeatedCombatant = addNewCombatant(sandbox, sampleCombat, {isDefeated: true});
            const invisibleCombatant = addNewCombatant(sandbox, sampleCombat, {visible: false});
            addToCombatTurns(sampleCombat, defeatedCombatant, invisibleCombatant);

            sandbox.stub(foundryApi, "combats").get(() => [sampleCombat])

            const context = await new TickBarHud()._prepareContext({parts: []});

            expect(context.ticks.flatMap(t => t.combatants)).to.be.empty;
        });

        it("should populate status effects on appropriate ticks", async () => {
            // Setup: Mock combatants with virtual status tokens
            const combat = createCombat(sandbox, {isActive: true, started: true});
            const combatant = addNewCombatant(sandbox, combat, {initiative: 10, visible: true, name: "Fighter"});
            addToCombatTurns(combat, combatant);
            combatant.actor.getVirtualStatusTokens.returns([{
                statusId: "x64isg0",
                img: "status-icon.png",
                name: "Poison",
                level: 1,
                description: "Poisoned",
                interval: 5,
                times: 2,
                startTick: 12
            }]);
            sandbox.stub(foundryApi, "combats").get(() => [combat]);

            const context = await new TickBarHud()._prepareContext({parts: []});

            const tick12 = context.ticks.find(t => t.tickNumber === 12);
            const tick17 = context.ticks.find(t => t.tickNumber === 17); //start plus interval
            expect(tick12?.statusEffects).to.have.length(1);
            expect(tick17?.statusEffects).to.have.length(1);
            expect(tick12?.statusEffects[0].description).to.equal("Poisoned");
        });

        it("should create chat messages for activated status effects", async () => {
            // Setup: Mock status effects that should be activated between ticks
            const combat = createCombat(sandbox, {isActive: true, started: true, turn: 0});
            const combatant = addNewCombatant(sandbox, combat, {initiative: 15, isOwner: true});
            addToCombatTurns(combat, combatant);
            combatant.actor.getVirtualStatusTokens.returns([{
                statusId: "x64isg3",
                img: "status-icon.png",
                name: "Poison",
                level: 1,
                description: "Poisoned",
                interval: 1,
                times: 1,
                startTick: 10
            }]);
            sandbox.stub(foundryApi, "combats").get(() => [combat]);
            sandbox.stub(foundryApi, "currentUser").get(() => ({id: "userId"}));
            sandbox.stub(foundryApi, "chatMessageTypes").get(() => ({OTHER: 0}));
            sandbox.stub(foundryApi, "getSpeaker").returns({scene: "", actor: "", token: "", alias: ""});
            sandbox.stub(foundryApi, "renderer").get(() => () => Promise.resolve(""));
            CONFIG.sounds = {notification: ""}

            const createChatMessageStub = sandbox.stub(foundryApi, "createChatMessage");
            const tickBarHud = new TickBarHud();
            tickBarHud.lastStatusTick = 5; // Previous tick was 5
            tickBarHud.currentTick = 15;

            await tickBarHud._prepareContext({parts: []});

            expect(createChatMessageStub.called).to.be.true;
        });
    });

    describe('_onRender', () => {
        async function tickBarWith(modifier: (tickBar: TickBarHud) => void = () => {
        }) {
            const underTest = new TickBarHud();
            // @ts-expect-error options are readonly
            underTest.options = TickBarHud.DEFAULT_OPTIONS;
            modifier(underTest);

            const context = await underTest._prepareContext({parts: []});
            const html = createHtml("./templates/apps/tick-bar-hud.hbs", context);
            const dom = new JSDOM(html);
            // @ts-expect-error element is readonly
            underTest.element = dom.window.document.body;

            return {underTest, dom};
        }

        function stubAnimation(dom: JSDOM) {
            const animateStub = sandbox.stub();
            dom.window.Element.prototype.animate = animateStub;
            return animateStub;
        }

        it("should set z-index for combatant list children", async () => {
            // Setup: Create mock HTML with combatant lists having multiple children
            const combat = createCombat(sandbox, {isActive: true, started: true});
            const combatant1 = addNewCombatant(sandbox, combat, {initiative: 10, visible: true, name: "Fighter"});
            const combatant2 = addNewCombatant(sandbox, combat, {initiative: 10, visible: true, name: "Wizard"});
            const combatant3 = addNewCombatant(sandbox, combat, {initiative: 10, visible: true, name: "Rogue"});

            addToCombatTurns(combat, combatant1, combatant2, combatant3);
            combat.combatants.contents.forEach(c => {
                c.actor.getVirtualStatusTokens = () => [];
            });
            sandbox.stub(foundryApi, "combats").get(() => [combat]);
            sandbox.stub(foundryApi, "currentScene").get(() => ({id: "sceneId"}));

            const {underTest} = await tickBarWith();

            await underTest._onRender({}, {});

            // Result: Each child should have decreasing z-index values
            const combatantList = underTest.element.querySelector('.tick-bar-hud-tick[data-tick="10"] .tick-bar-hud-combatant-list');
            expect(combatantList).to.not.be.null;
            expect(combatantList!.children).to.have.length.greaterThan(0);
            Array.from(combatantList!.children).forEach((child, index) => {
                    const expectedZIndex = combatantList!.children.length - 1 - index;
                    expect((child as HTMLElement).style.zIndex).to.equal(expectedZIndex.toString());
                });
            });

        it("should add hover animations to combatant lists", async () => {
            const combat = createCombat(sandbox, {isActive: true, started: true});
            const combatant1 = addNewCombatant(sandbox, combat, {initiative: 10, visible: true, name: "Fighter"});
            const combatant2 = addNewCombatant(sandbox, combat, {initiative: 10, visible: true, name: "Wizard"});
            addToCombatTurns(combat, combatant1, combatant2);
            combat.combatants.contents.forEach(c => {
                c.actor.getVirtualStatusTokens = () => [];
            });
            sandbox.stub(foundryApi, "combats").get(() => [combat]);
            sandbox.stub(foundryApi, "currentScene").get(() => ({id: "sceneId"}));

            const {underTest, dom} = await tickBarWith();
            const animateStub = stubAnimation(dom);

            await underTest._onRender({}, {});

            const combatantList = underTest.element.querySelector('.tick-bar-hud-combatant-list') as HTMLElement;
            if (!combatantList) {
                throw new Error("No combatant list found in rendered template");
            }

            combatantList.dispatchEvent(new dom.window.Event('mouseenter'));
            combatantList.dispatchEvent(new dom.window.Event('mouseleave'));

            //With two combatants, we need to animate one combatant on mouseover, as the first stays where it is.
            //Therefore, we expect two animation calls one for mouseenter and one for mouseleave
            expect(animateStub.callCount).to.equal(2)
            expect(animateStub.firstCall.firstArg).to.deep.equal([
                {marginTop: '0px'},
                {marginTop: '5px'}
            ]);
            expect(animateStub.lastCall.firstArg).to.deep.equal([
                {marginTop: '5px'},
                {marginTop: '-38px'}
            ]);
        });

        it("should add click handler to forward navigation button", async () => {
            const combat = createCombat(sandbox, {isActive: true, started: true});
            const combatant1 = addNewCombatant(sandbox, combat, {initiative: 10, visible: true, name: "Fighter"});
            const combatant2 = addNewCombatant(sandbox, combat, {initiative: 15, visible: true, name: "Wizard"});
            addToCombatTurns(combat, combatant1, combatant2);
            combat.combatants.contents.forEach(c => {
                c.actor.getVirtualStatusTokens = () => [];
            });
            sandbox.stub(foundryApi, "combats").get(() => [combat]);
            sandbox.stub(foundryApi, "currentScene").get(() => ({id: "sceneId"}));

            const {underTest, dom} = await tickBarWith((tickBar) => {
                tickBar.currentTick = 10;
                tickBar.viewedTick = 10;
                tickBar.maxTick = 20;
            });
            const animateStub = stubAnimation(dom);

            await underTest._onRender({}, {});

            // Mock the offsetWidth to simulate a realistic viewport
            const ticksElement = underTest.element.querySelector('.tick-bar-hud-ticks') as HTMLElement;
            Object.defineProperty(ticksElement, 'offsetWidth', {
                value: 360, // Simulate 5 ticks visible (5 * 72px = 360px)
                writable: true
            });

            const nextButton = underTest.element.querySelector('.tick-bar-hud-nav-btn[data-action="next-ticks"]') as HTMLElement;
            expect(nextButton).to.not.be.null;

            nextButton.dispatchEvent(new dom.window.Event('click'));

            expect(underTest.viewedTick).to.be.greaterThan(10);
            const scrollAnimateCalls = animateStub.getCalls().filter(call => call?.thisValue?.classList.contains('tick-bar-hud-ticks-scroll'));
            expect(scrollAnimateCalls.length).to.be.greaterThan(0);
        });

        it("should add click handler to backward navigation button", async () => {
            // Setup: Create TickBarHud with combatants and set viewedTick ahead of currentTick
            const combat = createCombat(sandbox, {isActive: true, started: true});
            const combatant1 = addNewCombatant(sandbox, combat, {initiative: 10, visible: true, name: "Fighter"});
            const combatant2 = addNewCombatant(sandbox, combat, {initiative: 15, visible: true, name: "Wizard"});
            addToCombatTurns(combat, combatant1, combatant2);
            combat.combatants.contents.forEach(c => {
                c.actor.getVirtualStatusTokens = () => [];
            });
            sandbox.stub(foundryApi, "combats").get(() => [combat]);
            sandbox.stub(foundryApi, "currentScene").get(() => ({id: "sceneId"}));

            const {underTest, dom} = await tickBarWith((tickBar) => {
                tickBar.currentTick = 10;
                tickBar.viewedTick = 15; // Set ahead so we can go backward
                tickBar.maxTick = 20;
            });
            const animateStub = stubAnimation(dom);

            await underTest._onRender({}, {});

            const prevButton = underTest.element.querySelector('.tick-bar-hud-nav-btn[data-action="previous-ticks"]') as HTMLElement;
            expect(prevButton).to.not.be.null;

            prevButton.dispatchEvent(new dom.window.Event('click'));

            expect(underTest.viewedTick).to.be.lessThan(15);
            const scrollAnimateCalls = animateStub.getCalls().filter(call => call?.thisValue?.classList.contains('tick-bar-hud-ticks-scroll'));
            expect(scrollAnimateCalls).to.not.be.empty;
        });

        it("should prevent viewedTick from going below currentTick", async () => {
            // Setup: Create TickBarHud with combatants and set viewedTick to attempt navigation below currentTick
            const combat = createCombat(sandbox, {isActive: true, started: true});
            const combatant1 = addNewCombatant(sandbox, combat, {initiative: 10, visible: true, name: "Fighter"});
            const combatant2 = addNewCombatant(sandbox, combat, {initiative: 15, visible: true, name: "Wizard"});
            addToCombatTurns(combat, combatant1, combatant2);
            combat.combatants.contents.forEach(c => {
                c.actor.getVirtualStatusTokens = () => [];
            });
            sandbox.stub(foundryApi, "combats").get(() => [combat]);
            sandbox.stub(foundryApi, "currentScene").get(() => ({id: "sceneId"}));

            const {underTest, dom} = await tickBarWith((tickBar) => {
                tickBar.currentTick = 10;
                tickBar.viewedTick = 12; // Set slightly ahead of currentTick
                tickBar.maxTick = 20;
            });
            const animateStub = stubAnimation(dom);

            await underTest._onRender({}, {});

            // Mock the offsetWidth to simulate a realistic viewport that would cause a step large enough to go below currentTick
            const ticksElement = underTest.element.querySelector('.tick-bar-hud-ticks') as HTMLElement;
            Object.defineProperty(ticksElement, 'offsetWidth', {
                value: 720, // Simulate 10 ticks visible (10 * 72px = 720px) - this will create step of 5
                writable: true
            });

            const prevButton = underTest.element.querySelector('.tick-bar-hud-nav-btn[data-action="previous-ticks"]') as HTMLElement;
            expect(prevButton).to.not.be.null;

            // Action: Trigger previous-ticks navigation that would normally go below currentTick
            // With step=5 (Math.ceil(10/2)), viewedTick would go from 12 to 7, which is below currentTick=10
            prevButton.dispatchEvent(new dom.window.Event('click'));

            // Result: viewedTick should be clamped to currentTick instead of going below it
            expect(underTest.viewedTick).to.equal(10); // Should be clamped to currentTick
            expect(underTest.viewedTick).to.be.at.least(underTest.currentTick); // Ensure it's not below currentTick

            // Verify that moveScrollbar was called (indicating the navigation logic was executed)
            const scrollAnimateCalls = animateStub.getCalls().filter(call => call?.thisValue?.classList.contains('tick-bar-hud-ticks-scroll'));
            expect(scrollAnimateCalls).to.not.be.empty;
        });

        it("should add hover handlers to combatant items", async () => {
            // Setup: Create combat with combatants and mock token objects
            const combat = createCombat(sandbox, {isActive: true, started: true});
            const combatant1 = addNewCombatant(sandbox, combat, {initiative: 10, visible: true, name: "Fighter"});
            const combatant2 = addNewCombatant(sandbox, combat, {initiative: 15, visible: true, name: "Wizard"});

            // Mock token objects with hover methods
            const mockToken1 = {
                _controlled: false,
                _onHoverIn: sandbox.stub(),
                _onHoverOut: sandbox.stub()
            };
            const mockToken2 = {
                _controlled: false,
                _onHoverIn: sandbox.stub(),
                _onHoverOut: sandbox.stub()
            };

            //@ts-expect-error readonly I don't care
            combatant1.token.object = mockToken1;
            //@ts-expect-error readonly I don't care
            combatant2.token.object = mockToken2;

            addToCombatTurns(combat, combatant1, combatant2);

            sandbox.stub(foundryApi, "combats").get(() => [combat]);
            sandbox.stub(foundryApi, "currentScene").get(() => ({id: "sceneId"}));

            const {underTest, dom} = await tickBarWith();

            await underTest._onRender({}, {});

            const combatantItems = underTest.element.querySelectorAll('.tick-bar-hud-combatant-list-item');
            expect(combatantItems).to.have.length(2);

            const firstCombatantItem = combatantItems[0] as HTMLElement;
            const secondCombatantItem = combatantItems[1] as HTMLElement;

            firstCombatantItem.dispatchEvent(new dom.window.Event('mouseenter'));
            firstCombatantItem.dispatchEvent(new dom.window.Event('mouseleave'));

            secondCombatantItem.dispatchEvent(new dom.window.Event('mouseenter'));
            secondCombatantItem.dispatchEvent(new dom.window.Event('mouseleave'));

            // Result: Token hover methods should be called for uncontrolled tokens
            expect(mockToken1._onHoverIn.calledOnce).to.be.true;
            expect(mockToken1._onHoverOut.calledOnce).to.be.true;
            expect(mockToken2._onHoverIn.calledOnce).to.be.true;
            expect(mockToken2._onHoverOut.calledOnce).to.be.true;
        });

        it("should add click handlers to combatant items", async () => {
            // Setup: Create combat with combatants and mock necessary foundry methods
            const combat = createCombat(sandbox, {isActive: true, started: true});
            const combatant1 = addNewCombatant(sandbox, combat, {initiative: 10, visible: true, name: "Fighter"});
            const combatant2 = addNewCombatant(sandbox, combat, {initiative: 15, visible: true, name: "Wizard"});

            // Mock token objects and actor sheets
            const mockToken1 = {
                object: {
                    control: sandbox.stub(),
                },
                x: 100,
                y: 150,
                actor: {
                    sheet: {
                        render: sandbox.stub()
                    }
                }
            };
            const mockToken2 = {
                object: {
                    control: sandbox.stub(),
                },
                x: 200,
                y: 250,
                actor: {
                    sheet: {
                        render: sandbox.stub()
                    }
                }
            };

            //@ts-expect-error readonly I don't care
            combatant1.token = mockToken1;
            //@ts-expect-error readonly I don't car
            combatant2.token = mockToken2;

            combatant1.actor.testUserPermission.returns(true);
            combatant2.actor.testUserPermission.returns(true);

            addToCombatTurns(combat, combatant1, combatant2);
            combat.combatants.contents.forEach(c => {
                c.actor.getVirtualStatusTokens = () => [];
            });

            // Mock foundry API methods
            sandbox.stub(foundryApi, "combats").get(() => [combat]);
            sandbox.stub(foundryApi, "currentScene").get(() => ({id: "sceneId"}));
            sandbox.stub(foundryApi, "currentUser").get(() => ({id: "userId"}));
            const panAnimationStub = sandbox.stub();
                sandbox.stub(foundryApi, "canvas").value({
                animatePan: panAnimationStub
            });

            const {underTest, dom} = await tickBarWith();

            await underTest._onRender({}, {});

            const combatantItems = underTest.element.querySelectorAll('.tick-bar-hud-combatant-list-item');
            expect(combatantItems).to.have.length(2);

            const firstCombatantItem = combatantItems[0] as HTMLElement;
            const secondCombatantItem = combatantItems[1] as HTMLElement;

            // Set dataset properties that the click handler looks for
            firstCombatantItem.dataset.combatantId = combatant1.id;
            secondCombatantItem.dataset.combatantId = combatant2.id;

            firstCombatantItem.dispatchEvent(new dom.window.Event('click'));
            await new Promise(resolve => setTimeout(resolve, 300));
            secondCombatantItem.dispatchEvent(new dom.window.Event('click'));

            // Result: Single clicks should control tokens and animate canvas
            expect(mockToken1.object.control.calledOnceWith({releaseOthers: true})).to.be.true;
            expect(mockToken2.object.control.calledOnceWith({releaseOthers: true})).to.be.true;
            expect(panAnimationStub.callCount).to.equal(2)
            expect(panAnimationStub.firstCall.args[0]).to.deep.equal({x: 100, y: 150});
            expect(panAnimationStub.secondCall.args[0]).to.deep.equal({x: 200, y: 250});
        });

    });
});

function addToCombatTurns(combat: SplittermondCombat, ...combatants: MockedCombatant[]){
        combat.turns.push(...combatants as unknown as FoundryCombatant[]);
}

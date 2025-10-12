import sinon, { type SinonStubbedInstance } from "sinon";
import SplittermondCombat from "module/combat/combat";
import { foundryApi } from "module/api/foundryApi";
import SplittermondActor from "module/actor/actor";
import { addTicks } from "module/combat/addTicks";
import { FoundryDialog } from "module/api/Application";

describe("addTicks", () => {
    const sandbox = sinon.createSandbox();
    let combat: SinonStubbedInstance<SplittermondCombat>;
    let actor: SplittermondActor;
    let combatant: any;

    beforeEach(() => {
        combat = sandbox.createStubInstance(SplittermondCombat);
        sandbox.stub(foundryApi, "combat").get(() => combat);
        actor = { name: "Test Actor" } as SplittermondActor;
        combatant = { id: "combatant-id", actor, initiative: 10 };
    });

    afterEach(() => {
        sandbox.restore();
    });

    [0, -5].forEach((ticks) => {
        it(`should not add ticks if ticksToAdd is 0 or less: [${ticks}]`, async () => {
            combat.combatants = { find: () => combatant } as any;
            await addTicks(actor, ticks, { askPlayer: false });
        });
    });

    it("should not add ticks if there is no active combat", async () => {
        sandbox.stub(foundryApi, "combat").get(() => undefined);
        await addTicks(actor, 5, { askPlayer: false });
        sinon.assert.notCalled(combat.setInitiative);
    });

    it("should not add ticks if the combatant is not found or initiative is null", async () => {
        combat.combatants = { find: () => undefined } as any;
        await addTicks(actor, 5, { askPlayer: false });
        sinon.assert.notCalled(combat.setInitiative);
        combat.combatants = { find: () => ({ id: "id2", actor, initiative: null }) } as any;
        await addTicks(actor, 5, { askPlayer: false });
        sinon.assert.notCalled(combat.setInitiative);
    });

    it("should add ticks to the combatant's initiative", async () => {
        combat.combatants = { find: () => combatant } as any;
        await addTicks(actor, 3, { askPlayer: false });
        sinon.assert.calledOnceWithExactly(combat.setInitiative, "combatant-id", 13);
    });

    it("should add rounded ticks if askPlayer is false", async () => {
        combat.combatants = { find: () => combatant } as any;
        await addTicks(actor, 2.7, { askPlayer: false });
        sinon.assert.calledOnceWithExactly(combat.setInitiative, "combatant-id", 13);
    });

    it("should ask the player for tick addition when askPlayer is true", async () => {
        combat.combatants = { find: () => combatant } as any;
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => key);
        sandbox.stub(FoundryDialog, "prompt").resolves(10);

        await addTicks(actor, 3, { askPlayer: true });
        sinon.assert.calledOnceWithExactly(combat.setInitiative, "combatant-id", 20);
    });
});

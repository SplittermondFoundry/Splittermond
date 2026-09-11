import "../../foundryMocks.js";
import sinon, { type SinonSandbox, type SinonStubbedInstance } from "sinon";
import { expect } from "chai";
import { PreparedAction } from "module/actor/PreparedAction";
import SplittermondActor from "module/actor/actor";
import type Attack from "module/actor/attack";
import type SplittermondSpellItem from "module/item/spell";
import { foundryApi } from "module/api/foundryApi";

describe("PreparedAction", () => {
    let sandbox: SinonSandbox;
    let actor: SinonStubbedInstance<SplittermondActor>;
    let attack: Attack;
    let spell: SplittermondSpellItem;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => key);

        attack = {
            id: "attack1",
            name: "Sword",
            weaponSpeedAsync: sandbox.stub().resolves(3),
        } as unknown as Attack;
        spell = {
            id: "spell1",
            name: "Fireball",
            castDuration: { inTicks: sandbox.stub().resolves(2) },
        } as unknown as SplittermondSpellItem;

        actor = sandbox.createStubInstance(SplittermondActor);
        Object.defineProperty(actor, "attacks", { value: [attack], enumerable: true });
        Object.defineProperty(actor, "spells", { value: [spell], enumerable: true });
        Object.defineProperty(actor, "system", {
            value: { preparedAction: { attack: null, spell: null } },
            enumerable: true,
            writable: true,
        });
    });

    afterEach(() => sandbox.restore());

    it("should add the attack's tick cost and persist the attack id", async () => {
        await new PreparedAction(actor, "attack").set("attack1");

        expect(actor.addTicks.calledWith(3, "splittermond.attack: Sword")).to.be.true;
        expect(actor.update.calledWith({ "system.preparedAction.attack": "attack1" })).to.be.true;
    });

    it("should add the spell's cast duration and persist the spell id", async () => {
        await new PreparedAction(actor, "spell").set("spell1");

        expect(actor.addTicks.calledWith(2, "splittermond.castDuration: Fireball")).to.be.true;
        expect(actor.update.calledWith({ "system.preparedAction.spell": "spell1" })).to.be.true;
    });

    it("should ignore unknown action ids", async () => {
        await new PreparedAction(actor, "attack").set("unknown");

        expect(actor.addTicks.called).to.be.false;
        expect(actor.update.called).to.be.false;
    });

    it("should clear the stored id on release", async () => {
        actor.system.preparedAction.attack = "attack1";

        await new PreparedAction(actor, "attack").release();

        expect(actor.update.calledWith({ "system.preparedAction.attack": null })).to.be.true;
    });

    it("should report an action as prepared only when its id matches", () => {
        actor.system.preparedAction.spell = "spell1";
        const preparedSpells = new PreparedAction(actor, "spell");

        expect(preparedSpells.isPrepared("spell1")).to.be.true;
        expect(preparedSpells.isPrepared("spell2")).to.be.false;
        expect(preparedSpells.preparedId).to.equal("spell1");
    });
});

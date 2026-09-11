import "../../../foundryMocks.js";
import sinon, { SinonSandbox, type SinonStub, type SinonStubbedInstance } from "sinon";
import { expect } from "chai";
import { JSDOM } from "jsdom";
import { createHtml } from "../../../../handlebarHarness";
import TokenActionBar from "../../../../../module/apps/token-action-bar/token-action-bar";
import SplittermondActor from "../../../../../module/actor/actor";
import Attack from "../../../../../module/actor/attack";
import { SplittermondApplication } from "module/data/SplittermondApplication";
import { splittermond } from "module/config";
import { PreparedAction } from "module/actor/PreparedAction";

describe("TokenActionBar", () => {
    let sandbox: SinonSandbox;
    let actorStub: SinonStubbedInstance<SplittermondActor>;
    let preparedSpells: SinonStubbedInstance<PreparedAction>;
    let preparedAttacks: SinonStubbedInstance<PreparedAction>;
    let dom: JSDOM;
    let bar: TokenActionBar;

    beforeEach(async () => {
        sandbox = sinon.createSandbox();

        // Minimal actor stub
        actorStub = sandbox.createStubInstance(SplittermondActor);
        sandbox.stub(actorStub, "id").get(() => "actor1");
        actorStub.name = "Test Actor";
        const sampleSkill = {
            acrobatics: { id: "acrobatics", label: "Acrobatics", value: 5, points: "1" },
        };
        const sampleItemCollection = { get: sandbox.stub() };
        const sampleSheet = { render: sandbox.stub() };
        const sampleDerivedValues = {
            defense: { value: 10 },
            bodyresist: { value: 8 },
            mindresist: { value: 6 },
        };
        Object.defineProperty(actorStub, "isToken", { value: false, enumerable: true });
        Object.defineProperty(actorStub, "skills", { value: sampleSkill, enumerable: true });
        Object.defineProperty(actorStub, "items", { value: sampleItemCollection, enumerable: true });
        Object.defineProperty(actorStub, "derivedValues", { value: sampleDerivedValues, enumerable: true });
        Object.defineProperty(actorStub, "sheet", { value: sampleSheet, enumerable: true });
        Object.defineProperty(actorStub, "attacks", { value: [], enumerable: true });
        preparedSpells = sandbox.createStubInstance(PreparedAction);
        sandbox.stub(preparedSpells, "preparedId").get(() => null);
        preparedAttacks = sandbox.createStubInstance(PreparedAction);
        sandbox.stub(preparedAttacks, "preparedId").get(() => null);
        Object.defineProperty(actorStub, "preparedSpells", { value: preparedSpells, enumerable: true });
        Object.defineProperty(actorStub, "preparedAttacks", { value: preparedAttacks, enumerable: true });
        actorStub.rollAttack.resolves(true);
        actorStub.rollSpell.resolves(true);
        actorStub.activeDefenseDialog = sandbox.stub();

        // Setup TokenActionBar
        bar = new TokenActionBar();
        // @ts-expect-error: set private for test
        bar._currentActor = actorStub;

        // Render handlebars template
        const html = createHtml("templates/apps/action-bar.hbs", bar._prepareContext({ parts: [] }));
        dom = new JSDOM(html);
        // @ts-expect-error: element needs to be set for test
        bar.element = dom.window.document.documentElement;
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should call rollAttack and clear preparedAttack", async () => {
        const attackLi = dom.window.document.createElement("li");
        attackLi.dataset.attackId = "attack1";
        attackLi.dataset.prepared = "true";
        await bar.rollAttack(null as any, attackLi);
        expect(actorStub.rollAttack.calledWith("attack1")).to.be.true;
        expect(preparedAttacks.release.called).to.be.true;
    });

    it("should prepare attack when not yet prepared", async () => {
        const attackLi = dom.window.document.createElement("li");
        const attackId = "attack1";
        attackLi.dataset.attackId = attackId;
        attackLi.dataset.prepared = "false";
        await bar.rollAttack(null as any, attackLi);
        expect(actorStub.rollAttack.callCount).to.equal(0);
        expect(preparedAttacks.set.calledWith(attackId)).to.be.true;
    });
    it("should call rollSkill with correct skill", () => {
        const skillLi = dom.window.document.createElement("li");
        skillLi.dataset.skill = "acrobatics";
        bar.rollSkill(null as any, skillLi);
        expect(actorStub.rollSkill.calledWith("acrobatics")).to.be.true;
    });

    it("should call rollSpell and clear preparedSpell", async () => {
        const spellLi = dom.window.document.createElement("li");
        spellLi.dataset.itemId = "spell1";
        await bar.rollSpell(null as any, spellLi);
        expect(actorStub.rollSpell.calledWith("spell1")).to.be.true;
        expect(preparedSpells.release.called).to.be.true;
    });

    it("should call activeDefenseDialog with correct type", () => {
        const defenseLi = dom.window.document.createElement("li");
        defenseLi.dataset.defenseType = "defense";
        bar.rollDefense(null as any, defenseLi);
        expect(actorStub.activeDefenseDialog.calledWith("defense")).to.be.true;
    });

    it("should prepare spell via the actor", async () => {
        const spellLi = dom.window.document.createElement("li");
        spellLi.dataset.spellId = "spell1";
        await bar.prepareSpell(null as any, spellLi);
        expect(preparedSpells.set.calledWith("spell1")).to.be.true;
    });

    it("should open actor sheet", () => {
        bar.openSheet();
        expect((actorStub.sheet.render as SinonStub).calledWith(true)).to.be.true;
    });

    it("should toggle equipped state for item", async () => {
        const itemStub = { system: { equipped: false }, update: sandbox.stub().resolves() };
        (actorStub.items.get as SinonStub).withArgs("item1").returns(itemStub);
        const itemLi = dom.window.document.createElement("li");
        itemLi.dataset.itemId = "item1";
        await bar.toogleEquipped(null as any, itemLi);
        expect(itemStub.update.calledWith({ "system.equipped": true })).to.be.true;
    });

    it("should pass attack skill value as a string in prepared context", async () => {
        sandbox
            .stub(SplittermondApplication.prototype as unknown as { _prepareContext: () => unknown }, "_prepareContext")
            .resolves({});
        sandbox.stub(splittermond, "skillGroups").get(() => ({ general: [], magic: [], all: [] }));
        (actorStub.items as unknown as { filter: sinon.SinonStub }).filter = sandbox.stub().returns([]);
        Object.defineProperty(actorStub, "spells", { value: [], enumerable: true });
        const attackStub = sandbox.createStubInstance(Attack);
        sandbox.define(attackStub, "id", "attack1");
        const toObjectResult = {
            id: "attack1",
            img: "sword.png",
            name: "Sword",
            skill: { id: "melee", label: "Melee", value: "12", attribute1: {}, attribute2: {} },
            range: "short",
            features: "",
            damage: "2W+4",
            damageType: "physical",
            costType: "V",
            weaponSpeed: "5",
            editable: true,
            deletable: true,
            isPrepared: true,
            featureList: [],
        };
        attackStub.toObject.returns(toObjectResult as unknown as ReturnType<Attack["toObject"]>);
        actorStub.attacks.push(attackStub);

        const data = await bar._prepareContext({ parts: [] });

        expect(data.attacks).to.have.lengthOf(1);
        expect(data.attacks![0].skill.value).to.equal("12");
        expect(data.attacks![0].skill.value).to.not.equal("[object Object]");
    });
});

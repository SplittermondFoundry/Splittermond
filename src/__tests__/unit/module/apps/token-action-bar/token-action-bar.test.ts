import "../../../foundryMocks.js";
import sinon, {SinonSandbox, type SinonStub, type SinonStubbedInstance} from "sinon";
import { expect } from "chai";
import { JSDOM } from "jsdom";
import { createHtml } from "../../../../handlebarHarness";
import TokenActionBar from "../../../../../module/apps/token-action-bar/token-action-bar";
import SplittermondActor from "../../../../../module/actor/actor";
import SplittermondSpellItem from "../../../../../module/item/spell";
import {foundryApi} from "../../../../../module/api/foundryApi";
import {SpellDataModel} from "../../../../../module/item/dataModel/SpellDataModel";
import Attack from "../../../../../module/actor/attack";

describe("TokenActionBar", () => {
    let sandbox: SinonSandbox;
    let actorStub: SinonStubbedInstance<SplittermondActor>;
    let spellStub: SinonStubbedInstance<SplittermondSpellItem>;
    let dom: JSDOM;
    let bar: TokenActionBar;

    beforeEach(async () => {
        sandbox = sinon.createSandbox();

        // Minimal actor stub
        actorStub = sandbox.createStubInstance(SplittermondActor);
        sandbox.stub(actorStub,"id").get(()=>"actor1");
        actorStub.name = "Test Actor";
        const sampleSkill = {
            acrobatics: { id: "acrobatics", label: "Acrobatics", value: 5, points: "1" }
        }
        const sampleItemCollection = {get: sandbox.stub()}
        const sampleSheet = { render: sandbox.stub() };
        const sampleDerivedValues = {
            defense: { value: 10 },
            bodyresist: { value: 8 },
            mindresist: { value: 6 }
        }
        Object.defineProperty(actorStub, "isToken", {value:false, enumerable:true});
        Object.defineProperty(actorStub, "skills", {value:sampleSkill, enumerable:true});
        Object.defineProperty(actorStub, "items", {value:sampleItemCollection, enumerable:true});
        Object.defineProperty(actorStub, "derivedValues", {value:sampleDerivedValues, enumerable:true});
        Object.defineProperty(actorStub, "sheet", {value:sampleSheet, enumerable:true});
        Object.defineProperty(actorStub, "attacks", {value:[], enumerable:true});
        actorStub.rollAttack.resolves(true)
        actorStub.rollSpell.resolves(true)
        actorStub.activeDefenseDialog = sandbox.stub();
        actorStub.getFlag.returns(null)

        // Minimal spell stub
        spellStub = sandbox.createStubInstance(SplittermondSpellItem);
        sandbox.stub(spellStub,"id").get(()=> "spell1");
        spellStub.name = "Fireball";
        sandbox.stub(spellStub,"castDuration").get(()=> 2);
        sandbox.stub(spellStub,"difficulty").get(()=> 5);
        sandbox.stub(spellStub,"enhancementCosts").get(()=> 1);
        sandbox.stub(spellStub,"enhancementDescription").get(()=> "Extra damage");
        sandbox.stub(spellStub,"enoughFocus").get(()=> true);
        spellStub.img = "fireball.png";
        sandbox.stub(spellStub,"skill").get(()=> ({ label: "Magic", value: 10 }));
        sandbox.stub(spellStub,"spellTypeList").get(()=> []);
        spellStub.system = sandbox.createStubInstance(SpellDataModel)
        spellStub.system.description = "A big fireball";


        // Setup TokenActionBar
        bar = new TokenActionBar();
        // @ts-expect-error: set private for test
        bar._currentActor = actorStub;

        // Render handlebars template
        const html = createHtml("templates/apps/action-bar.hbs", bar._prepareContext({parts:[]}));
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
        expect(actorStub.setFlag.calledWith("splittermond", "preparedAttack", null)).to.be.true;
    });

    it("should toggle prepared state for attack", async () => {
        sandbox.stub(foundryApi, "localize").callsFake((key)=>key);
        const attackLi = dom.window.document.createElement("li");
        const attackId = "attack1";
        attackLi.dataset.attackId = attackId
        attackLi.dataset.prepared = "false";
        const attackStub = sandbox.createStubInstance(Attack);
        attackStub.toObject.returns({ ...getMockAttackObject(), id: attackId });
        sandbox.stub(attackStub,"weaponSpeed").get(()=>3);
        actorStub.attacks.push(attackStub);
        await bar.rollAttack(null as any, attackLi);
        expect(actorStub.rollAttack.callCount).to.equal(0);
        expect(actorStub.setFlag.lastCall.args).to.have.members(["splittermond", "preparedAttack", attackId]);

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
        expect(actorStub.setFlag.calledWith("splittermond", "preparedSpell", null)).to.be.true;
    });

    it("should call activeDefenseDialog with correct type", () => {
        const defenseLi = dom.window.document.createElement("li");
        defenseLi.dataset.defenseType = "defense";
        bar.rollDefense(null as any, defenseLi);
        expect(actorStub.activeDefenseDialog.calledWith("defense")).to.be.true;
    });

    it("should prepare spell and set flag", () => {
        sandbox.stub(foundryApi, "localize").callsFake((key)=>key);
        (actorStub.items.get as SinonStub).withArgs("spell1").returns(spellStub);
        const spellLi = dom.window.document.createElement("li");
        spellLi.dataset.spellId = "spell1";
        bar.prepareSpell(null as any, spellLi);
        expect(actorStub.addTicks.calledWith(spellStub.castDuration, sinon.match.string)).to.be.true;
        expect(actorStub.setFlag.calledWith("splittermond", "preparedSpell", "spell1")).to.be.true;
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

});

function getMockAttackObject(){
    return  {
        id: "",
        img: "",
        name: "",
        skill: {} as any,
        range: 0,
        features: "",
        damage: "",
        damageType: "",
        costType: "",
        weaponSpeed: 0,
        editable: false,
        deletable: false,
        isPrepared: false,
        featureList: []
    }
}


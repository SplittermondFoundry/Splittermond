import {describe} from "mocha";
import sinon, {SinonSandbox, SinonStubbedInstance} from "sinon";
import {
    linkSpellAndActor,
    setUpCheckReportSelfReference,
    setUpMockActor,
    setUpMockSpellSelfReference,
    WithMockedRefs,
    withToObjectReturnsSelf
} from "./spellRollMessageTestHelper";
import {AgentReference} from "module/data/references/AgentReference";
import {expect} from "chai";
import {splittermond} from "module/config";
import SplittermondSpellItem from "module/item/spell";
import {foundryApi} from "module/api/foundryApi";
import {DamageActionHandler} from "../../../../../../module/util/chat/spellChatMessage/DamageActionHandler";
import {DamageInitializer} from "../../../../../../module/util/chat/damageChatMessage/initDamage";
import {SplittermondChatCard} from "../../../../../../module/util/chat/SplittermondChatCard";

describe("DamageActionHandler", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => key)
        sandbox.stub(foundryApi, "getSpeaker").returns({
            actor: "actor",
            alias: "alias",
            scene: "scene",
            token: "token"
        });
    });
    afterEach(() => {
        sandbox.restore();
    });

    describe("options", () => {
        it("should deliver damage addition options", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            sandbox.stub(underTest.spellReference.getItem(), "damage").get(() => "1");
            underTest.checkReportReference.get().succeeded = true;

            const options = underTest.renderDegreeOfSuccessOptions()

            expect(options).to.have.length(4);
            expect(options.map(o => o.render.action)).to.contain("damageUpdate");
        });

        it("active options addToDamage", () => {
            const underTest = setUpDamageActionHandler(sandbox);

            underTest.useDegreeOfSuccessOption({action: "damageUpdate", multiplicity: "2"}).action();

            expect(underTest.damageAddition).to.equal(2);
        });

        it("unchecking options should reset damage addition", () => {
            const underTest = setUpDamageActionHandler(sandbox);

            underTest.useDegreeOfSuccessOption({action: "damageUpdate", multiplicity: "2"}).action();
            underTest.useDegreeOfSuccessOption({action: "damageUpdate", multiplicity: "2"}).action();

            expect(underTest.damageAddition).to.equal(0);
        });

        it("unchecking options should come with negative costs", () => {
            const underTest = setUpDamageActionHandler(sandbox);

            underTest.useDegreeOfSuccessOption({action: "damageUpdate", multiplicity: "2"}).action();
            const uncheckCost = underTest.useDegreeOfSuccessOption({action: "damageUpdate", multiplicity: "2"})
                .usedDegreesOfSuccess;

            expect(uncheckCost).to.be.lessThan(0);
        });

        it("should not render options if they are not an option", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            underTest.checkReportReference.get().succeeded = false;

            const options = underTest.renderDegreeOfSuccessOptions();
            expect(options).to.have.length(0);
        });

        it("should not render options degrees of success prohibit it", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            sandbox.replaceGetter(underTest.spellReference.getItem(), "degreeOfSuccessOptions",
                () => ({damage: false} as any/* I don't want to retype all success options*/));
            underTest.checkReportReference.get().succeeded = true;

            const options = underTest.renderDegreeOfSuccessOptions();
            expect(options).to.have.length(0);
        });

        [1, 2, 4, 8].forEach((multiplicity) => {
            it(`should render degree of success costs negatively if the consumed ${multiplicity} is checked`, () => {
                const underTest = setUpDamageActionHandler(sandbox);
                underTest.checkReportReference.get().succeeded = true;

                underTest.useDegreeOfSuccessOption({action: "damageUpdate", multiplicity}).action();
                const options = underTest.renderDegreeOfSuccessOptions();

                expect(options.find(o => o.render.multiplicity === `${multiplicity}`)?.cost).to.be.lessThan(0);
            });
        });
    });

    describe("Increasing damage", () => {
        it("should not render action if its not an option", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            underTest.checkReportReference.get().succeeded = false;

            const actions = underTest.renderActions();

            expect(actions).to.have.length(0);
        });

        it("should disable all options after consuming ticks", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            sandbox.stub(underTest.spellReference.getItem(), "damage").get(() => "1");
            underTest.checkReportReference.get().succeeded = true;

            underTest.useDegreeOfSuccessOption({action: "damageUpdate", multiplicity: "2"});

            underTest.useAction({action: "applyDamage"});

            const options = underTest.renderDegreeOfSuccessOptions();

            expect(options).to.have.length(4);
            expect(options.map(o => o.render.disabled).reduce((a, b) => a && b, true)).to.be.true;
        });

        it("should invoke Dice module on damage application", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            const chatCardMock = sandbox.createStubInstance(SplittermondChatCard);
            const diceModuleStub = sandbox.stub(DamageInitializer, "rollDamage")
                .returns(Promise.resolve(chatCardMock));
            underTest.checkReportReference.get().succeeded = true;
            sandbox.stub(underTest.spellReference.getItem(), "damage").get(() => "1");

            underTest.useAction({action: "applyDamage"});

            expect(diceModuleStub.called).to.be.true;
        });

        it("should respect damage increases", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            const chatCardMock = sandbox.createStubInstance(SplittermondChatCard);
            const diceModuleStub = sandbox.stub(DamageInitializer, "rollDamage")
                .returns(Promise.resolve(chatCardMock));
            sandbox.stub(underTest.spellReference.getItem(), "damage").get(() => "1");
            underTest.checkReportReference.get().succeeded = true;
            underTest.spellReference.getItem().system.damageType = "bleeding";

            underTest.useDegreeOfSuccessOption({action: "damageUpdate", multiplicity: "2"}).action();
            underTest.useAction({action: "applyDamage"});

            expect(diceModuleStub.lastCall.firstArg).to.deep.equal([{damageFormula: "0W0+2", featureString:"", damageSource: "name", damageType:"bleeding"}]);
            expect(diceModuleStub.lastCall.lastArg).to.equal(underTest.actorReference.getAgent());
        });

        it("should not allow using actions multiple times", () => {
            const underTest = setUpDamageActionHandler(sandbox);
            const chatCardMock = sandbox.createStubInstance(SplittermondChatCard);
            const diceModuleStub = sandbox.stub(DamageInitializer, "rollDamage").returns(Promise.resolve(chatCardMock));
            underTest.checkReportReference.get().succeeded = true;
            sandbox.stub(underTest.spellReference.getItem(), "damage").get(() => "1");

            underTest.useDegreeOfSuccessOption({action: "damageUpdate", multiplicity: "2"}).action();
            underTest.useAction({action: "applyDamage"});
            underTest.useAction({action: "applyDamage"});

            expect(diceModuleStub.calledOnce).to.be.true;
        });

    });
});

function setUpDamageActionHandler(sandbox: SinonSandbox): WithMockedRefs<DamageActionHandler> {
    const spellReference = setUpMockSpellSelfReference(sandbox)
    setNecessaryDefaultsForSpellproperties(spellReference, sandbox);
    const actor = setUpMockActor(sandbox);
    const checkReportReference = setUpCheckReportSelfReference();
    linkSpellAndActor(spellReference, actor);
    return withToObjectReturnsSelf(() => {
        return DamageActionHandler.initialize(
            AgentReference.initialize(actor),
            spellReference,
            checkReportReference)
    }) as unknown as WithMockedRefs<DamageActionHandler> /*TS cannot know that we're injecting mocks*/
}

function setNecessaryDefaultsForSpellproperties(spellMock: SinonStubbedInstance<SplittermondSpellItem>, sandbox: sinon.SinonSandbox) {
    sandbox.stub(spellMock, "degreeOfSuccessOptions").get(() => ({damage: true,} as Record<keyof typeof splittermond.spellEnhancement, boolean>));
    sandbox.stub(spellMock, "damage").get(() => "1W6");
    spellMock.name = "name";
}

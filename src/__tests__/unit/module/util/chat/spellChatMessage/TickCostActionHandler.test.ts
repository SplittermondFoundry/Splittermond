import {describe} from "mocha";
import sinon, {SinonSandbox, SinonStubbedInstance} from "sinon";
import {
    linkSpellAndActor,
    setUpMockActor,
    setUpMockSpellSelfReference,
    WithMockedRefs,
    withToObjectReturnsSelf
} from "./spellRollMessageTestHelper";
import {TickCostActionHandler} from "module/util/chat/spellChatMessage/TickCostActionHandler";
import {AgentReference} from "module/data/references/AgentReference";
import {expect} from "chai";
import {splittermond} from "module/config";
import SplittermondSpellItem from "module/item/spell";
import {foundryApi} from "module/api/foundryApi";

describe("TickCostActionHandler", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "localize").callsFake((key:string)=>key)
    });
    afterEach(() => {
        sandbox.restore();
    });

    describe("options", ()=>{
        it("should deliver damage addition options",()=>{
            const underTest = setUpTickActionHandler(sandbox);

            const options = underTest.renderDegreeOfSuccessOptions()

            expect(options).to.have.length(2);
        });

        it("active options should increase usage", () =>{
            const underTest = setUpTickActionHandler(sandbox);

            underTest.useDegreeOfSuccessOption({action:"castDurationUpdate", multiplicity: "2"}).action();

            expect(underTest.tickReduction).to.equal(2);
        });

        it("unchecking options should reset tick usage", () =>{
            const underTest = setUpTickActionHandler(sandbox);

            underTest.useDegreeOfSuccessOption({action:"castDurationUpdate", multiplicity: "2"}).action();
            underTest.useDegreeOfSuccessOption({action:"castDurationUpdate", multiplicity: "2"}).action();

            expect(underTest.tickReduction).to.equal(0);
        });

        it("unchecking options come with negative cost", () =>{
            const underTest = setUpTickActionHandler(sandbox);

            underTest.useDegreeOfSuccessOption({action:"castDurationUpdate", multiplicity: "2"}).action();
            const suggestion = underTest.useDegreeOfSuccessOption({action:"castDurationUpdate", multiplicity: "2"});

            expect(suggestion.usedDegreesOfSuccess).to.be.lessThan(0);
        });

        it("should always offer options that are checked", () =>{
            const underTest = setUpTickActionHandler(sandbox);
            underTest.useDegreeOfSuccessOption({action:"castDurationUpdate", multiplicity: "2"});

            const options = underTest.renderDegreeOfSuccessOptions();
            expect(options).to.have.length(2);
            expect(options.find(o=>o.render.multiplicity === "2")).to.not.be.undefined;
        });

        it("should not render options if they are not an option",() =>{
            const underTest = setUpTickActionHandler(sandbox);
            underTest.updateSource({isOption: false});

            const options = underTest.renderDegreeOfSuccessOptions();
            expect(options).to.have.length(0);
        })
    });

    describe("Consuming ticks", ()=>{
        it("should not render action if its not an option", ()=>{
            const underTest = setUpTickActionHandler(sandbox);
            underTest.updateSource({isOption: false});

            const actions = underTest.renderActions();

            expect(actions).to.have.length(0);
        });

        it("should disable all options after consuming ticks", () =>{
            const underTest = setUpTickActionHandler(sandbox);
            underTest.useDegreeOfSuccessOption({action:"castDurationUpdate", multiplicity: "2"});

            underTest.useAction({action:"advanceToken"});

            const options = underTest.renderDegreeOfSuccessOptions();

            expect(options).to.have.length(2);
            expect(options.map(o =>o.render.disabled)).to.deep.equal([true,true]);
        });

        it("should send tick usage to the actor", () =>{
            const underTest = setUpTickActionHandler(sandbox);

            underTest.useAction({action:"advanceToken"});

            expect(underTest.actorReference.getAgent().addTicks.called).to.be.true;
            expect(underTest.actorReference.getAgent().addTicks.calledWith(3,"",false)).to.be.true;
        });

        it("should respect cost reductions", () =>{
            const underTest = setUpTickActionHandler(sandbox);

            underTest.useDegreeOfSuccessOption({action:"castDurationUpdate", multiplicity: "2"}).action();
            underTest.useAction({action:"advanceToken"});

            expect(underTest.actorReference.getAgent().addTicks.calledWith(1,"",false)).to.be.true;
        });

        it("should not allow using actions multiple times", ()=>{
            const underTest = setUpTickActionHandler(sandbox);

            underTest.useDegreeOfSuccessOption({action:"castDurationUpdate", multiplicity: "2"}).action();
            underTest.useAction({action:"advanceToken"});
            underTest.useAction({action:"advanceToken"});

            expect(underTest.actorReference.getAgent().addTicks.calledOnce).to.be.true;
        });

    });
});

function setUpTickActionHandler(sandbox:SinonSandbox):WithMockedRefs<TickCostActionHandler>{
    const spellReference = setUpMockSpellSelfReference(sandbox)
    setNecessaryDefaultsForSpellproperties(spellReference, sandbox);
    const actor = setUpMockActor(sandbox);
    linkSpellAndActor(spellReference, actor);
    return withToObjectReturnsSelf(()=>{
        return TickCostActionHandler.initialize(AgentReference.initialize(actor),spellReference,3)
    })as unknown as WithMockedRefs<TickCostActionHandler>/*TS cannot know tha we're injecting mocks*/
}
function setNecessaryDefaultsForSpellproperties(spellMock: SinonStubbedInstance<SplittermondSpellItem>, sandbox: sinon.SinonSandbox) {
    sandbox.stub(spellMock,"degreeOfSuccessOptions").get(()=>({
        consumedFocus:true,
        exhaustedFocus:true,
        channelizedFocus:true,
        damage: true,
        castDuration: true,
        effectDuration: true,
        range: true,
        effectArea: true,
    }as Record<keyof typeof splittermond.spellEnhancement, boolean>));
    spellMock.name = "name";
}

import sinon, {SinonSandbox} from "sinon";
import {
    linkSpellAndActor,
    setUpCheckReportSelfReference,
    setUpMockActor,
    setUpMockSpellSelfReference,
    WithMockedRefs,
    withToObjectReturnsSelf
} from "./spellRollMessageTestHelper";
import {NoOptionsActionHandler} from "module/util/chat/spellChatMessage/NoOptionsActionHandler";
import SplittermondActor from "module/actor/actor";
import {AgentReference} from "module/data/references/AgentReference";
import {expect} from "chai";
import {referencesUtils} from "../../../../../../module/data/references/referencesUtils";
import {injectParent} from "../../../../testUtils";


describe("Roll Fumble", () => {
    let sandbox: SinonSandbox;
    beforeEach(()=>{sandbox = sinon.createSandbox()});
    afterEach(() => sandbox.restore());
    it("should not render the action if the roll is not a fumble", () => {
        const underTest = setUpNoOptionsActionHandler(sandbox);
        underTest.checkReportReference.get().isFumble= false;

        const actions = underTest.renderActions();

        expect(actions.find(a => a.type === "rollMagicFumble")).to.be.undefined
    });

    it("should render the action if the roll is a fumble", () => {
        const underTest = setUpNoOptionsActionHandler(sandbox);
        underTest.checkReportReference.get().isFumble= true;

        const actions = underTest.renderActions();

        expect(actions.find(a => a.type === "rollMagicFumble")).not.to.be.undefined
    });
    it("should not allow using the action if the roll is not a fumble",async ()=>{
        const underTest = setUpNoOptionsActionHandler(sandbox);
        underTest.checkReportReference.get().isFumble= false;

        await underTest.useAction({action: "rollMagicFumble"});

        expect(underTest.casterReference.getAgent().rollMagicFumble.called).to.be.false
    });
    it("should call the action with the correct parameters if the roll was a fumble",async ()=>{
        const underTest = setUpNoOptionsActionHandler(sandbox);
        underTest.checkReportReference.get().isFumble= true;
        const eg = 3;
        const costs = "8V2";
        const skill = "deathmagic";
        underTest.checkReportReference.get().degreeOfSuccess = eg;
        sandbox.stub(underTest.spellReference.getItem(),"costs").get(()=> costs);
        underTest.checkReportReference.get().skill = {id : skill, points:1, attributes:{mystic:1, mind:2}};

        await underTest.useAction({action: "rollMagicFumble"});

        expect(underTest.casterReference.getAgent().rollMagicFumble.calledWith(-eg, costs,skill)).to.be.true;
    });
    it("should not allow using the action if it has already been used",async ()=>{
        const underTest = setUpNoOptionsActionHandler(sandbox);
        underTest.checkReportReference.get().isFumble= true;
        underTest.checkReportReference.get().degreeOfSuccess = 3;
        sandbox.stub(underTest.spellReference.getItem(),"costs").get(()=> "8V2");
        underTest.checkReportReference.get().skill = {id : "deathmagic", points:1, attributes:{mystic:1, mind:2}};

        await underTest.useAction({action: "rollMagicFumble"});
        await underTest.useAction({action: "rollMagicFumble"});

        expect(underTest.casterReference.getAgent().rollMagicFumble.calledOnce).to.be.true;
    });
});

describe("Active Defense", () => {
    let sandbox: SinonSandbox;
    beforeEach(()=> {
        sandbox = sinon.createSandbox();
        const actor = sandbox.createStubInstance(SplittermondActor);
        Object.defineProperty(actor, "getAgent",{value:()=>actor}) //make actor a reference onto itself
        sandbox.stub(referencesUtils,"findBestUserActor").returns(actor as  unknown as AgentReference);
    });
    afterEach(() => sandbox.restore());
    it("should not update the state",()=>{
        const underTest = setUpNoOptionsActionHandler(sandbox);
        const updateSourceSpy = sinon.spy(underTest, "updateSource")

        underTest.useAction({action: "activeDefense"})

        expect(updateSourceSpy.called).to.be.false;
    });

    it("should not be offered if no actor is the target",()=>{
        const underTest = setUpNoOptionsActionHandler(sandbox);
        sandbox.stub(underTest.spellReference.getItem(),"difficulty").get(()=>"13");

        const actions  =underTest.renderActions();

        expect(actions.find(a=> a.type === "activeDefense")).to.be.undefined;
    });

    it("should be offered if an actor is the target",()=>{
        const underTest = setUpNoOptionsActionHandler(sandbox);
        sandbox.stub(underTest.spellReference.getItem(),"difficulty").get(()=>"VTD");

        const actions  =underTest.renderActions();

        expect(actions.find(a=> a.type === "activeDefense")).not.to.be.undefined;
    });

    it("should not be usable if no actor is the target", ()=>{
        const underTest = setUpNoOptionsActionHandler(sandbox);
        sandbox.stub(underTest.spellReference.getItem(),"difficulty").get(()=>"VTD");

        underTest.useAction({action: "activeDefense"});

        expect(underTest.casterReference.getAgent().activeDefenseDialog.called).to.be.false;
    });

    it("should call the active defense dialog if an actor is the target",()=>{
        const underTest = setUpNoOptionsActionHandler(sandbox);
        sandbox.stub(underTest.spellReference.getItem(),"difficulty").get(()=>"VTD");

        underTest.useAction({action: "activeDefense"});

        expect(underTest.casterReference.getAgent().activeDefenseDialog.called).to.be.false;
    })
});

function setUpNoOptionsActionHandler(sandbox:SinonSandbox):WithMockedRefs<NoOptionsActionHandler>{
    const mockReportReference = setUpCheckReportSelfReference();
    const mockSpellRefernece = setUpMockSpellSelfReference(sandbox);
    const mockActor = setUpMockActor(sandbox);
    linkSpellAndActor(mockSpellRefernece, mockActor);

    return withToObjectReturnsSelf(()=> {
        const handler = NoOptionsActionHandler.initialize(mockReportReference, mockSpellRefernece, AgentReference.initialize(mockActor));
        injectParent(handler)
        return handler as unknown  as WithMockedRefs<NoOptionsActionHandler>; //TS cannot know we placed mocks inside this object.
    })

}


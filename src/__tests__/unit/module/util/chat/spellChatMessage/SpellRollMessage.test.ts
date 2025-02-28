import "../../../../foundryMocks"
import {afterEach, beforeEach, describe} from "mocha";
import {SpellRollMessage} from "module/util/chat/spellChatMessage/SpellRollMessage";
import sinon, {SinonSandbox, SinonStubbedInstance} from "sinon";
import {
    setUpMockActor,
    setUpMockSpellSelfReference,
    WithMockedRefs,
    withToObjectReturnsSelf
} from "./spellRollMessageTestHelper";
import {expect} from "chai";
import SplittermondSpellItem from "module/item/spell";
import SplittermondActor from "module/actor/actor";
import SplittermondItem from "module/item/item";
import {Cost} from "module/util/costs/Cost";
import {splittermond} from "module/config";
import {foundryApi} from "module/api/foundryApi";
import {CheckReport} from "../../../../../../module/actor/CheckReport";
import {referencesUtils} from "../../../../../../module/data/references/referencesUtils";
import {AgentReference} from "../../../../../../module/data/references/AgentReference";
import {injectParent} from "../../../../testUtils";


describe("SpellRollMessage", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => key)
    });
    afterEach(() => {
        sandbox.restore()
    })

    it("should load", () => {
        const spellRollMessage = createSpellRollMessage(sandbox);
        expect(spellRollMessage?.getData()).to.not.be.undefined;
    });

    it("should filter degree of success options that are too expensive on render", () => {
        const spellRollMessage = createSpellRollMessage(sandbox);
        spellRollMessage.updateSource({openDegreesOfSuccess: 0});
        expect(spellRollMessage.getData().degreeOfSuccessOptions).to.be.empty;
    });

    it("should allow options that are checked, even if no degrees of success are left", () => {
        const spellRollMessage = createSpellRollMessage(sandbox);
        spellRollMessage.updateSource({openDegreesOfSuccess: 1000});

        spellRollMessage.handleGenericAction({action: "consumedFocusUpdate", multiplicity: "1"});
        spellRollMessage.updateSource({openDegreesOfSuccess: 0});

        expect(spellRollMessage.getData().degreeOfSuccessOptions).to.have.length(1);
        expect(spellRollMessage.getData().degreeOfSuccessOptions[0]).to.deep.contain({
            checked: true,
            disabled: false,
            action: "consumedFocusUpdate",
            multiplicity: "1",
            text: "3 EG splittermond.degreeOfSuccessOptions.consumedFocus"
        });
    });

    it("should allow to unchecked options that are checked, even if no degrees of success are left", () => {
        const spellRollMessage = createSpellRollMessage(sandbox);
        spellRollMessage.updateSource({openDegreesOfSuccess: 1000});

        spellRollMessage.handleGenericAction({action: "consumedFocusUpdate", multiplicity: "1"});
        spellRollMessage.updateSource({openDegreesOfSuccess: 0});
        spellRollMessage.handleGenericAction({action: "consumedFocusUpdate", multiplicity: "1"});
        spellRollMessage.updateSource({openDegreesOfSuccess: 1000});

        expect(spellRollMessage.getData().degreeOfSuccessOptions.filter(dos => dos.checked))
            .to.be.empty;
    });

    //we're ignoring channeled Focus here, because it takes a different kind of spell. But the logic of SpellRollMessage is
    //rather generic
    ["consumedFocusUpdate", "exhaustedFocusUpdate", "spellEnhancementUpdate", "castDurationUpdate",
        "effectAreaUpdate", "effectDurationUpdate", "rangeUpdate"
    ].forEach((option) => {
        it(`should handle option ${option}`, () => {
            const underTest = createSpellRollMessage(sandbox);
            underTest.updateSource({openDegreesOfSuccess: 100});

            underTest.handleGenericAction({action: option, multiplicity: "1"});
            const afterFirstUpdate = underTest.getData().degreeOfSuccessOptions
                .filter(o => o.action === option)
                .find(o => o.multiplicity === "1")
            underTest.handleGenericAction({action: option, multiplicity: "1"});
            const afterSecondUpdate = underTest.getData().degreeOfSuccessOptions
                .filter(o => o.action === option)
                .find(o => o.multiplicity === "1")

            expect(afterFirstUpdate?.checked).to.be.true;
            expect(afterSecondUpdate?.checked).to.be.false;
        });
    });

    (["consumedFocusUpdate", "exhaustedFocusUpdate", "channeledFocusUpdate"] as const).forEach((action) => {
        function mapUpdateFunctionToSpellCostType(input: typeof action) {
            switch (input) {
                case "consumedFocusUpdate":
                    return "consumed";
                case "exhaustedFocusUpdate":
                    return "exhausted";
                case "channeledFocusUpdate":
                    return "channeled";
            }
        }

        [1, 2, 4, 8].forEach((multiplicity) => {
            it(`should check ${action} degree of success option with multiplicity ${multiplicity}`, () => {
                const spellRollMessage = createSpellRollMessage(sandbox);
                spellRollMessage.updateSource({openDegreesOfSuccess: 100});

                spellRollMessage.handleGenericAction({action, multiplicity: `${multiplicity}`});

                const spellCostType = mapUpdateFunctionToSpellCostType(action);
                expect(spellRollMessage.focusCostHandler[spellCostType].isChecked(multiplicity)).to.be.true;
            });

            it(`should uncheck ${action} degree of success option with multliplicity ${multiplicity}`, () => {
                const spellRollMessage = createSpellRollMessage(sandbox);
                spellRollMessage.updateSource({openDegreesOfSuccess: 100});

                spellRollMessage.handleGenericAction({action, multiplicity: `${multiplicity}`});
                spellRollMessage.handleGenericAction({action, multiplicity: `${multiplicity}`});

                expect(spellRollMessage.focusCostHandler.consumed.isChecked(multiplicity)).to.be.false;
            });
        });
    });

    //produces a warning that apply damage should not have been used. This is ok, it means that the action reached the handler.
    ["applyDamage" , "consumeCosts" , "advanceToken", "rollMagicFumble"].forEach(action => {
        it(`should handle action ${action}`, async () => {
            const underTest = createSpellRollMessage(sandbox);
            underTest.checkReport.succeeded = true;
            const warnUserStub = sandbox.stub(foundryApi, "warnUser");

            await underTest.handleGenericAction({action});

            expect(warnUserStub.called).to.be.false;
        });
    });

    it("should handle action activeDefense", async ()=>{
        const underTest = createSpellRollMessage(sandbox);
        underTest.checkReport.succeeded = true;
        const actor = sandbox.createStubInstance(SplittermondActor);
        Object.defineProperty(actor, "getAgent",{value:()=>actor}) //make actor a reference onto itself
        sandbox.stub(referencesUtils,"findBestUserActor").returns(actor as  unknown as AgentReference);
        const warnUserStub = sandbox.stub(foundryApi, "warnUser");

        await underTest.handleGenericAction({action:"activeDefense"});

        expect(warnUserStub.called).to.be.false;
    });
    describe("Splinterpoint usage", () => {
        it("should increase degrees of success by three", async () => {
            const underTest = createSpellRollMessage(sandbox);
            underTest.actorReference.getAgent().spendSplinterpoint.returns({
                pointSpent: true, getBonus() {
                    return 3;
                }
            })
            underTest.updateSource({checkReport: fullCheckReport()});

            await underTest.handleGenericAction({action: "useSplinterpoint"});

            expect(underTest.checkReport.degreeOfSuccess).to.equal(3);
        });

        it("should only be usable once", async () => {
            const underTest = createSpellRollMessage(sandbox);
            underTest.actorReference.getAgent().spendSplinterpoint.returns({
                pointSpent: true, getBonus() {
                    return 3;
                }
            })
            underTest.updateSource({checkReport: fullCheckReport()});

            await underTest.handleGenericAction({action: "useSplinterpoint"});
            await underTest.handleGenericAction({action: "useSplinterpoint"});

            expect(underTest.checkReport.degreeOfSuccess).to.equal(3);
        });

        it("should convert a failure into a success", async () => {
            const underTest = createSpellRollMessage(sandbox);
            underTest.actorReference.getAgent().spendSplinterpoint.returns({
                pointSpent: true, getBonus() {
                    return 3;
                }
            })
            underTest.updateSource({checkReport: fullCheckReport()});
            underTest.checkReport.roll.total = underTest.checkReport.difficulty - 1
            underTest.checkReport.degreeOfSuccess = 0;
            underTest.checkReport.succeeded = false;

            await underTest.handleGenericAction({action: "useSplinterpoint"});

            expect(underTest.checkReport.degreeOfSuccess).to.equal(0);
            expect(underTest.checkReport.succeeded).to.be.true
        });
        it("should be rendered if not a fumble", () => {
            const underTest = createSpellRollMessage(sandbox);
            underTest.checkReport.isFumble = false;

            expect(underTest.getData().actions.useSplinterpoint).not.to.be.undefined;
        });
        it("should not be applicable for fumbles", () => {
            const underTest = createSpellRollMessage(sandbox);
            underTest.checkReport.isFumble = true;

            expect(underTest.getData().actions.useSplinterpoint).to.be.undefined;
        });

        function fullCheckReport(): CheckReport {
            return {
                succeeded: false,
                degreeOfSuccess: 2,
                degreeOfSuccessMessage: "",
                difficulty: 9,
                hideDifficulty: false,
                isCrit: false,
                isFumble: false,
                modifierElements: [],
                roll: {dice: [{total: 5}], tooltip: "", total: 15},
                rollType: "standard",
                skill: {attributes: {"mystic": 1, "mind": 2}, id: "windmagic", points: 7},
            }
        }
    })
});

function createSpellRollMessage(sandbox: SinonSandbox) {
    const mockSpell = setUpMockSpellSelfReference(sandbox);
    setNecessaryDefaultsForSpellproperties(mockSpell, sandbox);
    const mockActor = setUpMockActor(sandbox);
    linkSpellAndActor(mockSpell, mockActor);
    const spellRollMessage = withToObjectReturnsSelf(() => {
        return SpellRollMessage.initialize(mockSpell, {
            degreeOfSuccess: 0,
            degreeOfSuccessMessage: "Uma mensagem muito importante",
            difficulty: 0,
            hideDifficulty: false,
            isCrit: false,
            isFumble: false,
            modifierElements: [],
            roll: {dice: [], tooltip: "", total: 0},
            rollType: "standard",
            skill: {attributes: {}, id: "deathmagic", points: 0},
            succeeded: true,
        });
    });
    injectParent(spellRollMessage);
    return spellRollMessage as unknown as WithMockedRefs<SpellRollMessage>; //TS cannot know that we injected mocks
}

function linkSpellAndActor(spellMock: SinonStubbedInstance<SplittermondSpellItem>, actorMock: SinonStubbedInstance<SplittermondActor>): void {
    actorMock.items = {get: () => spellMock} as unknown as Collection<SplittermondItem> //Our pseudo collection is supposed to return the spellMock regrardless of id entered.
    Object.defineProperty(spellMock, "actor", {value: actorMock, enumerable: true});
}

function setNecessaryDefaultsForSpellproperties(spellMock: SinonStubbedInstance<SplittermondSpellItem>, sandbox: sinon.SinonSandbox) {
    sandbox.stub(spellMock, "enhancementCosts").get(() => "1EG/+1V1");
    sandbox.stub(spellMock, "castDuration").get(() => 3);
    sandbox.stub(spellMock, "description").get(() => "description");
    spellMock.getCostsForFinishedRoll.returns(new Cost(10, 4, false).asPrimaryCost());
    sandbox.stub(spellMock, "degreeOfSuccessOptions").get(() => ({
        consumedFocus: true,
        exhaustedFocus: true,
        channelizedFocus: true,
        damage: true,
        castDuration: true,
        effectDuration: true,
        range: true,
        effectArea: true,
    } as Record<keyof typeof splittermond.spellEnhancement, boolean>));
    spellMock.name = "name";
}

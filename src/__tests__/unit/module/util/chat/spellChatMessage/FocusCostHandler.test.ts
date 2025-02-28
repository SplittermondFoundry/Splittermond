// Import necessary modules and types
import {expect} from 'chai';
import sinon, {SinonSandbox, SinonStubbedInstance} from 'sinon';
import {afterEach} from "mocha";
import {Cost, CostModifier} from "module/util/costs/Cost";
import {
    FocusDegreeOfSuccessOptionField
} from "module/util/chat/spellChatMessage/optionFields/FocusDegreeOfSuccessOptionField";
import {
    linkSpellAndActor,
    setUpCheckReportSelfReference,
    setUpMockActor,
    setUpMockSpellSelfReference,
    WithMockedRefs,
    withToObjectReturnsSelf
} from "./spellRollMessageTestHelper";
import {FocusCostHandler} from "../../../../../../module/util/chat/spellChatMessage/FocusCostHandler";
import {AgentReference} from "../../../../../../module/data/references/AgentReference";
import SplittermondSpellItem from "../../../../../../module/item/spell";
import {splittermond} from "../../../../../../module/config";
import {foundryApi} from "../../../../../../module/api/foundryApi";
import {parseCostString} from "../../../../../../module/util/costs/costParser";
import {settings} from "../../../../../../module/settings";
import {asMock} from "../../../../settingsMock";
import {injectParent} from "../../../../testUtils";

describe("FocusCostActionHandler", () => {
    let sandbox: SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "localize").callsFake((messageKey: string) => messageKey)
    })
    afterEach(() => sandbox.restore())

    describe("Degree of success option render", () => {
        it("should only render degree of success options that have a true isOption parameter", () => {
            const underTest = setUpFocusActionHandler(sandbox);
            underTest.consumed.updateSource({isOption: false})
            underTest.channeled.updateSource({isOption: false})
            underTest.exhausted.updateSource({isOption: false})

            const options = underTest.renderDegreeOfSuccessOptions();

            expect(options.map(o => o.render.action)).to.deep.equal(["spellEnhancementUpdate"])
        });

        it("should render all degree of success options that have isOption true (non-channeled)", () => {
            const underTest = setUpFocusActionHandler(sandbox);
            underTest.consumed.updateSource({isOption: true})
            underTest.channeled.updateSource({isOption: false})
            underTest.exhausted.updateSource({isOption: true})
            underTest.spellReference.getItem().getCostsForFinishedRoll.returns(new Cost(6, 2, false).asPrimaryCost())

            const options = underTest.renderDegreeOfSuccessOptions();

            const expectedActions = [
                "consumedFocusUpdate",
                "exhaustedFocusUpdate",
                "spellEnhancementUpdate"
            ];

            expect(options.map(o => o.render.action)).to.contain.members(expectedActions);
        });

        it("should render all degree of success options that have isOption true (channeled)", () => {
            const underTest = setUpFocusActionHandler(sandbox);
            underTest.consumed.updateSource({isOption: true})
            underTest.channeled.updateSource({isOption: true})
            underTest.exhausted.updateSource({isOption: false})
            underTest.spellReference.getItem().getCostsForFinishedRoll.returns(new Cost(6, 2, true).asPrimaryCost())

            const options = underTest.renderDegreeOfSuccessOptions();

            const expectedActions = [
                "consumedFocusUpdate",
                "channeledFocusUpdate",
                "spellEnhancementUpdate"
            ];

            expect(options.map(o => o.render.action)).to.contain.members(expectedActions);
        });

        it("should not render multiplicities that reduce consumed cost past minimum", () => {
            const underTest = setUpFocusActionHandler(sandbox);

            // Setting up initial cost and adjusted cost
            const initialCost = new Cost(1, 1, false).asPrimaryCost();

            underTest.spellReference.getItem().getCostsForFinishedRoll.returns(initialCost)

            const options = underTest.renderDegreeOfSuccessOptions();

            const consumedOptions = options.filter(o => o.render.action === 'consumedFocusUpdate');
            expect(consumedOptions).to.not.be.empty;

            // Check that multiplicity 1 is rendered and multiplicity 2 is not, due to cost reduction past minimum
            const multiplicitiesRendered = consumedOptions.map(o => o.render.multiplicity);
            expect(multiplicitiesRendered).to.include('1');
            expect(multiplicitiesRendered).to.not.include('2');
        });

        ([
            ["consumedFocusUpdate", new Cost(0, 1, false)],
            ["channeledFocusUpdate", new Cost(1, 0, true)],
            ["exhaustedFocusUpdate", new Cost(1, 0, false)]] as const)
            .forEach(([option, effect]) => {
                it(`${option} should not render if it reduces cost past minimum`, () => {
                    const underTest = setUpFocusActionHandler(sandbox);

                    const initialCost = effect.asPrimaryCost();

                    underTest.spellReference.getItem().getCostsForFinishedRoll.returns(initialCost)

                    const options = underTest.renderDegreeOfSuccessOptions();

                    const consumedOptions = options.filter(o => o.render.action === option);
                    expect(consumedOptions).to.be.empty;
                });
            });
        ([
            ["consumedFocusUpdate", new Cost(1, 1, false)],
            ["channeledFocusUpdate", new Cost(1, 1, true)],
            ["exhaustedFocusUpdate", new Cost(1, 1, false)]] as const)
            .forEach(([option, effect]) => {
            it(`${option} should render exactly one reduction`, () => {
                const underTest = setUpFocusActionHandler(sandbox);

                const initialCost = effect.asPrimaryCost();

                underTest.spellReference.getItem().getCostsForFinishedRoll.returns(initialCost)

                const options = underTest.renderDegreeOfSuccessOptions();

                const consumedOptions = options.filter(o => o.render.action === option);
                const multiplicitiesRendered = consumedOptions.map(o => o.render.multiplicity);

                expect(consumedOptions).not.to.be.empty;
                expect(multiplicitiesRendered).to.include('1');
            });
        });

        it("should render multiplicities that affect enhanced costs if setting is true", () => {
            const underTest = setUpFocusActionHandler(sandbox);

            const initialCost = new Cost(1, 0, true).asPrimaryCost();
            underTest.spellReference.getItem().getCostsForFinishedRoll.returns(initialCost)
            underTest.spellEnhancement.effect = new Cost(0, 1, true).asModifier();
            (asMock(settings.registerBoolean)).returnsSetting(true)

            underTest.useDegreeOfSuccessOption({action: "spellEnhancementUpdate", multiplicity: "1"}).action();
            const options = underTest.renderDegreeOfSuccessOptions();

            const consumedOptions = options.filter(o => o.render.action === 'channeledFocusUpdate');
            expect(consumedOptions).to.not.be.empty;

            const multiplicitiesRendered = consumedOptions.map(o => o.render.multiplicity);
            expect(multiplicitiesRendered).to.include('1');
        });

        it("should render multiplicities that affect enhanced costs if setting is false", () => {
            const underTest = setUpFocusActionHandler(sandbox);

            const initialCost = new Cost(1, 0, true).asPrimaryCost();
            underTest.spellReference.getItem().getCostsForFinishedRoll.returns(initialCost)
            underTest.spellEnhancement.effect = new Cost(0, 1, true).asModifier();
            (asMock(settings.registerBoolean)).returnsSetting(false)

            underTest.useDegreeOfSuccessOption({action: "spellEnhancementUpdate", multiplicity: "1"}).action();
            const options = underTest.renderDegreeOfSuccessOptions();

            const consumedOptions = options.filter(o => o.render.action === 'channeledFocusUpdate');
            expect(consumedOptions).to.be.empty;
        });

        ["consumedFocusUpdate", "channeledFocusUpdate", "exhaustedFocusUpdate", "spellEnhancementUpdate"].forEach((option) => {
            it(`should render the degree of success cost negatively for checked option ${option}`, () => {
                const underTest = setUpFocusActionHandler(sandbox);
                underTest.spellReference.getItem().getCostsForFinishedRoll.returns(new Cost(1, 1, false).asPrimaryCost())

                underTest.useDegreeOfSuccessOption({action: option, multiplicity: "1"}).action();
                const options = underTest.renderDegreeOfSuccessOptions();

                const renderedOption =
                    options.filter(o => o.render.action === `${option}`)
                        .find(o => o.render.multiplicity === '1');
                expect(renderedOption?.cost).to.be.lessThan(0);
            });
        });


        ["consumedFocusUpdate", "channeledFocusUpdate", "exhaustedFocusUpdate"].forEach((option) => {
            [1, 2, 4, 8].forEach((multiplicity) => {
                it(`should always offer checked option ${option} with multiplicity ${multiplicity}`, () => {
                    const underTest = setUpFocusActionHandler(sandbox);
                    underTest.useDegreeOfSuccessOption({action: option, multiplicity}).action();
                    underTest.spellReference.getItem().getCostsForFinishedRoll.returns(new Cost(0, 0, false).asPrimaryCost())

                    const options = underTest.renderDegreeOfSuccessOptions();

                    expect(options.find(o => o.render.multiplicity === `${multiplicity}`)).to.not.be.undefined;
                });
            });
        });
    });

    describe("useDegreeOfSuccessOption", () => {
        it("should update the consumed focus option when useDegreeOfSuccessOption is called", () => {
            const underTest = setUpFocusActionHandler(sandbox);

            // Initially, consumed focus is unchecked
            expect(underTest.consumed.isChecked(1)).to.be.false;

            // Prepare the degreeOfSuccessOptionData
            const degreeOfSuccessOptionData = {
                action: "consumedFocusUpdate",
                multiplicity: "1",
            };

            // Call useDegreeOfSuccessOption
            const degreeOfSuccessAction = underTest.useDegreeOfSuccessOption(degreeOfSuccessOptionData);

            // The degrees of success used should match the option's cost
            expect(degreeOfSuccessAction.usedDegreesOfSuccess).to.equal(underTest.consumed.getCost(1));

            // Execute the action
            degreeOfSuccessAction.action();

            // The consumed focus option should now be checked
            expect(underTest.consumed.isChecked(1)).to.be.true;

            expect(underTest.adjusted).to.deep.equal({
                _exhausted: 0,
                _channeled: 0,
                _consumed: -1,
                _channeledConsumed: -1
            });
        });

        it("should update the channeled focus option when useDegreeOfSuccessOption is called", () => {
            const underTest = setUpFocusActionHandler(sandbox);

            // Initially, channeled focus is unchecked
            expect(underTest.channeled.isChecked(1)).to.be.false;

            // Prepare the degreeOfSuccessOptionData
            const degreeOfSuccessOptionData = {
                action: "channeledFocusUpdate",
                multiplicity: "1",
            };

            // Call useDegreeOfSuccessOption
            const degreeOfSuccessAction = underTest.useDegreeOfSuccessOption(degreeOfSuccessOptionData);

            // The degrees of success used should match the option's cost
            expect(degreeOfSuccessAction.usedDegreesOfSuccess).to.equal(underTest.channeled.getCost(1));

            // Execute the action
            degreeOfSuccessAction.action();

            // The channeled focus option should now be checked
            expect(underTest.channeled.isChecked(1)).to.be.true;

            // The adjusted cost should have been modified accordingly
            expect(underTest.adjusted).to.deep.equal({
                _consumed: 0,
                _channeled: -1,
                _channeledConsumed: 0,
                _exhausted: -1
            })
        });

        it("should update the exhausted focus option when useDegreeOfSuccessOption is called", () => {
            const underTest = setUpFocusActionHandler(sandbox);

            expect(underTest.exhausted.isChecked(1)).to.be.false;

            const degreeOfSuccessOptionData = {
                action: "exhaustedFocusUpdate",
                multiplicity: "1",
            };

            const degreeOfSuccessAction = underTest.useDegreeOfSuccessOption(degreeOfSuccessOptionData);

            expect(degreeOfSuccessAction.usedDegreesOfSuccess).to.equal(underTest.exhausted.getCost(1));

            degreeOfSuccessAction.action();

            expect(underTest.exhausted.isChecked(1)).to.be.true;

            // The adjusted cost should have been modified accordingly
            expect(underTest.adjusted).to.deep.equal({
                _consumed: 0,
                _channeled: -1,
                _channeledConsumed: 0,
                _exhausted: -1
            })
        });

        it("should update the spell enhancement option when useDegreeOfSuccessOption is called", () => {
            const underTest = setUpFocusActionHandler(sandbox);

            expect(underTest.exhausted.isChecked(1)).to.be.false;

            const degreeOfSuccessOptionData = {
                action: "spellEnhancementUpdate",
                multiplicity: "1"
            };

            const degreeOfSuccessAction = underTest.useDegreeOfSuccessOption(degreeOfSuccessOptionData);

            expect(degreeOfSuccessAction.usedDegreesOfSuccess).to.equal(underTest.spellEnhancement.cost)

            degreeOfSuccessAction.action();

            expect(underTest.spellEnhancement.checked).to.be.true;

            // The adjusted cost should have been modified accordingly
            expect(underTest.adjusted).to.deep.equal({
                _consumed: 1,
                _channeled: 0,
                _channeledConsumed: 1,
                _exhausted: 0
            })
        });

        ["spellEnhancementUpdate", "consumedFocusUpdate", "channeledFocusUpdate", "exhaustedFocusUpdate"].forEach((option) => {
            it("should uncheck the option if already checked and recalculate adjusted cost", () => {
                const degreeOfSuccessOptionData = {
                    action: option,
                    multiplicity: "1",
                };
                const underTest = setUpFocusActionHandler(sandbox);

                underTest.useDegreeOfSuccessOption(degreeOfSuccessOptionData).action()
                const suggestion = underTest.useDegreeOfSuccessOption(degreeOfSuccessOptionData);
                suggestion.action();

                expect(suggestion.usedDegreesOfSuccess).to.be.lessThan(0);
                expect(underTest.adjusted).to.deep.equal({
                    _consumed: 0,
                    _channeled: 0,
                    _channeledConsumed: 0,
                    _exhausted: 0
                })
            });
        });


        it("should properly handle multiple multiplicities", () => {
            const underTest = setUpFocusActionHandler(sandbox);

            // Suppose we check multiplicity 2 for consumed focus
            const multiplicity = 2;

            // Initially, consumed focus multiplicity 2 is unchecked
            expect(underTest.consumed.isChecked(multiplicity)).to.be.false;

            // Prepare the degreeOfSuccessOptionData
            const degreeOfSuccessOptionData = {
                action: "consumedFocusUpdate",
                multiplicity: multiplicity.toString(),
            };

            const degreeOfSuccessAction = underTest.useDegreeOfSuccessOption(degreeOfSuccessOptionData);

            // The degrees of success used should match the option's cost times multiplicity
            expect(degreeOfSuccessAction.usedDegreesOfSuccess).to.equal(underTest.consumed.getCost(multiplicity));

            // Execute the action
            degreeOfSuccessAction.action();

            // The consumed focus option for multiplicity 2 should now be checked
            expect(underTest.consumed.isChecked(multiplicity)).to.be.true;

            // The adjusted cost should be equal to the  effect multiplied by the multiplicity, negated, because we
            // subtract consumed costs internally.
            expect(underTest.adjusted).to.deep.equal({
                _channeled: 0,
                _exhausted: 0,
                _consumed: -2,
                _channeledConsumed: -2
            })
        });

        it("should not allow degree of success options to be used if handler is already used", () => {
            const underTest = setUpFocusActionHandler(sandbox);

            // Mark the handler as used
            underTest.updateSource({used: true});

            // Prepare the degreeOfSuccessOptionData
            const degreeOfSuccessOptionData = {
                action: "consumedFocusUpdate",
                multiplicity: "1",
            };

            const consoleWarnStub = sandbox.stub(console, 'warn');
            underTest.useDegreeOfSuccessOption(degreeOfSuccessOptionData).action();

            expect(underTest.consumed.isChecked(1)).to.be.false;
            //
            expect(underTest.adjusted.multiply(1)).to.deep.equal({
                _consumed: 0,
                _channeled: 0,
                _exhausted: 0,
                _channeledConsumed: 0
            })
            expect(consoleWarnStub.calledWith("Attempt to alter a used cost action")).to.be.true;
        });
    });

    describe("useAction", () => {
        it("should consume cost and mark handler as used when useAction is called", async () => {
            const underTest = setUpFocusActionHandler(sandbox);
            const actionData = {action: "consumeCosts"} as const;
            const agent = underTest.casterReference.getAgent();

            await underTest.useAction(actionData);

            // Handler should now be used
            expect(underTest.used).to.be.true;
            // Agent's consumeCost should have been called with correct parameters
            const expectedCost = underTest.cost;
            expect(agent.consumeCost.calledWith(
                "focus",
                expectedCost.render(),
                underTest.spellReference.getItem().name)
            ).to.be.true;
        });

        it("should not allow useAction to be called if handler is already used", async () => {
            const underTest = setUpFocusActionHandler(sandbox);
            const actionData = {action: "consumeCosts"} as const;

            // Mark the handler as used
            underTest.updateSource({used: true});

            // Stub console.warn
            const consoleWarnStub = sandbox.stub(console, 'warn');

            // Call useAction
            await underTest.useAction(actionData);

            // Agent's consumeCost should not have been called
            const agent = underTest.casterReference.getAgent();
            expect(agent.consumeCost.called).to.be.false;

            // Console should have warned
            expect(consoleWarnStub.calledWith("Attempt to use a used action")).to.be.true;
        });
    });

    describe("Cost calculation", () => {
        it("should calculate cost correctly when options are selected", () => {
            const underTest = setUpFocusActionHandler(sandbox);

            // Select consumed focus option with multiplicity 1
            underTest.consumed.check(1);
            underTest.subtractCost(underTest.consumed.effect.multiply(1));

            // The cost should be base cost plus adjusted
            const baseCost = underTest.spellReference.getItem().getCostsForFinishedRoll(
                underTest.checkReportReference.get().degreeOfSuccess,
                underTest.checkReportReference.get().succeeded
            );

            const expectedCost = baseCost.add(underTest.adjusted);

            expect(underTest.cost).to.deep.equal(expectedCost);
        });
    });

    describe("FocusDegreeOfSuccessOptionField", () => {
        it("should initialize correctly", () => {
            const isOption = true;
            const cost = 1;
            const effect = new CostModifier({_channeled: 0, _channeledConsumed: 0, _exhausted: -1, _consumed: -1});
            const text = "Some text";

            const field = FocusDegreeOfSuccessOptionField.initialize(isOption, cost, effect, text);

            expect(field.isOption).to.equal(isOption);
            expect(field.cost).to.equal(cost);
            expect(field.effect).to.deep.equal(effect);
            expect(field.textTemplate).to.equal(text);
            expect(field.getMultiplicities()).to.deep.equal([1, 2, 4, 8]);
        });

        it("should toggle checked state correctly", () => {
            const field = FocusDegreeOfSuccessOptionField.initialize(true, 1, parseCostString("1V1").asModifier(), "text");

            expect(field.isChecked(1)).to.be.false;

            field.check(1);

            expect(field.isChecked(1)).to.be.true;

            field.check(1);

            expect(field.isChecked(1)).to.be.false;
        });

        it("should calculate cost and effect correctly for multiplicities", () => {
            const effect = new CostModifier({_channeled: 0, _channeledConsumed: 0, _exhausted: -1, _consumed: -1});
            const field = withToObjectReturnsSelf(() => FocusDegreeOfSuccessOptionField.initialize(true, 1, effect, "text"));


            const multiplicity = 2;

            const option = field.forMultiplicity(multiplicity);

            expect(option.multiplicity).to.equal(multiplicity);
            expect(option.cost).to.equal(field.cost * multiplicity);
            expect(option.effect).to.deep.equal(effect.multiply(multiplicity));

            // Check the option
            option.check();

            expect(field.isChecked(multiplicity)).to.be.true;

            // Uncheck the option
            option.check();

            expect(field.isChecked(multiplicity)).to.be.false;
        });
    });
});

function setUpFocusActionHandler(sandbox: SinonSandbox): WithMockedRefs<FocusCostHandler> {
    const spellMock = setUpMockSpellSelfReference(sandbox)
    const checkReportReference = setUpCheckReportSelfReference()
    const actorMock = setUpMockActor(sandbox)
    linkSpellAndActor(spellMock, actorMock)
    setNecessaryDefaultsForSpellproperties(spellMock, sandbox)
    return withToObjectReturnsSelf(() => {
        const handler = FocusCostHandler.initialize(AgentReference.initialize(actorMock), checkReportReference, spellMock);
        injectParent(handler);
        return handler as unknown as WithMockedRefs<FocusCostHandler>;
    });
}

function setNecessaryDefaultsForSpellproperties(spellMock: SinonStubbedInstance<SplittermondSpellItem>, sandbox: sinon.SinonSandbox) {
    sandbox.stub(spellMock, "enhancementCosts").get(() => "1EG/+1V1");
    sandbox.stub(spellMock, "enhancementDescription").get(() => "descriceao")
    sandbox.stub(spellMock, "castDuration").get(() => 3);
    sandbox.stub(spellMock, "description").get(() => "description");
    spellMock.getCostsForFinishedRoll.returns(new Cost(10, 4, false).asPrimaryCost());
    sandbox.stub(spellMock, "degreeOfSuccessOptions").get(() => ({
        consumedFocus: true,
        exhaustedFocus: true,
        channelizedFocus: true,
    } as Record<keyof typeof splittermond.spellEnhancement, boolean>));
    spellMock.name = "name";
}

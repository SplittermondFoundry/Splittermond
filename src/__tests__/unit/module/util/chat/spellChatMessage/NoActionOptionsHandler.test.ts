import {
    setUpMockSpellSelfReference,
    WithMockedRefs,
    withToObjectReturnsSelf
} from "./spellRollMessageTestHelper";
import {
    NoActionOptionsHandler
} from "../../../../../../module/util/chat/spellChatMessage/NoActionOptionsHandler";
import sinon, {SinonSandbox} from "sinon";
import {foundryApi} from "../../../../../../module/api/foundryApi";
import {expect} from "chai";
import {injectParent} from "../../../../testUtils";

describe("NoActionOptionsHandler", () => {
    let sandbox: SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi,"localize").callsFake((text: string) => text)
    });
    afterEach(() => sandbox.restore());

    it("should not render options not presented on the spell", () => {
        const underTest = setUpNoActionsHandler(sandbox);
        underTest.effectDuration.isOption = false;
        underTest.effectArea.isOption = false;
        underTest.range.isOption = false;

        expect(underTest.renderDegreeOfSuccessOptions()).to.have.length(0);
    });

    it("should render options presented on the spell", () => {
        const underTest = setUpNoActionsHandler(sandbox);
        underTest.effectDuration.isOption = true;
        underTest.effectArea.isOption = true;
        underTest.range.isOption = true;

        expect(underTest.renderDegreeOfSuccessOptions()).to.have.length(3*4)
        expect(underTest.renderDegreeOfSuccessOptions()
            .map(o=>o.render.action)).to.contain.members(["effectAreaUpdate", "effectDurationUpdate", "rangeUpdate"])
    });

    [1, 2, 4, 8].forEach((multiplicity) => {

        const effectAreaOptionData = {action: "effectAreaUpdate", multiplicity: `${multiplicity}`};
        const rangeUpdateOptionData = {action: "rangeUpdate", multiplicity: `${multiplicity}`};
        const effectDurationOptionData = {action: "effectDurationUpdate", multiplicity: `${multiplicity}`};

        it(`should check range option for multiplicity ${multiplicity}`, () => {
            const underTest = setUpNoActionsHandler(sandbox);

            const suggestion = underTest.useDegreeOfSuccessOption(rangeUpdateOptionData);
            suggestion.action();

            expect(suggestion.usedDegreesOfSuccess).to.be.greaterThan(0);
            expect(underTest.range.options.isChecked(multiplicity)).to.be.true;

        });

        it(`should check effect duration option for multiplicity ${multiplicity}`, () => {
            const underTest = setUpNoActionsHandler(sandbox);

            const suggestion = underTest.useDegreeOfSuccessOption(effectDurationOptionData);
            suggestion.action();

            expect(suggestion.usedDegreesOfSuccess).to.be.greaterThan(0);
            expect(underTest.effectDuration.options.isChecked(multiplicity)).to.be.true;
        });

        it(`should check effect area option for multiplicity ${multiplicity}`, () => {
            const underTest = setUpNoActionsHandler(sandbox);

            const suggestion = underTest.useDegreeOfSuccessOption(effectAreaOptionData)
            suggestion.action();

            expect(suggestion.usedDegreesOfSuccess).to.be.greaterThan(0);
            expect(underTest.effectArea.options.isChecked(multiplicity)).to.be.true;

        });

        it(`should uncheck range option for multiplicity ${multiplicity}`, () => {
            const underTest = setUpNoActionsHandler(sandbox);

            underTest.useDegreeOfSuccessOption(rangeUpdateOptionData).action();
            const suggestion = underTest.useDegreeOfSuccessOption(rangeUpdateOptionData);
            suggestion.action();

            expect(suggestion.usedDegreesOfSuccess).to.be.lessThan(0);
            expect(underTest.range.options.isChecked(multiplicity)).to.be.false;

        });

        it(`should uncheck effect duration option for multiplicity ${multiplicity}`, () => {
            const underTest = setUpNoActionsHandler(sandbox);

            underTest.useDegreeOfSuccessOption(effectDurationOptionData).action();
            const suggestion = underTest.useDegreeOfSuccessOption(effectDurationOptionData);
            suggestion.action();

            expect(suggestion.usedDegreesOfSuccess).to.be.lessThan(0);
            expect(underTest.effectDuration.options.isChecked(multiplicity)).to.be.false;
        });

        it(`should uncheck effect area option for multiplicity ${multiplicity}`, () => {
            const underTest = setUpNoActionsHandler(sandbox);

            underTest.useDegreeOfSuccessOption(effectAreaOptionData).action();
            const suggestion = underTest.useDegreeOfSuccessOption(effectAreaOptionData)
            suggestion.action();

            expect(suggestion.usedDegreesOfSuccess).to.be.lessThan(0);
            expect(underTest.effectArea.options.isChecked(multiplicity)).to.be.false;

        });


        it(`should produce negative cost for checked range option for multiplicity ${multiplicity}`, () => {
            const underTest = setUpNoActionsHandler(sandbox);

            underTest.useDegreeOfSuccessOption(rangeUpdateOptionData).action();
            const option = underTest.renderDegreeOfSuccessOptions()
                .find(o=>o.render.multiplicity === `${multiplicity}` && o.render.action === "rangeUpdate")

            expect(option?.cost).to.be.lessThan(0);

        });

        it(`should produce negative cost for checked effect area option for multiplicity ${multiplicity}`, () => {
            const underTest = setUpNoActionsHandler(sandbox);

            underTest.useDegreeOfSuccessOption(effectAreaOptionData).action();
            const option = underTest.renderDegreeOfSuccessOptions()
                .find(o=>o.render.multiplicity === `${multiplicity}` && o.render.action === "effectAreaUpdate")

            expect(option?.cost).to.be.lessThan(0);
        });

        it(`should produce negative cost for checked effect duration option for multiplicity ${multiplicity}`, () => {
            const underTest = setUpNoActionsHandler(sandbox);

            underTest.useDegreeOfSuccessOption(effectDurationOptionData).action();
            const option = underTest.renderDegreeOfSuccessOptions()
                .find(o=>o.render.multiplicity === `${multiplicity}` && o.render.action === "effectDurationUpdate")

            expect(option?.cost).to.be.lessThan(0);
        });

        it(`should produce positive cost for checked range option for multiplicity ${multiplicity}`, () => {
            const underTest = setUpNoActionsHandler(sandbox);

            const option = underTest.renderDegreeOfSuccessOptions()
                .find(o=>o.render.multiplicity === `${multiplicity}` && o.render.action === "rangeUpdate")

            expect(option?.cost).to.be.greaterThan(0);

        });

        it(`should produce positive cost for checked effect area option for multiplicity ${multiplicity}`, () => {
            const underTest = setUpNoActionsHandler(sandbox);

            const option = underTest.renderDegreeOfSuccessOptions()
                .find(o=>o.render.multiplicity === `${multiplicity}` && o.render.action === "effectAreaUpdate")

            expect(option?.cost).to.be.greaterThan(0);
        });

        it(`should produce positive cost for checked effect duration option for multiplicity ${multiplicity}`, () => {
            const underTest = setUpNoActionsHandler(sandbox);

            const option = underTest.renderDegreeOfSuccessOptions()
                .find(o=>o.render.multiplicity === `${multiplicity}` && o.render.action === "effectDurationUpdate")

            expect(option?.cost).to.be.greaterThan(0);
        });
    });
});

function setUpNoActionsHandler(sandbox: SinonSandbox): WithMockedRefs<NoActionOptionsHandler> {
    const spellMock = setUpMockSpellSelfReference(sandbox)
    sandbox.stub(spellMock,"degreeOfSuccessOptions").value({effectArea: true, range: true, effectDuration: true});
    return withToObjectReturnsSelf(() => {
        const handler = NoActionOptionsHandler.initialize(spellMock)
        injectParent(handler);
        return handler;
    })
}
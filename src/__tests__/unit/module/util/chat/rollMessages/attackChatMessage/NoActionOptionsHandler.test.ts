import { setUpMockActor, setUpMockAttackSelfReference } from "./attackRollMessageTestHelper";
import { NoActionOptionsHandler } from "module/util/chat/rollMessages/attackChatMessage/NoActionOptionsHandler";
import sinon, { SinonSandbox } from "sinon";
import { foundryApi } from "module/api/foundryApi";
import { expect } from "chai";

describe("NoActionOptionsHandler", () => {
    let sandbox: SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "localize").callsFake((text: string) => text);
    });
    afterEach(() => sandbox.restore());

    it("should not render range options for melee attacks", () => {
        const underTest = setUpNoActionsHandler(sandbox, false);
        underTest.range.isOption = false;

        expect(underTest.renderDegreeOfSuccessOptions()).to.have.length(0);
    });

    it("should render range options for ranged attacks", () => {
        const underTest = setUpNoActionsHandler(sandbox, true);
        underTest.range.isOption = true;

        expect(underTest.renderDegreeOfSuccessOptions()).to.have.length(4);
        expect(underTest.renderDegreeOfSuccessOptions().map((o) => o.render.action)).to.contain("rangeUpdate");
    });

    [1, 2, 4, 8].forEach((multiplicity) => {
        const rangeUpdateOptionData = { action: "rangeUpdate", multiplicity: `${multiplicity}` };

        it(`should check range option for multiplicity ${multiplicity}`, () => {
            const underTest = setUpNoActionsHandler(sandbox, true);

            const suggestion = underTest.useDegreeOfSuccessOption(rangeUpdateOptionData);
            suggestion.action();

            expect(suggestion.usedDegreesOfSuccess).to.be.greaterThan(0);
            expect(underTest.range.options.isChecked(multiplicity)).to.be.true;
        });

        it(`should uncheck range option for multiplicity ${multiplicity}`, () => {
            const underTest = setUpNoActionsHandler(sandbox, true);

            underTest.useDegreeOfSuccessOption(rangeUpdateOptionData).action();
            const suggestion = underTest.useDegreeOfSuccessOption(rangeUpdateOptionData);
            suggestion.action();

            expect(suggestion.usedDegreesOfSuccess).to.be.lessThan(0);
            expect(underTest.range.options.isChecked(multiplicity)).to.be.false;
        });
    });
});

function setUpNoActionsHandler(sandbox: SinonSandbox, isRangedAttack: boolean = false): NoActionOptionsHandler {
    const mockActor = setUpMockActor(sandbox);
    const mockAttack: ReturnType<typeof setUpMockAttackSelfReference> = setUpMockAttackSelfReference(
        sandbox,
        mockActor
    );

    // Set skill to ranged or melee based on test needs
    if (isRangedAttack) {
        Object.defineProperty(mockAttack, "skill", {
            value: { id: "longrange", attributes: {}, points: 5 },
            enumerable: true,
        });
    }

    return NoActionOptionsHandler.initialize(mockAttack);
}

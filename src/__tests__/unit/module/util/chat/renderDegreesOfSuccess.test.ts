import { describe } from "mocha";
import { renderDegreesOfSuccess } from "module/util/chat/renderDegreesOfSuccess";
import { expect } from "chai";

describe("calculateDegreeOfSuccessDisplay", () => {
    it("should prefer to put bonus degrees on open degrees of success", () => {
        const checkDegrees = { degreeOfSuccessMessage: "", degreeOfSuccess: { fromRoll: 2, modification: 1 } };
        const openDegreesOfSuccess = 1;
        const result = renderDegreesOfSuccess(checkDegrees, openDegreesOfSuccess);
        expect(result).to.deep.equal({
            degreeOfSuccessMessage: checkDegrees.degreeOfSuccessMessage,
            totalDegreesOfSuccess: 3,
            usedDegreesOfSuccess: 2,
            usedBonusDegreesOfSuccess: 0,
            openDegreesOfSuccess: 0,
            openBonusDegreesOfSuccess: 1,
        });
    });

    it("should use bonus degrees if no normal are available", () => {
        const checkDegrees = { degreeOfSuccessMessage: "", degreeOfSuccess: { fromRoll: 4, modification: 3 } };
        const openDegreesOfSuccess = 1;
        const result = renderDegreesOfSuccess(checkDegrees, openDegreesOfSuccess);
        expect(result).to.deep.equal({
            degreeOfSuccessMessage: checkDegrees.degreeOfSuccessMessage,
            totalDegreesOfSuccess: 7,
            usedDegreesOfSuccess: 4,
            usedBonusDegreesOfSuccess: 2,
            openDegreesOfSuccess: 0,
            openBonusDegreesOfSuccess: 1,
        });
    });

    it("should not set used bonus degrees when there are open ones", () => {
        const checkDegrees = { degreeOfSuccessMessage: "", degreeOfSuccess: { fromRoll: 4, modification: 3 } };
        const openDegreesOfSuccess = 6;
        const result = renderDegreesOfSuccess(checkDegrees, openDegreesOfSuccess);
        expect(result).to.deep.equal({
            degreeOfSuccessMessage: checkDegrees.degreeOfSuccessMessage,
            totalDegreesOfSuccess: 7,
            usedDegreesOfSuccess: 1,
            usedBonusDegreesOfSuccess: 0,
            openDegreesOfSuccess: 3,
            openBonusDegreesOfSuccess: 3,
        });
    });
});

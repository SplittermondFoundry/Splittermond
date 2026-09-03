import { describe, beforeEach, afterEach } from "mocha";
import { expect } from "chai";
import sinon, { SinonSandbox } from "sinon";
import SplittermondActor from "module/actor/actor";
import { modifyEvaluation } from "module/check/modifyEvaluation";
import ModifierManager from "module/actor/modifiers/modifier-manager";
import type { GenericRollEvaluation } from "module/check/types";
import type { CheckType } from "module/check/CheckModifierHandler";
import type { SplittermondSkill } from "module/config/skillGroups";
import { CharacterDataModel } from "module/actor/dataModel/CharacterDataModel";
import { NpcDataModel } from "module/actor/dataModel/NpcDataModel";

type ModifyEvaluationInput = GenericRollEvaluation & {
    skill: SplittermondSkill;
    type: CheckType;
};

function baseCheckReport(overrides: Partial<ModifyEvaluationInput> = {}): ModifyEvaluationInput {
    return {
        difficulty: 15,
        rollType: "standard",
        succeeded: true,
        isFumble: false,
        isCrit: false,
        degreeOfSuccess: { fromRoll: 3, modification: 0, limitedTo: 999 },
        degreeOfSuccessMessage: "",
        roll: { total: 18, dice: [{ total: 9 }], getTooltip: () => Promise.resolve("") },
        skill: "acrobatics",
        type: "skill",
        ...overrides,
    };
}

function setUpActor(sandbox: SinonSandbox, type: "character" | "npc", skillPoints: number) {
    const actor = sandbox.createStubInstance(SplittermondActor);
    Object.defineProperty(actor, "type", { value: type, enumerable: true, writable: false });
    Object.defineProperty(actor, "modifier", {
        value: new ModifierManager(),
        enumerable: true,
        writable: false,
    });
    const systemStub =
        type === "character"
            ? sandbox.createStubInstance(CharacterDataModel)
            : sandbox.createStubInstance(NpcDataModel);
    systemStub.updateSource.callThrough();
    systemStub.updateSource({ skills: { acrobatics: { points: skillPoints, value: 0 } } });
    actor.system = systemStub;
    return actor;
}

describe("modifyEvaluation", () => {
    let sandbox: SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });
    afterEach(() => sandbox.restore());

    describe("limitUnfamiliarSkillSuccessForPlayers", () => {
        it("clamps positive roll degrees of success to zero for a character with no skill points", async () => {
            const actor = setUpActor(sandbox, "character", 0);
            const checkReport = baseCheckReport({ degreeOfSuccess: { fromRoll: 4, modification: 0, limitedTo: 999 } });

            const result = await modifyEvaluation(checkReport, actor);

            expect(result.degreeOfSuccess.fromRoll).to.equal(0);
        });

        it("leaves negative roll degrees of success unchanged for a character with no skill points", async () => {
            const actor = setUpActor(sandbox, "character", 0);
            const checkReport = baseCheckReport({ degreeOfSuccess: { fromRoll: -3, modification: 0, limitedTo: 999 } });

            const result = await modifyEvaluation(checkReport, actor);

            expect(result.degreeOfSuccess.fromRoll).to.equal(-3);
        });

        it("does not clamp roll degrees of success for a character with skill points", async () => {
            const actor = setUpActor(sandbox, "character", 5);
            const checkReport = baseCheckReport({ degreeOfSuccess: { fromRoll: 4, modification: 0, limitedTo: 999 } });

            const result = await modifyEvaluation(checkReport, actor);

            expect(result.degreeOfSuccess.fromRoll).to.equal(4);
        });

        it("does not clamp roll degrees of success for an npc with no skill points", async () => {
            const actor = setUpActor(sandbox, "npc", 0);
            const checkReport = baseCheckReport({ degreeOfSuccess: { fromRoll: 4, modification: 0, limitedTo: 999 } });

            const result = await modifyEvaluation(checkReport, actor);

            expect(result.degreeOfSuccess.fromRoll).to.equal(4);
        });

        it("does not clamp roll degrees of success for an npc with skill points", async () => {
            const actor = setUpActor(sandbox, "npc", 5);
            const checkReport = baseCheckReport({ degreeOfSuccess: { fromRoll: 4, modification: 0, limitedTo: 999 } });

            const result = await modifyEvaluation(checkReport, actor);

            expect(result.degreeOfSuccess.fromRoll).to.equal(4);
        });

        it("clamps to zero even when the roll degrees of success are very high", async () => {
            const actor = setUpActor(sandbox, "character", 0);
            const checkReport = baseCheckReport({ degreeOfSuccess: { fromRoll: 12, modification: 0, limitedTo: 999 } });

            const result = await modifyEvaluation(checkReport, actor);

            expect(result.degreeOfSuccess.fromRoll).to.equal(0);
        });
    });

    describe("passthrough and modification", () => {
        it("preserves the checkReport fields other than degreeOfSuccess", async () => {
            const actor = setUpActor(sandbox, "character", 5);
            const checkReport = baseCheckReport({
                difficulty: 20,
                succeeded: true,
                isFumble: false,
                isCrit: true,
                degreeOfSuccessMessage: "message",
            });

            const result = await modifyEvaluation(checkReport, actor);

            expect(result.difficulty).to.equal(20);
            expect(result.succeeded).to.be.true;
            expect(result.isFumble).to.be.false;
            expect(result.isCrit).to.be.true;
            expect(result.degreeOfSuccessMessage).to.equal("message");
        });

        it("keeps the modification at zero when no check.result modifiers are registered", async () => {
            const actor = setUpActor(sandbox, "character", 5);
            const checkReport = baseCheckReport({ degreeOfSuccess: { fromRoll: 3, modification: 0, limitedTo: 999 } });

            const result = await modifyEvaluation(checkReport, actor);

            expect(result.degreeOfSuccess.modification).to.equal(0);
        });

        it("does not mutate the input checkReport", async () => {
            const actor = setUpActor(sandbox, "character", 0);
            const checkReport = baseCheckReport({ degreeOfSuccess: { fromRoll: 4, modification: 0, limitedTo: 999 } });

            await modifyEvaluation(checkReport, actor);

            expect(checkReport.degreeOfSuccess.fromRoll).to.equal(4);
        });
    });
});

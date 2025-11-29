import sinon, { SinonSandbox } from "sinon";
import { createTestRoll, stubFoundryRoll, stubRollApi } from "__tests__/unit/RollMock";
import { expect } from "chai";
import { describe } from "mocha";
import SplittermondActor from "module/actor/actor";
import { CharacterDataModel } from "module/actor/dataModel/CharacterDataModel";
import ModifierManager from "module/actor/modifiers/modifier-manager";
import Skill from "module/actor/skill";
import { foundryApi } from "module/api/foundryApi";
import { ChatMessage } from "module/api/ChatMessage";
import { Dice } from "module/check/dice";
import { Chat } from "module/util/chat";
import CheckDialog from "module/apps/dialog/check-dialog";
import type { IModifier } from "module/modifiers";
import { evaluate, isGreaterZero, of } from "module/modifiers/expressions/scalar";

type SkillCheckReport = Exclude<Awaited<ReturnType<Skill["roll"]>>, false | typeof ChatMessage>;
describe("Skill", () => {
    let sandbox: SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => key);
        sandbox.stub(foundryApi, "currentUser").get(() => ({
            targets: new Set(),
        }));
        stubRollApi(sandbox);
    });

    afterEach(() => sandbox.restore());

    it("should allow overwriting options with the check dialog", async () => {
        const actor = setUpActor(sandbox);
        const underTest = Skill.initialize(actor, "Testskill");

        const customOptions = {
            type: "test roll",
            difficulty: 20,
            modifier: 1,
            askUser: true,
        };
        const checkDialogStub = sandbox.stub(CheckDialog, "create").resolves({
            difficulty: "25", // changed from 20 to 25
            maneuvers: [],
            modifier: 3, // changed from 1 to 3
            modifierElements: [{ value: 3, description: "modifier" }],
            rollMode: "gmroll", // changed from publicroll to gmroll
            rollType: "risk", // changed from standard to risk
        });
        sandbox.stub(foundryApi, "settings").get(() => ({
            get: () => "publicroll",
        }));
        sandbox.stub(foundryApi, "rollModes").get(() => ({}));

        const roll = {
            dice: [],
            total: 26,
            getTooltip: () => "",
        };
        const diceCheckStub = sandbox.stub(Dice, "check").returns({
            difficulty: 25,
            succeeded: true,
            isFumble: false,
            isCrit: false,
            degreeOfSuccess: { fromRoll: 0, modification: 0 },
            degreeOfSuccessMessage: "(Knapp) gelungen",
            roll,
        });
        const chatPrepareStub = sandbox.stub(Chat, "prepareCheckMessageData").resolves();
        const createMessageStub = sandbox.stub(foundryApi, "createChatMessage").resolves();

        await underTest.roll(customOptions);

        expect(checkDialogStub.calledOnce).to.be.true;
        expect(diceCheckStub.calledOnce).to.be.true;
        expect(chatPrepareStub.calledOnce).to.be.true;
        expect(chatPrepareStub.firstCall.args[0]).to.equal(actor);
        expect(chatPrepareStub.firstCall.args[1]).to.equal("gmroll");
        expect(chatPrepareStub.firstCall.args[2]).to.equal(roll);
        expect(chatPrepareStub.firstCall.args[3]).to.be.an("object");
        expect(chatPrepareStub.firstCall.args[3]).to.deep.include({
            availableSplinterpoints: 0,
            degreeOfSuccess: { fromRoll: 0, modification: 0 },
            difficulty: 25,
            hideDifficulty: false,
            isCrit: false,
            isFumble: false,
            maneuvers: [],
            modifierElements: [
                {
                    value: "3",
                    description: "modifier",
                    isMalus: false,
                },
            ],
            rollType: "risk",
            skill: "testskill",
            skillAttributes: {},
            skillPoints: 0,
            skillValue: 0,
            succeeded: true,
            type: "test roll",
        });
        expect(createMessageStub.calledOnce).to.be.true;
    });

    it("should use the passed options if askUser is false", async () => {
        const actor = setUpActor(sandbox);
        const underTest = Skill.initialize(actor, "Testskill");

        const roll = {
            dice: [],
            total: 26,
            getTooltip: () => "",
        };
        const diceCheckStub = sandbox.stub(Dice, "check").returns({
            difficulty: 20,
            succeeded: true,
            isFumble: false,
            isCrit: false,
            degreeOfSuccess: { fromRoll: 3, modification: 0 },
            degreeOfSuccessMessage: "(Gut) gelungen",
            roll,
        });
        const chatPrepareStub = sandbox.stub(Chat, "prepareCheckMessageData").resolves();
        const createMessageStub = sandbox.stub(foundryApi, "createChatMessage").resolves();

        const customOptions = {
            type: "test roll",
            difficulty: 20,
            modifier: 1,
            askUser: false,
        };

        await underTest.roll(customOptions);

        expect(diceCheckStub.calledOnce).to.be.true;
        expect(chatPrepareStub.calledOnce).to.be.true;
        expect(chatPrepareStub.firstCall.args[0]).to.equal(actor);
        expect(chatPrepareStub.firstCall.args[1]).to.equal("publicroll");
        expect(chatPrepareStub.firstCall.args[2]).to.equal(roll);
        expect(chatPrepareStub.firstCall.args[3]).to.be.an("object");
        expect(chatPrepareStub.firstCall.args[3]).to.deep.include({
            availableSplinterpoints: 0,
            degreeOfSuccess: { fromRoll: 3, modification: 0 },
            difficulty: 20,
            hideDifficulty: false,
            isCrit: false,
            isFumble: false,
            maneuvers: [],
            modifierElements: [
                {
                    value: "1",
                    description: "splittermond.modifier",
                    isMalus: false,
                },
            ],
            rollType: "standard",
            skill: "testskill",
            skillAttributes: {},
            skillPoints: 0,
            skillValue: 0,
            succeeded: true,
            type: "test roll",
        });
        expect(createMessageStub.calledOnce).to.be.true;
    });

    it("should use default options if askUser is false and no options where passed", async () => {
        const actor = setUpActor(sandbox);
        const underTest = Skill.initialize(actor, "Testskill");

        const roll = {
            dice: [],
            total: 26,
            getTooltip: () => "",
        };
        const diceCheckStub = sandbox.stub(Dice, "check").returns({
            difficulty: 15,
            succeeded: true,
            isFumble: false,
            isCrit: false,
            degreeOfSuccess: { fromRoll: 3, modification: 0 },
            degreeOfSuccessMessage: "(Gut) gelungen",
            roll,
        });
        const chatPrepareStub = sandbox.stub(Chat, "prepareCheckMessageData").resolves();
        const createMessageStub = sandbox.stub(foundryApi, "createChatMessage").resolves();

        const customOptions = {
            askUser: false,
        };

        await underTest.roll(customOptions);

        expect(diceCheckStub.calledOnce).to.be.true;
        expect(chatPrepareStub.calledOnce).to.be.true;
        expect(chatPrepareStub.firstCall.args[0]).to.equal(actor);
        expect(chatPrepareStub.firstCall.args[1]).to.equal("publicroll");
        expect(chatPrepareStub.firstCall.args[2]).to.equal(roll);
        expect(chatPrepareStub.firstCall.args[3]).to.be.an("object");
        expect(chatPrepareStub.firstCall.args[3]).to.deep.include({
            availableSplinterpoints: 0,
            degreeOfSuccess: { fromRoll: 3, modification: 0 },
            difficulty: 15,
            hideDifficulty: false,
            isCrit: false,
            isFumble: false,
            maneuvers: [],
            modifierElements: [],
            rollType: "standard",
            skill: "testskill",
            skillAttributes: {},
            skillPoints: 0,
            skillValue: 0,
            succeeded: true,
            type: "skill",
        });
        expect(createMessageStub.calledOnce).to.be.true;
    });

    describe("roll modification", () => {
        beforeEach(() => {
            sandbox.stub(foundryApi, "createChatMessage");
            sandbox.stub(foundryApi, "chatMessageTypes").get(() => ({ OTHER: 0 }));
            sandbox.stub(ChatMessage, "applyRollMode").callsFake((data: any) => data);
        });
        it("should apply roll modifiers", async () => {
            const actor = setUpActor(sandbox);
            const mod = getModifier({ groupId: "check.result", attributes: { category: "success" } });
            actor.system.updateSource({
                attributes: { strength: { initial: 2 }, agility: { initial: 3 } },
                skills: { acrobatics: { value: 10, points: 5 } },
            });
            actor.modifier.addModifier(mod);
            stubFoundryRoll(createTestRoll("2d10", [2, 3], actor.system.skills.acrobatics.value));

            const result = (await Skill.initialize(actor, "acrobatics").roll({
                type: "attack",
                askUser: false,
                difficulty: 15,
            })) as SkillCheckReport;

            expect(result.report.degreeOfSuccess.fromRoll).to.equal(0);
            expect(result.report.degreeOfSuccess.modification).to.equal(evaluate(mod.value));
        });

        it("should apply success roll modifiers to outstanding rolls", async () => {
            const actor = setUpActor(sandbox);
            const mod = getModifier({ groupId: "check.result", attributes: { category: "success" } });
            actor.system.updateSource({
                attributes: { strength: { initial: 2 }, agility: { initial: 3 } },
                skills: { acrobatics: { value: 10, points: 5 } },
            });
            actor.modifier.addModifier(mod);
            stubFoundryRoll(createTestRoll("2d10", [10, 10], actor.system.skills.acrobatics.value));

            const result = (await Skill.initialize(actor, "acrobatics").roll({
                type: "attack",
                askUser: false,
                difficulty: 15,
            })) as SkillCheckReport;

            expect(result.report.degreeOfSuccess.fromRoll).to.equal(8);
            expect(result.report.degreeOfSuccess.modification).to.equal(evaluate(mod.value));
        });

        it("should apply failure roll modifiers to devastating rolls", async () => {
            const actor = setUpActor(sandbox);
            const mod = getModifier({ groupId: "check.result", attributes: { category: "failure" } });
            actor.system.updateSource({
                attributes: { strength: { initial: 2 }, agility: { initial: 3 } },
                skills: { acrobatics: { value: 10, points: 5 } },
            });
            actor.modifier.addModifier(mod);
            stubFoundryRoll(createTestRoll("2d10", [1, 1], actor.system.skills.acrobatics.value));

            const result = (await Skill.initialize(actor, "acrobatics").roll({
                type: "attack",
                askUser: false,
                difficulty: 30,
            })) as SkillCheckReport;

            expect(result.report.degreeOfSuccess.fromRoll).to.equal(-9); //malus by Fumble
            expect(result.report.degreeOfSuccess.modification).to.equal(evaluate(mod.value));
        });

        it("should ignore modifiers for wrong category", async () => {
            const actor = setUpActor(sandbox);
            const mod = getModifier({ groupId: "check.result", attributes: { category: "nearmiss" } });
            actor.system.updateSource({
                attributes: { strength: { initial: 2 }, agility: { initial: 3 } },
                skills: { acrobatics: { value: 10, points: 5 } },
            });
            actor.modifier.addModifier(mod);
            stubFoundryRoll(createTestRoll("2d10", [2, 3], actor.system.skills.acrobatics.value));

            const result = (await Skill.initialize(actor, "acrobatics").roll({
                type: "attack",
                askUser: false,
                difficulty: 15,
            })) as SkillCheckReport;

            expect(result.report.degreeOfSuccess.fromRoll).to.equal(0);
            expect(result.report.degreeOfSuccess.modification).to.equal(0);
        });

        it("should filter modifiers by skill", async () => {
            const actor = setUpActor(sandbox);
            const mod = getModifier({
                groupId: "check.result",
                attributes: { category: "success", skill: "acrobatics" },
            });
            actor.system.updateSource({
                attributes: { strength: { initial: 2 }, agility: { initial: 3 } },
                skills: { acrobatics: { value: 10, points: 5 } },
            });
            actor.modifier.addModifier(mod);
            stubFoundryRoll(createTestRoll("2d10", [2, 3], actor.system.skills.acrobatics.value));

            const result = (await Skill.initialize(actor, "acrobatics").roll({
                type: "attack",
                askUser: false,
                difficulty: 15,
            })) as SkillCheckReport;

            expect(result.report.degreeOfSuccess.fromRoll).to.equal(0);
            expect(result.report.degreeOfSuccess.modification).to.equal(evaluate(mod.value));
        });

        it("should ignore modifiers for wrong skill", async () => {
            const actor = setUpActor(sandbox);
            const mod = getModifier({
                groupId: "check.result",
                attributes: { category: "success", skill: "melee" },
            });
            actor.system.updateSource({
                attributes: { strength: { initial: 2 }, agility: { initial: 3 } },
                skills: { acrobatics: { value: 10, points: 5 } },
            });
            actor.modifier.addModifier(mod);
            stubFoundryRoll(createTestRoll("2d10", [2, 3], actor.system.skills.acrobatics.value));

            const result = (await Skill.initialize(actor, "acrobatics").roll({
                type: "attack",
                askUser: false,
                difficulty: 15,
            })) as SkillCheckReport;

            expect(result.report.degreeOfSuccess.fromRoll).to.equal(0);
            expect(result.report.degreeOfSuccess.modification).to.equal(0);
        });

        it("should apply check type filter", async () => {
            const actor = setUpActor(sandbox);
            const mod = getModifier({
                groupId: "check.result",
                attributes: { category: "success", checkType: "attack" },
            });
            actor.system.updateSource({
                attributes: { strength: { initial: 2 }, agility: { initial: 3 } },
                skills: { acrobatics: { value: 10, points: 5 } },
            });
            actor.modifier.addModifier(mod);
            stubFoundryRoll(createTestRoll("2d10", [2, 3], actor.system.skills.acrobatics.value));

            const result = (await Skill.initialize(actor, "acrobatics").roll({
                type: "attack",
                askUser: false,
                difficulty: 15,
            })) as SkillCheckReport;

            expect(result.report.degreeOfSuccess.fromRoll).to.equal(0);
            expect(result.report.degreeOfSuccess.modification).to.equal(evaluate(mod.value));
        });

        it("should ignore wrong check type filter", async () => {
            const actor = setUpActor(sandbox);
            const mod = getModifier({
                groupId: "check.result",
                attributes: { category: "success", checkType: "defense" },
            });
            actor.system.updateSource({
                attributes: { strength: { initial: 2 }, agility: { initial: 3 } },
                skills: { acrobatics: { value: 10, points: 5 } },
            });
            actor.modifier.addModifier(mod);
            stubFoundryRoll(createTestRoll("2d10", [2, 3], actor.system.skills.acrobatics.value));

            const result = (await Skill.initialize(actor, "acrobatics").roll({
                type: "attack",
                askUser: false,
                difficulty: 15,
            })) as SkillCheckReport;

            expect(result.report.degreeOfSuccess.fromRoll).to.equal(0);
            expect(result.report.degreeOfSuccess.modification).to.equal(0);
        });
    });
});

function setUpActor(sandbox: SinonSandbox) {
    const actor = sandbox.createStubInstance(SplittermondActor);
    const dataModel = sandbox.createStubInstance(CharacterDataModel);
    Object.defineProperty(dataModel, "experience", {
        value: { heroLevel: 1 },
        enumerable: true,
        writable: false,
    });
    Object.defineProperty(actor, "getFlag", { value: sandbox.stub(), enumerable: true, writable: false });
    Object.defineProperty(actor, "modifier", { value: new ModifierManager(), enumerable: true, writable: false });
    Object.defineProperty(actor, "system", { value: dataModel, enumerable: true, writable: true });
    Object.defineProperty(actor, "attributes", { value: {}, enumerable: true, writable: true });
    Object.defineProperty(actor, "uuid", { value: "Actor.test-actor-uuid", enumerable: true, writable: false });
    Object.defineProperty(actor.system, "skills", { value: {}, enumerable: true, writable: true });
    Object.defineProperty(actor, "items", { value: [], enumerable: true, writable: true });
    actor.findItem.callThrough();
    actor.update.callThrough();
    dataModel.updateSource.callThrough();
    return actor;
}

type ModifierPartial = Omit<Partial<IModifier>, "attributes"> & { attributes?: Partial<IModifier["attributes"]> };
function getModifier(mod: ModifierPartial = {}): IModifier {
    return {
        groupId: mod.groupId ?? "test.modifier",
        attributes: {
            ...mod.attributes,
            name: mod.attributes?.name ?? "Test Modifier",
            type: mod.attributes?.type ?? "innate",
        },
        selectable: mod.selectable ?? false,
        origin: null,
        isBonus: (mod.value && isGreaterZero(mod.value)) ?? true,
        value: mod.value ?? of(1),
        addTooltipFormulaElements: () => {},
    };
}

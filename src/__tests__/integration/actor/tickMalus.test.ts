import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import sinon, { type SinonSandbox } from "sinon";
import type SplittermondActor from "module/actor/actor";
import Skill from "module/actor/skill";
import { foundryApi } from "module/api/foundryApi";
import { ChatMessage } from "module/api/ChatMessage";
import SplittermondCombat from "module/combat/combat";
import { SplittermondChatMessage } from "module/data/SplittermondChatMessage";
import type { CheckReport } from "module/check";
import { handleChatAction } from "module/util/chat/SplittermondChatCard";
import { AttackRollMessage } from "module/util/chat/rollMessages/attackChatMessage/AttackRollMessage";
import { SpellRollMessage } from "module/util/chat/rollMessages/spellChatMessage/SpellRollMessage";
import { withActor } from "../fixtures";
import { passesEventually } from "../../util";

export function tickMalusTest({ describe, it, expect }: QuenchBatchContext) {
    describe("Tick malus when releasing prepared actions", () => {
        it(
            "persists the combined tick malus and charges a ranged release once",
            withReleaseCombat(async (actor, combat, sandbox, messageIds) => {
                await createTestBow(actor);
                await addTickMalus(actor, "tickmalus.mod +2, tickmalus.armor.mod +1, tickmalus.shield.mod +1", 4);
                stubSkillCheck(sandbox, "longrange", 0);

                const attack = actor.attacks.find((candidate) => candidate.skill.id === "longrange")!;
                expect(await attack.weaponSpeedAsync(), "preparation remains unchanged").to.equal(8);
                await attack.roll();

                const message = expectReleaseCost(messageIds[0], 7);
                await expectReleaseAdvancesCombatOnce(message, combat, 17);
            })
        );

        it(
            "persists the combined tick malus and charges a spell release with an EG reduction once",
            withReleaseCombat(async (actor, combat, sandbox, messageIds) => {
                await createTestSpell(actor, { castDuration: true });
                await addTickMalus(actor, "tickmalus.mod +2, tickmalus.armor.mod +1, tickmalus.shield.mod +1", 4);
                stubSkillCheck(sandbox, "lightmagic", 6);

                await rollSpell(actor);

                const message = expectReleaseCost(messageIds[0], 7);
                await handleChatAction({ action: "castDurationUpdate", multiplicity: "2" }, message.id);
                await expectReleaseAdvancesCombatOnce(message, combat, 15);
            })
        );

        it(
            "persists the combined tick malus and charges a spell without a release reduction option once",
            withReleaseCombat(async (actor, combat, sandbox, messageIds) => {
                await createTestSpell(actor, { castDuration: false });
                await addTickMalus(actor, "tickmalus.mod +2, tickmalus.armor.mod +1, tickmalus.shield.mod +1", 4);
                stubSkillCheck(sandbox, "lightmagic", 6);

                await rollSpell(actor);

                const message = expectReleaseCost(messageIds[0], 7);
                await expectReleaseAdvancesCombatOnce(message, combat, 17);
            })
        );

        it(
            "evaluates a dice tick malus, persists the spell release cost and charges it once",
            withReleaseCombat(async (actor, combat, sandbox, messageIds) => {
                await createTestSpell(actor, { castDuration: false });
                await addTickMalus(actor, "tickmalus.mod +6W1", 6);
                stubSkillCheck(sandbox, "lightmagic", 6);

                await rollSpell(actor);

                const message = expectReleaseCost(messageIds[0], 9);
                await expectReleaseAdvancesCombatOnce(message, combat, 19);
            })
        );
    });

    async function addTickMalus(actor: SplittermondActor, modifier: string, expected: number) {
        await actor.createEmbeddedDocuments("Item", [
            { type: "strength", name: "Tick malus test", system: { modifier } },
        ]);
        await passesEventually(() => expect(actor.modifier.getForId("tickmalus").getModifiers()).to.have.length(1));
        expect(await actor.tickMalus.calculate()).to.equal(expected);
        await actor.update({ name: `${actor.name} updated` });
        expect(await actor.tickMalus.calculate()).to.equal(expected);
    }

    async function rollSpell(actor: SplittermondActor) {
        const spell = actor.spells[0];
        expect(await spell.castDuration.inTicks(), "focusing remains unchanged").to.equal(8);
        await spell.roll({});
    }

    function expectReleaseCost(messageId: string, expected: number) {
        const message = foundryApi.messages.get(messageId);
        if (!(message instanceof SplittermondChatMessage)) throw new Error("Missing roll chat message");
        const model = message.system;
        if (!(model instanceof SpellRollMessage || model instanceof AttackRollMessage)) {
            throw new Error("Unexpected roll model");
        }
        expect(model.tickCostHandler.baseTickCost).to.equal(expected);
        expect(model.getData().actions.advanceToken).to.deep.contain({ value: `${expected}` });
        return message;
    }

    async function expectReleaseAdvancesCombatOnce(
        message: SplittermondChatMessage,
        combat: SplittermondCombat,
        expectedTick: number
    ) {
        await handleChatAction({ action: "advanceToken" }, message.id);
        expect(combat.combatants.contents[0].initiative).to.equal(expectedTick);
        await handleChatAction({ action: "advanceToken" }, message.id);
        expect(combat.combatants.contents[0].initiative, "release is only paid once").to.equal(expectedTick);
    }
}

function createTestBow(actor: SplittermondActor) {
    return actor.createEmbeddedDocuments("Item", [
        {
            type: "weapon",
            name: "Test bow",
            system: {
                skill: "longrange",
                attribute1: "agility",
                attribute2: "strength",
                damage: "1W6",
                equipped: true,
                weaponSpeed: 8,
            },
        },
    ]);
}

function createTestSpell(actor: SplittermondActor, degreeOfSuccessOptions: { castDuration: boolean }) {
    return actor.createEmbeddedDocuments("Item", [
        {
            type: "spell",
            name: "Test spell",
            system: {
                skill: "lightmagic",
                spellType: "",
                difficulty: "15",
                costs: "1",
                castDuration: { value: 8, unit: "T" },
                degreeOfSuccessOptions,
            },
        },
    ]);
}

function stubSkillCheck(sandbox: SinonSandbox, skill: "longrange" | "lightmagic", degreesOfSuccess: number) {
    sandbox.stub(Skill.prototype, "roll").resolves({
        report: reportFor(skill, degreesOfSuccess),
        rollOptions: { style: 0, rolls: [], whisper: [], blind: false },
    });
}

function withReleaseCombat(
    test: (
        actor: SplittermondActor,
        combat: SplittermondCombat,
        sandbox: SinonSandbox,
        messages: string[]
    ) => Promise<void>
) {
    return withActor(async (actor) => {
        const combat = (await SplittermondCombat.create({ active: false, scene: null })) as SplittermondCombat;
        const sandbox = sinon.createSandbox();
        const messages: string[] = [];
        try {
            const createMessage = foundryApi.createChatMessage.bind(foundryApi);
            sandbox.stub(foundryApi, "createChatMessage").callsFake(async (data) => {
                const message = await createMessage(data);
                messages.push(message.id);
                return message;
            });
            // Select an isolated real combat without changing the user's active encounter or scene.
            sandbox.stub(foundryApi, "combat").get(() => combat);
            await combat.createEmbeddedDocuments("Combatant", [{ type: "base", actorId: actor.id, initiative: 10 }]);
            await test(actor, combat, sandbox, messages);
        } finally {
            sandbox.restore();
            try {
                await ChatMessage.deleteDocuments(messages);
            } finally {
                await SplittermondCombat.deleteDocuments([combat.id]);
            }
        }
    });
}

function reportFor(skill: "longrange" | "lightmagic", degreesOfSuccess: number): CheckReport {
    return {
        succeeded: true,
        degreeOfSuccess: { fromRoll: degreesOfSuccess, modification: 0, limitedTo: 999 },
        degreeOfSuccessMessage: "",
        difficulty: 15,
        defenseType: null,
        hideDifficulty: false,
        isCrit: false,
        isFumble: false,
        modifierElements: [],
        roll: { dice: [], tooltip: "", total: 15 },
        rollType: "standard",
        skill: { attributes: {}, id: skill, points: 0 },
        maneuvers: [],
    };
}

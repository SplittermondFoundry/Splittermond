import { withActor, withScene } from "./fixtures.js";
import { ChatMessage } from "../../module/api/ChatMessage";
import { handleChatAction, SplittermondChatCard } from "module/util/chat/SplittermondChatCard";
import { foundryApi } from "module/api/foundryApi";
import { SimpleMessage, SplittermondChatMessage } from "module/data/SplittermondChatMessage";
import type { Hooks } from "module/api/foundryTypes";
import SplittermondActor from "../../module/actor/actor";
import SplittermondSpellItem from "module/item/spell";
import { CheckReport } from "module/check";
import { SpellRollMessage } from "module/util/chat/rollMessages/spellChatMessage/SpellRollMessage";
import { TEMPLATE_BASE_PATH } from "module/data/SplittermondApplication";
import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import type SplittermondWeaponItem from "module/item/weapon";
import { AttackRollMessage } from "module/util/chat/rollMessages/attackChatMessage/AttackRollMessage";
import type { AttackCheckReport } from "module/util/chat/rollMessages/attackChatMessage/interfaces";
import type { DamageMessage } from "module/util/chat/damageChatMessage/DamageMessage";
import sinon from "sinon";
import type ActiveDefense from "module/actor/active-defense";

declare const game: any;
declare const Hooks: Hooks;
declare class Scene extends FoundryDocument {}

type ChatMessageConfig = Parameters<(typeof SplittermondChatCard)["create"]>[2];
export function chatActionFeatureTest(context: QuenchBatchContext) {
    const { describe, it, expect, afterEach } = context;
    function getMessageConfig(input: Partial<ChatMessageConfig> = {}): ChatMessageConfig {
        return {
            blind: false,
            rolls: [],
            whisper: [],
            type: "simple",
            style: 0,
            mode: "CHAT.RollPublic",
            ...input,
        };
    }

    describe("SplittermondChatCard", () => {
        let messagesToDelete: string[] = [];
        afterEach(async () => {
            await ChatMessage.deleteDocuments(messagesToDelete);
            messagesToDelete = [];
        });
        it(
            "should post a message in the chat",
            withActor(async (actor) => {
                const message = new SimpleMessage({ title: "title", body: "I am a test message, I do nothing" });
                const chatCard = SplittermondChatCard.create(actor, message, getMessageConfig());

                await chatCard.sendToChat();
                const messageId = chatCard.messageId;
                messagesToDelete.push(messageId as string);

                expect(messageId, "messageId is null").not.to.be.null;
                expect(game.messages.get(messageId), `Did not find message with id ${messageId}`).to.not.be.undefined;
            })
        );

        it(
            "should rerender the same chat card on update",
            withActor(async (actor) => {
                const message = new SimpleMessage({ title: "title", body: "I am a test message, I do nothing" });
                const chatCard = SplittermondChatCard.create(actor, message, getMessageConfig());

                await chatCard.sendToChat();
                const messagesBeforeUpdate = getCollectionLength(game.messages);
                const messageId = chatCard.messageId;
                messagesToDelete.push(messageId as string);
                await handleChatAction({ action: "alterTitle", title: "Manchete" }, messageId!);

                expect(game.messages.get(messageId), `Did not find message with id ${messageId}`).to.not.be.null;
                expect(game.messages.get(messageId).content, `Did not find message with id ${messageId}`).to.contain(
                    "Manchete"
                );
                expect(getCollectionLength(game.messages), "Message count before and after update").to.equal(
                    messagesBeforeUpdate
                );
            })
        );

        it(
            "should be able to reproduce a message from handled chat action",
            withActor(async (actor) => {
                const message = new SimpleMessage({ title: "title", body: "I am a test message, I do nothing" });
                const chatCard = SplittermondChatCard.create(actor, message, getMessageConfig());
                await chatCard.sendToChat();

                const messageId = chatCard.messageId ?? "This should not happen";
                messagesToDelete.push(messageId as string);
                await handleChatAction({ action: "alterBody", body: "I have done something" }, messageId);
                expect(foundryApi.messages.get(messageId).content, "body was not updated").to.contain(
                    "I have done something"
                );
            })
        );

        it(
            "should be able to reproduce a message from local handled chat action",
            withActor(async (actor) => {
                const message = new SimpleMessage({ title: "title", body: "I am a test message, I do nothing" });
                const chatCard = SplittermondChatCard.create(actor, message, getMessageConfig());
                await chatCard.sendToChat();

                const messageId = chatCard.messageId ?? "This should not happen";
                messagesToDelete.push(messageId as string);
                await handleChatAction({ action: "alterBody", body: "I have done something" }, messageId);
                expect(foundryApi.messages.get(messageId).content, "body was updated").to.contain(
                    "I have done something"
                );
            })
        );

        function getCollectionLength<T>(collection: T[]) {
            return collection.map(() => 1).reduce((a, b) => a + b, 0);
        }
    });

    describe("UntrainedSkillMessages", () => {
        const sandbox = sinon.createSandbox();
        let messagesToDelete: string[] = [];
        afterEach(async () => {
            sandbox.restore();
            await ChatMessage.deleteDocuments(messagesToDelete);
            messagesToDelete = [];
        });

        it(
            "given a fresh untrained skill success, when spending a splinterpoint, then the persisted card still has zero roll EG",
            withActor(async (actor) => {
                await actor.update({ "system.skills.acrobatics.points": 0, "system.splinterpoints.value": 3 });
                const roll = foundryApi.roll("8d1 + 7");
                sandbox.stub(foundryApi, "roll").returns(roll);
                const message = await actor.skills.acrobatics.roll({
                    askUser: false,
                    rollType: "standard",
                    difficulty: 15,
                });
                if (!message || !("id" in message)) throw new Error("Expected a skill chat message");
                messagesToDelete.push(message.id);
                expect(message.rolls[0].total).to.equal(15);
                expect(message.getFlag("splittermond", "check")).to.deep.include({
                    skillPoints: 0,
                    degreeOfSuccess: { fromRoll: 0, modification: 0, limitedTo: 0 },
                });

                await actor.useSplinterpointBonus(message);

                const restored = new SplittermondChatMessage(foundryApi.messages.get(message.id).toObject());
                expect(restored.getFlag("splittermond", "check")).to.deep.include({
                    succeeded: true,
                    availableSplinterpoints: 0,
                    degreeOfSuccess: { fromRoll: 0, modification: 0, limitedTo: 0 },
                });
                const content = document.createElement("div");
                content.innerHTML = restored.content;
                expect(content.querySelector(".roll-total")?.textContent?.trim()).to.equal("18");
                expect(content.querySelector(".use-splinterpoint")).to.equal(null);
                expect(actor.splinterpoints.value).to.equal(2);
            })
        );

        it(
            "given a fresh untrained active defense, when spending a splinterpoint, then the persisted card grants only the base defense increase",
            withActor(async (actor) => {
                await actor.update({ "system.skills.acrobatics.points": 0, "system.splinterpoints.value": 3 });
                const defense = actor.activeDefense.defense.find((entry: ActiveDefense) => entry.id === "acrobatics");
                if (!defense) throw new Error("Expected an acrobatics active defense");
                const baseDefense = await actor.derivedValues.defense.value.calculate();
                const roll = foundryApi.roll("8d1 + 7");
                sandbox.stub(foundryApi, "roll").returns(roll);
                const message = await defense.roll({ askUser: false, rollType: "standard" });
                if (!message || !("id" in message)) throw new Error("Expected an active defense chat message");
                messagesToDelete.push(message.id);
                expect(message.rolls[0].total).to.equal(15);
                expect(message.getFlag("splittermond", "check")).to.deep.include({
                    type: "defense",
                    skillPoints: 0,
                    degreeOfSuccess: { fromRoll: 0, modification: 0, limitedTo: 0 },
                });

                await actor.useSplinterpointBonus(message);

                const restored = new SplittermondChatMessage(foundryApi.messages.get(message.id).toObject());
                expect(restored.getFlag("splittermond", "check")).to.deep.include({
                    succeeded: true,
                    degreeOfSuccess: { fromRoll: 0, modification: 0, limitedTo: 0 },
                });
                const content = document.createElement("div");
                content.innerHTML = restored.content;
                expect(content.querySelector(".roll-total")?.textContent?.trim()).to.equal("18");
                expect(content.querySelector(".degree-of-success-description")?.textContent?.trim()).to.equal(
                    `${foundryApi.localize("splittermond.derivedAttribute.defense.short")}: ${baseDefense + 1}`
                );
                expect(actor.splinterpoints.value).to.equal(2);
            })
        );
    });

    describe("RollMessages", () => {
        let messagesToDelete: string[] = [];
        afterEach(async () => {
            await ChatMessage.deleteDocuments(messagesToDelete);
            messagesToDelete = [];
        });
        for (const kind of ["attack", "spell"] as const) {
            it(
                `given a failed ${kind} card, when a splinterpoint makes it barely succeed, then the persisted card offers no paid EG options and spends one point`,
                withActor(async (actor) => {
                    await actor.update({ "system.splinterpoints.value": 5, "system.splinterpoints.max": 5 });
                    const [item] = await actor.createEmbeddedDocuments("Item", [
                        {
                            name: "Splinterpoint regression",
                            type: kind === "attack" ? "weapon" : "spell",
                            system:
                                kind === "attack"
                                    ? { skill: "blades", attribute1: "agility", attribute2: "strength", equipped: true }
                                    : { skill: "lightmagic", costs: "4V1" },
                        },
                    ]);
                    const card =
                        kind === "attack"
                            ? createAttackChatMessage(actor, item as SplittermondWeaponItem)
                            : createSpellChatMessage(actor, item as SplittermondSpellItem);
                    const model = card.system;
                    if (!(model instanceof AttackRollMessage) && !(model instanceof SpellRollMessage)) {
                        throw new Error("Expected a roll message");
                    }
                    model.updateSource({
                        checkReport: {
                            ...model.checkReport,
                            roll: { total: 23, dice: [{ total: 8 }], tooltip: "" },
                            difficulty: 26,
                            succeeded: false,
                            isCrit: false,
                            degreeOfSuccess: { fromRoll: -1, modification: 0, limitedTo: 999 },
                        },
                        openDegreesOfSuccess: 0,
                    });
                    await card.sendToChat();
                    const messageId = card.messageId!;
                    messagesToDelete.push(messageId);

                    await handleChatAction({ action: "useSplinterpoint" }, messageId);

                    const persisted = foundryApi.messages.get(messageId);
                    const restored = new SplittermondChatMessage(persisted.toObject()).system;
                    if (!(restored instanceof AttackRollMessage) && !(restored instanceof SpellRollMessage)) {
                        throw new Error("Expected a restored roll message");
                    }
                    expect(restored.checkReport.roll.total).to.equal(26);
                    expect(restored.checkReport.succeeded).to.equal(true);
                    expect(restored.checkReport.degreeOfSuccess.fromRoll).to.equal(0);
                    expect(restored.openDegreesOfSuccess).to.equal(0);
                    expect(restored.splinterPointUsed).to.equal(true);
                    expect(restored.getData().degreeOfSuccessOptions).to.be.empty;
                    expect(persisted.content).not.to.contain("NaN");
                    expect(actor.splinterpoints.value).to.equal(4);

                    await handleChatAction({ action: "useSplinterpoint" }, messageId);
                    expect(actor.splinterpoints.value).to.equal(4);
                })
            );
        }
        it(
            "actor should consume enhanced spell",
            withActor(async (actor) => {
                await actor.update({
                    system: {
                        focus: {
                            channeled: { entries: [] },
                            exhausted: { value: 0 },
                            consumed: { value: 0 },
                        },
                    },
                });
                const spell: SplittermondSpellItem = (
                    await actor.createEmbeddedDocuments("Item", [{ type: "spell", name: "Test Spell" }])
                )[0] as SplittermondSpellItem;
                await spell.update({ system: { costs: "4V1", skill: "lightmagic", enhancementCosts: "1EG/+1V1" } });
                const chatMessage = createSpellChatMessage(actor, spell);

                await chatMessage.sendToChat();
                const messageId = chatMessage.messageId ?? "This is not a chat message";
                messagesToDelete.push(messageId);
                await handleChatAction({ action: "spellEnhancementUpdate", multiplicity: 1 }, messageId);
                await handleChatAction({ action: "consumeCosts", multiplicity: 1 }, messageId);

                expect(actor.system.focus.exhausted.value).to.equal(3);
                expect(actor.system.focus.consumed.value).to.equal(1);
            })
        );

        function createSpellChatMessage(actor: SplittermondActor, spell: SplittermondSpellItem): SplittermondChatCard {
            const checkReport: CheckReport = {
                roll: {
                    total: 35,
                    dice: [{ total: 18 }],
                    tooltip: "",
                },
                skill: {
                    id: spell.skill.id,
                    points: 6,
                    attributes: {
                        [spell.skill.attribute1.id]: spell.skill.attribute1.value,
                        [spell.skill.attribute2.id]: spell.skill.attribute2.value,
                    },
                },
                modifierElements: [{ isMalus: false, value: "0", description: "4" }],
                hideDifficulty: false,
                rollType: "standard",
                succeeded: true,
                degreeOfSuccess: { fromRoll: 5, modification: 0, limitedTo: 999 },
                difficulty: 20,
                defenseType: null,
                isFumble: false,
                isCrit: true,
                degreeOfSuccessMessage: "mega success",
                maneuvers: [],
            };
            return SplittermondChatCard.create(
                actor,
                SpellRollMessage.initialize(spell, checkReport),
                getMessageConfig({ type: "spellRollMessage" })
            );
        }

        it(
            "should not fail for operating an attack chat message",
            withActor(async (actor) => {
                const weapon: SplittermondWeaponItem = (
                    await actor.createEmbeddedDocuments("Item", [{ type: "weapon", name: "Test weapon" }])
                )[0] as SplittermondWeaponItem;
                await weapon.update({
                    system: { skill: "longrange", attribute1: "agility", attribute2: "strength", equipped: true },
                });
                actor.prepareBaseData();
                actor.prepareEmbeddedDocuments();
                actor.prepareDerivedData();

                const chatMessage = createAttackChatMessage(actor, weapon);

                await chatMessage.sendToChat();
                const messageId = chatMessage.messageId ?? "This is not a chat message";
                messagesToDelete.push(messageId);
                await handleChatAction({ action: "damageUpdate", multiplicity: 2 }, messageId);
                await handleChatAction({ action: "rangeUpdate", multiplicity: 1 }, messageId);
            })
        );

        it(
            "should account for modifiers on attack rolls",
            withActor(async (actor) => {
                const weapon: SplittermondWeaponItem = (
                    await actor.createEmbeddedDocuments("Item", [{ type: "weapon", name: "The Grindstone" }])
                )[0] as SplittermondWeaponItem;
                await weapon.update({
                    system: {
                        skill: "longrange",
                        attribute1: "agility",
                        attribute2: "strength",
                        damage: "1W1",
                        equipped: true,
                        modifier: "item.addFeature feature='Kritisch' 3",
                    },
                });
                actor.prepareBaseData();
                actor.prepareEmbeddedDocuments();
                actor.prepareDerivedData();

                const chatMessage = createAttackChatMessage(actor, weapon);
                await chatMessage.sendToChat();
                const messageId = chatMessage.messageId ?? "This is not a chat message";
                messagesToDelete.push(messageId);
                await handleChatAction({ action: "applyDamage", multiplicity: 1 }, messageId);

                const damageMessage = game.messages
                    .filter((m: SplittermondChatMessage) => m.timestamp > foundryApi.messages.get(messageId).timestamp)
                    .filter((m: SplittermondChatMessage) => m.type === "damageMessage")
                    .map((m: SplittermondChatMessage) => m.system as DamageMessage)
                    .find((m: DamageMessage) => m.getData().source === "The Grindstone");
                expect(damageMessage.getData().total).to.equal(4);
                expect(damageMessage.getData().features).to.deep.contain({
                    active: true,
                    name: "Kritisch",
                    value: 3,
                });
            })
        );

        function createAttackChatMessage(
            actor: SplittermondActor,
            weapon: SplittermondWeaponItem
        ): SplittermondChatCard {
            const checkReport: AttackCheckReport = {
                roll: {
                    total: 35,
                    dice: [{ total: 18 }],
                    tooltip: "",
                },
                skill: {
                    id: weapon.skill,
                    points: 6,
                    attributes: {
                        [weapon.system.attribute1]: actor.attributes[weapon.system.attribute1].value,
                        [weapon.system.attribute2]: actor.attributes[weapon.system.attribute2].value,
                    },
                },
                modifierElements: [{ isMalus: false, value: "0", description: "4" }],
                hideDifficulty: false,
                rollType: "standard",
                succeeded: true,
                degreeOfSuccess: { fromRoll: 5, modification: 0, limitedTo: 999 },
                difficulty: 20,
                defenseType: null,
                isFumble: false,
                isCrit: true,
                degreeOfSuccessMessage: "mega success",
                maneuvers: [],
                grazingHitPenalty: 0,
            };
            return SplittermondChatCard.create(
                actor,
                AttackRollMessage.initialize(
                    actor.attacks.find((a) => a.id === weapon.id)!,
                    checkReport,
                    3
                ),
                getMessageConfig({ type: "attackRollMessage" })
            );
        }
    });
    describe("chat feature API tests", () => {
        it("should deliver the current user", () => {
            const currentUser = foundryApi.currentUser;
            expect(isUser(currentUser), "current User adheres to our interface").to.be.true;
        });

        it("should deliver all users", () => {
            const users = foundryApi.users;
            expect(isUser(users.find(() => true)), "users adhere to our interface").to.be.true;
        });

        it(
            "should produce a speaker from actor",
            withScene(
                withActor(async (actor, scene) => {
                    if (!foundryApi.currentScene) {
                        scene.activate();
                        setTimeout(() => {}, 100); //Give Foundry some time to update the current scene
                    }
                    const speaker = foundryApi.getSpeaker({ actor });

                    expect(speaker, "speaker is an object").to.be.an("object");
                    expect(speaker.scene, "speaker has a scene").to.equal(foundryApi.currentScene?.id);
                    expect(speaker.token, "speaker declares a token").to.not.be.undefined;
                    expect(speaker.actor, "speaker declares an actor").to.equal(actor.id);
                })
            )
        );

        it(
            "should return a message id when creating a chat message",
            withActor(async (actor) => {
                const speaker = foundryApi.getSpeaker({ actor });
                const sampleMessageContent = {
                    user: foundryApi.currentUser.id,
                    speaker,
                    rolls: [JSON.stringify(await foundryApi.roll("1d6").evaluate())],
                    content: "Random text content",
                    flags: {
                        splittermond: {
                            chatCard: { somthing: "else" },
                        },
                    },
                };
                const message = await foundryApi.createChatMessage(sampleMessageContent);

                expect(message.id, "messageId is a string").to.be.a("string");
                return ChatMessage.deleteDocuments([message.id]);
            })
        );

        it(
            "should post a message in the chat",
            withActor(async (actor) => {
                const speaker = foundryApi.getSpeaker({ actor });
                const sampleMessageContent = {
                    user: foundryApi.currentUser.id,
                    speaker,
                    rolls: [await foundryApi.roll("1d6").evaluate()],
                    content: "Random text content",
                    flags: {
                        splittermond: {
                            chatCard: { somthing: "else" },
                        },
                    },
                };
                const message = await foundryApi.createChatMessage(sampleMessageContent);

                const retrievedMessage = foundryApi.messages.get(message.id);
                expect(retrievedMessage, "message was found").to.not.be.undefined;
                expect(retrievedMessage.getFlag("splittermond", "chatCard")).to.deep.equal(
                    sampleMessageContent.flags.splittermond.chatCard
                );
                return ChatMessage.deleteDocuments([message.id]);
            })
        );

        it(
            "should accept a roll as string",
            withActor(async (actor) => {
                const speaker = foundryApi.getSpeaker({ actor });
                const roll = JSON.stringify(await foundryApi.roll("1d6").evaluate());
                const sampleMessageContent = {
                    user: foundryApi.currentUser.id,
                    speaker,
                    rolls: [roll],
                    content: "Random text content",
                };
                const message = await foundryApi.createChatMessage(sampleMessageContent);
                expect(message.rolls[0]).to.be.instanceOf(foundryApi.roll("1d6").constructor);
                return ChatMessage.deleteDocuments([message.id]);
            })
        );

        it(
            "should accept a roll as object ",
            withActor(async (actor) => {
                const speaker = foundryApi.getSpeaker({ actor });
                const roll = await foundryApi.roll("1d12").evaluate();
                const sampleMessageContent = {
                    user: foundryApi.currentUser.id,
                    speaker,
                    rolls: [roll],
                    content: "Random text content",
                };
                const message = await foundryApi.createChatMessage(sampleMessageContent);
                expect(message.rolls[0].dice[0].faces).to.equal(12);
                return ChatMessage.deleteDocuments([message.id]);
            })
        );

        it(
            "should accept a whisper property",
            withActor(async (actor) => {
                const speaker = foundryApi.getSpeaker({ actor });
                const roll = JSON.stringify(await foundryApi.roll("1d19").evaluate());
                const sampleMessageContent = {
                    user: foundryApi.currentUser.id,
                    speaker,
                    rolls: [roll],
                    messageMode: "whisper", //Don't ask me why this is necessary, but it is
                    whisper: [foundryApi.currentUser],
                    content: "Random text content",
                };
                const message = await foundryApi.createChatMessage(sampleMessageContent);
                expect(message.whisper).to.deep.equal([foundryApi.currentUser.id]);
                return ChatMessage.deleteDocuments([message.id]);
            })
        );

        it("should delete documents", async () => {
            const message = await foundryApi.createChatMessage({ content: "Random text content" });
            await ChatMessage.deleteDocuments([message.id]);

            expect(foundryApi.messages.get(message.id), "message was not deleted").to.be.undefined;
        });

        it("should deliver a template renderer", async () => {
            const content = "Rhaaaaagaahh";
            const renderedHtml = await foundryApi.renderer(`${TEMPLATE_BASE_PATH}/chat/simpleTemplate.hbs`, {
                title: content,
                body: "",
            });
            expect(renderedHtml, "renderedHtml is a string").to.be.a("string");
            expect(renderedHtml, "renderedHtml contains the content").to.contain(content);
        });

        it("transfer events via socket", () => {
            foundryApi.socket.on("system.splittermond.quench.test.event", (data) => {
                expect(data instanceof Object && "test" in data).to.be.true;
                expect((data as { test: unknown }).test).to.be.equal("test");
            });
            foundryApi.socket.emit("system.splittermond.quench.test.event", { test: "test" });
        });

        it(
            "passes application, html, and data to callback",
            withActor(async (actor) => {
                let storedApp;
                let storedHtml;
                let storedData;
                let callbackId: number;
                const callbackPromise = new Promise<void>((resolve) => {
                    callbackId = Hooks.on("renderChatMessageHTML", (app: any, html: any, data: any) => {
                        storedApp = app;
                        storedHtml = html;
                        storedData = data;
                        resolve();
                    });
                });
                const sampleMessageContent = {
                    user: foundryApi.currentUser.id,
                    speaker: foundryApi.getSpeaker({ actor }),
                    content: "Random text content",
                };
                const message = await foundryApi.createChatMessage(sampleMessageContent);
                await callbackPromise;
                expect(storedApp, "app is a chat message app").to.be.instanceOf(ChatMessage);
                expect(storedHtml, "html is an HTMLElement ").to.be.instanceOf(HTMLElement);
                expect(storedData, "data is the data of the chat message app").is.not.undefined;
                return ChatMessage.deleteDocuments([message.id]).then(() => {
                    Hooks.off("renderChatMessage", callbackId);
                });
            })
        );

        function isUser(object: unknown) {
            return typeof object === "object" && object && "isGM" in object && "id" in object && "active" in object;
        }
    });
}

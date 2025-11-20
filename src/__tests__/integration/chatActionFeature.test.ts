import { withActor, withScene } from "./fixtures.js";
import { ChatMessage } from "../../module/api/ChatMessage";
import { handleChatAction, SplittermondChatCard } from "module/util/chat/SplittermondChatCard";
import { foundryApi } from "module/api/foundryApi";
import { SimpleMessage } from "module/data/SplittermondChatMessage";
import type { Hooks } from "module/api/foundryTypes";
import SplittermondActor from "../../module/actor/actor";
import SplittermondSpellItem from "module/item/spell";
import { CheckReport } from "module/actor/CheckReport";
import { SpellRollMessage } from "module/util/chat/spellChatMessage/SpellRollMessage";
import { TEMPLATE_BASE_PATH } from "module/data/SplittermondApplication";
import type { QuenchBatchContext } from "@ethaks/fvtt-quench";

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

    describe("SpellRollMessage", () => {
        let messagesToDelete: string[] = [];
        afterEach(async () => {
            await ChatMessage.deleteDocuments(messagesToDelete);
            messagesToDelete = [];
        });
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
                )[0];
                await spell.update({ system: { costs: "4V1", skill: "lightmagic", enhancementCosts: "1EG/+1V1" } });
                const chatMessage = createSampleChatMessage(actor, spell);

                await chatMessage.sendToChat();
                const messageId = chatMessage.messageId ?? "This is not a chat message";
                messagesToDelete.push(messageId);
                await handleChatAction({ action: "spellEnhancementUpdate", multiplicity: 1 }, messageId);
                await handleChatAction({ action: "consumeCosts", multiplicity: 1 }, messageId);

                expect(actor.system.focus.exhausted.value).to.equal(3);
                expect(actor.system.focus.consumed.value).to.equal(1);
            })
        );

        function createSampleChatMessage(actor: SplittermondActor, spell: SplittermondSpellItem): SplittermondChatCard {
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
                degreeOfSuccess: { fromRoll: 5, modification: 0 },
                difficulty: 20,
                isFumble: false,
                isCrit: true,
                degreeOfSuccessMessage: "mega success",
            };
            return SplittermondChatCard.create(
                actor,
                SpellRollMessage.initialize(spell, checkReport),
                getMessageConfig({ type: "spellRollMessage" })
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
                    rollMode: "whisper", //Don't ask me why this is necessary, but it is
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

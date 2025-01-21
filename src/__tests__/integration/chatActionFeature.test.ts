import {getActor, getActorWithItemOfType} from "./fixtures.js"
import {
    handleChatAction,
    handleLocalChatAction,
    SplittermondChatCard
} from "../../module/util/chat/SplittermondChatCard";
import {foundryApi} from "../../module/api/foundryApi";
import {SplittermondTestRollMessage} from "./resources/SplittermondTestRollMessage.js";
import type {ChatMessage, Hooks} from "../../module/api/foundryTypes";
import SplittermondActor from "../../module/actor/actor";
import SplittermondSpellItem from "../../module/item/spell";
import {CheckReport} from "../../module/actor/CheckReport";
import SplittermondItem from "../../module/item/item";
import {SpellRollMessage} from "../../module/util/chat/spellChatMessage/SpellRollMessage";
import {QuenchContext} from "./resources/types";

declare const game: any;
declare const ChatMessage: ChatMessage;
declare const Hooks: Hooks;

export function chatActionFeatureTest(context: QuenchContext) {
    const {describe, it, expect} = context;
    const splittermondMessageConfig = {
        blind: false,
        rolls: [],
        whisper: [],
        type: foundryApi.chatMessageTypes.OTHER,
        mode: 'CHAT.RollPublic'
    }

    describe("SplittermondChatCard", () => {
        it("should post a message in the chat", async () => {
            const actor = getActor(it);
            const message = new SplittermondTestRollMessage({title: "a"});
            const chatCard = SplittermondChatCard.create(actor, message, splittermondMessageConfig);

            await chatCard.sendToChat();
            const messageId = chatCard.messageId;

            expect(messageId, "messageId is null").not.to.be.null;
            expect(game.messages.get(messageId), `Did not find message with id ${messageId}`).to.not.be.undefined;
            ChatMessage.deleteDocuments([messageId as string/*we asserted it is not null*/]);
        });

        it("should rerender the same chat card on update", async () => {
            const actor = getActor(it);
            const message = new SplittermondTestRollMessage({title: "title"});
            const chatCard = SplittermondChatCard.create(actor, message, splittermondMessageConfig);

            await chatCard.sendToChat();
            const messagesBeforeUpdate = getCollectionLength(game.messages);
            const messageId = chatCard.messageId;
            message.updateSource({title: "Manchete"});
            await chatCard.updateMessage();


            expect(game.messages.get(messageId), `Did not find message with id ${messageId}`).to.not.be.null;
            expect(game.messages.get(messageId).content, `Did not find message with id ${messageId}`).to.contain("Manchete");
            expect(getCollectionLength(game.messages), "Message count before and after update").to.equal(messagesBeforeUpdate);

            ChatMessage.deleteDocuments([messageId as string/*we asserted it is not null*/]);
        });

        it("should be able to reproduce a message from handled chat action", async () => {
            const actor = getActor(it);
            const message = new SplittermondTestRollMessage({title: "title"});
            const chatCard = SplittermondChatCard.create(actor, message, splittermondMessageConfig);
            await chatCard.sendToChat();

            const messageId = chatCard.messageId ?? "This should not happen";
            await handleChatAction({action: "alterTitle"}, messageId);
            expect(foundryApi.messages.get(messageId).content, "title not was updated").to.contain("title2");
            return ChatMessage.deleteDocuments([messageId]);
        });

        it("should be able to reproduce a message from local handled chat action", async () => {
            const actor = getActor(it);
            const message = new SplittermondTestRollMessage({title: "title"});
            const chatCard = SplittermondChatCard.create(actor, message, splittermondMessageConfig);
            await chatCard.sendToChat();

            const messageId = chatCard.messageId ?? "This should not happen";
            expect(await handleLocalChatAction({localaction: "alterTitle"}, messageId)).not.to.throw;
            expect(foundryApi.messages.get(messageId).content, "title was updated").not.to.contain("title2");
            return ChatMessage.deleteDocuments([messageId]);
        });

        function getCollectionLength<T>(collection: T[]) {
            return collection.map(() => 1).reduce((a, b) => a + b, 0)
        }
    });

    describe("SpellRollMessage", () => {
        it("actor should consume enhanced spell", async () => {
            const actor = getActorWithItemOfType(it, "spell");
            await actor.update({
                system: {
                    focus: {
                        channeled: {entries: []},
                        exhausted: {value: 0},
                        consumed: {value: 0}
                    }
                }
            });
            const spell = actor.items.find((item:SplittermondItem) => item.type === "spell");
            console.log(spell);
            const chatMessage = createSampleChatMessage(actor, spell);

            await chatMessage.sendToChat()
            const messageId = chatMessage.messageId ?? "This is not a chat message";
            await handleChatAction({action: "spellEnhancementUpdate", multiplicity: 1}, messageId);
            await handleChatAction({action: "consumeCosts", multiplicity: 1}, messageId);

            expect(actor.system.focus.exhausted.value +
                actor.system.focus.consumed.value +
                actor.system.focus.channeled.value).to.be.greaterThan(0);


            await actor.update({
                system: {
                    focus: {
                        channeled: {entries: []},
                        exhausted: {value: 0},
                        consumed: {value: 0}
                    }
                }
            });
            return ChatMessage.deleteDocuments([messageId]);
        });

        function createSampleChatMessage(actor:SplittermondActor, spell:SplittermondSpellItem):SplittermondChatCard {
            const checkReport:CheckReport = {
                roll: {
                    total: 35,
                    dice: [{total: 18}],
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
                modifierElements: [{value: 0, description: "4"}],
                hideDifficulty: false,
                rollType: "standard",
                succeeded: true,
                degreeOfSuccess: 5,
                difficulty: 20,
                isFumble: false,
                isCrit: true,
                degreeOfSuccessMessage: "mega success",
            };
            return SplittermondChatCard.create(
                actor, SpellRollMessage.initialize(spell, checkReport),
                splittermondMessageConfig
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

        it("should produce a speaker from actor", () => {
            const actor = getActor(it);
            const speaker = foundryApi.getSpeaker({actor});

            expect(speaker, "speaker is an object").to.be.an("object");
            expect(speaker.scene, "speaker has a scene").to.be.a("string");
            expect(speaker.token, "speaker declares a token").to.not.be.undefined;
            expect(speaker.actor, "speaker declares an actor").to.equal(actor.id);
        });

        it("should return a message id when creating a chat message", async () => {
            const actor = getActor(it);
            const speaker = foundryApi.getSpeaker({actor});
            const sampleMessageContent = {
                user: foundryApi.currentUser.id,
                speaker,
                rolls: [JSON.stringify(await foundryApi.roll("1d6").evaluate())],
                content: "Random text content",
                flags: {
                    splittermond: {
                        chatCard: {somthing: "else"},
                    },
                }
            };
            const message = await foundryApi.createChatMessage(sampleMessageContent);

            expect(message.id, "messageId is a string").to.be.a("string");
            return ChatMessage.deleteDocuments([message.id]);
        });

        it("should post a message in the chat", async () => {
            const actor = getActor(it);
            const speaker = foundryApi.getSpeaker({actor});
            const sampleMessageContent = {
                user: foundryApi.currentUser.id,
                speaker,
                rolls: [await foundryApi.roll("1d6").evaluate()],
                content: "Random text content",
                flags: {
                    splittermond: {
                        chatCard: {somthing: "else"},
                    },
                }
            };
            const message = await foundryApi.createChatMessage(sampleMessageContent);

            const retrievedMessage = foundryApi.messages.get(message.id);
            expect(retrievedMessage, "message was found").to.not.be.undefined;
            expect(retrievedMessage.getFlag("splittermond", "chatCard"))
                .to.deep.equal(sampleMessageContent.flags.splittermond.chatCard);
            return ChatMessage.deleteDocuments([message.id]);
        });

        it("should accept a roll as string", async () => {
            const actor = getActor(it);
            const speaker = foundryApi.getSpeaker({actor});
            const roll = JSON.stringify(await foundryApi.roll("1d6").evaluate())
            const sampleMessageContent = {
                user: foundryApi.currentUser.id,
                speaker,
                rolls: [roll],
                content: "Random text content",
            };
            const message = await foundryApi.createChatMessage(sampleMessageContent);
            expect(message.rolls[0]).to.be.instanceOf(foundryApi.roll("1d6").constructor);
            return ChatMessage.deleteDocuments([message.id]);
        });

        it("should accept a roll as object ", async () => {
            const actor = getActor(it);
            const speaker = foundryApi.getSpeaker({actor});
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
        });

        it("should accept a whisper property", async () => {
            const actor = getActor(it);
            const speaker = foundryApi.getSpeaker({actor});
            const roll = JSON.stringify(await foundryApi.roll("1d19").evaluate())
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
        });

        it("should delete documents", async () => {
            const message = await foundryApi.createChatMessage({content:"Random text content"});
            await ChatMessage.deleteDocuments([message.id]);

            expect (foundryApi.messages.get(message.id), "message was not deleted").to.be.undefined;
        });

        it("should deliver a template renderer", async () => {
            const content = "Rhaaaaagaahh"
            const renderedHtml = await foundryApi.renderer(
                "systems/splittermond/templates/__tests__/integration/resources/testTemplate.hbs", {title: content});
            expect(renderedHtml, "renderedHtml is a string").to.be.a("string");
            expect(renderedHtml, "renderedHtml contains the content").to.contain(content);
        });

        it("transfer events via socket", () => {
            foundryApi.socket.on("system.splittermond.quench.test.event", (data) => {
                expect(data instanceof Object && "test" in data).to.be.true;
                expect((data as {test:unknown}).test).to.be.equal("test");
            });
            foundryApi.socket.emit("system.splittermond.quench.test.event", {test: "test"});
        });

        it("delivers the the correct chat message types", () => {
            const types= foundryApi.chatMessageTypes;
            expect(types, "chatMessageTypes is an object").to.be.an("object");
            expect(Object.keys(types).length).to.equal(4);
            expect(types.EMOTE, "chatMessageTypes has an emote").to.be.a("number");
            expect(types.IC, "chatMessageTypes has an in character").to.be.a("number");
            expect(types.OOC, "chatMessageTypes has an out of character").to.be.a("number");
            expect(types.OTHER, "chatMessageTypes has an other").to.be.a("number");
        });

        it("passes application, html, and data to callback", async () => {
            let storedApp;
            let storedHtml;
            let storedData;
            let callbackId:number;
            const callbackPromise = new Promise<void>(resolve => {
                callbackId = Hooks.on("renderChatMessage", (app:any, html:any, data:any) => {
                    storedApp = app;
                    storedHtml = html;
                    storedData = data;
                    resolve();
                });
            });
            const sampleMessageContent = {
                user: foundryApi.currentUser.id,
                speaker: foundryApi.getSpeaker({actor: getActor(it)}),
                content: "Random text content",
            };
            const message = await foundryApi.createChatMessage(sampleMessageContent)
            await callbackPromise;
            expect(storedApp, "app is a chat message app").to.be.instanceOf(ChatMessage)
            expect(storedHtml, "html is a JQuery object").to.be.instanceOf(jQuery)
            expect(storedData, "data is the data of the chat message app").is.not.undefined
            return ChatMessage.deleteDocuments([message.id]).then(() => {
                Hooks.off("renderChatMessage", callbackId);
            });
        });

        function isUser(object:unknown) {
            return typeof object === "object" &&
                object && "isGM" in object && "id" in object && "active" in object;
        }
    });
}
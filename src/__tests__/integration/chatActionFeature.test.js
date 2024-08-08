import {getActor, getActorWithItemOfType} from "./fixtures.js"
import {handleChatAction, SplittermondChatCard} from "../../module/util/chat/SplittermondChatCard.js";
import {foundryApi} from "../../module/api/foundryApi.ts";
import {SplittermondTestRollMessage} from "./resources/SplittermondTestRollMessage.js";
import {SplittermondSpellRollMessage} from "../../module/util/chat/spellChatMessage/SplittermondSpellRollMessage.js";

export function chatActionFeatureTest(context) {
    const {describe, it, expect} = context;

    describe("SplittermondChatCard", () => {
        it("should post a message in the chat", async () => {
            const actor = getActor(this);
            const message = new SplittermondTestRollMessage({title: "a"});
            const chatCard = SplittermondChatCard.create(actor, message, {type:5, mode:'CHAT.RollPublic'});

            await chatCard.sendToChat();
            const messageId = chatCard.messageId;

            expect(game.messages.get(messageId), `Did not find message with id ${messageId}`).to.not.be.undefined;
            ChatMessage.deleteDocuments([messageId]);
        });

        it("should rerender the same chat card on update", async () => {
            const actor = getActor(this);
            const message = new SplittermondTestRollMessage({title: "title"});
            const chatCard = SplittermondChatCard.create(actor, message,{type:5, mode:'CHAT.RollPublic'});

            await chatCard.sendToChat();
            const messagesBeforeUpdate = getCollectionLength(game.messages);
            const messageId = chatCard.messageId;
            message.updateSource({title: "Manchete"});
            await chatCard.updateMessage();


            expect(game.messages.get(messageId), `Did not find message with id ${messageId}`).to.not.be.undefined;
            expect(game.messages.get(messageId).content, `Did not find message with id ${messageId}`).to.contain("Manchete");
            expect(getCollectionLength(game.messages), "Message count before and after update").to.equal(messagesBeforeUpdate);

            ChatMessage.deleteDocuments([messageId]);
        });

        it("should be able to reproduce a message from handled chat action", async () => {
            const actor = getActor(this);
            const message = new SplittermondTestRollMessage({title: "title"});
            const chatCard = SplittermondChatCard.create(actor, message,{type:5, mode:'CHAT.RollPublic'});
            await chatCard.sendToChat();

            await handleChatAction({action: "alterTitle"}, chatCard.messageId);
            expect(foundryApi.messages.get(chatCard.messageId).content, "title was updated").to.contain("title2");
            ChatMessage.deleteDocuments([chatCard.messageId]);
        });

        function getCollectionLength(collection) {
            return collection.map(() => 1).reduce((a, b) => a + b, 0)
        }
    });

    describe("SpellRollMessage", () => {
        it("actor should consume enhanced spell", async () => {
            const actor = getActorWithItemOfType(this, "spell");
            await actor.update({system:{focus:{channeled:{entries:[]}, exhausted:{value:0}, consumed: {value:0}}}});
            const spell = actor.items.find(item => item.type === "spell");
            const chatMessage = createSampleChatMessage(actor, spell);

            await chatMessage.sendToChat()
            const messageId = chatMessage.messageId;
            await handleChatAction({action: "spellEnhancementUpdate", multiplicity: 1 }, messageId);
            await handleChatAction({action: "consumeCosts", multiplicity: 1 }, messageId);

            expect(actor.system.focus.exhausted.value +
                actor.system.focus.consumed.value +
                actor.system.focus.channeled.value).to.be.greaterThan(0);


            await actor.update({system:{focus:{channeled:{entries:[]}, exhausted:{value:0}, consumed: {value:0}}}});
            ChatMessage.deleteDocuments([messageId]);
        })

        /**
         * @param {SplittermondActor} actor
         * @param {SplittermondSpellItem} spell
         * @return {SplittermondChatCard}
         */
        function createSampleChatMessage(actor, spell) {
            /**@type {CheckReport}*/const checkReport = {
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
                modifierElements: ["3"],
                rollType: "standard",
                succeeded: true,
                degreeOfSuccess: 5,
                difficulty: 20,
                isFumble: false,
                isCrit: true,
                degreeOfSuccessMessage: "mega success",
            };
            return SplittermondChatCard.create(
                actor, SplittermondSpellRollMessage.createRollMessage(spell, checkReport),
                {type: 5, blind:false, whisper:[]}
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
            const actor = getActor(this);
            const speaker = foundryApi.getSpeaker({actor});

            expect(speaker, "speaker is an object").to.be.an("object");
            expect(speaker.scene, "speaker has a scene").to.be.a("string");
            expect(speaker.token, "speaker declares a token").to.not.be.undefined;
            expect(speaker.actor, "speaker declares an actor").to.equal(actor.id);
        });

        it("should return a message id when creating a chat message", async () => {
            const actor = getActor(this);
            const speaker = foundryApi.getSpeaker({actor});
            const sampleMessageContent = {
                user: foundryApi.currentUser.id,
                speaker,
                rolls:[JSON.stringify(await foundryApi.roll("1d6").evaluate())],
                content: "Random text content",
                flags: {
                    splittermond: {
                        chatCard: {somthing: "else"},
                    },
                }
            };
            const message = await foundryApi.createChatMessage(sampleMessageContent);

            expect(message.id, "messageId is a string").to.be.a("string");
            ChatMessage.deleteDocuments([message.id]);
        });

        it("should post a message in the chat", async () => {
            const actor = getActor(this);
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
            ChatMessage.deleteDocuments([message.id]);
        });

        it("should accept a roll as string",async () => {
            const actor = getActor(this);
            const speaker = foundryApi.getSpeaker({actor});
            const roll =JSON.stringify(await foundryApi.roll("1d6").evaluate())
            const sampleMessageContent = {
                user: foundryApi.currentUser.id,
                speaker,
                rolls: [roll],
                content: "Random text content",
            };
            const message = await foundryApi.createChatMessage(sampleMessageContent);
            expect(message.rolls[0]).to.be.instanceOf(foundryApi.roll("1d6").constructor);
            ChatMessage.deleteDocuments([message.id]);
        });

        it("should accept a roll as object ",async () => {
            const actor = getActor(this);
            const speaker = foundryApi.getSpeaker({actor});
            const roll =await foundryApi.roll("1d12").evaluate();
            const sampleMessageContent = {
                user: foundryApi.currentUser.id,
                speaker,
                rolls: [roll],
                content: "Random text content",
            };
            const message = await foundryApi.createChatMessage(sampleMessageContent);
            expect(message.rolls[0].dice[0].faces).to.equal(12);
            ChatMessage.deleteDocuments([message.id]);
        });

        it("should accept a whisper property",async () => {
            const actor = getActor(this);
            const speaker = foundryApi.getSpeaker({actor});
            const roll =JSON.stringify(await foundryApi.roll("1d19").evaluate())
            const sampleMessageContent = {
                user: foundryApi.currentUser.id,
                speaker,
                rolls: [roll],
                rollMode: "whisper",//Don't ask me why this is necessary, but it
                whisper: [foundryApi.currentUser],
                content: "Random text content",
            };
            const message = await foundryApi.createChatMessage(sampleMessageContent);
            expect(message.whisper).to.deep.equal([foundryApi.currentUser.id]);
            ChatMessage.deleteDocuments([message.id]);
        });


        it("should deliver a template renderer", async () => {
            const content = "Rhaaaaagaahh"
            const renderedHtml = await foundryApi.renderer(
                "systems/splittermond/__tests__/integration/resources/testTemplate.hbs", {title: content});
            expect(renderedHtml, "renderedHtml is a string").to.be.a("string");
            expect(renderedHtml, "renderedHtml contains the content").to.contain(content);
        });

        it("transfer events via socket", () => {
            foundryApi.socket.on("system.splittermond.quench.test.event", (data) => {
                expect(data.test).to.be.equal("test");
            });
            foundryApi.socket.emit("system.splittermond.quench.test.event", {test: "test"});
        });

        it("delivers the the correct chat message types", ()=> {
            const types = foundryApi.chatMessageTypes;
            expect(types, "chatMessageTypes is an object").to.be.an("object");
            expect(Object.keys(types).length).to.equal(4);
            expect(types.EMOTE, "chatMessageTypes has an emote").to.be.a("number");
            expect(types.IC, "chatMessageTypes has an in character").to.be.a("number");
            expect(types.OOC, "chatMessageTypes has an out of character").to.be.a("number");
            expect(types.OTHER, "chatMessageTypes has an other").to.be.a("number");
        });

        function isUser(object) {
            return typeof object === "object" &&
                object && "isGM" in object && "id" in object && "active" in object;
        }
    });
}
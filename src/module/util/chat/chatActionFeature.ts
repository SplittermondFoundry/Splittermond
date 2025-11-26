import { handleChatAction, handleLocalChatAction } from "./SplittermondChatCard";
import { foundryApi } from "../../api/foundryApi";
import { canEditMessageOf } from "../chat.js";
import { FoundryChatMessage } from "../../api/ChatMessage";
import { ChatMessageModel, SimpleMessage, SplittermondChatMessage } from "../../data/SplittermondChatMessage";
import { SpellRollMessage } from "./rollMessages/spellChatMessage/SpellRollMessage";
import { DamageMessage } from "./damageChatMessage/DamageMessage";

const socketEvent = "system.splittermond";

interface ChatMessageConfig {
    dataModels: Record<string, new (...args: any[]) => ChatMessageModel>;
    documentClass: new (...args: any[]) => SplittermondChatMessage;
}

/**
 * This function needs to be called during the initialization of the system. Foundry's 'init' hooks needs to have fired.
 * @param config the chat message property of the global CONFIG variable
 */
export function chatActionFeature(config: ChatMessageConfig) {
    console.log("Splittermond | Initializing Chat action feature");
    foundryApi.hooks.on("renderChatLog", (_app: unknown, html: HTMLElement, _data: unknown) => chatListeners(html));
    foundryApi.hooks.on("renderChatPopout", (_app: unknown, html: HTMLElement, _data: unknown) => chatListeners(html));
    foundryApi.hooks.on("renderChatMessageHTML", (_app: unknown, html: HTMLElement, _data: unknown) =>
        chatListeners(html)
    );
    foundryApi.hooks.on("renderChatMessageHTML", (app: FoundryChatMessage, html: HTMLElement, data: unknown) =>
        prohibitActionOnChatCard(app, html, data)
    );

    foundryApi.socket.on(socketEvent, (data) => {
        if (
            !(
                data &&
                typeof data === "object" &&
                "type" in data &&
                "messageId" in data &&
                typeof data.messageId === "string" &&
                "userId" in data
            )
        ) {
            console.debug("Splittermond | Received invalid socket event data", data);
            return Promise.resolve();
        }
        if (data.type === "chatAction") {
            if (!foundryApi.currentUser.isGM) {
                console.debug("Splittermond | Discarded chat action event, due to not being the GM", data);
                return Promise.resolve();
            }
            const connectedGMs = foundryApi.users.filter((u) => u.isGM && u.active);
            const isResponsibleGM = !connectedGMs.some((other) => other.id < foundryApi.currentUser.id);
            if (!isResponsibleGM) {
                console.debug("Splittermond | Discarded chatAction event, due to not being the responsible GM", data);
                return Promise.resolve();
            }

            const { messageId, userId } = data;
            console.debug(`Splittermond | Handling chat action event from ${userId}`, data);
            return handleChatAction(data, messageId);
        }
        return Promise.resolve();
    });

    config.documentClass = SplittermondChatMessage;
    config.dataModels.simple = SimpleMessage;
    config.dataModels.spellRollMessage = SpellRollMessage;
    config.dataModels.damageMessage = DamageMessage;
}

function chatListeners(html: HTMLElement) {
    html.querySelectorAll(".splittermond-chat-action[data-action]").forEach((el) => {
        el.addEventListener("click", onChatCardAction);
    });
    html.querySelectorAll(".splittermond-chat-action[data-localAction]").forEach((el) => {
        el.addEventListener("click", onLocalChatCardAction);
    });
}

async function onChatCardAction(event: Event) {
    event.preventDefault();

    const button =
        event.currentTarget as HTMLElement; /*We're working in an HTML Context here. that the target is an HTMLElement is a given*/
    const dataAttributes = button.dataset;
    const messageElement = button.closest(
        ".message"
    ) as HTMLElement; /*We're working in an HTML Context here. that the target is an HTMLElement is a given*/
    const messageId = messageElement.dataset.messageId;

    if (!foundryApi.currentUser.isGM) {
        if (!foundryApi.users.filter((u) => u.isGM && u.active).length) {
            return foundryApi.warnUser("splittermond.chatCard.noGMConnected");
        }

        console.debug(`Splittermond | Emitting chat action event`);
        return foundryApi.socket.emit(socketEvent, {
            type: "chatAction",
            ...dataAttributes,
            messageId,
            userId: foundryApi.currentUser.id,
        });
    }
    if (messageId === undefined) {
        return foundryApi.warnUser("splittermond.chatCard.messageIdNotFound");
    }
    return await handleChatAction(dataAttributes, messageId);
}

async function onLocalChatCardAction(event: Event) {
    const button =
        event.currentTarget as HTMLElement; /*We're working in an HTML Context here. that the target is an HTMLElement is a given*/
    const messageElement = button.closest(
        ".message"
    ) as HTMLElement; /*We're working in an HTML Context here. that the target is an HTMLElement is a given*/
    const messageId = messageElement.dataset.messageId;
    if (messageId === undefined) {
        return foundryApi.warnUser("splittermond.chatCard.messageIdNotFound");
    }
    return await handleLocalChatAction(button.dataset, messageId);
}

/**
 *  We have to rely on JQuery to edit user access rights, because actual message evaluation is only done by the GM
 *  who always has edit rights.
 */
function prohibitActionOnChatCard(__: unknown, html: HTMLElement, data: unknown) {
    if (!dataHasRequiredAttributes(data)) {
        throw new Error("data parameter is expected to be an object with keys 'message' and 'author', but it was not.");
    }
    let actor = foundryApi.getSpeaker(data.message.speaker).actor;

    if (!((actor && foundryApi.getActor(actor)?.isOwner) || canEditMessageOf(data.author.id))) {
        html.querySelectorAll(
            ".splittermond-chat-action[data-action]:not(.splittermond-chat-action[data-localaction])"
        ).forEach((el) => el.remove());
    }

    html.querySelectorAll(".splittermond-chat-action-container:not(:has(.splittermond-chat-action))").forEach((el) =>
        el.remove()
    );
}

function dataHasRequiredAttributes(data: unknown): data is { message: { speaker: object }; author: { id: string } } {
    return (
        !!data &&
        typeof data === "object" &&
        "message" in data &&
        !!data.message &&
        typeof data.message === "object" &&
        "speaker" in data.message &&
        "author" in data &&
        !!data.author &&
        typeof data.author === "object" &&
        "id" in data.author
    );
}

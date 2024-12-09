import type {ChatMessage, ChatMessageTypes, Hooks, Roll, Socket, User} from "./foundryTypes";

export const foundryApi = new class FoundryApi {

    /**
     * @param {string} messageKey the key to an entry in the localization file
     */
    reportError(messageKey: string): void {
        //@ts-ignore
        ui.notifications.error(this.localize(messageKey));
    }

    /**
     * @param {string} messageKey the key to an entry in the localization file
     */
    warnUser(messageKey: string): void {
        //@ts-ignore
        ui.notifications.warn(this.localize(messageKey));
    }

    /**
     * @param {string} messageKey the key to an entry in the localization file
     */
    informUser(messageKey: string): void {
        // @ts-ignore
        ui.notifications.info(this.localize(messageKey));
    }

    get messages(): { get: (id: string) => ChatMessage } {
        //@ts-ignore
        return game.messages;
    }

    get renderer(): (template: string, data: object) => Promise<string> {
        //@ts-ignore
        return renderTemplate;
    }

    createChatMessage(chatData: object): Promise<ChatMessage> {
        //@ts-ignore
        return ChatMessage.create(chatData);
    }

    /**
     * @param {object} data object containing the actor
     * @return {{scene:string,token: string,actor: string,alias: string}} the token that is registered as the speaker
     */
    getSpeaker(data: object) {
        //@ts-ignore
        return ChatMessage.getSpeaker(data);
    }

    /**
     * @param  messageKey
     * @return the localized string or the key if no localization is found
     */
    localize(messageKey: string): string {
        //@ts-ignore
        return game.i18n.localize(messageKey);
    }

    get chatMessageTypes(): typeof ChatMessageTypes {
        //@ts-ignore
        return CONST.CHAT_MESSAGE_TYPES;
    }

    get currentUser(): User {
        //@ts-ignore
        return game.user
    }

    get users(): User[] {
        //@ts-ignore
        return game.users;
    }

    get socket(): Socket {
        //@ts-ignore
        return game.socket;
    }

    get hooks(): Hooks {
        //@ts-ignore
        return Hooks;
    }


    /**
     * @return {SplittermondItem}
     */
    getItem(itemId: string) {
        //@ts-ignore
        return game.items.get(itemId);
    }

    getActor(actorId: string): Actor | undefined {
        //@ts-ignore
        return game.actors.get(actorId);
    }

    getToken(sceneId: string, tokenId: string):TokenDocument|undefined {
        //@ts-ignore
        return game.scenes.get(sceneId)?.tokens.get(tokenId);
    }

    roll(damageFormula: string, context: object = {}): Roll {
        // @ts-ignore
        return new Roll(damageFormula, context)
    }
}
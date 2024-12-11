import type {ChatMessage, ChatMessageTypes, Hooks, Roll, Socket, User} from "./foundryTypes";

export const foundryApi = new class FoundryApi {

    /**
     * @param messageKey the key to an entry in the localization file
     * @param templateArgs the arguments to be inserted into the localized string
     */
    reportError(messageKey: string, templateArgs?:Record<string, string>): void {
        const message = templateArgs ? this.format(messageKey, templateArgs) : this.localize(messageKey);
        //@ts-ignore
        ui.notifications.error(message);
    }

    /**
     * @param messageKey the key to an entry in the localization file
     * @param templateArgs the arguments to be inserted into the localized string
     */
    warnUser(messageKey: string, templateArgs?:Record<string, string>): void {
        const message = templateArgs ? this.format(messageKey, templateArgs) : this.localize(messageKey);
        //@ts-ignore
        ui.notifications.warn(message);
    }

    /**
     * @param messageKey the key to an entry in the localization file
     * @param templateArgs the arguments to be inserted into the localized string
     */
    informUser(messageKey: string, templateArgs?:Record<string, string>): void {
        const message = templateArgs ? this.format(messageKey, templateArgs) : this.localize(messageKey);
        // @ts-ignore
        ui.notifications.info(message);
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

    createItem(data: object): Promise<Item>{
        //@ts-ignore
        return Item.create(data);
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

    /**
     * @param messageKey the key to an entry in the localization file
     * @param templateArgs the arguments to be inserted into the localized string
     */
    format(messageKey: string, templateArgs: Record<string,string>): string {
        //@ts-ignore
        return game.i18n.format(messageKey, templateArgs);
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
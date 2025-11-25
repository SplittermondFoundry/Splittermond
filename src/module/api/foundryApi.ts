import {
    type ChatMessageTypes,
    type CompendiumPacks,
    type FoundryCombat,
    type FoundryScene,
    type Hooks,
    type KeybindingActionBinding,
    type KeybindingActionConfig,
    type MergeObjectOptions,
    type SettingsConfig,
    type SettingTypeMapper,
    type Socket,
    type Speaker,
    type User,
} from "./foundryTypes";
import type { FoundryRoll, NumericTerm, OperatorTerm } from "./Roll";
import { FoundryChatMessage } from "./ChatMessage";
import { FoundryApplication } from "./Application";

export const foundryApi = new (class FoundryApi {
    /**
     * @param messageKey the key to an entry in the localization file
     * @param templateArgs the arguments to be inserted into the localized string
     */
    reportError(messageKey: string, templateArgs?: Record<string, string>): void {
        const message = templateArgs ? this.format(messageKey, templateArgs) : this.localize(messageKey);
        //@ts-ignore
        ui.notifications.error(message);
    }

    /**
     * @param messageKey the key to an entry in the localization file
     * @param templateArgs the arguments to be inserted into the localized string
     */
    warnUser(messageKey: string, templateArgs?: Record<string, string>): void {
        const message = templateArgs ? this.format(messageKey, templateArgs) : this.localize(messageKey);
        //@ts-ignore
        ui.notifications.warn(message);
    }

    /**
     * @param messageKey the key to an entry in the localization file
     * @param templateArgs the arguments to be inserted into the localized string
     */
    informUser(messageKey: string, templateArgs?: Record<string, string>): void {
        const message = templateArgs ? this.format(messageKey, templateArgs) : this.localize(messageKey);
        // @ts-ignore
        ui.notifications.info(message);
    }

    get messages(): { get: (id: string) => FoundryChatMessage } {
        //@ts-ignore
        return game.messages;
    }

    get renderer(): (template: string, data: object) => Promise<string> {
        //@ts-ignore
        return renderTemplate;
    }

    createChatMessage(chatData: object): Promise<FoundryChatMessage> {
        //@ts-ignore
        return ChatMessage.create(chatData);
    }

    createItem(data: object, options: object = {}): Promise<Item> {
        //@ts-ignore
        return Item.create(data, options);
    }

    createActor(data: object, options: object = {}): Promise<Actor> {
        //@ts-ignore
        return Actor.create(data, options);
    }

    /**
     * @param {actor:Actor,scene:Scene,token:TokenDocument, alias:string} data object containing the actor
     * @return  the token that is registered as the speaker
     */
    getSpeaker(data: object): Speaker {
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
    format(messageKey: string, templateArgs: Record<string, string>): string {
        //@ts-ignore
        return game.i18n.format(messageKey, templateArgs);
    }

    get chatMessageTypes(): typeof ChatMessageTypes {
        //@ts-ignore
        return CONST.CHAT_MESSAGE_TYPES;
    }

    get rollModes() {
        return CONFIG.Dice.rollModes;
    }

    get currentUser(): User {
        //@ts-ignore
        return game.user;
    }

    get currentScene(): FoundryScene | null {
        //@ts-ignore
        return game.scenes.current ?? null;
    }

    get users(): User[] {
        //@ts-ignore
        return game.users;
    }
    get scenes(): Collection<FoundryScene> {
        //@ts-ignore
        return game.scenes;
    }

    get combats(): Collection<FoundryCombat> & { apps: InstanceType<typeof FoundryApplication>[] } {
        //@ts-ignore
        return game.combats;
    }

    get combat(): FoundryCombat | null {
        //@ts-ignore
        return game.combat;
    }

    get socket(): Socket {
        //@ts-ignore
        return game.socket;
    }

    get hooks(): Hooks {
        //@ts-ignore
        return Hooks;
    }

    getItem(itemId: string): Item | undefined {
        //@ts-ignore
        return game.items.get(itemId);
    }

    getActor(actorId: string): Actor | undefined {
        //@ts-ignore
        return game.actors.get(actorId);
    }

    getToken(sceneId: string, tokenId: string): TokenDocument | undefined {
        //@ts-ignore
        return game.scenes.get(sceneId)?.tokens.get(tokenId);
    }

    roll(damageFormula: string, data: Record<string, string> = {}, context: object = {}): FoundryRoll {
        //@ts-ignore
        return new Roll(damageFormula, data, context);
    }

    get rollInfra() {
        return {
            validate(formula: string): boolean {
                //@ts-ignore
                return Roll.validate(formula);
            },
            rollFromTerms(terms: FoundryRoll["terms"]): FoundryRoll {
                //@ts-ignore
                return Roll.fromTerms(terms);
            },
            plusTerm(): OperatorTerm {
                //@ts-ignore
                return new foundry.dice.terms.OperatorTerm({ operator: "+" });
            },
            minusTerm(): OperatorTerm {
                //@ts-ignore
                return new foundry.dice.terms.OperatorTerm({ operator: "-" });
            },
            numericTerm(number: number): NumericTerm {
                //@ts-ignore
                return new foundry.dice.terms.NumericTerm({ number });
            },
        };
    }

    get settings() {
        return {
            set(namespace: string, key: string, value: unknown): void {
                // @ts-ignore
                return game.settings.set(namespace, key, value);
            },
            get<T extends typeof Number | typeof Boolean | typeof String>(
                namespace: string,
                key: string
            ): SettingTypeMapper<T> {
                // @ts-ignore
                return game.settings.get(namespace, key);
            },
            register<T extends typeof Number | typeof Boolean | typeof String>(
                namespace: string,
                key: string,
                data: SettingsConfig<T>
            ): void {
                // @ts-ignore
                game.settings.register(namespace, key, data);
            },
        };
    }

    get keybindings() {
        return {
            get(namespace: string, action: string): KeybindingActionBinding[] {
                // @ts-ignore
                return game.keybindings.get(namespace, action);
            },
            register(namespace: string, action: string, data: KeybindingActionConfig) {
                // @ts-ignore
                game.keybindings.register(namespace, action, data);
            },
            set(namespace: string, action: string, data: KeybindingActionBinding[]) {
                // @ts-ignore
                game.keybindings.set(namespace, action, data);
            },
        };
    }

    getFolders(type: "Item" | "Actor" | "Scene" | null = null): Collection<Folder> {
        switch (type) {
            case "Actor":
                // @ts-ignore
                return game.actors.folders;
            case "Scene":
                // @ts-ignore
                return game.scenes.folders;
            case "Item":
                // @ts-ignore
                return game.items.folders;
            default:
                // @ts-ignore
                return game.folders;
        }
    }

    utils = {
        fromUUID(uuid: string): Promise<FoundryDocument | null> {
            // @ts-ignore
            return fromUuid(uuid);
        },
        fromUUIDSync(uuid: string): FoundryDocument | null {
            // @ts-ignore
            return fromUuidSync(uuid);
        },
        /**@deprecated will fail for classes*/
        deepClone<T extends object>(object: T): T {
            // @ts-ignore
            return foundry.utils.deepClone(object, { strict: true });
        },
        duplicate<T extends object>(object: T): T {
            return JSON.parse(JSON.stringify(object)); //clone of foundry's duplicate method.
        },
        mergeObject<T extends object, U extends object>(
            original: T,
            other?: U,
            options?: MergeObjectOptions
        ): Partial<T> & Partial<U> {
            // @ts-ignore
            return foundry.utils.mergeObject(original, other, options);
        },

        enrichHtml(content: string, options?: { secrets: boolean; relativeTo: object }): Promise<string> {
            // @ts-ignore
            return foundry.applications.ux.TextEditor.implementation.enrichHTML(content, options);
        },
        resolveProperty(object: object, path: string): unknown {
            // @ts-ignore
            return foundry.utils.getProperty(object, path);
        },
    } as const;

    collections = {
        get items(): Collection<Item> {
            // @ts-ignore
            return game.items;
        },
        get actors(): Collection<Actor> {
            // @ts-ignore
            return game.actors;
        },
        get packs(): CompendiumPacks {
            // @ts-ignore
            return game.packs;
        },
    };

    sheets = {
        items: {
            register(...args: any[]): void {
                // @ts-ignore
                return Items.registerSheet(...args);
            },
            unregister(...args: any[]): void {
                // @ts-ignore
                return Items.unregisterSheet(...args);
            },
        },
        actors: {
            register(...args: any[]): void {
                // @ts-ignore
                return Actors.registerSheet(...args);
            },
            unregister(...args: any[]): void {
                // @ts-ignore
                return Actors.unregisterSheet(...args);
            },
        },
    };

    canvas = {
        animatePan(view: unknown): Promise<boolean> {
            // @ts-ignore
            return canvas.animatePan(view);
        },
    };
})();

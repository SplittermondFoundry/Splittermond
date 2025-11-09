import { foundryApi } from "module/api/foundryApi";
import { settings } from "module/settings";
import {
    ApplicationContextOptions,
    ApplicationRenderContext,
    SplittermondApplication,
    TEMPLATE_BASE_PATH,
} from "module/data/SplittermondApplication";
import SplittermondActor, { type DefenseType } from "module/actor/actor";
import { splittermond } from "module/config";
import SplittermondItem from "module/item/item";
import SplittermondSpellItem from "module/item/spell";
import { SplittermondSkill } from "module/config/skillGroups";
import { closestData } from "module/data/ClosestDataMixin";
import { TokenActionBarTemplateData } from "./templateInterface";
import { ElementToggler } from "./ElementToggler";

let theInstance: TokenActionBar | null = null;
let showActionBarGetter = () => false;
let showActionBar = () => true;

settings
    .registerBoolean("showHotbarDuringActionBar", {
        position: 4,
        scope: "client",
        config: true,
        default: true,
        onChange: () => {
            setTimeout(async () => {
                await theInstance!.update(); //can only be reached after the game is ready, so theInstance is not null
            }, 500);
        },
    })
    .then((accessors) => (showActionBar = accessors.get))
    .catch((e) => console.warn("Splittermond | Error registering setting showHotbarDuringActionBar", e));

settings
    .registerBoolean("showActionBar", {
        position: 3,
        scope: "client",
        config: true,
        default: true,
        onChange: () => {
            setTimeout(async () => {
                await theInstance!.update(); //can only be reached after the game is ready, so theInstance is not null
            }, 500);
        },
    })
    .then((accessors) => (showActionBarGetter = accessors.get))
    .catch((e) => console.warn("Splittermond | Error registering setting showActionBar", e));

export default class TokenActionBar extends SplittermondApplication {
    private _currentActor: SplittermondActor | null;
    static PARTS = {
        app: {
            template: `${TEMPLATE_BASE_PATH}/apps/action-bar.hbs`,
        },
    };

    static DEFAULT_OPTIONS = {
        id: "token-action-bar",
        tag: "div",
        classes: ["splittermond", "token-action-bar"],
        window: {
            frame: false,
            popOut: false,
            minimizable: false,
            resizable: false,
        },
    };

    constructor() {
        super({
            actions: {
                toggleEquipped: (e, t) => this.toogleEquipped(e, t),
                "open-sheet": () => {
                    this.openSheet();
                    return Promise.resolve();
                },
                prepareSpell: (e, t) => this.prepareSpell(e, t),
                rollAttack: (e, t) => this.rollAttack(e, t),
                rollDefense: (e, t) => {
                    this.rollDefense(e, t);
                    return Promise.resolve();
                },
                rollSkill: (e, t) => {
                    this.rollSkill(e, t);
                    return Promise.resolve();
                },
                rollSpell: (e, t) => this.rollSpell(e, t),
            },
        });
        this._currentActor = null;
    }

    get currentActor(): SplittermondActor | null {
        return this._currentActor;
    }

    async update() {
        setTimeout(async () => {
            if (!showActionBarGetter()) {
                this._currentActor = null;
                await this.render(true);
                this.hotbar.show();
                return;
            }

            let speaker = foundryApi.getSpeaker({});
            this._currentActor = null;
            if (speaker.token)
                this._currentActor = foundryApi.getToken(speaker.scene, speaker.token)!.actor as SplittermondActor;
            if (!this._currentActor && speaker.actor)
                this._currentActor = foundryApi.getActor(speaker.actor) as SplittermondActor;

            const customHotbar = document.querySelector("#custom-hotbar");
            if (this._currentActor == null) {
                this.hotbar.show();
                if (!!customHotbar) {
                    customHotbar.setAttribute("style", "display: flex !important");
                }
            } else {
                if (!showActionBar()) {
                    this.hotbar.hide();
                    if (!!customHotbar) {
                        customHotbar.setAttribute("style", "display: none !important");
                    }
                }
            }
            await this.render(true);
        }, 100);
    }

    private get hotbar() {
        const hotbar: HTMLElement | null = document.querySelector("#hotbar");
        return new ElementToggler(hotbar);
    }

    async _prepareContext(options: ApplicationContextOptions) {
        const data = (await super._prepareContext(options)) as ApplicationRenderContext &
            Partial<TokenActionBarTemplateData>;
        if (!!this._currentActor) {
            const currentActor = this._currentActor;
            data.name = this._currentActor.isToken ? this._currentActor.token.name : this._currentActor.name;
            data.actorId = this._currentActor.id;
            data.img = this._currentActor.isToken ? this._currentActor.token.texture.src : this._currentActor.img;
            data.skills = {
                general: splittermond.skillGroups.general
                    .filter(
                        (skillId) =>
                            ["acrobatics", "athletics", "determination", "stealth", "perception", "endurance"].includes(
                                skillId
                            ) || parseInt(currentActor.skills[skillId].points) > 0
                    )
                    .map((skillId) => currentActor.skills[skillId]),
                magic: splittermond.skillGroups.magic
                    .filter((skillId) => parseInt(currentActor.skills[skillId].points) > 0)
                    .map((skillId) => currentActor.skills[skillId]),
            };

            data.attacks = this._currentActor.attacks
                .map((a) => a.toObject())
                .map((a) => ({
                    ...a,
                    weaponSpeed: `${a.weaponSpeed}`,
                    range: `${a.range}`,
                }));

            data.weapons = this._currentActor.items
                .filter((item) => ["weapon", "shield"].includes(item.type))
                .sort((a, b) => a.sort - b.sort)
                .map((w) => w.toObject());

            data.spells = this._currentActor.spells
                .filter((spell: SplittermondSpellItem) => spell.skill && spell.skill.id)
                .reduce(
                    (
                        result: Partial<
                            Record<
                                SplittermondSkill,
                                {
                                    label: string;
                                    skillValue: number;
                                    spells: any[];
                                }
                            >
                        >,
                        item: SplittermondSpellItem
                    ) => {
                        const skillName = item.skill.id as SplittermondSkill;
                        if (!splittermond.skillGroups.all.includes(skillName)) {
                            throw new Error(`${skillName} is not a known skill`);
                        }
                        if (!result[skillName]) {
                            result[skillName] = {
                                label: `splittermond.skillLabel.${skillName}`,
                                skillValue: item.skill.value,
                                spells: [],
                            };
                        }
                        result[skillName].spells.push(item);
                        return result;
                    },
                    {}
                );

            if (Object.keys(data.spells as object /*see above*/).length == 0) {
                data.spells = undefined;
            }

            const preparedItemId = this._currentActor.getFlag("splittermond", "preparedSpell") as
                | string
                | null
                | undefined;
            data.preparedSpell = preparedItemId ? this.getPreparedSpell(preparedItemId) : null;

            data.derivedValues = this._currentActor.derivedValues;
        }

        return data;
    }

    private getPreparedSpell(preparedSpellId: string) {
        const preparedItem = preparedSpellId ? this._currentActor?.items.get(preparedSpellId) : null;
        if (!(preparedItem instanceof SplittermondSpellItem)) {
            this.currentActor?.setFlag("splittermond", "preparedSpell", null);
            throw new Error(`${preparedSpellId} does not point to a valid spell item`);
        }
        return {
            castDuration: preparedItem.castDuration.display,
            costs: preparedItem.costs,
            damage: preparedItem.damage,
            difficulty: preparedItem.difficulty,
            effectDuration: preparedItem.difficulty,
            enhancementCosts: preparedItem.enhancementCosts,
            enhancementDescription: preparedItem.enhancementDescription,
            enoughFocus: preparedItem.enoughFocus,
            id: preparedItem.id,
            img: preparedItem.img,
            name: preparedItem.name,
            range: preparedItem.range,
            skill: { label: preparedItem.skill.label, value: preparedItem.skill.value },
            spellTypeList: preparedItem.spellTypeList,
            description: preparedItem.system.description ?? "",
        };
    }

    async _onRender() {
        //try to place the action bar above the game and any custom hotbar
        if (showActionBar()) {
            let bottomPosition = Math.min(
                $("#ui-bottom").outerHeight() ?? Number.POSITIVE_INFINITY,
                $("#hotbar").outerHeight() ?? Number.POSITIVE_INFINITY
            );
            const bodyHeight = document.body.offsetHeight;
            if (document.querySelectorAll("#custom-hotbar").length) {
                bottomPosition = Math.max(bodyHeight - $("#custom-hotbar").position().top, bottomPosition);
            }
            (this.element.querySelector(".token-action-bar")! as HTMLElement).style.bottom = `${bottomPosition}px`;
        } else {
            setTimeout(() => {
                let bottomPosition = $("#ui-bottom").outerHeight() ?? "";
                (this.element.querySelector(".token-action-bar")! as HTMLElement).style.bottom = `${bottomPosition}px`;
            }, 200);
        }
    }

    async rollAttack(__: PointerEvent, target: HTMLElement) {
        const attackId = target.dataset.attackId;
        const prepared = target.dataset.prepared == "true";
        if (prepared) {
            let success = await this._currentActor?.rollAttack(attackId);
            if (success) this._currentActor?.setFlag("splittermond", "preparedAttack", null);
            return;
        }
        const attack = this._currentActor?.attacks.find((attack) => attack.toObject().id === attackId);
        if (!attack) {
            console.debug(`Splittermond | Attack of id ${attackId} not found on actor`);
            return;
        }
        this._currentActor?.addTicks(
            attack.weaponSpeed,
            `${foundryApi.localize("splittermond.attack")}: ${attack.name}`
        );
        this._currentActor?.setFlag("splittermond", "preparedAttack", attackId);
    }

    rollSkill(__: PointerEvent, target: HTMLElement) {
        const skill = closestData(target, "skill");
        this._currentActor?.rollSkill(skill);
    }

    async rollSpell(__: PointerEvent, target: HTMLElement) {
        const itemId = closestData(target, "item-id");
        let success = await this._currentActor?.rollSpell(itemId);
        if (success) {
            this._currentActor?.setFlag("splittermond", "preparedSpell", null);
        }
    }

    rollDefense(__: PointerEvent, target: HTMLElement) {
        const defenseType = target.dataset.defenseType ?? undefined;
        if (isDefenseType(defenseType)) {
            this._currentActor?.activeDefenseDialog(defenseType);
        } else {
            console.debug("Splittermond | Invalid defense type", defenseType);
            this._currentActor?.activeDefenseDialog(undefined); //Undefined will trigger the default
        }
    }

    async prepareSpell(__: PointerEvent, target: HTMLElement) {
        const itemId = target.dataset.spellId ?? "";
        const spell = this._currentActor?.items.get(itemId);
        if (!spell || !(spell instanceof SplittermondSpellItem)) {
            console.debug("Splittermond | Invalid spell", spell?.uuid);
            return;
        }
        this._currentActor?.addTicks(
            spell.castDuration.inTicks,
            `${foundryApi.localize("splittermond.castDuration")}: ${spell.name}`
        );
        await this._currentActor?.setFlag("splittermond", "preparedSpell", itemId);
    }

    openSheet() {
        this._currentActor?.sheet.render(true);
    }

    async toogleEquipped(__: PointerEvent, target: HTMLElement) {
        const itemId = target.dataset.itemId ?? "";
        const item = this._currentActor?.items.get(itemId);
        if (!item || !("equipped" in item.system)) {
            console.debug("Splittermond | Invalid item for toggle equipped", item?.uuid);
            return;
        }
        await item.update({ "system.equipped": !item.system.equipped });
    }
}

function isDefenseType(defenseType: string | undefined): defenseType is DefenseType | undefined {
    return (
        defenseType === undefined || ["mindresist", "bodyresist", "vtd", "kw", "gw", "defense"].includes(defenseType)
    );
}

export async function initTokenActionBar(splittermond: Record<string, unknown>) {
    theInstance = new TokenActionBar();
    splittermond.tokenActionBar = theInstance;

    type Controlled = unknown;
    foundryApi.hooks.on("controlToken", (__: TokenDocument, ___: Controlled) => {
        theInstance?.update();
    });

    type Updates = unknown;
    foundryApi.hooks.on("updateActor", (actor: SplittermondActor, __: Updates) => {
        if (actor.id === theInstance?.currentActor?.id) theInstance?.update();
    });

    type Scene = unknown;
    foundryApi.hooks.on("updateToken", (__: Scene, token: TokenDocument, ___: Updates) => {
        if (token._id == theInstance?.currentActor?.id) theInstance?.update();
    });

    foundryApi.hooks.on("updateItem", (source, __: SplittermondItem) => {
        if (source?.parent?.id == theInstance?.currentActor?.id) theInstance?.update();
    });

    foundryApi.hooks.on("createItem", (source, __: SplittermondItem) => {
        if (source?.parent?.id === theInstance?.currentActor?.id) theInstance?.update();
    });

    foundryApi.hooks.on("deleteItem", (source, __: SplittermondItem) => {
        if (source?.parent?.id == theInstance?.currentActor?.id) theInstance?.update();
    });
    return theInstance.update();
}

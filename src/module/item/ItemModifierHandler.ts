import type { ModifierErrorLogger } from "module/modifiers/parsing/ParseErrors";
import type { ScalarModifier, Value } from "../modifiers/parsing";
import { Modifier, MultiplicativeModifier } from "module/activeEffect";
import { splittermond } from "../config";
import type { IModifierSource } from "module/modifiers/IModifierSource";
import { type IModifier, makeConfig, ModifierHandler, type ModifierType } from "module/modifiers";
import { type TimeUnit } from "module/config/timeUnits";
import { isMember } from "module/util/util";
import { modifierChoices } from "module/modifiers/ModifierConfig";
import { ByAttributeHandler } from "module/modifiers/impl/ByAttributeHandler";

const spellSkillChoices = {
    values: modifierChoices(splittermond.skillGroups.all, (value) => `splittermond.skillLabel.${value}`),
    suggestions: Object.entries(splittermond.spellSkillsOption).map(([value, label]) => ({ value, label })),
};

export class ItemModifierHandler extends ByAttributeHandler(ModifierHandler<ScalarModifier>) {
    constructor(logErrors: ModifierErrorLogger, sourceItem: IModifierSource, modifierType: ModifierType) {
        super(logErrors, ItemModifierHandler.config, sourceItem, modifierType);
    }

    static config = makeConfig({
        topLevelPath: "item",
        hasEffect: false,
        subSegments: {
            damage: {
                description: "splittermond.modifierHelper.descriptions.itemDamage",
                optionalAttributes: {
                    item: null,
                    damageType: null,
                    itemType: null,
                    features: { label: "splittermond.modifierHelper.damageFeatures" },
                    skill: null,
                    spellType: null,
                },
            },
            weaponspeed: {
                description: "splittermond.modifierHelper.descriptions.weaponSpeed",
                optionalAttributes: { item: null, itemType: null, skill: null },
            },
            defenseTickCost: {
                description: "splittermond.modifierHelper.descriptions.defenseTickCost",
                optionalAttributes: { defenseType: null, item: null, itemType: null, skill: null },
            },
            mergeFeature: {
                description: "splittermond.modifierHelper.descriptions.mergeFeature",
                requiredAttributes: { value: null, feature: null },
                optionalAttributes: { item: null, itemType: null, skill: null },
            },
            addFeature: {
                description: "splittermond.modifierHelper.descriptions.addFeature",
                requiredAttributes: { value: null, feature: null },
                optionalAttributes: { item: null, itemType: null, skill: null },
            },
            castDuration: {
                description: "splittermond.modifierHelper.descriptions.castDuration",
                // Cast duration is only consumed by spells; retain the parser attribute for existing input.
                requiredAttributes: { value: null, unit: null },
                optionalAttributes: {
                    item: null,
                    itemType: { hidden: true },
                    skill: {
                        ...spellSkillChoices,
                        hint: "splittermond.modifierHelper.attributes.castDurationSkill",
                        groupChoices: false,
                    },
                },

                subSegments: {
                    multiplier: {
                        description: "splittermond.modifierHelper.descriptions.castDurationMultiplier",
                        optionalAttributes: {
                            item: null,
                            itemType: { hidden: true },
                            skill: {
                                ...spellSkillChoices,
                                hint: "splittermond.modifierHelper.attributes.castDurationSkill",
                                groupChoices: false,
                            },
                        },
                    },
                },
            },
        },
    });

    protected buildModifier(modifier: ScalarModifier): IModifier[] {
        const normalizedAttributes = this.buildAttributes(modifier.path, modifier.attributes);
        if (!this.hasValidDamageFilters(modifier, normalizedAttributes)) {
            return [];
        }
        const constructor = this.getConstructor(modifier.path);
        return [constructor(modifier.path, modifier.value, normalizedAttributes, false, () => this.sourceItem.actor)];
    }

    private hasValidDamageFilters(modifier: ScalarModifier, attributes: IModifier["attributes"]): boolean {
        if (modifier.path.toLowerCase() !== "item.damage" || !("spellType" in modifier.attributes)) {
            return true;
        }
        if ("item" in modifier.attributes) {
            this.reportInvalidDescriptor(modifier.path, "spellType", attributes.spellType ?? undefined, {
                messageKey: "splittermond.modifiers.parseMessages.spellTypeWithItem",
            });
            return false;
        }
        if ("skill" in modifier.attributes) {
            const skill = attributes.skill;
            const isValidSpellSkill = skill === "arcanelore" || isMember(splittermond.skillGroups.magic, skill);
            if (!isValidSpellSkill) {
                if (isMember(splittermond.skillGroups.all, skill)) {
                    this.reportInvalidDescriptor(modifier.path, "skill", skill, {
                        messageKey: "splittermond.modifiers.parseMessages.spellTypeWithSkill",
                    });
                }
                return false;
            }
        }
        return true;
    }

    private getConstructor(path: string) {
        return path.endsWith("multiplier") ? MultiplicativeModifier.create : Modifier.create;
    }

    mapAttribute(path: string, attribute: string, value: Value): string | undefined {
        switch (attribute) {
            case "name":
                return this.commonNormalizers.validatedAttribute(value);
            case "damageType":
                return this.normalizeDamageType(path, value);
            case "itemType":
                return this.normalizeItemType(path, value);
            case "unit":
                return this.normalizeUnit(path, value);
            case "skill":
                return this.commonNormalizers.normalizeSkill(path, value);
            case "spellType":
                return this.commonNormalizers.validatedAttribute(value)?.trim().toLowerCase();
            case "defenseType":
                return this.normalizeDefenseType(path, value);
            default:
                return this.commonNormalizers.validatedAttribute(value);
        }
    }

    normalizeDamageType(path: string, damageType: Value | undefined): string | undefined {
        const normalized = this.commonNormalizers.normalizeAttribute(damageType, "damageTypes");
        if (!normalized) {
            return undefined;
        } else if (!isMember(splittermond.damageTypes, normalized)) {
            this.reportInvalidDescriptor(path, "damageType", normalized);
            return undefined;
        } else {
            return normalized;
        }
    }

    normalizeItemType(path: string, itemType: Value | undefined): string | undefined {
        const normalized = this.commonNormalizers.normalizeAttribute(itemType, "itemTypes");
        if (!normalized) {
            return undefined;
        } else if (!isMember(splittermond.itemTypes.all, normalized)) {
            this.reportInvalidDescriptor(path, "itemType", normalized);
            return normalized;
        } else {
            return normalized;
        }
    }

    normalizeUnit(path: string, unit: Value | undefined): TimeUnit | undefined {
        const validated = this.commonNormalizers.validatedAttribute(unit);
        if (!validated) {
            return undefined;
        } else if (validated.toLowerCase().startsWith("t")) {
            return "T";
        } else if (validated.toLowerCase().startsWith("min")) {
            return "min";
        } else {
            this.reportInvalidDescriptor(path, "unit", validated);
            return undefined;
        }
    }

    normalizeDefenseType(path: string, defenseType: Value | undefined): string | undefined {
        const validated = this.commonNormalizers.validatedAttribute(defenseType)?.toLowerCase();
        switch (validated) {
            case "def":
            case "vtd":
            case "defense":
                return "defense";
            case "br":
            case "kw":
            case "bodyresist":
                return "bodyresist";
            case "mr":
            case "gw":
            case "mindresist":
                return "mindresist";
            case undefined:
                return undefined;
            default:
                this.reportInvalidDescriptor(path, "defenseType", validated);
                return undefined;
        }
    }
}

import type { ModifierErrorLogger } from "module/modifiers/parsing/ParseErrors";
import { normalizeDescriptor } from "module/modifiers/parsing/normalizer";
import { ICostModifier } from "module/util/costs/spellCostManagement";
import { times as timesCost } from "module/modifiers/expressions/cost";
import { type Expression, of } from "module/modifiers/expressions/scalar";
import type { FocusModifier, Value } from "module/modifiers/parsing";
import { ModifierHandler, type ModifierType } from "module/modifiers";
import { makeConfig, modifierChoices } from "module/modifiers/ModifierConfig";
import type { IModifierSource } from "module/modifiers/IModifierSource";
import { splittermond } from "module/config";

type ValidMapper = Parameters<ReturnType<typeof normalizeDescriptor>["usingMappers"]>[0];

export class CostModifierHandler extends ModifierHandler<FocusModifier> {
    constructor(
        logErrors: ModifierErrorLogger,
        private readonly sourceItem: IModifierSource,
        _: ModifierType
    ) {
        super(logErrors, CostModifierHandler.config);
    }
    static config = makeConfig({
        topLevelPath: "focus",
        hasEffect: false,
        subSegments: {
            reduction: {
                description: "splittermond.modifierHelper.descriptions.focusReduction",
                optionalAttributes: {
                    skill: {
                        values: modifierChoices(
                            splittermond.skillGroups.magic,
                            (value) => `splittermond.skillLabel.${value}`
                        ),
                        hint: "splittermond.modifierHelper.attributes.focusSkill",
                        groupChoices: false,
                    },
                    type: {
                        label: "splittermond.modifierHelper.spellType",
                        hint: "splittermond.modifierHelper.attributes.costType",
                    },
                },
            },
            addition: {
                description: "splittermond.modifierHelper.descriptions.focusAddition",
                optionalAttributes: {
                    skill: {
                        values: modifierChoices(
                            splittermond.skillGroups.magic,
                            (value) => `splittermond.skillLabel.${value}`
                        ),
                        hint: "splittermond.modifierHelper.attributes.focusSkill",
                        groupChoices: false,
                    },
                    type: {
                        label: "splittermond.modifierHelper.spellType",
                        hint: "splittermond.modifierHelper.attributes.costType",
                    },
                },
            },
            enhancedReduction: {
                description: "splittermond.modifierHelper.descriptions.enhancedReduction",
                optionalAttributes: {
                    skill: {
                        values: modifierChoices(
                            splittermond.skillGroups.magic,
                            (value) => `splittermond.skillLabel.${value}`
                        ),
                        hint: "splittermond.modifierHelper.attributes.focusSkill",
                        groupChoices: false,
                    },
                    type: {
                        label: "splittermond.modifierHelper.spellType",
                        hint: "splittermond.modifierHelper.attributes.costType",
                    },
                },
            },
            enhancedAddition: {
                description: "splittermond.modifierHelper.descriptions.enhancedAddition",
                optionalAttributes: {
                    skill: {
                        values: modifierChoices(
                            splittermond.skillGroups.magic,
                            (value) => `splittermond.skillLabel.${value}`
                        ),
                        hint: "splittermond.modifierHelper.attributes.focusSkill",
                        groupChoices: false,
                    },
                    type: {
                        label: "splittermond.modifierHelper.spellType",
                        hint: "splittermond.modifierHelper.attributes.costType",
                    },
                },
            },
        },
    });

    protected buildModifier(modifier: FocusModifier): ICostModifier[] {
        const group = this.normalizeSkill(modifier.path, modifier.attributes.skill);
        const type = this.validatedAttribute(modifier.attributes.type);
        const value = timesCost(this.getSign(modifier.path), modifier.value);
        const base: ICostModifier = {
            label: this.normalizePath(modifier.path),
            value,
            skill: hasSystemSkill(this.sourceItem) ? this.sourceItem.system.skill : null,
            attributes: {
                skill: group ?? undefined,
                type: type ?? undefined,
            },
            applyMultiplier: (multiplier) => ({ ...base, value: timesCost(of(multiplier), value) }),
        };
        return [base];
    }

    protected omitForValue(): boolean {
        return false;
    }

    validatedAttribute(value: Value | undefined): string | undefined {
        if (value === null || value === undefined || !this.validateDescriptor(value)) {
            return undefined;
        }
        return value;
    }

    private normalizeAttribute(value: Value | undefined, mapper: ValidMapper): string | undefined {
        const validated = this.validatedAttribute(value);
        return validated ? normalizeDescriptor(validated).usingMappers(mapper).do() : validated;
    }

    private normalizeSkill(groupId: string, input: Value) {
        const normalized = this.normalizeAttribute(input, "skills");
        if (normalized && !this.getAttributeChoices(groupId, "skill")?.some(({ value }) => value === normalized)) {
            this.reportInvalidDescriptor(groupId, "skill", normalized);
            //If the skill is invalid, but the item has a skill, use that one. If not use the invalid one,
            //because we don't want to accidentally make the modifier global.
            return hasSystemSkill(this.sourceItem) ? this.sourceItem.system.skill : normalized;
        }
        return normalized;
    }

    private getSign(groupId: string): Expression {
        const lowerCaseId = groupId.toLowerCase();
        if (lowerCaseId.endsWith("reduction") || lowerCaseId.endsWith("enhancedreduction")) {
            return of(1);
        } else {
            return of(-1);
        }
    }

    private normalizePath(path: string): string {
        if (path.toLowerCase().includes(".addition")) {
            return "focus.reduction";
        } else if (path.toLowerCase().includes(".enhancedaddition")) {
            return "focus.enhancedreduction";
        }
        return path;
    }
}

function hasSystemSkill(input: object): input is { system: { skill: string } } {
    return hasSystem(input) && hasSkill(input.system);
}
function hasSystem(input: object): input is { system: object } {
    return "system" in input && typeof input.system == "object" && !Array.isArray(input.system);
}

function hasSkill(input: object): input is { skill: string } {
    return "skill" in input && typeof input.skill === "string";
}

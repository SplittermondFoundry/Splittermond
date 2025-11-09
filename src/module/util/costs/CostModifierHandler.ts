import { normalizeDescriptor } from "module/modifiers/parsing/normalizer";
import { ICostModifier } from "module/util/costs/spellCostManagement";
import { times as timesCost } from "module/modifiers/expressions/cost";
import { type Expression, of, times } from "module/modifiers/expressions/scalar";
import type { FocusModifier, Value } from "module/modifiers/parsing";
import { ModifierHandler } from "module/modifiers";
import { makeConfig } from "module/modifiers/ModifierConfig";
import type SplittermondItem from "module/item/item";
import type { ModifierType } from "module/actor/modifier-manager";
import { splittermond } from "module/config";
import { isMember } from "module/util/util";

type ValidMapper = Parameters<ReturnType<typeof normalizeDescriptor>["usingMappers"]>[0];

export class CostModifierHandler extends ModifierHandler<FocusModifier> {
    constructor(
        logErrors: (...message: string[]) => void,
        private readonly sourceItem: SplittermondItem,
        _: ModifierType,
        private readonly multiplier: Expression
    ) {
        super(logErrors, CostModifierHandler.config);
    }
    static config = makeConfig({
        topLevelPath: "focus",
        subSegments: {
            reduction: {
                optionalAttributes: ["skill", "type"],
            },
            addition: {
                optionalAttributes: ["skill", "type"],
            },
            enhancedReduction: {
                optionalAttributes: ["skill", "type"],
            },
            enhancedAddition: {
                optionalAttributes: ["skill", "type"],
            },
        },
    });

    protected buildModifier(modifier: FocusModifier): ICostModifier | null {
        const group = this.normalizeSkill(modifier.path, modifier.attributes.skill);
        const type = this.validatedAttribute(modifier.attributes.type);
        return {
            label: this.normalizePath(modifier.path),
            value: timesCost(this.getMultiplier(modifier.path), modifier.value),
            skill: "skill" in this.sourceItem.system ? this.sourceItem.system.skill : null,
            attributes: {
                skill: group ?? undefined,
                type: type ?? undefined,
            },
        };
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
        if (normalized && !isMember(splittermond.skillGroups.magic, normalized)) {
            this.reportInvalidDescriptor(groupId, "skill", normalized);
            //If the skill is invalid, but the item has a skill, use that one. If not use the invalid one,
            //because we don't want to accidentally make the modifier global.
            return hasSkill(this.sourceItem.system) ? this.sourceItem.system.skill : normalized;
        }
        return normalized;
    }

    private getMultiplier(groupId: string): Expression {
        if (groupId.endsWith("reduction") || groupId.endsWith("enhancedreduction")) {
            return this.multiplier;
        } else {
            return times(this.multiplier, of(-1));
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

function hasSkill(input: object): input is { skill: string } {
    return "skill" in input && typeof (input as any).skill === "string";
}

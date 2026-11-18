import type { Value } from "module/modifiers/parsing";
import { normalizeDescriptor } from "module/modifiers/parsing/normalizer";
import { isMember } from "module/util/util";
import { splittermond } from "module/config";
import type { ModifierChoice } from "module/modifiers/ModifierConfig";

type ValidMapper = Parameters<ReturnType<typeof normalizeDescriptor>["usingMappers"]>[0];
export class CommonNormalizers {
    constructor(
        private validateDescriptor: (value: Value) => value is string,
        private reportInvalidDescriptor: (
            path: string,
            descriptorName: string,
            descriptorValue: string | undefined
        ) => void,
        private attributeChoices: (path: string, attribute: string) => readonly ModifierChoice[] | undefined = () =>
            undefined
    ) {}

    normalizeSkill(path: string, skill: Value | undefined): string | undefined {
        const normalized = this.normalizeAttribute(skill, "skills");
        if (!normalized) {
            return undefined;
        }
        const choices = this.attributeChoices(path, "skill");
        const valid = choices
            ? choices.some(({ value }) => value === normalized)
            : isMember(splittermond.skillGroups.all, normalized);
        if (!valid) {
            this.reportInvalidDescriptor(path, "skill", normalized);
            return normalized;
        } else {
            return normalized;
        }
    }

    normalizeAttribute(value: Value | undefined, mapper: ValidMapper): string | undefined {
        const validated = this.validatedAttribute(value);
        return validated ? normalizeDescriptor(validated).usingMappers(mapper).do() : validated;
    }

    validatedAttribute(value: Value | undefined): string | undefined {
        if (value === null || value === undefined || !this.validateDescriptor(value)) {
            return undefined;
        }
        return value;
    }
}

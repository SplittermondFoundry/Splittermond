import type { LanguageMapper } from "module/util/LanguageMapper";
import type { Value } from "module/modifiers/parsing";
import type { CommonNormalizers } from "module/modifiers/impl/CommonNormalizers";
import { isMember } from "module/util/util";

export function validateMembered<T extends string>(
    descriptorName: string,
    value: Value,
    collective: Readonly<T[]>,
    mapper: () => LanguageMapper<T>,
    reportInvalidDescriptor: (path: string, descriptorName: string, descriptorValue: string | undefined) => void,
    commonNormalizers: CommonNormalizers,
    path: string
): string | undefined {
    const resultDescriptor = commonNormalizers.validatedAttribute(value);
    if (!resultDescriptor) {
        return undefined;
    }
    const normalized = mapper().toCode(resultDescriptor);
    if (isMember(collective, normalized ?? resultDescriptor)) {
        return normalized ?? resultDescriptor;
    }
    reportInvalidDescriptor(path, descriptorName, resultDescriptor);
    return resultDescriptor;
}

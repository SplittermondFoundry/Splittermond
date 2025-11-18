import { type Config, type ModifierAttributes, ModifierHandler, type ModifierType } from "module/modifiers";
import type { Value } from "module/modifiers/parsing";
import { normalizeDescriptor } from "module/modifiers/parsing/normalizer";
import type { AnyModifier } from "module/modifiers/ModiferHandler";
import type SplittermondItem from "module/item/item";

type ValidMapper = Parameters<ReturnType<typeof normalizeDescriptor>["usingMappers"]>[0];
export function CommonHandlerMethods<T extends AnyModifier>(base: typeof ModifierHandler<T>) {
    abstract class CommonHandler extends base {
        constructor(
            logErrors: (...message: string[]) => void,
            config: Config,
            protected readonly sourceItem: SplittermondItem,
            protected readonly modifierType: ModifierType
        ) {
            super(logErrors, config);
        }
        buildAttributes(groupId: string, attributes: Record<string, Value>): ModifierAttributes {
            const normalizedAttributes: ModifierAttributes = {
                name: this.sourceItem.name,
                type: this.modifierType,
            };
            for (const attribute in attributes) {
                normalizedAttributes[attribute] = this.mapAttribute(groupId, attribute, attributes[attribute]);
            }
            return normalizedAttributes;
        }
        protected abstract mapAttribute(groupId: string, attribute: string, value: Value): string | undefined;

        protected normalizeAttribute(value: Value | undefined, mapper: ValidMapper): string | undefined {
            const validated = this.validatedAttribute(value);
            return validated ? normalizeDescriptor(validated).usingMappers(mapper).do() : validated;
        }

        protected validatedAttribute(value: Value | undefined): string | undefined {
            if (value === null || value === undefined || !this.validateDescriptor(value)) {
                return undefined;
            }
            return value;
        }
    }
    return CommonHandler;
}

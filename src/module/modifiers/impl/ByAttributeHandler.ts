import { type Config, type ModifierAttributes, ModifierHandler, type ModifierType } from "module/modifiers";
import type { Value } from "module/modifiers/parsing";
import type { AnyModifier } from "module/modifiers/ModiferHandler";
import type SplittermondItem from "module/item/item";
import { CommonNormalizers } from "module/modifiers/impl/CommonNormalizers";

export function ByAttributeHandler<T extends AnyModifier>(base: typeof ModifierHandler<T>) {
    abstract class CommonHandler extends base {
        protected readonly commonNormalizers: CommonNormalizers;
        constructor(
            logErrors: (...message: string[]) => void,
            config: Config,
            protected readonly sourceItem: SplittermondItem,
            protected readonly modifierType: ModifierType
        ) {
            super(logErrors, config);
            this.commonNormalizers = new CommonNormalizers(
                this.validateDescriptor.bind(this),
                this.reportInvalidDescriptor.bind(this)
            );
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
    }
    return CommonHandler;
}

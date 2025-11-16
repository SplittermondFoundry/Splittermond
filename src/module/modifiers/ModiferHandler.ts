import { foundryApi } from "module/api/foundryApi";
import type { FocusModifier, ScalarModifier, Value } from "module/modifiers/parsing";
import { validateDescriptors } from "module/modifiers/parsing/validators";
import type { Config, ConfigSegment } from "module/modifiers/ModifierConfig";
import type { CostExpression } from "module/modifiers/expressions/cost";
import type { Expression } from "module/modifiers/expressions/scalar";
import type { ICostModifier } from "module/util/costs/spellCostManagement";
import type { IModifier } from "module/modifiers/index";

export type AnyModifier = ScalarModifier | FocusModifier;

type ExpressionType<T extends AnyModifier> = T["value"] & (Expression | CostExpression);
type ResultType<T extends AnyModifier> = T extends ScalarModifier ? IModifier : ICostModifier;
export abstract class ModifierHandler<TYPE extends AnyModifier> {
    constructor(
        private readonly logErrors: (...messages: string[]) => void,
        private readonly config: Config
    ) {}

    processModifier(modifier: TYPE): ResultType<TYPE>[] {
        if (this.omitForValue(modifier.value)) {
            console.debug(`Splittermond | Omitting modifier ${modifier.path} because of its value:`, modifier.value);
            return [];
        }
        const pathConfig = this.getPathConfig(modifier.path);
        if (!pathConfig) {
            this.reportPathError(modifier.path);
            return [];
        } else if (!this.noMissingAttributes(modifier, pathConfig)) {
            this.reportMissingAttributeError(modifier, pathConfig);
            return [];
        }
        this.reportUnknownAttributes(modifier, pathConfig);

        return this.buildModifier(modifier, pathConfig);
    }

    protected abstract omitForValue(value: ExpressionType<TYPE>): boolean;

    protected abstract buildModifier(modifier: TYPE, pathConfig: ConfigSegment): ResultType<TYPE>[];

    private getPathConfig(path: string): ConfigSegment | null {
        const pathElements = path.toLowerCase().split(".");
        const configTopLevel = this.config.topLevelPath.toLowerCase().split(".");
        if (pathElements.slice(0, configTopLevel.length).some((e, i) => e !== configTopLevel[i])) {
            return null;
        }
        let currentSegment: ConfigSegment = this.config;
        for (const pathElement of pathElements.slice(configTopLevel.length)) {
            const nextSegmentKey = Object.keys(currentSegment.subSegments ?? {}).find(
                (key) => key.toLowerCase() === pathElement
            );
            if (!nextSegmentKey) {
                return null;
            }
            currentSegment = currentSegment.subSegments![nextSegmentKey];
        }
        return currentSegment;
    }

    protected reportUnknownAttributes(modifier: TYPE, config: ConfigSegment) {
        const knownAttributes = [...config.requiredAttributes, ...config.optionalAttributes];
        Object.keys(modifier.attributes)
            .filter((key) => !knownAttributes.includes(key))
            .forEach((key) => {
                this.logErrors(
                    foundryApi.format("splittermond.modifiers.parseMessages.unknownDescriptor", {
                        groupId: modifier.path,
                        attribute: key,
                    })
                );
            });
    }

    private reportPathError(groupId: string) {
        this.logErrors(foundryApi.format("splittermond.modifiers.parseMessages.unknownGroupId", { groupId }));
    }

    private noMissingAttributes(modifier: TYPE, config: ConfigSegment) {
        return this.findMissingAttributes(modifier, config).length === 0;
    }

    private reportMissingAttributeError(modifier: TYPE, pathConfig: ConfigSegment) {
        const failedValidations = this.findMissingAttributes(modifier, pathConfig).map((attributeKey) =>
            foundryApi.format("splittermond.modifiers.parseMessages.missingDescriptor", {
                groupId: modifier.path,
                attribute: attributeKey,
            })
        );
        this.logErrors(...failedValidations);
    }

    private findMissingAttributes(modifier: TYPE, config: ConfigSegment) {
        return config.requiredAttributes.filter(
            (requiredAttribute) => modifier.attributes[requiredAttribute] === undefined
        );
    }

    protected reportInvalidDescriptor(path: string, descriptorName: string, descriptorValue: string | undefined) {
        this.logErrors(
            foundryApi.format("splittermond.modifiers.parseMessages.invalidDescriptorValue", {
                groupId: path,
                attribute: descriptorName,
                value: descriptorValue ?? "",
            })
        );
    }

    protected validateDescriptor(value: Value): value is string {
        const errors = validateDescriptors(value);
        if (errors.length > 0) {
            this.logErrors(...errors);
            return false;
        }
        return true;
    }
}

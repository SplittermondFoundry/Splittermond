import type {IModifier} from "module/actor/modifier-manager";
import {foundryApi} from "module/api/foundryApi";
import type {ScalarModifier, Value} from "module/modifiers/parsing";
import {validateDescriptors} from "module/modifiers/parsing/validators";
import type {Expression} from "module/modifiers/expressions/scalar";
import type {Config, ConfigSegment} from "module/modifiers/ModifierConfig";


export abstract class ModifierHandler {

    constructor(
        private readonly logErrors:(...messages: string[])=>void,
        private readonly config: Config,
    ) {
    }

    processModifier(modifier: ScalarModifier): IModifier | null {
        if (this.omitForValue(modifier.value)) {
            console.debug(`Splittermond | Omitting modifier ${modifier.path} because of its value:`, modifier.value);
            return null;
        }
        const pathConfig = this.getPathConfig(modifier.path);
        if (!pathConfig) {
            this.reportPathError(modifier.path);
            return null;
        } else if (!this.noMissingAttributes(modifier, pathConfig)) {
            this.reportMissingAttributeError(modifier, pathConfig);
            return null;
        }
        this.reportUnknownAttributes(modifier, pathConfig);


        return this.buildModifier(modifier, pathConfig);
    };


    protected abstract omitForValue(value: Expression): boolean

    protected abstract buildModifier(modifier: ScalarModifier, pathConfig: ConfigSegment): IModifier | null;


    private getPathConfig(path: string): ConfigSegment | null {
        const pathElements = path.split(".").map((e)=>e.toLowerCase());
        if (pathElements[0] !== this.config.topLevelPath) {
            return null;
        }
        let currentSegment: ConfigSegment = this.config;
        for (const pathElement of pathElements.slice(1)) {
            const nextSegmentKey = Object.keys(currentSegment.subSegments ?? {})
                .find(key => key.toLowerCase() === pathElement);
            if (!nextSegmentKey) {
                return null;
            }
            currentSegment = currentSegment.subSegments![nextSegmentKey];
        }
        return currentSegment;
    }

    protected reportUnknownAttributes(modifier: ScalarModifier, config: ConfigSegment) {
        const knownAttributes = [...config.requiredAttributes, ...config.optionalAttributes];
        Object.keys(modifier.attributes)
            .filter(key => !knownAttributes.includes(key))
            .forEach(key => {
                this.logErrors(foundryApi.format("splittermond.modifiers.parseMessages.unknownDescriptor", {
                    groupId: modifier.path,
                    attribute: key,
                }));
            });
    }

    private reportPathError(groupId: string) {
        this.logErrors(foundryApi.format(
            "splittermond.modifiers.parseMessages.unknownGroupId", {groupId})
        );
    }

    private noMissingAttributes(modifier: ScalarModifier, config: ConfigSegment) {
        return this.findMissingAttributes(modifier, config).length === 0;
    }

    private reportMissingAttributeError(modifier:ScalarModifier, pathConfig:ConfigSegment) {
        const failedValidations = this.findMissingAttributes(modifier, pathConfig)
            .map(attributeKey => foundryApi.format("splittermond.modifiers.parseMessages.missingDescriptor", {
                    groupId: modifier.path,
                    attribute: attributeKey,
                })
            );
        this.logErrors(...failedValidations)
    }

    private findMissingAttributes(modifier: ScalarModifier, config: ConfigSegment) {
        return config.requiredAttributes.filter(requiredAttribute => modifier.attributes[requiredAttribute] === undefined)
    }

    protected reportInvalidDescriptor(path: string, descriptorName: string, descriptorValue: string | undefined) {
        this.logErrors(foundryApi.format("splittermond.modifiers.parseMessages.invalidDescriptorValue", {
            groupId: path,
            attribute: descriptorName,
            value: descriptorValue ?? "",
        }));
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
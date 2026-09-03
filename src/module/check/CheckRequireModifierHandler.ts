import { type Config, IModifier, makeConfig, ModifierHandler, type ModifierType } from "module/modifiers";
import { of } from "module/modifiers/expressions/scalar";
import type { ScalarModifier, Value } from "module/modifiers/parsing";
import { Modifier } from "module/activeEffect";
import type { IModifierSource } from "module/modifiers/IModifierSource";
import { rollType, type RollType } from "module/config/check";
import { initMapper, LanguageMapper } from "module/util/LanguageMapper";
import { CommonNormalizers } from "module/modifiers/impl/CommonNormalizers";
import { validateMembered } from "module/check/validateMembered";
import { checkTypeMapper, checkTypes } from "module/check/CheckModifierHandler";

const rollTypes = Object.keys(rollType) as RollType[];

const rollTypeMapper: () => LanguageMapper<RollType> = initMapper(rollTypes)
    .withTranslator((t) => `splittermond.rollType.${t}`)
    .build();

export class CheckRequireModifierHandler extends ModifierHandler<ScalarModifier> {
    static config: Config = makeConfig({
        topLevelPath: "check.require",
        requiredAttributes: ["rollType"],
        optionalAttributes: ["skill", "type"],
        requiresValue: false,
    });

    private readonly commonNormalizers: CommonNormalizers;

    constructor(
        logErrors: (...message: string[]) => void,
        private readonly sourceItem: IModifierSource,
        private readonly modifierType: ModifierType
    ) {
        super(logErrors, CheckRequireModifierHandler.config);
        this.commonNormalizers = new CommonNormalizers(
            this.validateDescriptor.bind(this),
            this.reportInvalidDescriptor.bind(this)
        );
    }

    protected omitForValue(): boolean {
        return false;
    }

    protected buildModifier(modifier: ScalarModifier): IModifier[] {
        const emphasis = this.commonNormalizers.validatedAttribute(modifier.attributes.emphasis);
        const attributes = {
            name: emphasis ?? this.sourceItem.name,
            rollType: this.validateRollType(modifier.attributes.rollType),
            skill: this.commonNormalizers.normalizeSkill(modifier.path, modifier.attributes.skill),
            checkType: this.validateCheckType(modifier.attributes.type),
            type: this.modifierType,
            emphasis,
        };
        return [
            Modifier.create("check.require", of(0), attributes, !!attributes.emphasis, () => this.sourceItem.actor),
        ];
    }

    private validateRollType(value: Value): string | undefined {
        return validateMembered(
            "rollType",
            value,
            rollTypes,
            rollTypeMapper,
            this.reportInvalidDescriptor.bind(this),
            this.commonNormalizers,
            CheckRequireModifierHandler.config.topLevelPath
        );
    }

    private validateCheckType(type: Value): string | undefined {
        return validateMembered(
            "type",
            type,
            checkTypes,
            checkTypeMapper,
            this.reportInvalidDescriptor.bind(this),
            this.commonNormalizers,
            CheckRequireModifierHandler.config.topLevelPath
        );
    }
}

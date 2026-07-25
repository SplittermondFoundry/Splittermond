import { type Config, IModifier, makeConfig, ModifierHandler, type ModifierType } from "module/modifiers";
import { Expression, isZero } from "module/modifiers/expressions/scalar";
import type { ScalarModifier, Value } from "module/modifiers/parsing";
import { Modifier } from "module/activeEffect";
import type { IModifierSource } from "module/modifiers/IModifierSource";
import { type CheckSuccessState, successStates } from "module/check/modifyEvaluation";
import { initMapper, LanguageMapper } from "module/util/LanguageMapper";
import { CommonNormalizers } from "module/modifiers/impl/CommonNormalizers";
import { validateMembered } from "module/check/validateMembered";

export class CheckModifierHandler extends ModifierHandler<ScalarModifier> {
    static config: Config = makeConfig({
        topLevelPath: "check",
        subSegments: {
            result: {
                requiredAttributes: ["category"],
                optionalAttributes: ["skill", "type"],
            },
        },
    });
    private readonly commonNormalizers: CommonNormalizers;

    constructor(
        logErrors: (...message: string[]) => void,
        private readonly sourceItem: IModifierSource,
        private readonly modifierType: ModifierType
    ) {
        super(logErrors, CheckModifierHandler.config);
        this.commonNormalizers = new CommonNormalizers(
            this.validateDescriptor.bind(this),
            this.reportInvalidDescriptor.bind(this)
        );
    }
    protected omitForValue(value: Expression): boolean {
        return isZero(value);
    }

    protected buildModifier(modifier: ScalarModifier): IModifier[] {
        const emphasis = this.commonNormalizers.validatedAttribute(modifier.attributes.emphasis);
        const attributes = {
            name: emphasis ?? this.sourceItem.name,
            category: this.validateOutcomeCategory(modifier.attributes.category),
            skill: this.commonNormalizers.normalizeSkill(modifier.path, modifier.attributes.skill),
            checkType: this.validateCheckType(modifier.attributes.type),
            type: this.modifierType,
            emphasis,
        };
        return [
            Modifier.create(
                modifier.path,
                modifier.value,
                attributes,
                !!attributes.emphasis,
                () => this.sourceItem.actor
            ),
        ];
    }

    validateOutcomeCategory(category: Value): string | undefined {
        return validateMembered(
            "category",
            category,
            successStates,
            successStateMapper,
            this.reportInvalidDescriptor.bind(this),
            this.commonNormalizers,
            CheckModifierHandler.config.topLevelPath
        );
    }
    validateCheckType(type: Value): string | undefined {
        return validateMembered(
            "type",
            type,
            checkTypes,
            checkTypeMapper,
            this.reportInvalidDescriptor.bind(this),
            this.commonNormalizers,
            CheckModifierHandler.config.topLevelPath
        );
    }
}
const successStateMapper = initMapper(successStates)
    .withTranslator((s) => `splittermond.degreeOfSuccessClassification.${s}`)
    .andOtherMappers(mapSuccessMessage)
    .build();

function mapSuccessMessage(successState: CheckSuccessState): string {
    switch (successState) {
        case "outstanding":
            return "splittermond.successMessage.5";
        case "success":
            return "splittermond.successMessage.1";
        case "nearmiss":
            return "splittermond.failMessage.0";
        case "failure":
            return "splittermond.failMessage.1";
        case "devastating":
            return "splittermond.failMessage.5";
    }
}

export const checkTypes = ["attack", "spell", "defense", "skill"] as const;
export type CheckType = (typeof checkTypes)[number];

export const checkTypeMapper: () => LanguageMapper<CheckType> = initMapper(checkTypes)
    .withTranslator(mapCheckTypes)
    .andDirectMap("activeDefense", "defense")
    .build();

function mapCheckTypes(checkType: CheckType): string {
    switch (checkType) {
        case "attack":
        case "spell":
        case "skill":
            return `splittermond.${checkType}`;
        case "defense":
            return "splittermond.activeDefense";
    }
}

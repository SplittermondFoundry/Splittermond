import { type Config, IModifier, makeConfig, ModifierHandler, type ModifierType } from "module/modifiers";
import { Expression, isZero, times } from "module/modifiers/expressions/scalar";
import type { ScalarModifier, Value } from "module/modifiers/parsing";
import Modifier from "module/modifiers/impl/modifier";
import type SplittermondItem from "module/item/item";
import { type CheckSuccessState, successStates } from "module/check/modifyEvaluation";
import { isMember } from "module/util/util";
import { initMapper, LanguageMapper } from "module/util/LanguageMapper";
import { CommonNormalizers } from "module/modifiers/impl/CommonNormalizers";

export class CheckModifierHandler extends ModifierHandler<ScalarModifier> {
    static config: Config = makeConfig({
        topLevelPath: "check",
        subSegments: {
            result: {
                requiredAttributes: ["category"],
                optionalAttributes: [
                    "skill",
                    "type",
                    /*"emphasis"*/
                    //This,later
                ],
            },
        },
    });
    private readonly commonNormalizers: CommonNormalizers;

    constructor(
        logErrors: (...message: string[]) => void,
        private readonly sourceItem: SplittermondItem,
        private readonly modifierType: ModifierType,
        private readonly multiplier: Expression
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
        const totalValue = times(modifier.value, this.multiplier);
        return [new Modifier(modifier.path, totalValue, attributes, this.sourceItem, !!attributes.emphasis)];
    }

    validateOutcomeCategory(category: Value): string | undefined {
        return this.validateMembered("category", category, successStates, successStateMapper);
    }
    validateCheckType(type: Value): string | undefined {
        return this.validateMembered("type", type, checkTypes, checkTypeMapper);
    }
    private validateMembered<T extends string>(
        descriptorName: string,
        value: Value,
        collective: Readonly<T[]>,
        mapper: () => LanguageMapper<T>
    ) {
        const resultDescriptor = this.commonNormalizers.validatedAttribute(value);
        if (!resultDescriptor) {
            return undefined;
        }
        const normalized = mapper().toCode(resultDescriptor);
        if (isMember(collective, normalized ?? resultDescriptor)) {
            return normalized ?? resultDescriptor;
        }
        this.reportInvalidDescriptor(CheckModifierHandler.config.topLevelPath, descriptorName, resultDescriptor);
        return resultDescriptor;
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

const checkTypes = ["attack", "spell", "defense", "skill"] as const;
export type CheckType = (typeof checkTypes)[number];

const checkTypeMapper = initMapper(checkTypes)
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

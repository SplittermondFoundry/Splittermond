import { type Config, IModifier, makeConfig, ModifierHandler, type ModifierType } from "module/modifiers";
import { Expression, isZero, times } from "module/modifiers/expressions/scalar";
import type { ScalarModifier, Value } from "module/modifiers/parsing";
import Modifier from "module/modifiers/impl/modifier";
import type SplittermondItem from "module/item/item";
import { type CheckSuccessState, successStates } from "module/check/modifyEvaluation";
import { isMember } from "module/util/util";
import { initMapper } from "module/util/LanguageMapper";

export class CheckModifierHandler extends ModifierHandler<ScalarModifier> {
    static config: Config = makeConfig({
        topLevelPath: "check",
        subSegments: {
            result: {
                requiredAttributes: ["category"],
                optionalAttributes: [
                    /*"skill",*/
                    /*"type",*/
                    //later
                    /*"emphasis"*/
                    //This,later
                ],
            },
        },
    });

    constructor(
        logErrors: (...message: string[]) => void,
        private readonly sourceItem: SplittermondItem,
        private readonly modifierType: ModifierType,
        private readonly multiplier: Expression
    ) {
        super(logErrors, CheckModifierHandler.config);
    }
    protected omitForValue(value: Expression): boolean {
        return isZero(value);
    }

    protected buildModifier(modifier: ScalarModifier): IModifier[] {
        const emphasis = this.validatedEmphasis(modifier.attributes.emphasis);
        const attributes = {
            name: emphasis ?? this.sourceItem.name,
            category: this.validateOutcomeCategory(modifier.attributes.category),
            type: this.modifierType,
            emphasis,
        };
        const totalValue = times(modifier.value, this.multiplier);
        return [new Modifier(modifier.path, totalValue, attributes, this.sourceItem, !!attributes.emphasis)];
    }

    validatedEmphasis(emphasis: Value | undefined): string | undefined {
        return emphasis && this.validateDescriptor(emphasis) ? emphasis : undefined;
    }

    validateOutcomeCategory(type: Value): string | undefined {
        const resultDescriptor = this.validateDescriptor(type) ? type : undefined;
        if (!resultDescriptor) {
            return undefined;
        }
        const normalized = successStateMapper().toCode(resultDescriptor);
        if (isMember(successStates, normalized ?? resultDescriptor)) {
            return normalized ?? resultDescriptor;
        }
        this.reportInvalidDescriptor(CheckModifierHandler.config.topLevelPath, "category", resultDescriptor);
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

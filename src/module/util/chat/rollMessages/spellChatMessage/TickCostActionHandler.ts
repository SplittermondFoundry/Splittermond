import { DataModelSchemaType, fields, SplittermondDataModel } from "module/data/SplittermondDataModel";
import { ActionHandler, DegreeOfSuccessOptionSuggestion, ValuedAction } from "./interfaces";
import { configureUseOption, DegreeOfSuccessAction } from "../defaultUseOptionAlgorithm";
import { NumberDegreeOfSuccessOptionField } from "../NumberDegreeOfSuccessOptionField";
import { AgentReference } from "module/data/references/AgentReference";
import { splittermond } from "module/config";
import { ItemReference } from "module/data/references/ItemReference";
import SplittermondSpellItem from "../../../../item/spell";
import { configureUseAction } from "../defaultUseActionAlgorithm";

function TickCostActionHandlerSchema() {
    return {
        used: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        isOption: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        tickReduction: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        actorReference: new fields.EmbeddedDataField(AgentReference, { required: true, nullable: false }),
        baseTickCost: new fields.NumberField({ required: true, nullable: false }),
        options: new fields.EmbeddedDataField(NumberDegreeOfSuccessOptionField, { required: true, nullable: false }),
    };
}

type TickCostActionHandlerType = DataModelSchemaType<typeof TickCostActionHandlerSchema>;

export class TickCostActionHandler extends SplittermondDataModel<TickCostActionHandlerType> implements ActionHandler {
    static defineSchema = TickCostActionHandlerSchema;

    static initialize(
        actorReference: AgentReference,
        spellReference: ItemReference<SplittermondSpellItem>,
        baseTickCost: number
    ): TickCostActionHandler {
        const castDurationConfig = splittermond.spellEnhancement.castDuration;
        return new TickCostActionHandler({
            used: false,
            isOption: !!spellReference.getItem().degreeOfSuccessOptions.castDuration,
            tickReduction: 0,
            actorReference: actorReference,
            baseTickCost,
            options: NumberDegreeOfSuccessOptionField.initialize(
                castDurationConfig.degreesOfSuccess,
                castDurationConfig.castDurationReduction,
                castDurationConfig.textTemplate
            ),
        });
    }

    public readonly handlesDegreeOfSuccessOptions = ["castDurationUpdate"] as const;

    useDegreeOfSuccessOption(degreeOfSuccessOptionData: any): DegreeOfSuccessAction {
        return configureUseOption()
            .withUsed(() => this.used)
            .withIsOption(() => this.isOption)
            .withHandlesOptions(this.handlesDegreeOfSuccessOptions)
            .whenAllChecksPassed((degreeOfSuccessOptionData) => {
                const multiplicity = Number.parseInt(degreeOfSuccessOptionData.multiplicity);
                const option = this.options.forMultiplicity(multiplicity);
                return {
                    usedDegreesOfSuccess: option.isChecked() ? -1 * option.cost : option.cost,
                    action: () => {
                        option.check();
                        const tickReductionIncrement = option.isChecked() ? option.effect : -1 * option.effect;
                        this.updateSource({ tickReduction: this.tickReduction + tickReductionIncrement });
                    },
                };
            })
            .useOption(degreeOfSuccessOptionData);
    }

    renderDegreeOfSuccessOptions(): DegreeOfSuccessOptionSuggestion[] {
        if (!this.isOption) {
            return [];
        }
        return this.options
            .getMultiplicities()
            .map((m) => this.options.forMultiplicity(m))
            .filter((m) => m.isChecked() || !this.reducesCostPastMinimum(m.effect))
            .map((m) => ({
                render: {
                    ...m.render(),
                    disabled: this.used,
                    action: "castDurationUpdate",
                },
                cost: m.isChecked() ? -m.cost : m.cost,
            }));
    }

    private reducesCostPastMinimum(effect: number): boolean {
        return this.baseTickCost - effect < 1;
    }

    public readonly handlesActions = ["advanceToken"] as const;

    useAction(actionData: any): Promise<void> {
        return configureUseAction()
            .withUsed(() => this.used)
            .withIsOptionEvaluator(() => this.isOption)
            .withHandlesActions(this.handlesActions)
            .whenAllChecksPassed(() => {
                this.updateSource({ used: true });
                return this.actorReference.getAgent().addTicks(this.tickCost, "", false);
            })
            .useAction(actionData);
    }

    renderActions(): ValuedAction[] {
        if (!this.isOption) {
            return [];
        }
        return [
            {
                type: "advanceToken",
                value: `${this.tickCost}`,
                disabled: this.used,
                isLocal: false,
            },
        ];
    }

    get tickCost() {
        const adjusted = this.baseTickCost - this.tickReduction;
        return adjusted > 0 ? adjusted : 1;
    }
}

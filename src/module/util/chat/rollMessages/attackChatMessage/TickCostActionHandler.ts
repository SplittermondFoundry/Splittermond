import { DataModelSchemaType, fields, SplittermondDataModel } from "module/data/SplittermondDataModel";
import { ActionHandler, type AttackCheckReport, DegreeOfSuccessOptionSuggestion, ValuedAction } from "./interfaces";
import { configureUseAction } from "../ChatMessageUtils";
import { NumberDegreeOfSuccessOptionField } from "../NumberDegreeOfSuccessOptionField";
import { AgentReference } from "module/data/references/AgentReference";
import { splittermond } from "module/config";
import { OnAncestorReference } from "module/data/references/OnAncestorReference";
import { totalDegreesOfSuccess } from "module/check/modifyEvaluation";

function TickCostActionHandlerSchema() {
    return {
        used: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        actorReference: new fields.EmbeddedDataField(AgentReference, { required: true, nullable: false }),
        baseTickCost: new fields.NumberField({ required: true, nullable: false }),
        checkReportReference: new fields.EmbeddedDataField(OnAncestorReference<AttackCheckReport>, {
            required: true,
            nullable: false,
        }),
        isOption: new fields.BooleanField({ required: true, nullable: false }),
        options: new fields.EmbeddedDataField(NumberDegreeOfSuccessOptionField, { required: true, nullable: false }),
    };
}

type TickCostActionHandlerType = DataModelSchemaType<typeof TickCostActionHandlerSchema>;

export class TickCostActionHandler extends SplittermondDataModel<TickCostActionHandlerType> implements ActionHandler {
    static defineSchema = TickCostActionHandlerSchema;

    static initialize(
        actorReference: AgentReference,
        checkReportReference: OnAncestorReference<AttackCheckReport>,
        baseTickCost: number
    ): TickCostActionHandler {
        const castDurationConfig = splittermond.spellEnhancement.castDuration;
        return new TickCostActionHandler({
            used: false,
            isOption: baseTickCost > 0,
            actorReference: actorReference,
            checkReportReference,
            baseTickCost,
            options: NumberDegreeOfSuccessOptionField.initialize(
                castDurationConfig.degreesOfSuccess,
                castDurationConfig.castDurationReduction,
                castDurationConfig.textTemplate
            ),
        });
    }

    public readonly handlesDegreeOfSuccessOptions = [] as const;

    renderDegreeOfSuccessOptions(): DegreeOfSuccessOptionSuggestion[] {
        return [];
    }
    useDegreeOfSuccessOption() {
        return {
            action: () => {},
            usedDegreesOfSuccess: 0,
        };
    }

    public readonly handlesActions = ["advanceToken"] as const;

    useAction(actionData: any): Promise<void> {
        return configureUseAction()
            .withUsed(() => this.used)
            .withIsOptionEvaluator(() => this.isOption)
            .withHandlesActions(this.handlesActions)
            .whenAllChecksPassed(() => {
                this.updateSource({ used: true });
                return this.actorReference.getAgent().addTicks(this.tickCost - this.critSuccessReduction, "", false);
            })
            .useAction(actionData);
    }

    get critSuccessReduction() {
        const isCriticalSuccess =
            totalDegreesOfSuccess(this.checkReportReference.get()) >=
            splittermond.check.degreeOfSuccess.criticalSuccessThreshold;
        return isCriticalSuccess ? splittermond.attackEnhancement.criticalSuccess.weaponspeedReduction : 0;
    }

    renderActions(): ValuedAction[] {
        if (!this.isOption) return [];
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
        const adjusted = this.baseTickCost;
        return adjusted > 0 ? adjusted : 1;
    }
}

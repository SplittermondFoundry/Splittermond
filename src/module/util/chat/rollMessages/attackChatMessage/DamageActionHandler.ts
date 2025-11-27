import { DataModelSchemaType, fields, SplittermondDataModel } from "module/data/SplittermondDataModel";
import {
    ActionHandler,
    ActionInput,
    type AttackCheckReport,
    DegreeOfSuccessAction,
    DegreeOfSuccessOptionSuggestion,
    ValuedAction,
} from "./interfaces";
import { NumberDegreeOfSuccessOptionField } from "./optionFields/NumberDegreeOfSuccessOptionField";
import { AgentReference } from "module/data/references/AgentReference";
import { splittermond } from "module/config";
import { OnAncestorReference } from "module/data/references/OnAncestorReference";
import { configureUseOption } from "./commonAlgorithms/defaultUseOptionAlgorithm";
import { configureUseAction } from "./commonAlgorithms/defaultUseActionAlgorithm";
import { DamageInitializer } from "../../damageChatMessage/initDamage";
import { CostBase, type CostType } from "../../../costs/costTypes";
import { foundryApi } from "module/api/foundryApi";
import { asString, condense, mapRoll } from "module/modifiers/expressions/scalar";
import { toDisplayFormula, toRollFormula } from "module/util/damage/util";
import type Attack from "module/actor/attack";

function DamageActionHandlerSchema() {
    return {
        used: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        damageAddition: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        actorReference: new fields.EmbeddedDataField(AgentReference, { required: true, nullable: false }),
        attackReference: new fields.EmbeddedDataField(OnAncestorReference<Attack>, {
            required: true,
            nullable: false,
        }),
        checkReportReference: new fields.EmbeddedDataField(OnAncestorReference<AttackCheckReport>, {
            required: true,
            nullable: false,
        }),
        options: new fields.EmbeddedDataField(NumberDegreeOfSuccessOptionField, { required: true, nullable: false }),
    };
}

type DamageActionHandlerType = DataModelSchemaType<typeof DamageActionHandlerSchema>;

export class DamageActionHandler extends SplittermondDataModel<DamageActionHandlerType> implements ActionHandler {
    static defineSchema = DamageActionHandlerSchema;

    static initialize(
        actorReference: AgentReference,
        attackReference: OnAncestorReference<Attack>,
        checkReportReference: OnAncestorReference<AttackCheckReport>
    ): DamageActionHandler {
        const damageAdditionConfig = splittermond.spellEnhancement.damage;
        return new DamageActionHandler({
            used: false,
            damageAddition: 0,
            actorReference: actorReference,
            attackReference: attackReference,
            checkReportReference: checkReportReference,
            options: NumberDegreeOfSuccessOptionField.initialize(
                damageAdditionConfig.degreesOfSuccess,
                damageAdditionConfig.damageIncrease,
                damageAdditionConfig.textTemplate
            ),
        });
    }

    public readonly handlesDegreeOfSuccessOptions = ["damageUpdate"];

    useDegreeOfSuccessOption(degreeOfSuccessOptionData: any): DegreeOfSuccessAction {
        return configureUseOption()
            .withUsed(() => this.used)
            .withHandlesOptions(this.handlesDegreeOfSuccessOptions)
            .whenAllChecksPassed((degreeOfSuccessOptionData) => {
                const multiplicity = Number.parseInt(degreeOfSuccessOptionData.multiplicity);
                const option = this.options.forMultiplicity(multiplicity);
                return {
                    usedDegreesOfSuccess: option.isChecked() ? -1 * option.cost : option.cost,
                    action: () => {
                        option.check();
                        const damageAdditionIncrement = option.isChecked() ? option.effect : -1 * option.effect;
                        this.updateSource({ damageAddition: this.damageAddition + damageAdditionIncrement });
                    },
                };
            })
            .useOption(degreeOfSuccessOptionData);
    }

    renderDegreeOfSuccessOptions(): DegreeOfSuccessOptionSuggestion[] {
        if (!this.isOption()) {
            return [];
        }
        return this.options
            .getMultiplicities()
            .map((m) => this.options.forMultiplicity(m))
            .map((m) => ({
                render: {
                    ...m.render(),
                    disabled: this.used,
                    action: "damageUpdate",
                },
                cost: m.isChecked() ? -m.cost : m.cost,
            }));
    }

    public readonly handlesActions = ["applyDamage"] as const;

    useAction(actionData: ActionInput): Promise<void> {
        return configureUseAction()
            .withUsed(() => this.used)
            .withIsOptionEvaluator(() => this.isOption())
            .withHandlesActions(this.handlesActions)
            .whenAllChecksPassed(() => {
                this.updateSource({ used: true });
                const attack = this.attackReference.get();
                const damages = this.totalDamage;
                const costType = attack.costType ?? "V";
                const rollOptions = {
                    costBase: CostBase.create(costType as CostType),
                    grazingHitPenalty: this.checkReportReference.get().grazingHitPenalty,
                };
                return DamageInitializer.rollFromDamageRoll(
                    [damages.principalComponent, ...damages.otherComponents],
                    rollOptions,
                    this.actorReference.getAgent()
                ).then((chatCard) => chatCard.sendToChat());
            })
            .useAction(actionData);
    }

    renderActions(): ValuedAction[] {
        if (!this.isOption()) {
            return [];
        }
        return [
            {
                type: "applyDamage",
                value: this.getConcatenatedDamageRolls(),
                disabled: this.used,
                isLocal: false,
            },
        ];
    }

    private getConcatenatedDamageRolls() {
        const allDamage = this.totalDamage;
        const allFormulas = [
            allDamage.principalComponent.damageRoll.getDamageFormula(),
            ...allDamage.otherComponents.map((c) => c.damageRoll.getDamageFormula()),
        ];
        return allFormulas.length <= 1
            ? allFormulas.join("")
            : toDisplayFormula(asString(condense(mapRoll(foundryApi.roll(toRollFormula(allFormulas.join(" + ")))))));
    }

    //TODO: should the check report be used here?
    private isOption() {
        return this.checkReportReference.get().succeeded;
    }

    get totalDamage() {
        const damage = this.attackReference.get().getForDamageRoll();
        damage.principalComponent.damageRoll.increaseDamage(this.damageAddition);
        return damage;
    }
}

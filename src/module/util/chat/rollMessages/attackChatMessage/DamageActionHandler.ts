import { DataModelSchemaType, fields, SplittermondDataModel } from "module/data/SplittermondDataModel";
import {
    ActionHandler,
    ActionInput,
    type AttackCheckReport,
    DegreeOfSuccessOptionSuggestion,
    ValuedAction,
} from "./interfaces";
import { configureUseAction, configureUseOption, DegreeOfSuccessAction } from "../ChatMessageUtils";
import { NumberDegreeOfSuccessOptionField } from "../NumberDegreeOfSuccessOptionField";
import { AgentReference } from "module/data/references/AgentReference";
import { splittermond } from "module/config";
import { OnAncestorReference } from "module/data/references/OnAncestorReference";
import { DamageInitializer } from "../../damageChatMessage/initDamage";
import { CostBase, type CostType } from "../../../costs/costTypes";
import { foundryApi } from "module/api/foundryApi";
import { asString, condense, mapRoll } from "module/modifiers/expressions/scalar";
import { toDisplayFormula, toRollFormula } from "module/util/damage/util";
import type Attack from "module/actor/attack";

function DamageActionHandlerSchema() {
    return {
        damageUsed: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        penaltyUsed: new fields.BooleanField({ required: true, nullable: false, initial: false }),
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
        consumedGrazingHitCost: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        convertedToNumbingDamage: new fields.BooleanField({ required: true, nullable: false, initial: false }),
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
            damageUsed: false,
            penaltyUsed: false,
            damageAddition: 0,
            actorReference: actorReference,
            attackReference: attackReference,
            checkReportReference: checkReportReference,
            options: NumberDegreeOfSuccessOptionField.initialize(
                damageAdditionConfig.degreesOfSuccess,
                damageAdditionConfig.damageIncrease,
                "splittermond.chatCard.attackMessage.increaseDamage"
            ),
            consumedGrazingHitCost: false,
            convertedToNumbingDamage: false,
        });
    }

    public readonly handlesDegreeOfSuccessOptions = ["damageUpdate", "grazingHitUpdate", "numbingDamageUpdate"];

    useDegreeOfSuccessOption(degreeOfSuccessOptionData: any): DegreeOfSuccessAction {
        // Determine which guard to use based on the action type
        const isGrazingHitAction = degreeOfSuccessOptionData.action === "grazingHitUpdate";
        const usedEvaluator = () => (isGrazingHitAction ? this.damageUsed || this.penaltyUsed : this.damageUsed);

        return configureUseOption()
            .withUsed(usedEvaluator)
            .withHandlesOptions(this.handlesDegreeOfSuccessOptions)
            .whenAllChecksPassed((degreeOfSuccessOptionData) => {
                switch (degreeOfSuccessOptionData.action) {
                    case "damageUpdate":
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
                    case "numbingDamageUpdate":
                        return {
                            usedDegreesOfSuccess: this.convertedToNumbingDamage ? -1 : 1,
                            action: () => {
                                this.updateSource({ convertedToNumbingDamage: !this.convertedToNumbingDamage });
                            },
                        };
                    case "grazingHitUpdate":
                        return {
                            usedDegreesOfSuccess: 0,
                            action: () => {
                                this.updateSource({ consumedGrazingHitCost: !this.consumedGrazingHitCost });
                            },
                        };
                    default:
                        return {
                            usedDegreesOfSuccess: 0,
                            action: () => {},
                        };
                }
            })
            .useOption(degreeOfSuccessOptionData);
    }

    renderDegreeOfSuccessOptions(): DegreeOfSuccessOptionSuggestion[] {
        if (!this.isOption()) {
            return [];
        }
        const options = [];
        if (this.isGrazingHit()) {
            options.push({
                render: {
                    multiplicity: "1",
                    checked: this.consumedGrazingHitCost,
                    text: foundryApi.localize("splittermond.chatCard.attackMessage.selectConsumeCost"),
                    disabled: this.damageUsed,
                    action: "grazingHitUpdate",
                },
                cost: 0,
            });
        }
        const numbingDamageOption = {
            render: {
                multiplicity: "1",
                checked: this.convertedToNumbingDamage,
                text: foundryApi.localize("splittermond.chatCard.attackMessage.numbingDamage"),
                disabled: this.damageUsed,
                action: "numbingDamageUpdate",
            },
            cost: this.convertedToNumbingDamage ? -1 : 1,
        };
        const damageOptions = this.options
            .getMultiplicities()
            .map((m) => this.options.forMultiplicity(m))
            .map((m) => ({
                render: {
                    ...m.render(),
                    disabled: this.damageUsed,
                    action: "damageUpdate",
                },
                cost: m.isChecked() ? -m.cost : m.cost,
            }));
        options.push(...damageOptions, numbingDamageOption);
        return options;
    }
    private isGrazingHit() {
        return this.checkReportReference.get().grazingHitPenalty > 0;
    }

    public readonly handlesActions = ["applyDamage", "consumeCost"] as const;

    useAction(actionData: ActionInput): Promise<void> {
        if (actionData.action === "applyDamage") {
            return configureUseAction()
                .withUsed(() => this.damageUsed)
                .withIsOptionEvaluator(() => this.isOption())
                .withHandlesActions(this.handlesActions)
                .whenAllChecksPassed(() => this.applyDamage())
                .useAction(actionData);
        } else if (actionData.action === "consumeCost") {
            return configureUseAction()
                .withUsed(() => this.penaltyUsed)
                .withIsOptionEvaluator(() => this.isGrazingHit())
                .withHandlesActions(this.handlesActions)
                .whenAllChecksPassed(() => this.consumeGrazingHitDamage())
                .useAction(actionData);
        }
        return Promise.reject();
    }

    private consumeGrazingHitDamage() {
        this.updateSource({ penaltyUsed: true });
        return this.actorReference
            .getAgent()
            .consumeCost("health", `${this.checkReportReference.get().grazingHitPenalty}`, "");
    }

    private applyDamage() {
        this.updateSource({ damageUsed: true });
        const attack = this.attackReference.get();
        const damages = this.totalDamage;
        const costType = this.convertedToNumbingDamage ? "E" : (attack.costType ?? "V");
        const rollOptions = {
            costBase: CostBase.create(costType as CostType),
            grazingHitPenalty: this.isApplyPenalty() ? this.checkReportReference.get().grazingHitPenalty : 0,
        };
        return DamageInitializer.rollFromDamageRoll(
            [damages.principalComponent, ...damages.otherComponents],
            rollOptions,
            this.actorReference.getAgent()
        ).then((chatCard) => chatCard.sendToChat());
    }
    private isApplyPenalty() {
        return this.isGrazingHit() && !this.consumedGrazingHitCost;
    }

    renderActions(): ValuedAction[] {
        if (!this.isOption()) {
            return [];
        }
        const options: ValuedAction[] = [];
        options.push({
            type: "applyDamage" as const,
            value: this.getConcatenatedDamageRolls(),
            disabled: this.damageUsed,
            isLocal: false,
        });
        if (this.isGrazingHit() && this.consumedGrazingHitCost) {
            options.push({
                type: "consumeCost" as const,
                value: `${this.checkReportReference.get().grazingHitPenalty}`,
                disabled: this.penaltyUsed,
                isLocal: false,
            });
        }
        return options;
    }

    private getConcatenatedDamageRolls() {
        const allDamage = this.totalDamage;
        if (this.isApplyPenalty()) {
            allDamage.principalComponent.damageRoll.decreaseDamage(this.checkReportReference.get().grazingHitPenalty);
        }
        const allFormulas = [
            allDamage.principalComponent.damageRoll.getDamageFormula(),
            ...allDamage.otherComponents.map((c) => c.damageRoll.getDamageFormula()),
        ];
        return allFormulas.length <= 1
            ? allFormulas.join("")
            : toDisplayFormula(asString(condense(mapRoll(foundryApi.roll(toRollFormula(allFormulas.join(" + ")))))));
    }

    private isOption() {
        return this.checkReportReference.get().succeeded;
    }

    get totalDamage() {
        const damage = this.attackReference.get().getForDamageRoll();
        damage.principalComponent.damageRoll.increaseDamage(this.damageAddition);
        return damage;
    }
}

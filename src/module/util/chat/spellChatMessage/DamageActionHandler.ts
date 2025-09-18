import { DataModelSchemaType, fields, SplittermondDataModel } from "../../../data/SplittermondDataModel";
import {
    ActionHandler,
    ActionInput,
    DegreeOfSuccessAction,
    DegreeOfSuccessOptionSuggestion,
    ValuedAction,
} from "./interfaces";
import { NumberDegreeOfSuccessOptionField } from "./optionFields/NumberDegreeOfSuccessOptionField";
import { AgentReference } from "../../../data/references/AgentReference";
import { splittermond } from "../../../config";
import { ItemReference } from "../../../data/references/ItemReference";
import SplittermondSpellItem from "../../../item/spell";
import { OnAncestorReference } from "../../../data/references/OnAncestorReference";
import { CheckReport } from "../../../actor/CheckReport";
import { configureUseOption } from "./commonAlgorithms/defaultUseOptionAlgorithm";
import { configureUseAction } from "./commonAlgorithms/defaultUseActionAlgorithm";
import { DamageInitializer } from "../damageChatMessage/initDamage";
import { CostBase } from "../../costs/costTypes";
import { foundryApi } from "../../../api/foundryApi";
import { asString, condense, mapRoll } from "../../../modifiers/expressions/scalar";
import { toDisplayFormula, toRollFormula } from "../../damage/util";

function DamageActionHandlerSchema() {
    return {
        used: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        damageAddition: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        actorReference: new fields.EmbeddedDataField(AgentReference, { required: true, nullable: false }),
        spellReference: new fields.EmbeddedDataField(ItemReference<SplittermondSpellItem>, {
            required: true,
            nullable: false,
        }),
        checkReportReference: new fields.EmbeddedDataField(OnAncestorReference<CheckReport>, {
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
        spellReference: ItemReference<SplittermondSpellItem>,
        checkReportReference: OnAncestorReference<CheckReport>
    ): DamageActionHandler {
        const damageAdditionConfig = splittermond.spellEnhancement.damage;
        return new DamageActionHandler({
            used: false,
            damageAddition: 0,
            actorReference: actorReference,
            spellReference: spellReference,
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
        if (!(this.isOption() && this.spellReference.getItem().degreeOfSuccessOptions.damage)) {
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
                const spell = this.spellReference.getItem();
                const damages = this.totalDamage;
                return DamageInitializer.rollFromDamageRoll(
                    [damages.principalComponent, ...damages.otherComponents],
                    CostBase.create(spell.system.costType ?? "V"),
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
        return (
            !!this.spellReference.getItem().damage &&
            this.spellReference.getItem().damage !== "0" &&
            this.checkReportReference.get().succeeded
        );
    }

    get totalDamage() {
        const damage = this.spellReference.getItem().getForDamageRoll();
        damage.principalComponent.damageRoll.increaseDamage(this.damageAddition);
        return damage;
    }
}

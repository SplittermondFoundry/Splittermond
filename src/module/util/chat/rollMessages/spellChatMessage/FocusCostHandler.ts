import { DataModelSchemaType, fields, SplittermondDataModel } from "module/data/SplittermondDataModel";
import {
    ActionHandler,
    ActionInput,
    DegreeOfSuccessAction,
    DegreeOfSuccessOptionSuggestion,
    ValuedAction,
} from "./interfaces";
import { Cost, CostModifier } from "../../../costs/Cost";
import { AgentReference } from "module/data/references/AgentReference";
import { OnAncestorReference } from "module/data/references/OnAncestorReference";
import { CheckReport } from "module/check";
import { ItemReference } from "module/data/references/ItemReference";
import SplittermondSpellItem from "../../../../item/spell";
import { splittermond } from "module/config";
import { FocusDegreeOfSuccessOptionField } from "./optionFields/FocusDegreeOfSuccessOptionField";
import { parseCostString, parseSpellEnhancementDegreesOfSuccess } from "../../../costs/costParser";
import { configureUseAction, configureUseOption } from "../ChatMessageUtils";
import { PrimaryCost } from "../../../costs/PrimaryCost";
import { settings } from "module/settings";

let hasReducibleEnhancementCosts: () => boolean = () => false;
settings
    .registerBoolean("reducibleEnhancementCosts", { position: 5, scope: "world", config: true, default: false })
    .then((value) => (hasReducibleEnhancementCosts = value.get))
    .catch((e) => console.error("Splittermond | Failed to register setting for reducible enhancement costs", e));

function FocusCostHandlerSchema() {
    return {
        used: new fields.BooleanField({ required: true, blank: false, nullable: false, initial: false }),
        casterReference: new fields.EmbeddedDataField(AgentReference, { required: true, nullable: false }),
        checkReportReference: new fields.EmbeddedDataField(OnAncestorReference<CheckReport>, {
            required: true,
            nullable: false,
        }),
        spellReference: new fields.EmbeddedDataField(ItemReference<SplittermondSpellItem>, {
            required: true,
            nullable: false,
        }),
        adjusted: new fields.EmbeddedDataField(CostModifier, { required: true, nullable: false }),
        consumed: new fields.EmbeddedDataField(FocusDegreeOfSuccessOptionField, { required: true, nullable: false }),
        exhausted: new fields.EmbeddedDataField(FocusDegreeOfSuccessOptionField, { required: true, nullable: false }),
        channeled: new fields.EmbeddedDataField(FocusDegreeOfSuccessOptionField, { required: true, nullable: false }),
        spellEnhancement: new fields.SchemaField(
            {
                checked: new fields.BooleanField({ required: true, nullable: false, initial: false }),
                cost: new fields.NumberField({ required: true, nullable: false }),
                effect: new fields.EmbeddedDataField(CostModifier, { required: true, nullable: false }),
            },
            { required: true, nullable: false }
        ),
    };
}

type FocusCostHandlerType = DataModelSchemaType<typeof FocusCostHandlerSchema>;

export class FocusCostHandler extends SplittermondDataModel<FocusCostHandlerType> implements ActionHandler {
    public readonly handlesActions = ["consumeCosts"] as const;
    public readonly handlesDegreeOfSuccessOptions = [
        "channeledFocusUpdate",
        "consumedFocusUpdate",
        "exhaustedFocusUpdate",
        "spellEnhancementUpdate",
    ] as const;
    static defineSchema = FocusCostHandlerSchema;

    static initialize(
        casterReference: AgentReference,
        checkReportReference: OnAncestorReference<CheckReport>,
        spellReference: ItemReference<SplittermondSpellItem>
    ) {
        const consumedFocusConfig = splittermond.spellEnhancement.consumedFocus;
        const channeledFocusConfig = splittermond.spellEnhancement.channelizedFocus;
        const exhaustedFocusConfig = splittermond.spellEnhancement.exhaustedFocus;
        const focusOptions = spellReference.getItem().degreeOfSuccessOptions;
        return new FocusCostHandler({
            used: false,
            casterReference: casterReference.toObject(),
            checkReportReference: checkReportReference.toObject(),
            spellReference: spellReference.toObject(),
            adjusted: new Cost(0, 0, false, false).asModifier().toObject(),
            consumed: FocusDegreeOfSuccessOptionField.initialize(
                !!focusOptions.consumedFocus,
                consumedFocusConfig.degreesOfSuccess,
                parseCostString(consumedFocusConfig.focusCostReduction).asModifier(),
                consumedFocusConfig.textTemplate
            ).toObject(),
            channeled: FocusDegreeOfSuccessOptionField.initialize(
                !!focusOptions.channelizedFocus,
                channeledFocusConfig.degreesOfSuccess,
                parseCostString(channeledFocusConfig.focusCostReduction).asModifier(),
                channeledFocusConfig.textTemplate
            ).toObject(),
            exhausted: FocusDegreeOfSuccessOptionField.initialize(
                !!focusOptions.exhaustedFocus,
                exhaustedFocusConfig.degreesOfSuccess,
                parseCostString(exhaustedFocusConfig.focusCostReduction).asModifier(),
                exhaustedFocusConfig.textTemplate
            ).toObject(),
            spellEnhancement: {
                checked: false,
                cost: parseSpellEnhancementDegreesOfSuccess(spellReference.getItem().enhancementCosts),
                //TODO: I would like to use toObject(), but the type system complains about missing functions.
                effect: parseCostString(spellReference.getItem().enhancementCosts).asModifier(),
            },
        });
    }

    get cost() {
        const checkReport = this.checkReportReference.get();
        const dos = checkReport.degreeOfSuccess;
        let cost: PrimaryCost = this.spellReference
            .getItem()
            .getCostsForFinishedRoll(dos.fromRoll + dos.modification, checkReport.succeeded)
            .add(this.adjusted);
        if (cost.isZero()) {
            cost = cost.add(new Cost(1, 0, false).asModifier());
        }
        return cost;
    }

    renderDegreeOfSuccessOptions(): DegreeOfSuccessOptionSuggestion[] {
        const options: DegreeOfSuccessOptionSuggestion[] = [];
        if (this.consumed.isOption) {
            this.consumed
                .getMultiplicities()
                .map((m) => this.consumed.forMultiplicity(m))
                .filter((m) => m.isChecked() || !this.overshootsCost(m.effect))
                .map((m) => this.createRender(m, "consumedFocusUpdate"))
                .forEach((m) => options.push(m));
        }
        if (this.channeled.isOption) {
            this.channeled
                .getMultiplicities()
                .map((m) => this.channeled.forMultiplicity(m))
                .filter((m) => m.isChecked() || !this.overshootsCost(m.effect))
                .map((m) => this.createRender(m, "channeledFocusUpdate"))
                .forEach((m) => options.push(m));
        }
        if (this.exhausted.isOption) {
            this.exhausted
                .getMultiplicities()
                .map((m) => this.exhausted.forMultiplicity(m))
                .filter((m) => m.isChecked() || !this.overshootsCost(m.effect))
                .map((m) => this.createRender(m, "exhaustedFocusUpdate"))
                .forEach((m) => options.push(m));
        }

        options.push({
            render: {
                checked: this.spellEnhancement.checked,
                disabled: this.used,
                action: "spellEnhancementUpdate",
                multiplicity: "1",
                text: `${this.spellReference.getItem().enhancementCosts} ${this.spellReference.getItem().enhancementDescription}`,
            },
            cost: this.spellEnhancement.checked ? -1 * this.spellEnhancement.cost : this.spellEnhancement.cost,
        });
        return options;
    }
    private overshootsCost(cost: CostModifier) {
        let baseCost = this.cost;
        if (this.spellEnhancement.checked && !hasReducibleEnhancementCosts()) {
            baseCost = baseCost.subtract(this.spellEnhancement.effect);
        }
        return (
            baseCost.consumed < cost.getConsumed(baseCost) ||
            (baseCost.isChanneled
                ? baseCost.channeled < cost.getNonConsumed(baseCost)
                : baseCost.exhausted < cost.getNonConsumed(baseCost)) ||
            baseCost.subtract(cost).isZero()
        );
    }

    private createRender(m: ReturnType<FocusDegreeOfSuccessOptionField["forMultiplicity"]>, action: string) {
        return {
            render: {
                ...m.render(),
                disabled: this.used,
                action,
            },
            //If an option is already checked then the cost of the action (unchecking) is negative, as it frees DoS
            cost: m.isChecked() ? -1 * m.cost : m.cost,
        };
    }

    renderActions(): ValuedAction[] {
        return [
            {
                type: "consumeCosts",
                value: this.cost.render(),
                disabled: this.used,
                isLocal: false,
            },
        ];
    }

    useAction(actionData: ActionInput): Promise<void> {
        return configureUseAction()
            .withUsed(() => this.used)
            .withHandlesActions(this.handlesActions)
            .whenAllChecksPassed(() => {
                this.updateSource({ used: true });
                this.casterReference
                    .getAgent()
                    .consumeCost("focus", this.cost.render(), this.spellReference.getItem().name);
                return Promise.resolve();
            })
            .useAction(actionData);
    }

    useDegreeOfSuccessOption(degreeOfSuccessOptionData: any): DegreeOfSuccessAction {
        return configureUseOption()
            .withUsed(() => this.used)
            .withHandlesOptions(this.handlesDegreeOfSuccessOptions)
            .whenAllChecksPassed((degreeOfSuccessOptionData) => {
                const multiplicity = Number.parseInt(degreeOfSuccessOptionData.multiplicity);
                switch (degreeOfSuccessOptionData.action) {
                    case "channeledFocusUpdate":
                        return this.updateFocus("channeled", multiplicity);
                    case "consumedFocusUpdate":
                        return this.updateFocus("consumed", multiplicity);
                    case "exhaustedFocusUpdate":
                        return this.updateFocus("exhausted", multiplicity);
                    case "spellEnhancementUpdate":
                        return this.updateSpellEnhancement();
                }
            })
            .useOption(degreeOfSuccessOptionData);
    }

    private updateFocus(type: "consumed" | "exhausted" | "channeled", multiplicity: number) {
        if (!this[type].isOption) {
            console.warn(`Splittermond | Attempt to update option ${type}, when it should not be available`);
            return {
                usedDegreesOfSuccess: 0,
                action() {},
            };
        }
        const option = this[type].forMultiplicity(multiplicity);
        return {
            usedDegreesOfSuccess: option.isChecked() ? -1 * option.cost : option.cost,
            action: () => {
                option.check();
                const action = option.isChecked() ? this.subtractCost : this.addCost;
                action.call(this, option.effect);
            },
        };
    }

    private updateSpellEnhancement() {
        return {
            usedDegreesOfSuccess: this.spellEnhancement.checked
                ? -1 * this.spellEnhancement.cost
                : this.spellEnhancement.cost,
            action: () => {
                this.updateSource({
                    spellEnhancement: {
                        ...this.spellEnhancement,
                        checked: !this.spellEnhancement.checked,
                    },
                });
                if (this.spellEnhancement.checked) {
                    this.addCost(this.spellEnhancement.effect);
                } else {
                    this.subtractCost(this.spellEnhancement.effect);
                }
            },
        };
    }

    addCost(cost: CostModifier) {
        if (this.used) {
            console.warn("Attempt alter a used cost action");
            return;
        }
        this.updateSource({ adjusted: this.adjusted.add(cost) });
    }

    subtractCost(cost: CostModifier) {
        if (this.used) {
            console.warn("Attempt to alter a used cost action");
            return;
        }
        this.updateSource({ adjusted: this.adjusted.subtract(cost) });
    }
}

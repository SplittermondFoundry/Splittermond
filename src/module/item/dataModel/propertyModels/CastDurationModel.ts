import {DataModelSchemaType, fieldExtensions, fields, SplittermondDataModel} from "module/data/SplittermondDataModel";
import SplittermondItem from "module/item/item";
import {foundryApi} from "module/api/foundryApi";
import {SplittermondItemDataModel} from "../../index";
import {DocumentAccessMixin} from "module/data/AncestorDocumentMixin";
import {asString, condense, evaluate, isGreaterZero, of, plus, times} from "module/modifiers/expressions/scalar";
import type {TimeUnit} from "module/config/timeUnits";
import {splittermond} from "module/config";
import {getTimeUnitConversion} from "module/util/timeUnitConversion";


function CastDurationSchema() {
    return {
        value: new fields.NumberField({required: true, nullable: false, initial: 1, validate: (x: number) => x > 0}),
        unit: new fieldExtensions.StringEnumField({
            required: true,
            nullable: false,
            initial: "T",
            validate: (x: TimeUnit) => splittermond.time.timeUnits.includes(x)
        }),
    };
}

export type CastDurationType = DataModelSchemaType<typeof CastDurationSchema>;

export class CastDurationBase extends SplittermondDataModel<CastDurationType, SplittermondItemDataModel> {
    static defineSchema = CastDurationSchema;
}

export class CastDurationModel extends DocumentAccessMixin(CastDurationBase, SplittermondItem) {

    static empty() {
        return new CastDurationModel({value: 1, unit: "T"});
    }

    static from(input: string) {
        const parsed = parseCastDuration(input);
        return parsed ? new CastDurationModel(parsed) : CastDurationModel.empty();
    }

    /**
     * Get the duration in ticks for comparison purposes
     * Assuming 100-120 ticks per minute, we'll use 110 as average
     */
    get inTicks(): number {
        const value = evaluate(this.getTotalDuration());
        return Math.max(0,Math.floor(value * getTimeUnitConversion(this.unit, "T")));
    }


    get display(): string {
        return `${asString(condense(this.getTotalDuration()))} ${this.unit}`;
    }

    get innateDuration(): string {
        return `${this.value} ${this.unit}`;
    }


    toString(): string {
        return this.display;
    }

    private getTotalDuration(){
        const multiplicativeModifiers = this.getMultiplicativeModifierValue();
        const additiveModifiers = this.getAdditiveModifierValue();
        const base= of(this.value)
        const modified = plus(times(base,multiplicativeModifiers),additiveModifiers);
        return isGreaterZero(modified) ? modified: of(0);
    }

    private getMultiplicativeModifierValue() {
        return this.getModifiers("item.castDuration.multiplier")
            .getModifiers()
            .map(m => m.value)
            .reduce((acc, mod) =>times(mod,acc), of(1));
    }

    private getAdditiveModifierValue() {
        return this.getModifiers("item.castDuration")
            .withAttributeValues("unit", ...splittermond.time.timeUnits)
            .getModifiers()
            .map(mod => {
                if (mod.attributes.unit !== this.unit) {
                    const factor = getTimeUnitConversion(mod.attributes.unit as TimeUnit, this.unit);
                    return times(mod.value, of(factor));
                }
                return mod.value;
            })
            .reduce((acc, mod) => plus(acc,mod), of(0));
    }

    private getModifiers(groupId:string) {
       return this.document.actor.modifier.getForId(groupId)
           .notSelectable()
           .withAttributeValuesOrAbsent("item", this.getItemName())
           .withAttributeValuesOrAbsent("itemType", this.getItemType());
    }

    private getItemName(): string {
        return this.document.name
    }

    private getItemType(): string {
        return this.document.type
    }
}

export function parseCastDuration(input: string): { value: number, unit: TimeUnit } | null {
    if (!input || typeof input !== "string") {
        return null;
    }

    const match = /^(?<value>\d+)\s*(?<unit>[^\d\s]*)$/.exec(input.trim());

    if (!match) {
        foundryApi.warnUser("splittermond.message.castDurationParsingFailure", {input});
        return null;
    }
    const unit = parseUnit(match.groups!.unit);
    if (!unit) {
        foundryApi.warnUser("splittermond.message.castDurationParsingFailure", {input});
        return null;
    }

    const value = parseFloat(match[1]);

    if (value <= 0) {
        foundryApi.warnUser("splittermond.message.castDurationParsingFailure", {input});
        return null;
    }

    return {value, unit};
}

function parseUnit(unit: string): TimeUnit | null {
    const unitString = unit.toLowerCase()
    if (!unitString || unitString === "t" || unitString.startsWith("tick")) {
        return  "T"
    } else if (unitString === "m" || unitString.startsWith("min")) {
        return "min"
    }
    return null;
}

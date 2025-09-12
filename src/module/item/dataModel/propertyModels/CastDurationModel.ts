import {DataModelSchemaType, fieldExtensions, fields, SplittermondDataModel} from "module/data/SplittermondDataModel";
import SplittermondItem from "module/item/item";
import {foundryApi} from "module/api/foundryApi";
import {SplittermondItemDataModel} from "../../index";
import {DocumentAccessMixin} from "module/data/AncestorDocumentMixin";

export type TimeUnit = typeof timeUnits[number];

const timeUnits = ["T", "min"] as const;

function CastDurationSchema() {
    return {
        value: new fields.NumberField({required: true, nullable: false, initial: 1, validate: (x: number) => x > 0}),
        unit: new fieldExtensions.StringEnumField({
            required: true,
            nullable: false,
            initial: "T",
            validate: (x: TimeUnit) => timeUnits.includes(x)
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
        if (this.unit === "T") {
            return this.value;
        } else if (this.unit === "min") {
            return this.value * 110; // Convert minutes to ticks
        }
        return this.value;
    }

    /**
     * Get a formatted display string
     */
    get display(): string {
        return `${this.value} ${this.unit}`;
    }

    get innateDuration(): string {
        return `${this.value} ${this.unit}`;
    }


    toString(): string {
        return this.display;
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

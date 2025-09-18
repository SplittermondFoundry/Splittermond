import { DataModelSchemaType, fields, SplittermondDataModel } from "../../../data/SplittermondDataModel";
import { toRollFormula } from "../../../util/damage/util";
import { foundryApi } from "../../../api/foundryApi";
import SplittermondItem from "../../item";
import { DataModel } from "../../../api/DataModel";

function DamageModelSchema() {
    return {
        stringInput: new fields.StringField({
            required: true,
            nullable: true,
            validate: (x: string) => x === null || foundryApi.rollInfra.validate(toRollFormula(x)),
        }),
    };
}

export type ValidDamage = Exclude<string, "">;
export type DamageModelType = DataModelSchemaType<typeof DamageModelSchema>;

export class DamageModel extends SplittermondDataModel<DamageModelType, DataModel<any, SplittermondItem>> {
    static defineSchema = DamageModelSchema;

    static from(input: string | null | undefined) {
        return new DamageModel({ stringInput: input ?? null });
    }

    get displayValue(): string {
        return this.stringInput ?? "";
    }

    get calculationValue(): string {
        //replace empty string, null, undefined by a zero as all are invalid roll inputs.
        return !!this.stringInput ? toRollFormula(this.stringInput) : "0";
    }

    asRoll() {
        return foundryApi.roll(this.calculationValue);
    }
}

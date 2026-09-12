import { DataModelSchemaType, fields, SplittermondDataModel } from "../../data/SplittermondDataModel";
import SplittermondMasteryItem from "../mastery";
import { getDescriptorFields, validatedBoolean } from "./commonFields";
import {
    from13_5_2_migrate_fo_modifiers,
    from13_8_8_migrateSkillModifiers,
    migrateFrom0_12_13,
    migrateFrom0_12_20,
} from "./migrations";

function ItemMasteryDataModelSchema() {
    return {
        ...getDescriptorFields(),
        availableIn: new fields.StringField({ required: true, nullable: true }),
        modifier: new fields.StringField({ required: true, nullable: true }),
        skill: new fields.StringField({ required: true, nullable: true, initial: null }),
        isGrandmaster: validatedBoolean(),
        isManeuver: validatedBoolean(),
        level: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    };
}
export type MasteryDataModelType = DataModelSchemaType<typeof ItemMasteryDataModelSchema>;

export class MasteryDataModel extends SplittermondDataModel<MasteryDataModelType, SplittermondMasteryItem> {
    static defineSchema = ItemMasteryDataModelSchema;

    static migrateData(source: unknown) {
        source = from14_3_0_normalizeMasteryFieldTypes(source);
        source = migrateFrom0_12_13(source);
        source = migrateFrom0_12_20(source);
        source = from13_5_2_migrate_fo_modifiers(source);
        source = from13_8_8_migrateSkillModifiers(source);
        return super.migrateData(source);
    }
}

export function from14_3_0_normalizeMasteryFieldTypes<T = unknown>(source: T): T {
    if (!source || typeof source !== "object") {
        return source;
    }
    const record = source as Record<string, unknown>;
    if (record.skill !== undefined) record.skill = asNullableSkill(record.skill);
    if (record.isGrandmaster !== undefined) record.isGrandmaster = asBoolean(record.isGrandmaster);
    if (record.isManeuver !== undefined) record.isManeuver = asBoolean(record.isManeuver);
    if (record.level !== undefined) record.level = asNumber(record.level);
    for (const key of ["description", "source", "availableIn", "modifier"]) {
        if (record[key] !== undefined) record[key] = asNullableString(record[key]);
    }
    return source;
}

function asNullableSkill(value: unknown): string | null {
    const normalized = asNullableString(value);
    return normalized === "" || normalized === "none" ? null : normalized;
}

function asNullableString(value: unknown): string | null {
    if (value === null) return null;
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) return value.join(", ");
    return null;
}

function asBoolean(value: unknown): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") return ["true", "1"].includes(value.trim().toLowerCase());
    return false;
}

function asNumber(value: unknown): number {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "boolean") return value ? 1 : 0;
    if (typeof value === "string") {
        const parsed = Number(value.trim());
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}

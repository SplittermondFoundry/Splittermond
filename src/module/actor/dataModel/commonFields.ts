import { fields } from "module/data/SplittermondDataModel";
import type { SplittermondSkill } from "module/config/skillGroups";
import { splittermond } from "module/config";
import type { CharacterAttribute } from "module/actor/dataModel/CharacterAttribute";
import type { NpcAttribute } from "module/actor/dataModel/NpcAttribute";
import { HealthDataModel } from "module/actor/dataModel/HealthDataModel";
import { FocusDataModel } from "module/actor/dataModel/FocusSchemaModel";

type Constructor<T = {}> = new (...args: any[]) => T;
export function actorDataModel<T extends Constructor<CharacterAttribute | NpcAttribute>>(model: T) {
    return {
        sex: new fields.StringField(strictlyPresent()),
        biography: new fields.HTMLField(strictlyPresent()),
        attributes: attributes(model),
        skills: skills(),
        health: new fields.EmbeddedDataField(HealthDataModel, strictlyPresent()),
        focus: new fields.EmbeddedDataField(FocusDataModel, strictlyPresent()),
        currency: currency(),
        preparedAction: new fields.SchemaField(
            {
                attack: new fields.StringField({ required: true, nullable: true, initial: null }),
                spell: new fields.StringField({ required: true, nullable: true, initial: null }),
            },
            strictlyPresent()
        ),
    } as const;
}

type SkillDefinition = ReturnType<typeof skill>;
export function skills() {
    const skills = splittermond.skillGroups.all.reduce(
        (acc: Partial<Record<SplittermondSkill, SkillDefinition>>, s) => {
            acc[s] = skill();
            return acc;
        },
        {}
    );
    return new fields.SchemaField(skills as Record<SplittermondSkill, SkillDefinition>, strictlyPresent());
}

function attributes<T extends Constructor<CharacterAttribute | NpcAttribute>>(model: T) {
    return new fields.SchemaField(
        {
            charisma: new fields.EmbeddedDataField(model, strictlyPresent()),
            agility: new fields.EmbeddedDataField(model, strictlyPresent()),
            intuition: new fields.EmbeddedDataField(model, strictlyPresent()),
            constitution: new fields.EmbeddedDataField(model, strictlyPresent()),
            mystic: new fields.EmbeddedDataField(model, strictlyPresent()),
            strength: new fields.EmbeddedDataField(model, strictlyPresent()),
            mind: new fields.EmbeddedDataField(model, strictlyPresent()),
            willpower: new fields.EmbeddedDataField(model, strictlyPresent()),
        },
        strictlyPresent()
    );
}

function currency() {
    return new fields.SchemaField(
        {
            S: zeroInitialedNumber(),
            L: zeroInitialedNumber(),
            T: zeroInitialedNumber(),
        },
        strictlyPresent()
    );
}

function skill() {
    return new fields.SchemaField(
        {
            points: zeroInitialedNumber(),
            value: zeroInitialedNumber(),
        },
        strictlyPresent()
    );
}
function zeroInitialedNumber() {
    return new fields.NumberField({ ...strictlyPresent(), initial: 0 });
}
function strictlyPresent() {
    return { required: true, nullable: false } as const;
}

export function derivedAttribute() {
    return new fields.SchemaField(
        {
            value: zeroInitialedNumber(),
        },
        strictlyPresent()
    );
}

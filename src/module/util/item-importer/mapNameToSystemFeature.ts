import { NpcFeatureDataModelType } from "../../item";
import { PartialItemData } from "./types";
import { initMapper } from "../LanguageMapper";
import { damageTypes } from "../../config/damageTypes";

const getLanguageMapper = initMapper(damageTypes)
    .withTranslator((s) => `splittermond.damageTypes.long.${s}`)
    .andOtherMappers((s) => `splittermond.damageTypes.short.${s}`)
    .andDirectMap("Physischen Schaden", "physical")
    .andDirectMap("Mentalen Schaden", "mental")
    .andDirectMap("Mentalschaden", "mental")
    .build();

export function mapNameToSystemFeature(data: PartialItemData<NpcFeatureDataModelType>) {
    const modifiers = [
        ...(data.system.modifier?.split(",") ?? []),
        ...weaknessFromName(data),
        ...resistanceFromName(data),
    ];
    return {
        type: data.type,
        name: data.name,
        system: {
            ...data.system,
            ...(modifiers.length > 0 ? { modifier: modifiers.join(", ") } : {}),
        },
    };
}

function weaknessFromName(data: PartialItemData<NpcFeatureDataModelType>) {
    const { code, translatedDamageValue } = mapSusceptibility("verwundbarkeit", data);
    if (!code) {
        return [];
    }
    return [`weakness.${code} ${translatedDamageValue}`];
}

function resistanceFromName(data: PartialItemData<NpcFeatureDataModelType>) {
    const { code, translatedDamageValue } = mapSusceptibility("resistenz", data);
    if (!code) {
        return [];
    }

    return [`resistance.${code} ${translatedDamageValue}`];
}

function mapSusceptibility(keyword: string, data: PartialItemData<NpcFeatureDataModelType>) {
    const stringMatcher = /(?<type>\w+)\s+gegen\s+(?<damageType>[A-zäöüß]+(?:\s+[A-zäöüß]+)?)(?:\s+(?<modifier>\d*))?/;
    const matchResult = stringMatcher.exec(data.name.toLowerCase());
    const concernsSusceptibility = matchResult !== null && matchResult.groups?.type === keyword;
    if (!concernsSusceptibility) {
        return {};
    }
    const translatedDamageType = matchResult.groups?.damageType;
    const translatedDamageValue = matchResult.groups?.modifier ?? "1";

    const code = translatedDamageType ? getLanguageMapper().toCode(translatedDamageType) : undefined;
    return { code, translatedDamageValue };
}

import {parseModifiers} from "module/modifiers/parsing";
import {validateDescriptors} from "module/modifiers/parsing/validators";
import {isRoll} from "module/api/Roll";
import {parseFeatures} from "./propertyModels/ItemFeaturesModel";

export function migrateFrom0_12_13(source: unknown) {
    if (!!source && typeof source === "object" && ("modifier" in source) && typeof (source.modifier) === "string") {
        const keep = source.modifier.split(",")
            .map(mod => mod.trim())
            .filter(mod => !mod.includes("/"));
        const change = source.modifier.split(",")
            .map(mod => mod.trim())
            .filter(mod => mod.includes("/"))
            .map(mod => {
                const path = mod.split("/")?.[0].trim() ?? "";
                const value = /\S+(?=\s*$)/.exec(mod)?.[0].trim() ?? "";
                const emphasis = /(?<=\/).*?(?=\S+\s*$)/.exec(mod)?.[0].trim() ?? ""
                return `${path} emphasis="${emphasis}" ${value}`
            });
        source.modifier = [...keep, ...change].join(", ");
    }

    //We need to enforce that boolean values are actually boolean values. Otherwise they might behave weirdly when displayed
    if (!!source && typeof source === "object" && "equipped" in source) {
        source.equipped = !!source.equipped;
    }
    if (!!source && typeof source === "object" && "multiSelectable" in source) {
        source.multiSelectable = !!source.multiSelectable;
    }
    if (!!source && typeof source === "object" && "onCreationOnly" in source) {
        source.onCreationOnly = !!source.onCreationOnly;
    }
    if (!!source && typeof source === "object" && "isGrandmaster" in source) {
        source.isGrandmaster = !!source.isGrandmaster;
    }
    if (!!source && typeof source === "object" && "isManeuver" in source) {
        source.isManeuver = !!source.isManeuver;
    }
    if (!!source && typeof source === "object" && "prepared" in source) {
        source.prepared = !!source.prepared;
    }
    if (!!source && typeof source === "object" && "active" in source) {
        source.active = !!source.active;
    }
    return source;
}

export function migrateFrom0_12_20(source: unknown) {
    if (!!source && typeof source === "object" && ("modifier" in source) && typeof (source.modifier) === "string") {
        const keep = source.modifier.split(",")
            .map(mod => mod.trim())
            .filter(mod => !mod.startsWith("damage") && !mod.startsWith("weaponspeed"));
        const change = source.modifier.split(",")
            .map(mod => mod.trim())
            .filter(mod => mod.startsWith("damage") || mod.startsWith("weaponspeed"))
            .map(mapDamageModifier);
        source.modifier = [...keep, ...change].join(", ");
    }
    return source;
}

export function from0_12_20_migrateFeatures(source: unknown) {
    if (source && typeof source === "object" && "features" in source && typeof source["features"] === "string") {
        const features = source["features"];
        source["features"] = {
            internalFeatureList: parseFeatures(features)
        }
    }
    if (source && typeof source === "object" && "secondaryAttack" in source &&
        typeof source["secondaryAttack"] === "object" && source.secondaryAttack &&
        "features" in source.secondaryAttack && typeof source.secondaryAttack["features"] === "string") {
        const features = source.secondaryAttack.features;
        source.secondaryAttack.features = {
            internalFeatureList: parseFeatures(features)
        }
    }
    return source;
}

export function from0_12_20_migrateDamage(source: unknown) {
    if (!source || typeof source !== "object") {
        return source;
    }
    if ("damage" in source && typeof source["damage"] === "string") {
        source.damage = {stringInput: source["damage"]};
    }
    if (source && typeof source === "object" && "secondaryAttack" in source &&
        typeof source["secondaryAttack"] === "object" && source.secondaryAttack &&
        "damage" in source.secondaryAttack && typeof source.secondaryAttack["damage"] === "string") {
        source.secondaryAttack.damage = {
            stringInput: source.secondaryAttack["damage"]
        };
    }
    return source;
}

function mapDamageModifier(mod: string): string {
    if (!mod.includes("/") && !/^\s*\S+[.]\S+/.test(mod) && !/emphasis=\S+/.test(mod)) {
        return mod;
    }
    const parsedModifier = parseModifiers(mod).modifiers[0];
    const path = parsedModifier.path.split(".")[0];
    const nameFromPath = parsedModifier.path.split(".")[1];
    let itemName: string | null = null;
    if (nameFromPath && nameFromPath.length > 0) {
        itemName = nameFromPath.trim();
    } else if (parsedModifier.attributes.emphasis) {
        const errors = validateDescriptors(parsedModifier.attributes.emphasis);
        itemName = errors.length > 0 ? null : (parsedModifier.attributes.emphasis as string);
    }
    let valueAsString: string;
    if (isRoll(parsedModifier.attributes.value)) {
        valueAsString = parsedModifier.attributes.value.formula;
    } else if (typeof parsedModifier.attributes.value === "object") {
        valueAsString = parsedModifier.attributes.value.original;
    } else {
        valueAsString = `${parsedModifier.attributes.value}`;
    }

    if (itemName) {
        return `${path} item="${itemName}" ${valueAsString}`;
    } else {
        return `${path} ${valueAsString}`;
    }
}

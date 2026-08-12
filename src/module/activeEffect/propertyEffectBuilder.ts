import type SplittermondItem from "module/item/item";
import type { EffectCreationData } from "module/activeEffect/effectBuilder";
import { serialize } from "module/modifiers/expressions/scalar/serialization";
import { max, minus, of, plus, ref, type Expression } from "module/modifiers/expressions/scalar";
import type { ArmorDataModel } from "module/item/dataModel/ArmorDataModel";
import type { ShieldDataModel } from "module/item/dataModel/ShieldDataModel";
import type { WeaponDataModel } from "module/item/dataModel/WeaponDataModel";
import { foundryApi } from "module/api/foundryApi";
import { parseShieldMinAttributes, type ParsedMinAttribute } from "module/item/minAttributesParser";

interface ModifierEntry {
    path: string;
    serializedValue: ReturnType<typeof serialize>;
    implementation: string;
    selectable: boolean;
    attributes: { name: string; type: "equipment" };
}

function equipmentAttributes(item: SplittermondItem): { name: string; type: "equipment" } {
    return { name: item.name, type: "equipment" };
}

function scalarEntry(path: string, value: Expression, item: SplittermondItem): ModifierEntry {
    return {
        path,
        serializedValue: serialize(value),
        implementation: "additive",
        selectable: false,
        attributes: equipmentAttributes(item),
    };
}

function attributeLabel(attr: string): string {
    const localized = foundryApi.localize(`splittermond.attribute.${attr}.long`);
    return localized || attr;
}

function armorAttributeMalusExpression(minStr: number | null): Expression | null {
    if (minStr == null) return null;
    return max(
        of(0),
        minus(
            of(minStr),
            ref("attributes.strength.value", () => null, "Stärke", true)
        )
    );
}

function shieldAttributeMalusExpression(entries: ParsedMinAttribute[]): Expression | null {
    if (entries.length === 0) return null;
    const terms = entries.map(({ attr, threshold }) =>
        max(
            of(0),
            minus(
                of(threshold),
                ref(`attributes.${attr}.value`, () => null, attributeLabel(attr), true)
            )
        )
    );
    return terms.reduce((acc, term) => plus(acc, term));
}

function buildArmorEntries(item: SplittermondItem): ModifierEntry[] {
    const system = item.system as ArmorDataModel;
    const entries: ModifierEntry[] = [];
    if (system.defenseBonus) entries.push(scalarEntry("defense", of(system.defenseBonus), item));
    if (system.damageReduction) entries.push(scalarEntry("damagereduction", of(system.damageReduction), item));

    const malus = armorAttributeMalusExpression(system.minStr);
    if (system.handicap || malus) {
        const value = malus ? plus(of(system.handicap), malus) : of(system.handicap);
        entries.push(scalarEntry("handicap.armor", value, item));
    }
    if (system.tickMalus || malus) {
        const value = malus ? plus(of(system.tickMalus), malus) : of(system.tickMalus);
        entries.push(scalarEntry("tickmalus.armor", value, item));
    }
    return entries;
}

function buildShieldEntries(item: SplittermondItem): ModifierEntry[] {
    const system = item.system as ShieldDataModel;
    const entries: ModifierEntry[] = [];
    if (system.defenseBonus) entries.push(scalarEntry("defense", of(system.defenseBonus), item));

    const parsed = parseShieldMinAttributes(system.minAttributes);
    const malus = shieldAttributeMalusExpression(parsed);
    if (system.handicap || malus) {
        const value = malus ? plus(of(system.handicap), malus) : of(system.handicap);
        entries.push(scalarEntry("handicap.shield", value, item));
    }
    if (system.tickMalus || malus) {
        const value = malus ? plus(of(system.tickMalus), malus) : of(system.tickMalus);
        entries.push(scalarEntry("tickmalus.shield", value, item));
    }
    return entries;
}

function buildWeaponEntries(item: SplittermondItem): ModifierEntry[] {
    const system = item.system as WeaponDataModel;
    if (!system.features.hasFeature("Unhandlich")) return [];
    return [scalarEntry("defense", of(2), item)];
}

/**
 * Build the single auto-generated ActiveEffect carrying an item's property-derived
 * modifiers (armor/shield/weapon fields that are computed from item data, not from the
 * `system.modifier` string). Returns `null` when the item has no property-derived
 * modifiers.
 *
 * Provider conflation: the builder runs at BUILD time (item create/update). `serialize()`
 * drops the `ActorProvider`, so `ref(..., null, ...)` calls are made with a null provider;
 * the live actor is re-bound at READ time by `ActionEffectDataModel.asModifiers` via
 * `bindReferenceProviders` → `resolveHostActor`. The `of(minStr)`/`of(threshold)` parts
 * are deliberately baked (item data, kept fresh by the rebuild triggers in item.js);
 * the `ref("attributes.strength.value", ...)` part is deliberately live (actor data,
 * re-resolved each evaluation so strength changes propagate without a rebuild).
 */
export function buildPropertyDerivedEffectData(item: SplittermondItem): EffectCreationData | null {
    let entries: ModifierEntry[];
    switch (item.type) {
        case "armor":
            entries = buildArmorEntries(item);
            break;
        case "shield":
            entries = buildShieldEntries(item);
            break;
        case "weapon":
            entries = buildWeaponEntries(item);
            break;
        default:
            return null;
    }
    if (entries.length === 0) return null;

    return {
        name: `Ausrüstung: ${item.name}`,
        origin: item.uuid,
        type: "autoGenerated",
        transfer: true,
        disabled: false,
        system: {
            modifiers: entries,
            costModifiers: [],
        },
        flags: {
            splittermond: {
                rawInput: `Ausrüstung: ${item.name}`,
            },
        },
    };
}

import SplittermondItem from "./item";
import SplittermondWeaponItem from "./weapon";
import SplittermondShieldItem from "./shield";
import SplittermondArmorItem from "./armor";
import SplittermondSpellItem from "./spell";
import SplittermondEquipmentItem from "./equipment";
import SplittermondNPCAttackItem from "./npcattack";
import SplittermondMastery from "./mastery";
import {AncestryDataModel, type AncestryDataModelType} from "./dataModel/AncestryDataModel";
import {ArmorDataModel, type ArmorDataModelType} from "./dataModel/ArmorDataModel";
import {CultureDataModel, type CultureDataModelType} from "./dataModel/CultureDataModel";
import {CultureLoreDataModel, type CultureLoreDataModelType} from "./dataModel/CultureLoreDataModel";
import {EducationDataModel, type EducationDataModelType} from "./dataModel/EducationDataModel";
import {EquipmentDataModel, type EquipmentDataModelType} from "./dataModel/EquipmentDataModel";
import {LanguageDataModel, type LanguageDataModelType} from "./dataModel/LanguageDataModel";
import {MasteryDataModel, type MasteryDataModelType} from "./dataModel/MasteryDataModel";
import {MoonsignDataModel, type MoonsignDataModelType} from "./dataModel/MoonsignDataModel";
import {NpcAttackDataModel, type NpcAttackDataModelType} from "./dataModel/NpcAttackDataModel";
import {NpcFeatureDataModel, type NpcFeatureDataModelType} from "./dataModel/NpcFeatureDataModel";
import {ProjectileDataModel, type ProjectileDataModelType} from "./dataModel/ProjectileDataModel";
import {ResourceDataModel, type ResourceDataModelType} from "./dataModel/ResourceDataModel";
import {ShieldDataModel, type ShieldDataModelType} from "./dataModel/ShieldDataModel";
import {SpeciesDataModel, type SpeciesDataModelType} from "./dataModel/SpeciesDataModel";
import {SpellDataModel, type SpellDataModelType} from "./dataModel/SpellDataModel";
import {SpellEffectDataModel, type SpellEffectDataModelType} from "./dataModel/SpellEffectDataModel";
import {StatusEffectDataModel, type StatusEffectDataModelType} from "./dataModel/StatusEffectDataModel";
import {StrengthDataModel, type StrengthDataModelType} from "./dataModel/StrengthDataModel";
import {WeaknessDataModel, type WeaknessDataModelType} from "./dataModel/WeaknessDataModel";
import {WeaponDataModel, type WeaponDataModelType} from "./dataModel/WeaponDataModel";
import {ModifierRegistry} from "module/modifiers";
import {ItemModifierHandler} from "module/item/ItemModifierHandler";

type SplittermondItemDataModel = AncestryDataModel |
    NpcAttackDataModel |
    NpcFeatureDataModel |
    ProjectileDataModel |
    ResourceDataModel |
    SpeciesDataModel |
    SpellEffectDataModel |
    SpellDataModel |
    StatusEffectDataModel |
    StrengthDataModel |
    WeaknessDataModel |
    WeaponDataModel |
    ArmorDataModel |
    CultureDataModel |
    CultureLoreDataModel |
    EducationDataModel |
    EquipmentDataModel |
    LanguageDataModel |
    MasteryDataModel |
    MoonsignDataModel |
    ShieldDataModel
    ;
type SplittermondItemDataModelType = AncestryDataModelType |
    NpcAttackDataModelType |
    NpcFeatureDataModelType |
    ProjectileDataModelType |
    ResourceDataModelType |
    SpeciesDataModelType |
    SpellEffectDataModelType |
    SpellDataModelType |
    StatusEffectDataModelType |
    StrengthDataModelType |
    WeaknessDataModelType |
    WeaponDataModelType |
    ArmorDataModelType |
    CultureDataModelType |
    CultureLoreDataModelType |
    EducationDataModelType |
    EquipmentDataModelType |
    LanguageDataModelType |
    MasteryDataModelType |
    MoonsignDataModelType |
    ShieldDataModelType;

export type {
    AncestryDataModelType,
    NpcAttackDataModelType,
    NpcFeatureDataModelType,
    ProjectileDataModelType,
    ResourceDataModelType,
    SpeciesDataModelType,
    SpellEffectDataModelType,
    SpellDataModelType,
    StatusEffectDataModelType,
    StrengthDataModelType,
    WeaknessDataModelType,
    WeaponDataModelType,
    ArmorDataModelType,
    CultureDataModelType,
    CultureLoreDataModelType,
    EducationDataModelType,
    EquipmentDataModelType,
    LanguageDataModelType,
    MasteryDataModelType,
    MoonsignDataModelType,
    ShieldDataModelType,
    SplittermondItemDataModelType,
    SplittermondItemDataModel
};

export function initializeItem(config: typeof CONFIG, modifierRegistry: ModifierRegistry) {
    config.Item.documentClass = SplittermondItem;
    config.Item.dataModels = {
        ...(CONFIG.Item.dataModels ?? {}),
        ancestry: AncestryDataModel,
        armor: ArmorDataModel,
        culture: CultureDataModel,
        culturelore: CultureLoreDataModel,
        education: EducationDataModel,
        equipment: EquipmentDataModel,
        language: LanguageDataModel,
        mastery: MasteryDataModel,
        moonsign: MoonsignDataModel,
        npcattack: NpcAttackDataModel,
        npcfeature: NpcFeatureDataModel,
        projectile: ProjectileDataModel,
        resource: ResourceDataModel,
        shield: ShieldDataModel,
        species: SpeciesDataModel,
        spell: SpellDataModel,
        spelleffect: SpellEffectDataModel,
        statuseffect: StatusEffectDataModel,
        strength: StrengthDataModel,
        weakness: WeaknessDataModel,
        weapon: WeaponDataModel
    };

    if (config.splittermond == undefined) {
        config.splittermond = {};
    }
    (config.splittermond as Record<string, unknown>).Item = {
        documentClasses: {
            default: SplittermondItem,
            weapon: SplittermondWeaponItem,
            shield: SplittermondShieldItem,
            armor: SplittermondArmorItem,
            spell: SplittermondSpellItem,
            equipment: SplittermondEquipmentItem,
            npcattack: SplittermondNPCAttackItem,
            mastery: SplittermondMastery
        }
    };

    modifierRegistry.addHandler(ItemModifierHandler.config.topLevelPath, ItemModifierHandler);
}

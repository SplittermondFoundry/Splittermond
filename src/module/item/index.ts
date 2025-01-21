import SplittermondItem from "./item";
import {WeaponDataModel} from "./dataModel/WeaponDataModel";
import SplittermondWeaponItem from "./weapon";
import SplittermondShieldItem from "./shield";
import SplittermondArmorItem from "./armor";
import SplittermondSpellItem from "./spell";
import SplittermondEquipmentItem from "./equipment";
import SplittermondNPCAttackItem from "./npcattack";
import SplittermondMastery from "./mastery";
import {AncestryDataModel} from "./dataModel/AncestryDataModel";
import {ArmorDataModel} from "./dataModel/ArmorDataModel";
import {CultureDataModel} from "./dataModel/CultureDataModel";
import {CultureLoreDataModel} from "./dataModel/CultureLoreDataModel";
import {EducationDataModel} from "./dataModel/EducationDataModel";
import {EquipmentDataModel} from "./dataModel/EquipmentDataModel";
import {LanguageDataModel} from "./dataModel/LanguageDataModel";
import {MasteryDataModel} from "./dataModel/MasteryDataModel";
import {MoonsignDataModel} from "./dataModel/MoonsignDataModel";
import {NpcAttackDataModel} from "./dataModel/NpcAttackDataModel";
import {NpcFeatureDataModel} from "./dataModel/NpcFeatureDataModel";
import {ProjectileDataModel} from "./dataModel/ProjectileDataModel";
import {ResourceDataModel} from "./dataModel/ResourceDataModel";
import {ShieldDataModel} from "./dataModel/ShieldDataModel";
import {SpeciesDataModel} from "./dataModel/SpeciesDataModel";
import {SpellDataModel} from "./dataModel/SpellDataModel";
import {SpellEffectDataModel} from "./dataModel/SpellEffectDataModel";
import {StatusEffectDataModel} from "./dataModel/StatusEffectDataModel";
import {StrengthDataModel} from "./dataModel/StrengthDataModel";
import {WeaknessDataModel} from "./dataModel/WeaknessDataModel";

declare const CONFIG: any;

export function initializeItem() {
    CONFIG.Item.documentClass = SplittermondItem;
    CONFIG.Item.dataModels = {
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

    if (CONFIG.splittermond == undefined) {
        CONFIG.splittermond = {};
    }

    CONFIG.splittermond.Item = {
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
}
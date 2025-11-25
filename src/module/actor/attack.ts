import Skill from "./skill.js";
import {
    asString,
    condense,
    condenseCombineDamageWithModifiers,
    evaluate,
    mapRoll,
    of,
    plus,
} from "../modifiers/expressions/scalar";
import { foundryApi } from "../api/foundryApi.js";
import SplittermondActor from "./actor";
import { splittermond } from "../config";
import { initMapper } from "../util/LanguageMapper";
import { ItemFeaturesModel, mergeFeatures } from "../item/dataModel/propertyModels/ItemFeaturesModel";
import { DamageRoll } from "../util/damage/DamageRoll";
import { toDisplayFormula } from "../util/damage/util";
import { DamageModel } from "../item/dataModel/propertyModels/DamageModel";
import { DataModelSchemaType, fieldExtensions, fields, SplittermondDataModel } from "../data/SplittermondDataModel";

type Options<T extends object> = { [K in keyof T]+?: T[K] | null | undefined };

interface AttackItem {
    id: string;
    img: string;
    name: string;
    type: string;
    system: Options<AttackItemData> & { secondaryAttack?: Options<AttackItemData> };
}

interface AttackItemData {
    skill: string;
    attribute1: string;
    attribute2: string;
    skillValue: number;
    minAttributes: string;
    skillMod: number;
    damageLevel: number;
    range: number;
    features: ItemFeaturesModel;
    damage: DamageModel;
    weaponSpeed: number;
    damageType: string;
    costType: string;
}

function withDefaults(data: Options<AttackItemData>): AttackItemData {
    return {
        //@formatter:off
        get skill() {
            return data.skill ?? "";
        },
        get attribute1() {
            return data.attribute1 ?? "";
        },
        get attribute2() {
            return data.attribute2 ?? "";
        },
        get skillValue() {
            return data.skillValue ?? 0;
        },
        get minAttributes() {
            return data.minAttributes ?? "";
        },
        get skillMod() {
            return data.skillMod ?? 0;
        },
        get damageLevel() {
            return data.damageLevel ?? 0;
        },
        get range() {
            return data.range ?? 0;
        },
        get features() {
            return data.features ?? new ItemFeaturesModel({ internalFeatureList: [] });
        },
        get damage() {
            return data.damage ?? new DamageModel({ stringInput: "1W6" });
        }, //assume that an attack does do some damage
        get weaponSpeed() {
            return data.weaponSpeed ?? 6;
        }, //Splittermond balances damage at 1/tick so with 6 we achieve that average
        get damageType() {
            return data.damageType ?? "physical";
        },
        get costType() {
            return data.costType ?? "V";
        },
        //@formatter:on
    };
}

const attributeMapper = initMapper(splittermond.attributes)
    .withTranslator((a) => `splittermond.attribute.${a}.long`)
    .andOtherMappers((a) => `splittermond.attribute.${a}.short`)
    .build();

function AttackSchema() {
    return {
        actor: new fieldExtensions.TypedObjectField<SplittermondActor, true, false>({
            required: true,
            nullable: false,
            validate: (x): x is SplittermondActor => x !== null && x !== undefined,
        }),
        item: new fieldExtensions.TypedObjectField<AttackItem, true, false>({
            required: true,
            nullable: false,
            validate: (x): x is AttackItem => x !== null && x !== undefined,
        }),
        isSecondaryAttack: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        attackData: new fieldExtensions.TypedObjectField<AttackItemData, true, false>({
            required: true,
            nullable: false,
            validate: (x): x is AttackItemData => x !== null && x !== undefined,
        }),
        id: new fields.StringField({ required: true, nullable: false }),
        img: new fields.StringField({ required: true, nullable: false }),
        name: new fields.StringField({ required: true, nullable: false }),
        skill: new fieldExtensions.TypedObjectField<Skill, true, false>({
            required: true,
            nullable: false,
            validate: (x): x is Skill => x !== null && x !== undefined,
        }),
        editable: new fields.BooleanField({ required: true, nullable: false }),
        deletable: new fields.BooleanField({ required: true, nullable: false }),
    };
}

type AttackType = DataModelSchemaType<typeof AttackSchema>;

export default class Attack extends SplittermondDataModel<AttackType> {
    static defineSchema = AttackSchema;

    /**
     * Initializer function that replaces the constructor logic
     * @param  actor Actor-Object of attack
     * @param  item Corresponding item for attack
     * @param  secondaryAttack Generate secondary attack of item
     */
    static initialize(actor: SplittermondActor, item: AttackItem, secondaryAttack = false): Attack {
        const isSecondaryAttack = secondaryAttack;
        const attackData = withDefaults(
            secondaryAttack && item.system.secondaryAttack ? item.system.secondaryAttack : item.system
        );

        const editable = ["weapon", "shield", "npcattack"].includes(item.type);
        const deletable = ["npcattack"].includes(item.type);
        const id = !isSecondaryAttack ? item.id : `${item.id}_secondary`;
        const img = item.img;
        const name = !isSecondaryAttack
            ? item.name
            : `${item.name} (${foundryApi.localize(`splittermond.skillLabel.${attackData.skill}`)})`;
        const skill = new Skill(
            actor,
            attackData.skill || name,
            attackData.attribute1,
            attackData.attribute2,
            attackData.skillValue
        );
        skill.addModifierPath(`skill.${id}`);

        let minAttributeMalus = 0;
        attackData.minAttributes.split(",").forEach((aStr) => {
            const attribute = aStr.match(/^\S+(?=\s)/)?.[0];
            const minAttributeValue = parseInt(aStr.match(/([0-9]+)$/)?.[0] ?? "0");
            if (attribute) {
                let attr = attributeMapper().toCode(attribute);
                if (attr) {
                    let diff = parseInt(actor.attributes[attr].value) - minAttributeValue;
                    if (diff < 0) {
                        minAttributeMalus += diff;
                    }
                }
            }
        });

        if (minAttributeMalus) {
            actor.modifier.add(
                `skill.${id}`,
                {
                    name: foundryApi.localize("splittermond.minAttributes"),
                    type: "innate",
                },
                of(minAttributeMalus),
                item
            );
            actor.modifier.add(
                "weaponspeed",
                {
                    item: id,
                    name: foundryApi.localize("splittermond.minAttributes"),
                    type: "innate",
                },
                of(minAttributeMalus),
                item
            );
        }

        //add skill modifier if present AND greater than 0!
        if (attackData.skillMod) {
            actor.modifier.add(
                `skill.${id}`,
                {
                    name: foundryApi.localize("splittermond.skillMod"),
                    type: "innate",
                },
                of(attackData.skillMod),
                item
            );
        }

        if (attackData.damageLevel > 2) {
            actor.modifier.add(
                `skill.${id}`,
                {
                    name: foundryApi.localize("splittermond.damageLevel"),
                    type: "innate",
                },
                of(-3),
                item
            );
        }

        return new Attack({
            actor,
            item,
            isSecondaryAttack,
            attackData,
            id,
            img,
            name,
            skill,
            editable,
            deletable,
        });
    }

    get range() {
        return this.attackData.range;
    }

    /**
     * Returns the features of the attack as a string, suitable for display.
     */
    get features() {
        return this.attackData.features.features;
    }

    get featuresAsRef() {
        return this.attackData.features;
    }

    /**
     * @return {principalComponent: ProtoDamageImplement, otherComponents: ProtoDamageImplement[]}
     */
    getForDamageRoll() {
        const fromModifiers = this.collectModifiers().map((m) => {
            return {
                damageRoll: DamageRoll.fromExpression(m.damageExpression, m.features),
                damageType: m.damageType,
                damageSource: m.damageSource,
            };
        });
        return {
            principalComponent: {
                damageRoll: DamageRoll.from(this.attackData.damage.calculationValue, this.attackData.features),
                damageType: this.attackData.damageType,
                damageSource: this.name,
            },
            otherComponents: fromModifiers,
        };
    }

    get damage() {
        const modifiers = this.collectModifiers()
            .map((m) => m.damageExpression)
            .reduce((a, b) => plus(a, b), of(0));
        const damage = this.attackData.damage.calculationValue;
        const mainComponent = condense(mapRoll(foundryApi.roll(damage)));
        const displayFormula = toDisplayFormula(asString(condenseCombineDamageWithModifiers(mainComponent, modifiers)));
        return displayFormula === "0" ? "" : displayFormula;
    }

    private collectModifiers() {
        const modifiers = this.actor.modifier
            .getForId("item.damage")
            .notSelectable()
            .withAttributeValuesOrAbsent("item", this.name)
            .withAttributeValuesOrAbsent("itemType", this.item.type)
            .withAttributeValuesOrAbsent("skill", this.skill.id)
            .getModifiers()
            .map((m) => {
                const features = mergeFeatures(
                    ItemFeaturesModel.from(m.attributes.features ?? ""),
                    this.attackData.features
                );
                return {
                    damageExpression: m.value,
                    features: features,
                    damageType: m.attributes.damageType ?? this.attackData.damageType,
                    damageSource: m.attributes.name ?? null,
                };
            });
        modifiers.push(...this.getImproviationBonus());
        return modifiers;
    }

    private getImproviationBonus() {
        const improviationBonus =
            !!this.actor.findItem().withType("mastery").withName("improvisation") &&
            this.attackData.features.hasFeature("Improvisiert");
        const modifier = {
            damageExpression: of(2),
            features: this.attackData.features,
            damageType: this.attackData.damageType,
            damageSource: "Improvisation",
        };
        return improviationBonus ? [modifier] : [];
    }

    get damageType() {
        return this.attackData.damageType;
    }

    get costType() {
        return this.attackData.costType;
    }

    get weaponSpeed() {
        let weaponSpeed = this.attackData.weaponSpeed;
        weaponSpeed -= this.actor.modifier
            .getForId("item.weaponspeed")
            .withAttributeValuesOrAbsent("item", this.item.id, this.item.name)
            .withAttributeValuesOrAbsent("itemType", this.item.type)
            .withAttributeValuesOrAbsent("skill", this.skill.id)
            .getModifiers().sum;

        this.getImproviationBonus().forEach((bonus) => (weaponSpeed -= evaluate(bonus.damageExpression)));
        if (["melee", "slashing", "chains", "blades", "staffs"].includes(this.skill.id))
            weaponSpeed += parseInt(this.actor.tickMalus);
        return weaponSpeed;
    }

    get isPrepared() {
        return ["longrange", "throwing"].includes(this.skill.id)
            ? this.actor.getFlag("splittermond", "preparedAttack") == this.id
            : true;
    }

    toObjectData() {
        return {
            id: this.id,
            img: this.img,
            name: this.name,
            skill: this.skill.toObject(),
            range: this.range,
            features: this.features,
            damage: this.damage,
            damageType: this.damageType,
            costType: this.costType,
            weaponSpeed: this.weaponSpeed,
            editable: this.editable,
            deletable: this.deletable,
            isPrepared: this.isPrepared,
            featureList: this.attackData.features.featuresAsStringList(),
        };
    }

    async roll(options: Partial<Parameters<typeof this.skill.roll>[0]> = {}) {
        if (!this.actor) return false;

        const attackRollOptions = {
            type: "attack",
            subtitle: this.item.name,
            difficulty: "VTD" as const,
            preSelectedModifier: [this.item.name],
            modifier: 0,
            checkMessageData: {
                weapon: {
                    ...this.toObjectData(),
                    damageImplements: this.getForDamageRoll(),
                },
            },
            ...structuredClone(options),
        };
        return this.skill.roll(attackRollOptions);
    }
}

import Skill from "./skill";
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
import { SplittermondChatCard } from "module/util/chat/SplittermondChatCard";
import { AttackRollMessage } from "module/util/chat/rollMessages/attackChatMessage/AttackRollMessage";
import type { CheckReport } from "module/check";
import { totalDegreesOfSuccess } from "module/check/modifyEvaluation";
import type { SplittermondAttribute } from "module/config/attributes";
import type { DamageType } from "module/config/damageTypes";
import type { CostType } from "module/util/costs/costTypes";
import { isMember } from "module/util/util";

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
    attribute1: SplittermondAttribute | "";
    attribute2: SplittermondAttribute | "";
    skillValue: number;
    minAttributes: string;
    skillMod: number;
    damageLevel: number;
    range: number;
    features: ItemFeaturesModel;
    damage: DamageModel;
    weaponSpeed: number;
    damageType: DamageType;
    costType: CostType;
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

export default class Attack {
    public readonly item: AttackItem;
    private readonly isSecondaryAttack: boolean;
    private readonly attackData: AttackItemData;

    public readonly id: string;
    public readonly img: string;
    public readonly name: string;
    public readonly skill: Skill;
    public readonly editable: boolean;
    public readonly deletable: boolean;

    static initialize(actor: SplittermondActor, item: AttackItem, secondaryAttack = false) {
        return new Attack(actor, item, secondaryAttack);
    }
    /**
     *
     * @param  actor Actor-Object of attack
     * @param  item Corresponding item for attack
     * @param  secondaryAttack Generate secondary attack of item
     */
    constructor(
        public readonly actor: SplittermondActor,
        item: AttackItem,
        secondaryAttack = false
    ) {
        this.isSecondaryAttack = secondaryAttack;
        this.attackData = withDefaults(
            secondaryAttack && item.system.secondaryAttack ? item.system.secondaryAttack : item.system
        );

        this.editable = ["weapon", "shield", "npcattack"].includes(item.type);
        this.deletable = ["npcattack"].includes(item.type);
        this.id = !this.isSecondaryAttack ? item.id : `${item.id}_secondary`;
        this.img = item.img;
        this.name = !this.isSecondaryAttack
            ? item.name
            : `${item.name} (${foundryApi.localize(`splittermond.skillLabel.${this.attackData.skill}`)})`;
        this.skill = Skill.initialize(
            this.actor,
            this.attackData.skill || this.name,
            this.attackData.attribute1,
            this.attackData.attribute2,
            this.attackData.skillValue
        );
        this.skill.addModifierPath(`skill.${this.id}`);
        this.item = item;

        let minAttributeMalus = 0;
        this.attackData.minAttributes.split(",").forEach((aStr) => {
            const attribute = aStr.match(/^\S+(?=\s)/)?.[0];
            const minAttributeValue = parseInt(aStr.match(/([0-9]+)$/)?.[0] ?? "0");
            if (attribute) {
                let attr = attributeMapper().toCode(attribute);
                if (attr) {
                    let diff = parseInt(this.actor.attributes[attr].value) - minAttributeValue;
                    if (diff < 0) {
                        minAttributeMalus += diff;
                    }
                }
            }
        });

        if (minAttributeMalus) {
            this.actor.modifier.add(
                `skill.${this.id}`,
                {
                    name: foundryApi.localize("splittermond.minAttributes"),
                    type: "innate",
                },
                of(minAttributeMalus),
                this
            );
            this.actor.modifier.add(
                "weaponspeed",
                {
                    item: this.id,
                    name: foundryApi.localize("splittermond.minAttributes"),
                    type: "innate",
                },
                of(minAttributeMalus),
                this
            );
        }

        //add skill modifier if present AND greater than 0!
        if (this.attackData.skillMod) {
            this.actor.modifier.add(
                `skill.${this.id}`,
                {
                    name: foundryApi.localize("splittermond.skillMod"),
                    type: "innate",
                },
                of(this.attackData.skillMod),
                this
            );
        }

        if (this.attackData.damageLevel > 2) {
            this.actor.modifier.add(
                `skill.${this.id}`,
                {
                    name: foundryApi.localize("splittermond.damageLevel"),
                    type: "innate",
                },
                of(-3),
                this
            );
        }
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

    getForDamageRoll() {
        const fromModifiers = this.collectModifiers().map((m) => {
            return {
                damageRoll: DamageRoll.fromExpression(m.damageExpression, m.features),
                damageType: m.damageType as DamageType,
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
                const features = mergeFeatures(ItemFeaturesModel.from(m.attributes.features ?? ""), this.featuresAsRef);
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
    get isRanged() {
        return isMember(splittermond.skillGroups.ranged, this.skill.id);
    }

    get isPrepared() {
        return this.isRanged ? this.actor.getFlag("splittermond", "preparedAttack") == this.id : true;
    }

    toObject() {
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
                    ...this.toObject(),
                    damageImplements: this.getForDamageRoll(),
                },
            },
            ...structuredClone(options),
        };
        const result = await this.skill.roll(attackRollOptions);
        if (!result) {
            return;
        }
        const checkReport = this.adaptForGrazingHit(result.report);
        const tickCost = this.getAfterRollTickCost(checkReport);
        return (
            SplittermondChatCard.create(this.actor, AttackRollMessage.initialize(this, checkReport, tickCost), {
                ...result.rollOptions,
                type: "attackRollMessage",
            })
                .sendToChat()
                // We need to return that to the token action bar so that it knows to delete prepared attacks
                //Ideally, attack preparation would probably be handled here though!
                .then(() => true)
        );
    }

    public adaptForGrazingHit(checkReport: CheckReport) {
        const totalDegreesOfSuccess = checkReport.degreeOfSuccess.fromRoll + checkReport.degreeOfSuccess.modification;
        const isGrazingHit = totalDegreesOfSuccess < checkReport.maneuvers.length && checkReport.succeeded;
        const message = isGrazingHit
            ? foundryApi.localize("splittermond.grazingHit")
            : checkReport.degreeOfSuccessMessage;
        return {
            ...checkReport,
            degreeOfSuccessMessage: message,
            grazingHitPenalty: isGrazingHit ? splittermond.grazingHitBasePenalty * checkReport.maneuvers.length : 0,
        };
    }

    private getAfterRollTickCost(checkReport: CheckReport) {
        const base = this.isRanged ? 3 : this.weaponSpeed;
        const isCritSuccess =
            totalDegreesOfSuccess(checkReport) >= splittermond.check.degreeOfSuccess.criticalSuccessThreshold;
        const successReduction = isCritSuccess
            ? splittermond.attackEnhancement.criticalSuccess.weaponspeedReduction
            : 0;
        return base - successReduction;
    }
}

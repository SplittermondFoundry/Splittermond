import SplittermondItem from "./item";
import AttackableItem from "./attackable-item";

import { getSpellAvailabilityParser } from "./availabilityParser";
import { produceSpellAvailabilityTags } from "./tags/spellTags";
import { parseCostString, parseSpellEnhancementDegreesOfSuccess } from "../util/costs/costParser";
import { calculateReducedEnhancementCosts, calculateReducedSpellCosts } from "../util/costs/spellCosts";
import { SplittermondChatCard } from "../util/chat/SplittermondChatCard";
import { splittermond } from "../config";
import { PrimaryCost } from "../util/costs/PrimaryCost";
import { Cost } from "../util/costs/Cost";
import { SpellRollMessage } from "../util/chat/spellChatMessage/SpellRollMessage";
import { ItemFeaturesModel, mergeFeatures } from "./dataModel/propertyModels/ItemFeaturesModel";
import { DamageRoll } from "../util/damage/DamageRoll";
import {
    asString,
    condense,
    condenseCombineDamageWithModifiers,
    mapRoll,
    of,
    plus,
} from "../modifiers/expressions/scalar/index.js";
import { toDisplayFormula } from "../util/damage/util";

/**
 * @extends SplittermondItem
 * @property {SpellDataModel} system
 * @property {SplittermondActor} actor
 */
export default class SplittermondSpellItem extends AttackableItem(SplittermondItem) {
    constructor(
        data,
        context = {},
        availabilityParser = getSpellAvailabilityParser(game.i18n, CONFIG.splittermond.skillGroups.magic)
    ) {
        super(data, context);
        this.availabilityParser = availabilityParser;
    }

    /** @return {string} */
    get costs() {
        return this.actor
            ? calculateReducedSpellCosts(this.system, this.actor.system.spellCostReduction)
            : this.system.costs;
    }

    /** @return {string} */
    get enhancementCosts() {
        if (this.actor) {
            const requiredDegreesOfSuccess = parseSpellEnhancementDegreesOfSuccess(this.system.enhancementCosts);
            const reducedCosts = calculateReducedEnhancementCosts(
                this.system,
                this.actor.system.spellEnhancedCostReduction
            );
            return `${requiredDegreesOfSuccess}EG/+${reducedCosts}`;
        } else {
            return this.system.enhancementCosts;
        }
    }

    get availableIn() {
        return this.availabilityParser.toDisplayRepresentation(this.system.availableIn);
    }

    /**
     * @override
     */
    update(data, context) {
        if ("availableIn" in data) {
            data["system.availableIn"] = this.availabilityParser.toInternalRepresentation(data.availableIn);
            delete data.availableIn;
        }
        return super.update(data, context);
    }

    updateSource(data, context) {
        if ("availableIn" in data) {
            data["system.availableIn"] = this.availabilityParser.toInternalRepresentation(data.availableIn);
            delete data.availableIn;
        }
        return super.updateSource(data, context);
    }

    get skill() {
        if (!splittermond.skillGroups.all.includes(this.system.skill)) {
            console.warn(
                `Splittermond | Spell ${this.name} on ${this.actor.name} has an invalid skill: `,
                this.system.skill
            );
        }
        return this.actor?.skills[this.system.skill];
    }

    get enoughFocus() {
        let costData = parseCostString(this.costs).asPrimaryCost();
        let costTotal = costData.channeled + costData.exhausted + costData.consumed;
        return costTotal <= this.actor?.system.focus.available.value;
    }

    get difficulty() {
        return this.system.difficulty;
    }

    get castDuration() {
        return this.system.castDuration;
    }

    get range() {
        return this.system.range;
    }

    get effectDuration() {
        return this.system.effectDuration;
    }

    get effectArea() {
        return this.system.effectArea;
    }

    get description() {
        return this.system.description ?? "";
    }

    get enhancementDescription() {
        return this.system.enhancementDescription;
    }

    get degreeOfSuccessOptions() {
        return this.system.degreeOfSuccessOptions ?? {};
    }

    get spellType() {
        return this.system.spellType + "";
    }

    get spellTypeList() {
        return this.spellType?.split(",").map((str) => str.trim());
    }

    get availableInList() {
        return produceSpellAvailabilityTags(this.system, this.availabilityParser);
    }

    get damage() {
        const fromModifiers = this.actor.modifier
            .getForId("item.damage")
            .notSelectable()
            .withAttributeValuesOrAbsent("item", this.name)
            .withAttributeValuesOrAbsent("itemType", this.type)
            .withAttributeValuesOrAbsent("skill", this.system.skill)
            .getModifiers()
            .map((m) => m.value)
            .reduce((a, b) => plus(a, b), of(0));
        const mainComponent = condense(mapRoll(this.system.damage.asRoll()));
        return toDisplayFormula(asString(condenseCombineDamageWithModifiers(mainComponent, fromModifiers)));
    }

    /**
     * @return {principalComponent: ProtoDamageImplement, otherComponents: ProtoDamageImplement[]}
     */
    getForDamageRoll() {
        const fromModifiers = this.actor.modifier
            .getForId("item.damage")
            .notSelectable()
            .withAttributeValuesOrAbsent("item", this.name)
            .withAttributeValuesOrAbsent("itemType", this.type)
            .withAttributeValuesOrAbsent("skill", this.system.skill)
            .getModifiers()
            .map((m) => {
                const features = mergeFeatures(
                    ItemFeaturesModel.from(m.attributes.features ?? ""),
                    this.system.features
                );
                return {
                    damageRoll: DamageRoll.fromExpression(m.value, features),
                    damageType: m.attributes.damageType ?? this.system.damageType,
                    damageSource: m.attributes.name ?? null,
                };
            });
        return {
            principalComponent: {
                damageRoll: DamageRoll.from(this.system.damage.calculationValue, this.system.features),
                damageType: this.system.damageType,
                damageSource: this.name,
            },
            otherComponents: fromModifiers,
        };
    }

    async roll(options) {
        if (!this.actor) return false;

        options = duplicate(options);
        options.type = "spell";
        options.subtitle = this.name;
        options.difficulty = this.difficulty;
        options.preSelectedModifier = this.spellType.split(",");
        options.checkMessageData = {
            spell: {
                id: this.id,
                name: this.name,
                spellType: this.spellType,
                description: this.description,
                enhancementDescription: this.enhancementDescription,
                degreeOfSuccessOptions: this.degreeOfSuccessOptions,
                costs: this.costs,
                enhancementCosts: this.enhancementCosts,
                skill: this.skill.toObject(),
                difficulty: this.difficulty,
                castDuration: this.castDuration,
                range: this.range,
                effectDuration: this.effectDuration,
                spellTypeList: this.spellTypeList,
                damage: this.damage,
            },
        };

        return this.skill
            .roll(options)
            .then((result) =>
                !result
                    ? false
                    : SplittermondChatCard.create(this.actor, SpellRollMessage.initialize(this, result.report), {
                          ...result.rollOptions,
                          type: "spellRollMessage",
                      }).sendToChat()
            )
            .then((result) => result ?? true);
    }

    /**
     * @param {number} degreeOfSuccess
     * @param {boolean} successful
     * @return {PrimaryCost}
     */
    getCostsForFinishedRoll(degreeOfSuccess, successful) {
        if (successful) {
            const costs = parseCostString(this.costs).asPrimaryCost();
            const critReduction =
                degreeOfSuccess >= splittermond.degreeOfSuccessThresholds.critical
                    ? getReductionForCriticalSuccess(costs)
                    : new Cost(0, 0, false, true);
            return costs.subtract(critReduction.asModifier());
        } else {
            return parseCostString(`${Math.abs(degreeOfSuccess)}`).asPrimaryCost();
        }
    }

    #getReductionForCriticalSuccess() {
        const costs = parseCostString(this.costs).asPrimaryCost();
        if (costs.isChanneled && costs.consumed > 0) {
            return new Cost(0, 1, true, true);
        } else if (!costs.isChanneled) {
            return new Cost(0, 1, false, true);
        } else {
            return new Cost(0, 0, false, true);
        }
    }
}
function getReductionForCriticalSuccess(costs) {
    if (costs.isChanneled && costs.consumed > 0) {
        return new Cost(0, 1, true, true);
    } else if (!costs.isChanneled) {
        return new Cost(0, 1, false, true);
    } else {
        return new Cost(0, 0, false, true);
    }
}

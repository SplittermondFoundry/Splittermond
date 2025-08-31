import {foundryApi} from "../../api/foundryApi";
import {Die, FoundryRoll, isNumericTerm, isOperatorTerm, isRoll, NumericTerm} from "../../api/Roll";
import {DamageFeature} from "./DamageFeature";
import {
    ItemFeatureDataModel,
    ItemFeaturesModel,
    parseFeatures
} from "../../item/dataModel/propertyModels/ItemFeaturesModel";
import {ItemFeature} from "../../config/itemFeatures";
import {condense, Expression, mapRoll, toRollFormula} from "../../actor/modifiers/expressions/scalar";
import {toDisplayFormula, toRollFormula as rollFormulaReplacer} from "./util";

export class DamageRoll {

    /**
     * @param  damageString a splittermond damage string like "1W6+2"
     * @param  featureString like "Exakt 1" or "Scharf 2"
     */
    static parse(damageString: string, featureString: string = "") {
        const features = parseFeatures(featureString).map(f => new ItemFeatureDataModel(f));
        return this.from(damageString, ItemFeaturesModel.from(features));
    }

    static from(damageString: string, itemFeatures: ItemFeaturesModel) {
        const damage = concatSimpleRoll(foundryApi.roll(rollFormulaReplacer(damageString)));
        return new DamageRoll(damage, itemFeatures)
    }

    static fromExpression(rollExpression: Expression, itemFeatures:ItemFeaturesModel): DamageRoll {
        const roll = concatSimpleRoll(rollExpression);
        return new DamageRoll(roll, itemFeatures);
    }

    private backingRoll: FoundryRoll;
    private baseModifier: number;
    private hasFinalNumericTerm: boolean;
    private _damageModifier: number;
    private _features: ItemFeaturesModel;

    constructor(roll: FoundryRoll, features: ItemFeaturesModel) {
        this.backingRoll = roll;
        this._damageModifier = 0;
        this.hasFinalNumericTerm = isNumericTerm(this.getLastTerm(roll));
        this.baseModifier = this.hasFinalNumericTerm ? (this.getLastTerm(roll) as NumericTerm).number : 0;
        this._features = features
    }

    private getLastTerm(roll: FoundryRoll) {
        return roll.terms.slice(-1)[0];
    }

    async evaluate(){
        const modifiedRoll = this.modifyRollFormula(this.backingRoll.clone());
        const {roll, activeFeatures} = await evaluateDamageRoll(modifiedRoll, this._features);
        if(this._features.hasFeature("Wuchtig") && this._damageModifier > 0){
            activeFeatures.add("Wuchtig");
        }
        return new EvaluatedDamageRoll(roll, this._features, activeFeatures);
    }

    private modifyRollFormula(roll: FoundryRoll) {
        const finalModificationValue = this.baseModifier + this._damageModifier;
        if (this.hasFinalNumericTerm && roll.terms.length >= 3) {
            const lastOperand = roll.terms.slice(-2);
            const lastOperator = lastOperand[0];
            const lastNumericTerm = lastOperand[1];
            if (isOperatorTerm(lastOperator) && isNumericTerm(lastNumericTerm)) {
                lastOperator.operator = finalModificationValue > 0 ? "+" : "-";
                lastNumericTerm.number = Math.abs(finalModificationValue);
                roll.resetFormula();
                return roll;
            }
        } else if (this.hasFinalNumericTerm && roll.terms.length == 1) {
            (this.getLastTerm(roll) as NumericTerm/*follows from condition*/).number = finalModificationValue;
            roll.resetFormula();
            return roll;
        }
        return this.appendModifier(roll, finalModificationValue);
    }

    private appendModifier(roll: FoundryRoll, damageModifier: number) {
        if (damageModifier === 0) {
            return roll;
        }
        const operator = damageModifier < 0 ? foundryApi.rollInfra.minusTerm() : foundryApi.rollInfra.plusTerm();
        const number = foundryApi.rollInfra.numericTerm(damageModifier);
        roll.terms.push(operator, number);
        roll.resetFormula();
        return roll;
    }

    increaseDamage(amount: number) {
        this._damageModifier += amount * this.damageModifierFactor;
    }

    decreaseDamage(amount: number) {
        this._damageModifier -= amount * this.damageModifierFactor;
    }

    private get damageModifierFactor(): number {
        return this._features.hasFeature("Wuchtig") ? 2 : 1;
    }


    getDamageFormula() {
        const rollCopy = this.modifyRollFormula(this.backingRoll.clone());
        return toDisplayFormula(rollCopy.formula);
    }

    getFeatureString(): string {
        return this._features.features
    }

}

export type {EvaluatedDamageRoll};
class EvaluatedDamageRoll {

    constructor(
        public readonly roll: FoundryRoll,
        public readonly features: ItemFeaturesModel,
        private activeFeatures: Set<ItemFeature>
    ) {
    }

    getActiveFeatures(): DamageFeature[] {
        return this.features.featureList.filter(f => this.activeFeatures.has(f.name))
            .map(f => this.toRecord(f))
    };

    private toRecord(feature: ItemFeatureDataModel): DamageFeature {
        return {
            name: feature.name,
            value: feature.value,
            active: this.activeFeatures.has(feature.name)
        }
    }

}

async function evaluateDamageRoll(roll: FoundryRoll, features: ItemFeaturesModel) {
    const activeFeatures: Set<ItemFeature> = new Set<ItemFeature>();
    if(roll.isDeterministic){
       return Promise.resolve({roll: roll.evaluateSync(), activeFeatures});
    }
    modifyFormulaForExactFeature();
    await roll.evaluate();
    modifyResultForScharfFeature();
    modifyResultForKritischFeature();

    return {roll,  activeFeatures};

    function modifyFormulaForExactFeature() {
        const exactValue = features.valueOf("Exakt");
        if (exactValue) {
            activeFeatures.add("Exakt");
            const dieTerm = getFirstDieTerm(roll);
            const diceToKeep = dieTerm.number;
            dieTerm.number += exactValue;
            dieTerm.modifiers.push(`kh${diceToKeep}`)
            roll.resetFormula();
        }
    }

    function modifyResultForScharfFeature() {
        const scharfValue = features.valueOf("Scharf");
        if (scharfValue) {
            let scharfBonus = 0;
            const firstDie = getFirstDieTerm(roll)
            const cappedSharpness = getCappedSharpness(scharfValue, firstDie.faces)
            firstDie.results.forEach(r => {
                if (r.active) {
                    if (r.result < cappedSharpness) {
                        activeFeatures.add("Scharf");
                        scharfBonus += cappedSharpness - r.result;
                    }
                }
            });
            roll._total += scharfBonus;
        }
    }

    function getCappedSharpness(scharfValue:number, faces:number){
        const cappedSharpness = Math.min(scharfValue, faces / 2); //They are no odd sided dice, so faces/2 is always an integer
        if(cappedSharpness < scharfValue){
           console.debug(`Splittermond | Feature 'Scharf ${scharfValue}' capped to ${cappedSharpness}, because the dice only have ${faces} sides.`)
        }
        return cappedSharpness;
    }

    function modifyResultForKritischFeature() {
        const kritischValue = features.valueOf("Kritisch");
        if (kritischValue) {
            let kritischBonus = 0;
            const firstDie = getFirstDieTerm(roll);
            firstDie.results.forEach(r => {
                if (r.active) {
                    if (r.result === firstDie.faces) {
                        activeFeatures.add("Kritisch");
                        kritischBonus += kritischValue;
                    }
                }
            });
            roll._total += kritischBonus;
        }
    }
}

/**
 * Uses a quirk of the {@link mapRoll} function that allows us to concatenate the rather simple common
 * roll formula 1d6 +2 +2 to 1d6 + 4.
 */
function concatSimpleRoll(roll: FoundryRoll|Expression) {
    const expression = isRoll(roll) ? mapRoll(roll) : roll;
    const condensedFormula = toRollFormula(condense(expression));
    return foundryApi.roll(condensedFormula[0]);
}

function getFirstDieTerm(roll: FoundryRoll): Die {
    for (const term of roll.terms) {
        if ("results" in term && "faces" in term) {
            return term;
        }
    }
    throw new Error("Somehow the first term in the roll was an operator.")
}

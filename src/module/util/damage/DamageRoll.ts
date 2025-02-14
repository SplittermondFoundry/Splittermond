import {foundryApi} from "../../api/foundryApi";
import {Die, Roll} from "../../api/foundryTypes";

interface DiceRoll {
    nDice:number;
    nFaces:number;
    sign?: 1 | -1;
}
interface Feature {
    name: string;
    value: number;
    active: boolean;
}

interface DamageRollObjectType {
    nDice: number;
    nFaces: number;
    damageModifier: number;
    features: Record<string, Feature>
    otherDice?:DiceRoll[];
}

export class DamageRoll {

    /**
     * @param  damageString a splittermond damage string like "1W6+2"
     * @param  featureString like "Exakt 1" or "Scharf 2"
     */
    static parse(damageString: string, featureString: string = "") {
        const features = parseFeatureString(featureString);
        const damage = parseDamageString(damageString);
        return new DamageRoll({...damage, features});
    }

    private _mainDie:DiceRoll
    private _damageModifier: number;
    private _features: Record<string,Feature>;
    private _otherDice: DiceRoll[];


    constructor({nDice, nFaces, damageModifier, features, otherDice=[]}: DamageRollObjectType) {
        this._mainDie = {nDice, nFaces};
        this._damageModifier = damageModifier;
        this._features = features
        this._otherDice = otherDice;
    }

    increaseDamage(amount:number) {
        this._damageModifier += amount;
    }

    decreaseDamage(amount:number) {
        this._damageModifier -= amount;
    }

    async evaluate():Promise<Roll> {
        const rollFormulas= [...this._otherDice]
            .map((die)=>this.#getSign(die.sign ?? 1) + this.getRollFormulaForDie(die))
            .reduce((acc,cur)=>acc + cur, this.getRollFormulaForDie(this._mainDie));
        const damageFormula = `${rollFormulas}${this.#getSign(this._damageModifier)}${Math.abs(this._damageModifier)}`;

        let rollResult = await foundryApi.roll(damageFormula, {}).evaluate();

        rollResult = this.#modifyResultForScharfFeature(rollResult);
        rollResult = this.#modifyResultForKritischFeature(rollResult);
        return rollResult;
    }

    private getRollFormulaForDie(die:DiceRoll):string {
        if(this._features["exakt"]){
            this._features["exakt"].active = true;
            let temp = die.nDice + this._features["exakt"].value
            return `${temp}d${die.nFaces}kh${die.nDice}`;

        }
        return `${die.nDice}d${die.nFaces}`
    }

    #modifyResultForScharfFeature(roll:Roll):Roll {
        if (this._features["scharf"]) {
            let scharfBonus = 0;
            roll.terms.filter(isDie).forEach(die => {
                die.results.forEach(r => {
                    if (r.active) {
                        if (r.result < this._features["scharf"].value) {
                            this._features["scharf"].active = true;
                            scharfBonus += this._features["scharf"].value - r.result;
                        }
                    }
                });
            });
            roll._total += scharfBonus;
        }
        return roll;
    }

    #modifyResultForKritischFeature(roll:Roll):Roll {
        if (this._features["kritisch"]) {
            let kritischBonus = 0;
            roll.terms.filter(isDie).forEach(die => {
                die.results.forEach(r => {
                    if (r.active) {
                        if (r.result === die.faces) {
                            this._features["kritisch"].active = true;
                            kritischBonus += this._features["kritisch"].value;
                        }
                    }
                });
            });
            roll._total += kritischBonus;
        }
        return roll;
    }

    getDamageFormula() {
        let damageFormula = `${this._mainDie.nDice}W${this._mainDie.nFaces}`;
        const sign = this.#getSign(this._damageModifier);
        if (this._damageModifier) {
            damageFormula += `${sign}${Math.abs(this._damageModifier)}`
        }
        if(this._otherDice.length > 0){
            damageFormula += "+?"
        }
        return damageFormula;
    }

    #getSign(num:number):string {
        return num >= 0 ? "+" : "-";
    }

    getFeatureString():string {
        return Object.keys(this._features).map(key => `${this._features[key].name} ${this._features[key].value}`).join(", ");
    }

    toObject():DamageRollObjectType {
        return {
            nDice: this._mainDie.nDice,
            nFaces: this._mainDie.nFaces,
            damageModifier: this._damageModifier,
            features: this._features,
            otherDice: this._otherDice
        }
    }
}

function parseFeatureString(featureString:string):Record<string,Feature> {
    const features:Record<string,Feature> = {};
    featureString.split(',').forEach(feat => {
        let temp = /([^0-9 ]+)\s*([0-9]*)/.exec(feat.trim());
        if (temp && temp[1]) {
            features[temp[1].toLowerCase()] = {
                name: temp[1],
                value: parseInt(temp[2]) || 1,
                active: false
            };
        }
    });
    return features;
}

function parseDamageString(damageString:string){
    const sanitizedFormula = sanitizeDamageString(damageString)
    const terms = getStringSegments(sanitizedFormula);
    const firstDieTerm = parseDie(terms.firstDie);
    //dice other than 6 or 10 faced do not occur in damage calculation
    if (![0, 6, 10].includes(firstDieTerm.nFaces)) {
        console.warn(`Discarded damage string ${damageString}, because it uses dice with an invalid number of faces.`)
        return {nDice: 0, nFaces: 0, damageModifier: 0}
    }
    return {...firstDieTerm, damageModifier: parseModifiers(terms.modifiers), otherDice: terms.otherDice.map(parseDie)};
}

function sanitizeDamageString(damageString:string):string {
    return damageString.toLowerCase()
        .replace(/\s/g, "")
        .replace(/w/g, "d")
        .replace(/_/g, "");
}

function getStringSegments(damageString:string) {
    const pattern = /([+-]?\d*d\d+|[+-]\d+)/g;
    const terms = damageString.match(pattern);
    const segmentedTerms = {firstDie: "0d0", otherDice: [] as string[], modifiers: [] as string[]}
    if (!Array.isArray(terms)) {
        return segmentedTerms
    }
    let firstDieFound = false;
    for (const term of terms) {
        if (term.includes("d") && !firstDieFound) {
            firstDieFound = true;
            segmentedTerms.firstDie = term;
        } else if (term.includes("d")) {
            segmentedTerms.otherDice.push(term)
        } else {
            segmentedTerms.modifiers.push(term)
        }
    }
    return segmentedTerms;
}

function parseDie(dieTerm:string): DiceRoll{
    //throwing more than 999 dice is not supported by Foundry V12.
    const diceTermPattern = /(?<sign>[+-])?(?<ndice>\d{0,999})d(?<nfaces>\d+)/
    const parsedTerm = diceTermPattern.exec(dieTerm);
    return {
        sign: parsedTerm?.groups?.sign === '-' ? -1 : 1,
        nDice: parseInt(parsedTerm?.groups?.ndice ?? '0'),
        nFaces: parseInt(parsedTerm?.groups?.nfaces ?? '0')
    }
}


function parseModifiers(modifierTerms:string[]):number {
    function isANumber(modifier:number, index:number) {
        if (isNaN(modifier)) {
            console.warn(`Discarded flat damage term ${modifierTerms[index]}, because it could not be parsed`)
            return false;
        } else {
            return true;
        }
    }

    return modifierTerms
        .map(term => parseInt(term))
        .filter(isANumber)
        .reduce((a, b) => a + b, 0);
}

function isDie(term: Roll["terms"][number]): term is Die{
   return "results" in term && "faces" in term;
}

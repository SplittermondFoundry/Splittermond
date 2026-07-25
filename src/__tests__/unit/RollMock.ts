import { Die, FoundryRoll, NumericTerm, OperatorTerm, ParentheticTerm, RollTerm } from "module/api/Roll";
import { foundryApi } from "module/api/foundryApi";
import sinon, { SinonSandbox } from "sinon";

// roll.mock.ts
class MockDie implements Die {
    modifiers: string[] = [];

    constructor(
        public number: number,
        public faces: number,
        public results: Array<{ active: boolean; result: number }>,
        public _evaluated = false
    ) {}

    get formula() {
        return `${this.number}d${this.faces}${this.modifiers.join("")}`;
    }
    get total() {
        return this.results.filter((r) => r.active).reduce((a, b) => a + b.result, 0);
    }
}

export class MockOperatorTerm implements OperatorTerm {
    constructor(
        public operator: string,
        public _evaluated = false
    ) {}

    get formula() {
        return this.operator;
    }
}

export class MockNumericTerm implements NumericTerm {
    constructor(
        public number: number,
        public _evaluated = false
    ) {}

    get total() {
        return this.number;
    }

    get expression() {
        return `${this.number}`;
    }

    get formula() {
        return this.expression;
    }
}

function cloneTerm(term: Die | OperatorTerm | NumericTerm): Die | OperatorTerm | NumericTerm {
    if ("faces" in term) {
        return new MockDie(
            term.number,
            term.faces,
            term.results.map((r) => ({ ...r })),
            term._evaluated
        );
    } else if ("operator" in term) {
        return new MockOperatorTerm(term.operator, term._evaluated);
    } else {
        return new MockNumericTerm(term.number, term._evaluated);
    }
}

export class MockRoll implements FoundryRoll {
    /**@internal*/ _evaluated: boolean;
    /**@internal*/ _total: number;
    private _formula: string;
    /**@internal*/ _termsComplete: boolean;
    terms: Array<Die | OperatorTerm | NumericTerm>;
    dice: Die[];

    constructor(formula: string) {
        this._evaluated = false;
        this._total = 0;
        this._formula = formula;
        this._termsComplete = false;
        this.terms = [];
        this.dice = [];

        // Simple formula parsing for common cases: only fully match NdN(+M) or NdN(-M)
        const match = formula.replace(/ /g, "").match(/^(\d+)d(\d+)([+-]\d+)?$/);
        if (match) {
            const diceCount = parseInt(match[1]);
            const faces = parseInt(match[2]);
            const modifier = match[3] ? parseInt(match[3]) : null;

            // Create dice terms
            const dieResults = Array.from({ length: diceCount }, () => ({
                active: true,
                result: Math.floor(Math.random() * faces) + 1,
            }));

            const die = new MockDie(diceCount, faces, dieResults);
            this.terms.push(die);
            this.dice.push(die);

            if (modifier !== null) {
                this.terms.push(
                    new MockOperatorTerm(modifier > 0 ? "+" : "-"),
                    new MockNumericTerm(Math.abs(modifier))
                );
            }
            this._termsComplete = true;
        } else {
            // Partial parse: extract the first die term for formulas with @ placeholders
            const partialMatch = formula.replace(/ /g, "").match(/(\d+)d(\d+)/);
            if (partialMatch) {
                const diceCount = parseInt(partialMatch[1]);
                const faces = parseInt(partialMatch[2]);
                const dieResults = Array.from({ length: diceCount }, () => ({
                    active: true,
                    result: Math.floor(Math.random() * faces) + 1,
                }));
                const die = new MockDie(diceCount, faces, dieResults);
                this.terms.push(die);
                this.dice.push(die);
            }
        }
    }

    get formula(): string {
        return this._termsComplete ? this.terms.map((t) => t.formula).join(" ") : this._formula;
    }

    set formula(value: string) {
        this._formula = value;
    }

    resetFormula() {
        this._formula = this.terms.map((t) => t.formula).join(" ");
    }

    get result(): string {
        return this.terms
            .map((term) => {
                if ("results" in term) return term.results.map((r) => r.result).join(" + ");
                if ("operator" in term) return term.operator;
                return term.number.toString();
            })
            .join(" ");
    }

    get total(): number {
        return this._evaluated ? this._total : 0;
    }

    static validate(formula: string) {
        return /^\d+d\d+\s*(?:[+-]\s*\d+)?$/.test(formula);
    }

    async evaluate(): Promise<MockRoll> {
        return Promise.resolve(this.evaluateSync());
    }

    get isDeterministic() {
        return !this.terms.some((t) => t instanceof MockDie);
    }

    evaluateSync() {
        if (!this._evaluated) {
            this._total = this.terms.reduce((sum, term) => {
                if ("results" in term) {
                    return sum + term.results.reduce((dSum, r) => dSum + r.result, 0);
                }
                if ("number" in term) {
                    return sum + term.number;
                }
                return sum;
            }, 0);

            this._evaluated = true;
            this.terms.forEach((term) => (term._evaluated = true));
        }
        return this;
    }

    clone() {
        const roll = new MockRoll(this.formula);
        roll.terms = this.terms.map(cloneTerm);
        roll.dice = roll.terms.filter((term): term is Die => "faces" in term);
        roll._total = this._total;
        roll._evaluated = this._evaluated;
        roll._termsComplete = this._termsComplete;
        roll.resetFormula();
        return roll;
    }

    async getTooltip(): Promise<string> {
        return `<div class="dice-tooltip">${this.formula} = ${this.total}</div>`;
    }

    static fromTerms(terms: Array<Die | OperatorTerm | NumericTerm>): MockRoll {
        const formula = terms
            .map((term) => {
                if ("faces" in term) return `${term.number}d${term.faces}`;
                if ("operator" in term) return term.operator;
                return term.number.toString();
            })
            .join(" ");
        const roll = new MockRoll(formula);
        roll.terms = terms;
        roll.dice = terms.filter((term) => "faces" in term);
        roll._termsComplete = true;
        return roll;
    }
}

// Test utility functions
export function createTestRoll(
    formula: `${number}d${number}` | "",
    results: number[],
    modifier: number | null = null
): FoundryRoll {
    const terms: Array<Die | OperatorTerm | NumericTerm> = [];
    const dice: Die[] = [];
    let pushedDie = false;

    if (results.length > 0) {
        pushedDie = true;
        const die = new MockDie(
            results.length,
            parseInt(/(?<=d)\d+/.exec(formula)![0]),
            results.map((result) => ({ active: true, result })),
            true
        );
        terms.push(die);
        dice.push(die);
    }

    if (modifier !== null) {
        if (pushedDie) {
            terms.push(new MockOperatorTerm(modifier > 0 ? "+" : "-"));
        }
        terms.push(new MockNumericTerm(Math.abs(modifier)));
    }

    const roll = new MockRoll(formula);
    roll.terms = terms;
    roll.dice = dice;
    roll._total = results.reduce((a, b) => a + b, 0) + (modifier ?? 0);
    roll._evaluated = true;
    roll._termsComplete = true;

    return roll;
}

// Sinon stub setup helper
export function stubFoundryRoll(rollInstance: FoundryRoll, sandbox: SinonSandbox = sinon) {
    //handle case where roll is already stubbed (e.g. by stubRollApi)
    if ("restore" in foundryApi.roll && typeof (foundryApi.roll as any).restore === "function") {
        (foundryApi.roll as any).restore();
    }
    return sandbox.stub(foundryApi, "roll").returns(rollInstance);
}

export function stubRollApi(sandbox: SinonSandbox = sinon) {
    const rollStub = sandbox
        .stub(foundryApi, "roll")
        .callsFake((str) => (/^\s*\d+\s*$/.test(str) ? createTestRoll("", [], parseInt(str)) : new MockRoll(str)));
    const infraStub = sandbox.stub(foundryApi, "rollInfra").get(() => {
        return {
            validate: sandbox.stub().callsFake((formula) => MockRoll.validate(formula)),
            rollFromTerms(terms: Exclude<RollTerm, ParentheticTerm>[]): FoundryRoll {
                return MockRoll.fromTerms(terms);
            },
            plusTerm(): OperatorTerm {
                return new MockOperatorTerm("+");
            },
            minusTerm(): OperatorTerm {
                return new MockOperatorTerm("-");
            },
            numericTerm(number: number): NumericTerm {
                return new MockNumericTerm(number);
            },
        };
    });
    return { rollStub, infraStub };
}

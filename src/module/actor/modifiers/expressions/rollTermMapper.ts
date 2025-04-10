import {FoundryRoll, isRoll, OperatorTerm, RollTerm} from "../../../api/Roll";
import {
    AmountExpression,
    dividedBy,
    Expression,
    minus,
    plus,
    RollExpression,
    times
} from "./definitions";
import {exhaustiveMatchGuard} from "./util";
import {foundryApi} from "../../../api/foundryApi";

type NoOperatorTerm = Exclude<RollTerm, OperatorTerm>;

export function mapRoll(roll:FoundryRoll):Expression {
    const terms = groupTermsByOperator(roll.terms);
    const termIterator = terms[Symbol.iterator]()
    let leftTerm=termIterator.next();
    if(leftTerm.done || isOperator(leftTerm.value)){
       throw new Error("Foundry Roll appears invalid, cannot map to expression");
    }
    let leftExpression:Expression=termToExpression(asNoOperator(leftTerm.value));
    while(true){
        const operator = termIterator.next();
        const rightTerm = termIterator.next();

        if(operator.done && rightTerm.done){
            return leftExpression;
        }else if(operator.done || rightTerm.done){
            throw new Error("Not enough terms to be a correct roll formula")
        }else if (asOperator(operator.value).operator === "+"){
            leftExpression = plus(leftExpression, termToExpression(asNoOperator(rightTerm.value)));
        }else if (asOperator(operator.value).operator === "-"){
            leftExpression = minus(leftExpression, termToExpression(asNoOperator(rightTerm.value)));
        }else if (asOperator(operator.value).operator === "*"){
            leftExpression = times(leftExpression, termToExpression(asNoOperator(rightTerm.value)));
        }else if (asOperator(operator.value).operator === "/"){
            leftExpression = dividedBy(leftExpression, termToExpression(asNoOperator(rightTerm.value)));
        }
    }
}

function groupTermsByOperator(terms:RollTerm[]):RollTerm[] {
    const operators = terms.filter(isOperator);
    if (operators.length <= 1 || operators.every(t => ["*","/"].includes(t.operator))){
        return terms;
    }

    const termIterator = terms[Symbol.iterator]()
    let leftTerm = termIterator.next();
    if (leftTerm.done || isOperator(leftTerm.value)) {
        throw new Error("Foundry Roll appears invalid, cannot map to expression");
    }
    let groupedTerms:RollTerm[] = [leftTerm.value]
    while (true) {
        const operator = termIterator.next();
        const rightTerm = termIterator.next();

        if (operator.done && rightTerm.done) {
            return groupedTerms;
        } else if (operator.done || rightTerm.done) {
            throw new Error("Not enough terms to be a correct roll formula")
        } else if (["*", "/"].includes(asOperator(operator.value).operator)) {
            const lastTerm = groupedTerms.pop()!;/*array cannot be empty here*/
            const newRoll = foundryApi.rollInfra.rollFromTerms([lastTerm, operator.value, rightTerm.value]);
            const hierarchicalTerm = {
                roll: newRoll,
                _evaluated: newRoll._evaluated
            }
            groupedTerms.push(hierarchicalTerm);
        }else{
            groupedTerms.push(operator.value,rightTerm.value)
        }
    }
}
function asOperator(term:RollTerm):OperatorTerm {
    if(isOperator(term)){
       return term;
    } else{
        throw new Error(`Expected ${term} to be an operator but it was not`)
    }
}

function asNoOperator(term:RollTerm):NoOperatorTerm {
    if(!isOperator(term)){
        return term;
    } else{
        throw new Error(`Expected ${term} not to be an operator but it was`)
    }

}

function isOperator(term:RollTerm):term is OperatorTerm{
    return ("operator" in term);
}

function termToExpression(term:NoOperatorTerm):Expression {
    if("faces" in term){
        return new RollExpression(foundryApi.rollInfra.rollFromTerms([term]));
    } else if ("number" in term){
        return new AmountExpression(term.number);
    } else if ("roll" in term){
        if(!isRoll(term.roll)){
            throw new Error("Found a term with a roll expression that was not a parenthetic expression")
        }
        return mapRoll(term.roll);
    }
    exhaustiveMatchGuard(term);
}
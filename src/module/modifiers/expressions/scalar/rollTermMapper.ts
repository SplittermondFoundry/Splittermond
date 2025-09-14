import {FoundryRoll, isRoll, OperatorTerm, RollTerm} from "module/api/Roll";
import {AmountExpression, dividedBy, Expression, minus, plus, RollExpression, times} from "./definitions";
import {foundryApi} from "module/api/foundryApi";

type NoOperatorTerm = Exclude<RollTerm, OperatorTerm>;

export function mapRoll(roll:FoundryRoll):Expression {
    //counting from the right produces an order of operations with whicht the most common roll expression 1d6+ 2+3 can be easily condensed.
    //also copy all terms, because we don't want an in-place reversal
    const terms = [...groupTermsByOperator(roll.terms)].reverse();
    const termIterator = terms[Symbol.iterator]()
    let rightTerm=termIterator.next();
    if(rightTerm.done || isOperator(rightTerm.value)){
       throw new Error(`Foundry Roll ${roll.formula} appears invalid, cannot map to expression`);
    }
    let rightExpression:Expression=termToExpression(asNoOperator(rightTerm.value));
    while(true){
        const operator = termIterator.next();
        const leftTerm = termIterator.next();

        if(operator.done && leftTerm.done){
            return rightExpression;
        }else if(operator.done || leftTerm.done){
            throw new Error("Not enough terms to be a correct roll formula")
        }else if (asOperator(operator.value).operator === "+"){
            rightExpression = plus(termToExpression(asNoOperator(leftTerm.value)),rightExpression);
        }else if (asOperator(operator.value).operator === "-"){
            rightExpression = minus(termToExpression(asNoOperator(leftTerm.value)),rightExpression);
        }else if (asOperator(operator.value).operator === "*"){
            rightExpression = times(termToExpression(asNoOperator(leftTerm.value)), rightExpression);
        }else if (asOperator(operator.value).operator === "/"){
            rightExpression = dividedBy(termToExpression(asNoOperator(leftTerm.value)),rightExpression);
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
    } else {
        console.debug(`Splittermond | Found an unknown term ${(term as any)?.formula ?? term} while mapping to expression.`)
        return new RollExpression(foundryApi.rollInfra.rollFromTerms([term]));
    }
}
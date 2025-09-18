import { foundryApi } from "../api/foundryApi.ts";

export class TooltipFormula {
    constructor() {
        this.parts = [];
    }

    /**
     * @param {{value: string, description:string, classes?:string}[]} parts
     * @param {string} joinedByOperator
     */
    addParts(parts, joinedByOperator) {
        parts.forEach((part, index) => {
            this.addPart(part.value, part.description, part.classes);
            if (index !== parts.length - 1) {
                //add an operator for all but the last attribute
                this.addOperator(joinedByOperator);
            }
        });
    }

    addPart(value, description, classes) {
        const splitClassInput = classes ? classes.split(" ") : [];
        const partClasses = ["formula-part"];
        partClasses.push(...splitClassInput);
        this.parts.push({
            type: "part",
            classes: partClasses,
            value: `${value ?? ""}`,
            description: description ?? null,
        });
    }

    addOperator(operator) {
        this.parts.push({
            type: "operator",
            classes: ["operator"],
            value: operator,
        });
    }

    addMalus(value, description) {
        const strippedValue = preventOperatorDuplication("-", value);
        this.addOperator("-");
        this.addPart(strippedValue, description, "malus");
    }

    addBonus(value, description) {
        const strippedValue = preventOperatorDuplication("+", value);
        this.addOperator("+");
        this.addPart(strippedValue, description, "bonus");
    }

    /**
     * @returns {{classes: string, description: string, type: string, value: string}[]}
     */
    getData() {
        return this.parts.map((p) => ({
            type: `${p.type}`,
            classes: p.classes.join(" "),
            value: p.value ? foundryApi.localize(`${p.value}`) : "",
            description: p.description ? foundryApi.localize(`${p.description}`) : "",
        }));
    }

    render() {
        let result = `<span class="formula">`;
        this.getData().forEach((part) => {
            if (part.type === "part") {
                result += `<span class="${part.classes}"><span class="value">${part.value}</span>
                <span class="description">${part.description}</span></span>`;
            } else if (part.type === `${part.classes}`) {
                result += `<span class="operator">${part.value}</span>`;
            }
        });
        result += "</span>";
        return result;
    }
}

/**
 * For some weird reason, we allow modifiers to add an additional bonus and malus prefix
 * This may lead to ugly duplication. Since I don't know, what it was good for and if there is any
 * edge case where they are actually helpful, I'll remove it with this method.
 * @param {string} operator
 * @param {string|*}value
 * @return {string}
 */
function preventOperatorDuplication(operator, value) {
    if (typeof value === "string" && new RegExp(`^\\s*[${operator}]`).test(value)) {
        return value.trim().replace(operator, "");
    } else {
        return value;
    }
}

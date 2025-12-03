import { Cost } from "./Cost";

export function parseCostString(cost: string, asStrict = false): Cost {
    const costString = formatCostInput(cost);
    if (!costString || typeof costString !== "string") {
        return new Cost(0, 0, false, asStrict);
    }

    const costDataRaw = /^\s*([+-])?(k)?(0*[1-9][0-9]*)(?:v(0*[1-9][0-9]*))?\s*$/.exec(costString.toLowerCase());
    if (!costDataRaw) {
        return new Cost(0, 0, false, asStrict);
    }
    const rawConsumed = parseInt(costDataRaw[4]) || 0;
    const rawNonConsumed = parseInt(costDataRaw[3]) || 0;
    if (rawConsumed > rawNonConsumed) {
        return new Cost(0, 0, false, asStrict);
    }
    const isNegative = costDataRaw && costDataRaw[1] === "-";
    const isChanneled = costDataRaw[2] === "k";
    const sign = isNegative ? -1 : 1;
    return new Cost(sign * (rawNonConsumed - rawConsumed), sign * rawConsumed, isChanneled, asStrict);
}

function formatCostInput(str: string) {
    if (!str || typeof str !== "string") {
        return "";
    }
    let strParts = str?.split("/");
    if (strParts.length > 1) {
        return strParts[1]; //parsing Enhanced cost string
    } else {
        return strParts[0];
    }
}

export function parseSpellEnhancementDegreesOfSuccess(costString: string): number {
    const enhancementCostString = /([0-9]+)(?=\s*[Ee][Gg])/.exec(costString);
    if (enhancementCostString) {
        return parseInt(enhancementCostString[0]);
    } else {
        return 0;
    }
}

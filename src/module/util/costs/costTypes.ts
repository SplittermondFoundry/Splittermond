import {Cost, CostModifier} from "./Cost";
import {PrimaryCost} from "./PrimaryCost";
import {fieldExtensions, SplittermondDataModel} from "../../data/SplittermondDataModel";

export const costTypes = ['K', 'V', ''] as const;
export function isCostType(value: string): value is CostType {
    return costTypes.includes(value as CostType);
}
export type CostType = typeof costTypes[number];

export class CostBase extends SplittermondDataModel<{ costType: CostType }> {

    static create(costType: CostType): CostBase {
        return new CostBase({costType});
    }

    static defineSchema() {
        return {
            costType: new fieldExtensions.StringEnumField({
                required: true,
                nullable: false,
                blank: false,
                validate: (x:CostType) => costTypes.includes(x)
            })
        };
    }


    add(cost:CostModifier):PrimaryCost {
        return toCost(this.costType).subtract(toCost(this.costType).toModifier(true)).add(cost);
    }
    multiply(factor:number):CostModifier{
        return toCost(this.costType).toModifier(true).multiply(factor);
    }

}

function toCost(costType: CostType): PrimaryCost {
    switch (costType) {
        case 'K':
            return new Cost(1, 0, true, true).asPrimaryCost()
        case 'V':
            return new Cost(0, 1, false, true).asPrimaryCost()
        case "":
            return new Cost(1, 0, false, true).asPrimaryCost();
    }
}


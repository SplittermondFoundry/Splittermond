import {CostModifier} from "../util/costs/Cost";
import {parseCostString} from "../util/costs/costParser";

/**
 * Will only accept a `never` type thus making the compiler fail if a switch of if statement is not exhaustive
 */
export function exhaustiveMatchGuard<T extends never>(remainder:T):never{
    throw new Error(`Exhaustive switches did not exhaust all options: Remaining for option '${remainder}'`);
}

export class PropertyResolver {
    numberOrNull(propertyPath: string | null | undefined, source: object): number | null {
        const value = this.resolve(propertyPath, source);
        if (typeof value === "number") {
            return value;
        }
        return null;
    }

    costModifier(propertyPath: string | null | undefined, source: object): CostModifier {
        const value = this.resolve(propertyPath, source);
        if (typeof value === "string") {
            return parseCostString(value).asModifier();
        }
        return CostModifier.zero

    }

    resolve(propertyPath: string | null | undefined, source: object): unknown {
        if (!propertyPath) {
            return source;
        }

        const individualParts = propertyPath.split(".");
        let current: unknown = source;
        for (const part of individualParts) {
            if (this.hasPart(current, part)) {
                const compilerDeconfuser:Record<string,unknown> =current;
                current = compilerDeconfuser[part]
            } else {
                return undefined;
            }
        }
        return current;
    }
    private hasPart(current: unknown, part: string): current is Record<string,unknown> {
        return current !== null && typeof current === "object" && part in current;
    }
}

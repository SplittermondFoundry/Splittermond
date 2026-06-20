import { FoundryRoll } from "module/api/Roll";

export class RollExpression {
    constructor(public readonly value: FoundryRoll) {}

    async evaluate(): Promise<number> {
        const evaluated = await this.value.clone().evaluate();
        return evaluated.total;
    }
}

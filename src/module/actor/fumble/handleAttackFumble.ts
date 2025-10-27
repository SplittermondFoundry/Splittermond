import type SplittermondActor from "module/actor/actor";
import { splittermond } from "module/config";
import { foundryApi } from "module/api/foundryApi";
import { FumbleHandler } from "module/actor/fumble/FumbleHandler";

export async function rollAttackFumble(actor: SplittermondActor) {
    return attackFumbleHandler.handleFumble(actor, { eg: 0, costs: "0", lowerFumbleResult: 0 });
}

const attackFumbleHandler = new (class extends FumbleHandler {
    constructor() {
        super("splittermond.attackFumble", splittermond.fumbleTable.fight);
    }

    getRoll() {
        return foundryApi.roll(`2d10`).evaluate();
    }
})();

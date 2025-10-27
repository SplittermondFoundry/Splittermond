import type SplittermondActor from "module/actor/actor";
import { splittermond } from "module/config";
import { FumbleDialog } from "module/actor/fumble/MagicFumbleDialog";
import type { ConfirmedFumbledCheckData, FumbledCheckData, FumbleDialogResult } from "module/actor/fumble/DataTypes";
import { FumbleHandler } from "module/actor/fumble/FumbleHandler";
import { foundryApi } from "module/api/foundryApi";

export async function rollMagicFumble(actor: SplittermondActor, data: FumbledCheckData) {
    let { eg, skill } = data;
    const isPriest = !!actor.findItem().withType("strength").withName("priester");
    const lowerFumbleResult = actor.modifier
        .getForId("lowerfumbleresult")
        .notSelectable()
        .withAttributeValuesOrAbsent("skill", skill)
        .getModifiers().sum;

    const confirmedData = await enrichFumbleData({ ...data, eg: Math.abs(eg) }, lowerFumbleResult, isPriest);
    const handler = isPriest ? priestFumbleHandler : sorcererFumbleHandler;
    return handler.handleFumble(actor, confirmedData);
}

async function askUser(data: FumbledCheckData, lowerFumbleResult: number, isPriest: boolean) {
    return new Promise<FumbleDialogResult>(async (resolve, reject) => {
        const dialog = new FumbleDialog(resolve, reject, { ...data, lowerFumbleResult, isPriest });
        await dialog.render({ force: true });
    });
}

async function enrichFumbleData(
    data: FumbledCheckData,
    lowerFumbleResult: number,
    isPriest: boolean
): Promise<ConfirmedFumbledCheckData> {
    const baseData = data.askUser ? await askUser(data, lowerFumbleResult, isPriest) : { ...data, lowerFumbleResult };
    return {
        eg: baseData.eg,
        costs: baseData.costs,
        lowerFumbleResult: baseData.lowerFumbleResult,
    };
}

function magicFumbleRoll(eg: number, totalCosts: number) {
    const egLabel = foundryApi.localize("splittermond.degreeOfSuccessAbbrev");
    const costsLabel = foundryApi.localize("splittermond.focusCosts");
    return foundryApi
        .roll(`2d10+@eg[${egLabel}]*@costs[${costsLabel}]`, {
            eg: `${eg}`,
            costs: `${totalCosts}`,
        })
        .evaluate();
}

const priestFumbleHandler = new (class extends FumbleHandler {
    constructor() {
        super("splittermond.magicFumblePriest", splittermond.fumbleTable.magic.priest);
    }

    getRoll = magicFumbleRoll;
})();

const sorcererFumbleHandler = new (class extends FumbleHandler {
    constructor() {
        super("splittermond.magicFumbleSorcerer", splittermond.fumbleTable.magic.sorcerer);
    }

    getRoll = magicFumbleRoll;
})();

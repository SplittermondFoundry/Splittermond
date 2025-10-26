import { foundryApi } from "module/api/foundryApi";
import type SplittermondActor from "module/actor/actor";
import { parseCostString } from "module/util/costs/costParser";
import { IllegalStateException } from "module/data/exceptions";
import { splittermond } from "module/config";
import { FumbleDialog } from "module/actor/fumble/MagicFumbleDialog";
import type { ConfirmedFumbledCheckData, FumbledCheckData, FumbleDialogResult } from "module/actor/fumble/DataTypes";

export async function rollMagicFumble(actor: SplittermondActor, data: FumbledCheckData) {
    let { eg, skill } = data;
    const isPriest = !!actor.findItem().withType("strength").withName("priester");
    const lowerFumbleResult = actor.modifier
        .getForId("lowerfumbleresult")
        .notSelectable()
        .withAttributeValuesOrAbsent("skill", skill)
        .getModifiers().sum;

    const confirmedData = await enrichFumbleData({ ...data, eg: Math.abs(eg) }, lowerFumbleResult, isPriest);
    return handleFumble(actor, confirmedData);
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
        ...baseData,
        rollTable: isPriest ? splittermond.fumbleTable.magic.priest : splittermond.fumbleTable.magic.sorcerer,
    };
}

async function handleFumble(actor: SplittermondActor, fumbleData: ConfirmedFumbledCheckData) {
    const rollTable = fumbleData.rollTable;
    let eg = fumbleData.eg;
    let lowerFumbleResult = Math.abs(fumbleData.lowerFumbleResult);
    const parsedCosts = parseCostString(fumbleData.costs).asPrimaryCost();
    const totalCosts = (parsedCosts.isChanneled ? parsedCosts.channeled : parsedCosts.exhausted) + parsedCosts.consumed;

    let roll = await foundryApi
        .roll(
            `2d10+@eg[${foundryApi.localize("splittermond.degreeOfSuccessAbbrev")}]*@costs[${foundryApi.localize("splittermond.focusCosts")}]`,
            {
                eg: `${eg}`,
                costs: `${totalCosts}`,
            }
        )
        .evaluate();

    let result = rollTable.find((el) => el.min <= roll.total && el.max >= roll.total);
    if (!result) {
        throw new IllegalStateException("No fumble table result found for roll total: " + roll.total);
    }
    let index = rollTable.indexOf(result);

    if (lowerFumbleResult) {
        index = Math.max(index - lowerFumbleResult, 0);
        result = rollTable[index];
    }

    let data: Record<string, any> = {};
    data.roll = roll;
    data.title = foundryApi.localize("splittermond.magicFumble");
    data.rollType = roll.formula;
    data.img = "";
    data.degreeOfSuccessDescription = `<div class="fumble-table-result">`;
    rollTable.forEach((el) => {
        if (el === result) {
            data.degreeOfSuccessDescription += `<div class="fumble-table-result-item fumble-table-result-item-active"><div class="fumble-table-result-item-range">${el.min}&ndash;${el.max}</div>${foundryApi.localize(el.text)}</div>`;
        } else {
            data.degreeOfSuccessDescription += `<div class="fumble-table-result-item"><div class="fumble-table-result-item-range">${el.min}&ndash;${el.max}</div>${foundryApi.localize(el.text)}</div>`;
        }
    });
    data.degreeOfSuccessDescription += `</div>`;
    if (lowerFumbleResult) {
        data.degreeOfSuccessDescription =
            `${lowerFumbleResult} ${foundryApi.localize("splittermond.lowerFumbleResultChat")}` +
            data.degreeOfSuccessDescription;
    }

    let templateContext = {
        ...data,
        tooltip: await data.roll.getTooltip(),
    };

    let chatData = {
        user: foundryApi.currentUser.id,
        speaker: foundryApi.getSpeaker({ actor }),
        rolls: [roll],
        content: await foundryApi.renderer("systems/splittermond/templates/chat/skill-check.hbs", templateContext),
        type: foundryApi.chatMessageTypes.OTHER,
    };

    return foundryApi.createChatMessage(chatData);
}

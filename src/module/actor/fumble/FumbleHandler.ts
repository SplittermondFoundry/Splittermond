import type { FoundryRoll } from "module/api/Roll";
import type SplittermondActor from "module/actor/actor";
import { IllegalStateException } from "module/data/exceptions";
import { foundryApi } from "module/api/foundryApi";
import { parseCostString } from "module/util/costs/costParser";
import type { ConfirmedFumbledCheckData } from "module/actor/fumble/DataTypes";
import { TEMPLATE_BASE_PATH } from "module/data/SplittermondApplication";

interface RollTableEntry {
    min: number;
    max: number;
    text: string;
}
export abstract class FumbleHandler {
    protected constructor(
        private titleKey: string,
        private rollTable: Array<RollTableEntry>
    ) {}

    abstract getRoll(eg: number, totalCosts: number, lowerFumbleResult: number): Promise<FoundryRoll>;

    async handleFumble(actor: SplittermondActor, fumbleData: ConfirmedFumbledCheckData) {
        const rollTable = this.rollTable;
        const eg = Math.abs(fumbleData.eg);
        let lowerFumbleResult = Math.abs(fumbleData.lowerFumbleResult);
        const totalCosts = this.calculateTotalCosts(fumbleData.costs);

        let roll = await this.getRoll(eg, totalCosts, lowerFumbleResult);

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
        data.title = this.titleKey;
        data.rollType = roll.formula;
        data.img = "";
        data.degreeOfSuccessDescription = `<div class="fumble-table-result">`;
        rollTable.forEach((el) => {
            data.degreeOfSuccessDescription += `<div class="fumble-table-result-item${el === result ? " fumble-table-result-item-active" : ""}"><div class="fumble-table-result-item-range">${el.min}&ndash;${el.max}</div>${foundryApi.localize(el.text)}</div>`;
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
            content: await foundryApi.renderer(`${TEMPLATE_BASE_PATH}/chat/skill-check.hbs`, templateContext),
            type: foundryApi.chatMessageTypes.OTHER,
        };

        return foundryApi.createChatMessage(chatData);
    }

    calculateTotalCosts(costString: string) {
        const cost = parseCostString(costString).asPrimaryCost();
        const nonConsumed = cost.isChanneled ? cost.channeled : cost.exhausted;
        return nonConsumed + cost.consumed;
    }
}

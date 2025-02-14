import {SplittermondChatCard} from "../SplittermondChatCard";
import {foundryApi} from "../../../api/foundryApi";
import {DamageEvent, DamageImplement} from "../../damage/DamageEvent";
import {AgentReference} from "../../../data/references/AgentReference";
import {Cost} from "../../costs/Cost";
import {DamageRoll} from "../../damage/DamageRoll";
import {DamageType} from "../../../config/damageTypes";
import {parseFeatureString} from "../../damage/featureParser";
import {DamageMessage} from "./DamageMessage";
import {Roll, sumRolls} from "../../../api/Roll";
import {Speaker} from "../../../api/foundryTypes";

interface ProtoDamageImplement {
    damageFormula: string;
    featureString: string;
    damageSource: string;
    damageType: DamageType
}


export async function singleDamage(damageFormula: string, featureString: string, damageSource = "", speaker: Speaker | null) {
    const singleImplement = {damageFormula, featureString, damageSource, damageType: "physical" as const};
    return initDamage([singleImplement], "V", speaker);
}

export async function initDamage(damages: ProtoDamageImplement[], costType: 'K' | 'V' | "", speaker: Speaker | null) {

    const damageResults = await rollDamages(damages);
    const costVector = toCost(costType);
    const actorReference = resolveActor(speaker);
    const damageEvent = new DamageEvent({
        causer: actorReference,
        costVector,
        formula: damageResults.totalRoll.formula,
        tooltip: await damageResults.totalRoll.getTooltip(),
        implements: damageResults.damageImplements
    });

    return SplittermondChatCard.create(
        actorReference?.getAgent() as any, //TODO: We either need a speaker or allow no speaker
        DamageMessage.initialize(damageEvent),
        {
            type: foundryApi.chatMessageTypes.OTHER,
            whisper: [],
            blind: false,
            rolls: [damageResults.totalRoll]
        }
    );
}

async function rollDamages(damages: ProtoDamageImplement[]) {
    const allRolls: Roll[] = [];
    const damageImplements = await Promise.all(damages.map(async damage => {
        const rollResult = await DamageRoll.parse(damage.damageFormula, damage.featureString).evaluate();
        allRolls.push(rollResult);
        return new DamageImplement({
            damage: rollResult.total,
            formula: damage.damageFormula,
            implementName: damage.damageSource,
            damageExplanation: await rollResult.getTooltip(),
            baseReductionOverride: parseFeatureString(damage.featureString)["Durchdringung"]?.value ?? 0,
            damageType: damage.damageType
        });
    }));
    return {totalRoll: sumRolls(allRolls), damageImplements};
}

function resolveActor(speaker: Speaker | null) {
    const actorId = speaker?.actor;
    const actor = actorId ? foundryApi.getActor(actorId) : null;
    return actor ? AgentReference.initialize(actor) : null;
}


function toCost(damageType: 'K' | 'V' | "") {
    switch (damageType) {
        case 'K':
            return new Cost(1, 0, true, true).asModifier();
        case 'V':
            return new Cost(0, 1, false, true).asModifier();
        case "":
            return new Cost(1, 0, false, true).asModifier();
    }
}
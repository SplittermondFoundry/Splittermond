import {DamageEvent, DamageImplement} from "../../damage/DamageEvent";
import {AgentReference} from "../../../data/references/AgentReference";
import {DamageRoll} from "../../damage/DamageRoll";
import {DamageType} from "../../../config/damageTypes";
import {parseFeatureString} from "../../damage/featureParser";
import {DamageMessage} from "./DamageMessage";
import {Roll, sumRolls} from "../../../api/Roll";
import {DamageFeature} from "../../damage/DamageFeature";
import SplittermondActor from "../../../actor/actor";
import {CostBase, CostType} from "../../costs/costTypes";
import {SplittermondChatCard} from "../SplittermondChatCard";

interface ProtoDamageImplement0 {
    damageFormula: string;
    featureString: string;
    damageSource: string;
    damageType: DamageType|null;
}
export const DamageInitializer ={
    rollDamage,
}

async function rollDamage(damages: ProtoDamageImplement0[], costType: CostType|CostBase, speaker: SplittermondActor| null) {

    const damageResults = await rollDamages(damages);
    const actorReference = speaker ? AgentReference.initialize(speaker) : null;
    const damageEvent = new DamageEvent({
        causer: actorReference,
        _costBase: costType instanceof CostBase? costType : CostBase.create(costType),
        formula: damageResults.totalRoll.formula,
        tooltip: await damageResults.totalRoll.getTooltip(),
        implements: damageResults.damageImplements,
        isGrazingHit: false,
    });

    return SplittermondChatCard.create(
        speaker,
        DamageMessage.initialize(damageEvent,damageResults.features),
        {
            type: "damageMessage",
            whisper: [],
            blind: false,
            rolls: [damageResults.totalRoll]
        }
    );
}

async function rollDamages(damages: ProtoDamageImplement0[]) {
    const allRolls: Roll[] = [];
    const allFeature:DamageFeature[] = [];
    const damageImplements = await Promise.all(damages.map(async damage => {
        const damageRoll = DamageRoll.parse(damage.damageFormula, damage.featureString);
        const rollResult = await damageRoll.evaluate();
        allFeature.push(...Object.values(rollResult.getActiveFeatures()));
        allRolls.push(rollResult.roll);
        return new DamageImplement({
            damage: rollResult.roll.total,
            formula: damage.damageFormula,
            implementName: damage.damageSource,
            damageExplanation: await rollResult.roll.getTooltip(),
            _baseReductionOverride: parseFeatureString(damage.featureString)["durchdringung"]?.value ?? 0,
            damageType: damage.damageType ?? "physical"
        });
    }));
    return {totalRoll: sumRolls(allRolls),features: allFeature, damageImplements};
}


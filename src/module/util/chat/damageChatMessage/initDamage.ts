import { DamageEvent, DamageImplement } from "../../damage/DamageEvent";
import { AgentReference } from "module/data/references/AgentReference";
import { DamageRoll, type EvaluatedDamageRoll } from "../../damage/DamageRoll";
import { DamageType } from "module/config/damageTypes";
import { DamageMessage } from "./DamageMessage";
import { sumRolls } from "module/api/Roll";
import { DamageFeature } from "../../damage/DamageFeature";
import SplittermondActor from "../../../actor/actor";
import { CostBase } from "../../costs/costTypes";
import { SplittermondChatCard } from "../SplittermondChatCard";
import { toDisplayFormula } from "../../damage/util";
import { asString, condense, mapRoll } from "module/modifiers/expressions/scalar";

export const DamageInitializer = {
    rollFromDamageRoll,
};

interface ProtoDamageImplement {
    readonly damageRoll: DamageRoll;
    readonly damageType: DamageType;
    readonly damageSource: string | null;
}
type EvaluatedImplement = Omit<ProtoDamageImplement, "damageRoll"> & { evaluatedRoll: EvaluatedDamageRoll };
class WrappedImplement {
    static from(protoImplement: ProtoDamageImplement) {
        return new WrappedImplement(protoImplement.damageRoll, protoImplement.damageType, protoImplement.damageSource);
    }

    constructor(
        public readonly damageRoll: DamageRoll,
        public readonly damageType: DamageType,
        public readonly source: string | null
    ) {}

    async evaluate() {
        const evaluatedRoll = await this.damageRoll.evaluate();
        return {
            evaluatedRoll: evaluatedRoll,
            damageType: this.damageType,
            damageSource: this.source,
        };
    }
}

class EvaluatedImplements {
    constructor(public readonly damageImplements: EvaluatedImplement[]) {}

    get evaluatedRoll() {
        const rolls = this.damageImplements.map((i) => i.evaluatedRoll).map((d) => d.roll);
        return sumRolls(rolls);
    }

    get features(): DamageFeature[] {
        const featureSet = this.damageImplements
            .map((i) => i.evaluatedRoll)
            .flatMap((d) => d.getActiveFeatures())
            .sort((a, b) => b.value - a.value) //largest value first
            .reduce((acc, val) => acc.add(val), new Set<DamageFeature>());
        return Array.from(featureSet);
    }
}

async function evaluateImplements(damageImplements: ProtoDamageImplement[]) {
    const evaluatedImplements = await Promise.all(
        damageImplements.map((d) => WrappedImplement.from(d)).map((d) => d.evaluate())
    );
    return new EvaluatedImplements(evaluatedImplements);
}

interface DamageRollOptions {
    costBase: CostBase;
    grazingHitPenalty: number;
}

async function rollFromDamageRoll(
    damages: ProtoDamageImplement[],
    damageRollOptions: DamageRollOptions,
    speaker: SplittermondActor | null
) {
    const evaluatedImplements = await evaluateImplements(damages);
    const damageImplements = await mapToDamageImplements(evaluatedImplements);
    const totalRoll = evaluatedImplements.evaluatedRoll;
    const damageEvent = new DamageEvent({
        causer: speaker ? AgentReference.initialize(speaker) : null,
        _costBase: damageRollOptions.costBase,
        formulaToDisplay: toDisplayFormula(asString(condense(mapRoll(totalRoll)))),
        tooltip: await totalRoll.getTooltip(),
        implements: damageImplements,
        grazingHitPenalty: damageRollOptions.grazingHitPenalty,
    });

    return SplittermondChatCard.create(speaker, DamageMessage.initialize(damageEvent, evaluatedImplements.features), {
        type: "damageMessage",
        whisper: [],
        blind: false,
        rolls: [totalRoll],
    });
}
async function mapToDamageImplements(proto: EvaluatedImplements) {
    return Promise.all(proto.damageImplements.map((i) => mapToImplement(i)));
}

async function mapToImplement(proto: EvaluatedImplement) {
    const explanation = await proto.evaluatedRoll.roll.getTooltip();
    return new DamageImplement({
        damage: proto.evaluatedRoll.roll.total,
        formula: proto.evaluatedRoll.roll.formula,
        implementName: proto.damageSource ?? "",
        damageExplanation: explanation,
        _baseReductionOverride: proto.evaluatedRoll.features.featureValue("Durchdringung"),
        damageType: proto.damageType,
    });
}

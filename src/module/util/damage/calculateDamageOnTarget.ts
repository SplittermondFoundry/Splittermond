import SplittermondActor from "../../actor/actor";
import {DamageEvent} from "./DamageEvent";
import {DamageType} from "../../config/damageTypes";
import {CostModifier} from "../costs/Cost";
import {AgentReference} from "../../data/references/AgentReference";
import {PrimaryCost} from "../costs/PrimaryCost";
import {CostBase} from "../costs/costTypes";


export interface UserReporter {
    set target(value: SplittermondActor);

    set totalFromImplements(value: CostModifier);

    set overriddenReduction(value: CostModifier);

    set totalDamage(value: CostModifier);

    set event(event: { causer: AgentReference | null, isGrazingHit: boolean, costBase: CostBase });

    addRecord(implementName: string, damageType: DamageType, baseDamage: CostModifier, appliedDamage: CostModifier): void;
}




export class NoReporter implements UserReporter {
    set target(__: SplittermondActor) {
    }

    set totalFromImplements(__: CostModifier) {
    }

    set overriddenReduction(__: CostModifier) {
    }

    set totalDamage(__: CostModifier) {
    }

    set event(__: { causer: AgentReference | null; isGrazingHit: boolean; costBase: CostBase}) {
    }

    addRecord(): void {
    }
}

export function calculateDamageOnTarget(event: DamageEvent, target: SplittermondActor, reporter: UserReporter = new NoReporter()): PrimaryCost {

    function toCost(value: number) {
        return event.costBase.multiply(value)
    }

    reporter.event = event;
    reporter.target = target;


    let damageBeforeGrazingAndReduction = CostModifier.zero;
    let realizedDamageReductionOverride = CostModifier.zero;

    for (const implement of event.implements) {
        const susceptibility = toCost(target.susceptibilities[implement.damageType]);
        const damageAdded = implement.bruttoHealthCost.add(susceptibility);
        realizedDamageReductionOverride = realizedDamageReductionOverride.add(implement.ignoredReductionCost);
        damageBeforeGrazingAndReduction = damageBeforeGrazingAndReduction.add(damageAdded);
        reporter.addRecord(implement.implementName, implement.damageType, implement.bruttoHealthCost, damageAdded);
    }
    reporter.totalFromImplements = damageBeforeGrazingAndReduction;
    reporter.overriddenReduction = realizedDamageReductionOverride;

    const damageBeforeReduction = damageBeforeGrazingAndReduction.multiply(event.isGrazingHit ? 0.5 : 1);
    const remainingReduction = calculateActualDamageReduction(event, target, realizedDamageReductionOverride);
    const totalDamage = event.costBase.add(damageBeforeReduction.subtract(remainingReduction)).round();
    reporter.totalDamage = totalDamage.toModifier(true);

    return totalDamage;
}

function calculateActualDamageReduction(event: DamageEvent, target: SplittermondActor, realizedDamageReductionOverride: CostModifier) {
    //Base reduction must be be a primary cost, because it must not go below 0. However, we need to convert it to a modifier to apply the damage reduction
    //Therefore, we need to apply the cost type both via cost base and cost vector;
    const baseReduction = event.costBase.add(event.costBase.multiply(target.damageReduction));
    return baseReduction.subtract(realizedDamageReductionOverride).toModifier(true);
}

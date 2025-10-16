import SplittermondActor from "../../actor/actor";
import { DamageEvent, DamageImplement } from "./DamageEvent";
import { DamageType } from "../../config/damageTypes";
import { CostModifier } from "../costs/Cost";
import { AgentReference } from "../../data/references/AgentReference";
import { PrimaryCost } from "../costs/PrimaryCost";
import { CostBase } from "../costs/costTypes";
import { evaluateEventImmunities, evaluateImplementImmunities, Immunity } from "./immunities";

export interface UserReporter {
    set target(value: SplittermondActor);

    set totalFromImplements(value: CostModifier);

    set overriddenReduction(value: CostModifier);

    set totalDamage(value: CostModifier);

    set event(event: { causer: AgentReference | null; grazingHitPenalty: number; costBase: CostBase });

    set immunity(immunity: Immunity | undefined);

    addRecord(
        implementName: string,
        damageType: DamageType,
        baseDamage: CostModifier,
        appliedDamage: CostModifier,
        immunity?: Immunity
    ): void;
}

export class NoReporter implements UserReporter {
    set target(__: SplittermondActor) {}

    set totalFromImplements(__: CostModifier) {}

    set overriddenReduction(__: CostModifier) {}

    set totalDamage(__: CostModifier) {}

    set event(__: { causer: AgentReference | null; grazingHitPenalty: number; costBase: CostBase }) {}

    set immunity(__: Immunity | undefined) {}

    addRecord(): void {}
}

export function calculateDamageOnTarget(
    event: DamageEvent,
    target: SplittermondActor,
    reporter: UserReporter = new NoReporter()
): PrimaryCost {
    reporter.event = event;
    reporter.target = target;

    const damageCalculator = new AddedDamageCalculator(event.costBase, target);
    let damageBeforeGrazingAndReduction = CostModifier.zero;
    let realizedDamageReductionOverride = CostModifier.zero;

    for (const implement of event.implements) {
        const damageAdded = damageCalculator.calculateAddedDamage(implement);
        const immunity = evaluateImplementImmunities(implement, target);
        if (!immunity) {
            realizedDamageReductionOverride = realizedDamageReductionOverride.add(implement.ignoredReductionCost);
            damageBeforeGrazingAndReduction = damageBeforeGrazingAndReduction.add(damageAdded);
        }
        reporter.addRecord(
            implement.implementName,
            implement.damageType,
            implement.bruttoHealthCost,
            damageAdded,
            immunity
        );
    }
    const applicableOverriddenReduction = calculateApplicableOverride(event, target, realizedDamageReductionOverride);
    reporter.totalFromImplements = damageBeforeGrazingAndReduction;
    reporter.overriddenReduction = applicableOverriddenReduction;

    const grazingHitPenalty = event.costBase.multiply(event.grazingHitPenalty);
    const damageBeforeReduction = damageBeforeGrazingAndReduction.subtract(grazingHitPenalty);
    const remainingReduction = calculateActualDamageReduction(event, target, applicableOverriddenReduction);
    const totalDamage = event.costBase.add(damageBeforeReduction.subtract(remainingReduction)).round();
    reporter.totalDamage = totalDamage.toModifier(true);

    const immunity = evaluateEventImmunities(event, target);
    if (immunity) {
        reporter.immunity = immunity;
        return event.costBase.add(CostModifier.zero);
    }
    return totalDamage;
}

class AddedDamageCalculator {
    private remainingReduction: Map<DamageType, CostModifier> = new Map();

    constructor(
        private readonly costBase: CostBase,
        private readonly target: SplittermondActor
    ) {}

    calculateAddedDamage(implement: DamageImplement) {
        const damageAdjustedForWeakness = implement.bruttoHealthCost.multiply(
            Math.pow(2, this.target.weaknesses[implement.damageType])
        );
        //wrap in primary cost to ensure that the damage is not negative
        return this.costBase
            .add(this.getResistanceModifiedDamage(damageAdjustedForWeakness, implement.damageType))
            .round()
            .toModifier(true);
    }

    private getResistanceModifiedDamage(damage: CostModifier, damageType: DamageType) {
        const resistance = this.getResistance(damageType);
        const adjustedDamage = damage.subtract(resistance);
        this.remainingReduction.set(damageType, this.costBase.add(adjustedDamage.negate()).toModifier(true));
        return adjustedDamage;
    }

    private getResistance(damageType: DamageType): CostModifier {
        if (this.remainingReduction.has(damageType)) {
            console.warn(
                "Splittermond | Registered multiple damage sources of the same type. This is not intended. Calculation will proceed correctly, but reporting might look weird."
            );
            return this.remainingReduction.get(damageType)!;
        } else {
            return this.costBase.multiply(this.target.resistances[damageType]);
        }
    }
}

function calculateApplicableOverride(
    event: DamageEvent,
    target: SplittermondActor,
    realizedDamageReductionOverride: CostModifier
) {
    const allReduction = event.costBase.multiply(target.damageReduction);
    const protectedReduction = event.costBase.multiply(target.protectedDamageReduction);
    const overridableReduction = allReduction.subtract(protectedReduction);
    const applicableReductionOverride = realizedDamageReductionOverride.subtract(protectedReduction);
    const overrideExcess = event.costBase
        .add(applicableReductionOverride)
        .subtract(overridableReduction)
        .toModifier(true);

    return event.costBase.add(applicableReductionOverride).subtract(overrideExcess).toModifier(true);
}

function calculateActualDamageReduction(
    event: DamageEvent,
    target: SplittermondActor,
    applicableReductionOverride: CostModifier
) {
    const baseReduction = event.costBase.multiply(target.damageReduction);
    return event.costBase.add(baseReduction.subtract(applicableReductionOverride)).toModifier(true); //Wrap in primary cost to ensure that the reduction is not negative
}

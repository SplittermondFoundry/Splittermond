import {Cost, CostModifier} from "../../../costs/Cost";
import {DamageType} from "../../../../config/damageTypes";
import {UserReporter} from "../../../damage/calculateDamageOnTarget";
import SplittermondActor from "../../../../actor/actor";
import {AgentReference} from "../../../../data/references/AgentReference";
import {CostBase} from "../../../costs/costTypes";


export interface ProtoUserAdjustment {
    readonly damageAdjustment: number;
    readonly costBase: "K" | "V" | "";
    readonly costBaseChanged: boolean;
    readonly operationCancelled: boolean;
}

export interface UserReport {
    target: SplittermondActor;
    damageReduction: CostModifier;
    event: EventReport;
    records: UserReportRecord[];
    totalDamage: CostModifier;
    overriddenReduction: CostModifier;
    totalFromImplements: CostModifier;
}

export interface EventReport {
    causer: AgentReference | null,
    isGrazingHit: boolean,
    costBase: CostBase
}


export interface UserReportRecord {
    implementName: string,
    damageType: DamageType,
    baseDamage: CostModifier,
    modifiedBy: CostModifier,
    appliedDamage: CostModifier
}

export class UserReporterImpl implements UserReporter {
    private _target: SplittermondActor | null = null;
    public _event: EventReport | null = null;
    private records: UserReportRecord[] = [];
    public totalDamage: CostModifier = new Cost(0, 0, false).asModifier();
    public overriddenReduction: CostModifier = new Cost(0, 0, false).asModifier();
    public totalFromImplements: CostModifier = new Cost(0, 0, false).asModifier();

    set target(value: SplittermondActor) {
        this._target = value;
    }

    set event(value:EventReport) {
        this._event = value;
    }

    addRecord(implementName: string, damageType: DamageType, baseDamage: CostModifier, appliedDamage: CostModifier): void {
        this.records.push({
            implementName,
            damageType, baseDamage,
            modifiedBy:
                appliedDamage.subtract(baseDamage),
            appliedDamage,
        });
    }

    getReport(): UserReport {
        if (this._target === null) {
            throw new Error("A user report without a target is not allowed");
        }
        if (this._event === null) {
            throw new Error("A user report without an event is not allowed");
        }
        return {
            target: this._target,
            damageReduction: this._event.costBase.multiply(this._target.damageReduction),
            event: this._event,
            records: this.records,
            totalDamage: this.totalDamage,
            overriddenReduction: this.overriddenReduction,
            totalFromImplements: this.totalFromImplements
        }
    }
}

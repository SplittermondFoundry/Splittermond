import { foundryApi } from "../../../../api/foundryApi";
import { UserReport, UserReportRecord } from "./UserReporterImpl";
import { CostType } from "../../../costs/costTypes";

export interface DamageRecord {
    baseId: string;
    type: CostType;
    items: DamageRecordItem[];
    isGrazingHit: boolean;
    damageReduction: number;
    ignoredReduction: number;
    totalBeforeGrazing: number;
    readonly totalDamage: number;
    readonly effectiveDamageReduction: number;
}

interface DamageRecordItem {
    name: string;
    type: string;
    baseValue: number;
    modifiedBy: number;
    subTotal: number;
    immunity?: string;
}

export class Renderer {
    constructor(private userModificationRecord: UserReport) {}

    async getHtml(): Promise<string> {
        const damageRecord = this.mapData();
        const targetHasSplinterpoints = this.getTargetSplinterpoints() > 0;
        return await foundryApi.renderer("systems/splittermond/templates/apps/dialog/new-damage-report.hbs", {
            ...damageRecord,
            displaySplinterpoints: targetHasSplinterpoints,
        });
    }

    get attackerName(): string {
        return (
            this.userModificationRecord.event.causer?.getAgent().name ??
            foundryApi.localize("splittermond.damageMessage.unknown")
        );
    }

    get defenderName(): string {
        return this.userModificationRecord.target.name;
    }

    get costType(): CostType {
        const source = this.userModificationRecord;
        return source.event.costBase.costType;
    }

    private getTargetSplinterpoints(): number {
        return this.userModificationRecord.target.splinterpoints.max ?? 0;
    }

    private mapData(): DamageRecord {
        const source = this.userModificationRecord;
        return {
            baseId: `${new Date().toISOString()}${Math.random()}`,
            type: this.costType,
            damageReduction: source.damageReduction.length,
            effectiveDamageReduction: this.getEffectiveDamageReduction(),
            ignoredReduction: source.overriddenReduction.length,
            isGrazingHit: source.event.isGrazingHit,
            items: this.mapRecords(source.records),
            totalBeforeGrazing: source.totalFromImplements.length,
            totalDamage: source.totalDamage.length,
        };
    }

    private getEffectiveDamageReduction() {
        const source = this.userModificationRecord;
        return source.event.costBase.add(source.damageReduction).subtract(source.overriddenReduction).toModifier(true)
            .length;
    }

    private mapRecords(records: UserReportRecord[]): DamageRecordItem[] {
        return records.map((record) => {
            const modifiedBySign = record.baseDamage.length > record.appliedDamage.length ? -1 : 1;
            return {
                name: record.implementName,
                type: foundryApi.localize(`splittermond.damageTypes.short.${record.damageType}`),
                baseValue: record.baseDamage.length,
                modifiedBy: modifiedBySign * record.modifiedBy.length,
                subTotal: record.appliedDamage.length,
                immunity: record.immunity?.name,
            };
        });
    }
}

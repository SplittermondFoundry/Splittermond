export interface BonusGrant {
    sourceId: string;
    value: number;
}

export interface BonusEntry {
    sourceId: string;
    value: number;
}

export interface BonusPoolState {
    granted: number;
    remaining: number;
    used: number;
}

export interface BonusPool {
    entries: readonly BonusEntry[];
    grants: readonly BonusGrant[];
}

export function evaluateBonusPool(entries: readonly BonusEntry[], grants: readonly BonusGrant[]): BonusPoolState {
    const entriesBySource = new Map(entries.map((entry) => [entry.sourceId, entry]));
    let granted = 0;
    let remaining = 0;
    for (const grant of grants) {
        const grantValue = Math.max(grant.value, 0);
        granted += grantValue;
        const entry = entriesBySource.get(grant.sourceId);
        remaining += entry ? Math.min(entry.value, grantValue) : grantValue;
    }
    return { granted, remaining, used: granted - remaining };
}

export function isEffectBonusExhausted(effectUuid: string, pools: readonly BonusPool[]): boolean {
    const grantingPools = pools.filter((pool) => pool.grants.some((grant) => grant.sourceId === effectUuid));
    if (grantingPools.length === 0) {
        return false;
    }
    return grantingPools.every((pool) => {
        const entry = pool.entries.find((candidate) => candidate.sourceId === effectUuid);
        return entry !== undefined && entry.value <= 0;
    });
}

export function allocateFromBonusPool(
    entries: readonly BonusEntry[],
    grants: readonly BonusGrant[],
    cost: number
): { entries: BonusEntry[]; absorbed: number } {
    const grantBySource = new Map(grants.map((grant) => [grant.sourceId, Math.max(grant.value, 0)]));
    const grantSources = new Set(grantBySource.keys());
    const materialized = grants
        .filter((grant) => !entries.some((entry) => entry.sourceId === grant.sourceId))
        .map((grant) => ({ sourceId: grant.sourceId, value: Math.max(grant.value, 0) }));
    const working = [...entries.map((entry) => ({ ...entry })), ...materialized];
    let absorbed = 0;
    for (const entry of working) {
        if (absorbed >= cost) {
            break;
        }
        if (!grantSources.has(entry.sourceId)) {
            continue;
        }
        const withdrawal = Math.min(cost - absorbed, entry.value, grantBySource.get(entry.sourceId) ?? 0);
        entry.value -= withdrawal;
        absorbed += withdrawal;
    }
    return { entries: working, absorbed };
}

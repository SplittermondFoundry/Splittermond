import type SplittermondCombat from "module/combat/combat";
import type { EffectType } from "module/activeEffect/dataModel/effectTypes";
import type { DurationMode } from "module/activeEffect/SplittermondActiveEffect";
import { foundryApi } from "module/api/foundryApi";

export type EffectCardEffect = {
    isSuppressed: boolean;
    disabled: boolean;
    type: EffectType | "base";
    durationMode: DurationMode;
    duration: {
        expired: boolean;
        value: number | null;
        units: string;
        start?: { round?: number };
    };
};

export type EffectCardBadge = {
    icon: string;
    tooltipKey: string;
    cssClass: string;
};

export type EffectCardContext = {
    type: EffectType | "base";
    typeCssClass: string;
    badges: EffectCardBadge[];
    ticksToExpiration: number | null;
    showTicks: boolean;
};

const HIGHLIGHTED_TYPES: Record<string, boolean> = {
    spellEffect: true,
    attackEffect: true,
    spellEnhancedEffect: true,
};

export function buildEffectCardContext(
    effect: EffectCardEffect,
    { actor }: { actor: Actor | null }
): EffectCardContext {
    const badges: EffectCardBadge[] = [];

    if (effect.isSuppressed) {
        badges.push({
            icon: "fa-link-slash",
            tooltipKey: "splittermond.activeEffect.badge.suppressed",
            cssClass: "badge-suppressed",
        });
    }

    if (effect.duration.expired) {
        badges.push({
            icon: "fa-hourglass-end",
            tooltipKey: "splittermond.activeEffect.badge.expired",
            cssClass: "badge-expired",
        });
    }

    if (effect.durationMode === "channelled") {
        badges.push({
            icon: "fa-arrows-to-circle",
            tooltipKey: "splittermond.activeEffect.badge.channelled",
            cssClass: "badge-channelled",
        });
    }

    let ticksToExpiration: number | null = null;

    const combat = actor ? (foundryApi.getCombatForActor(actor) as SplittermondCombat | null) : null;
    const currentTick = combat?.currentTick;

    if (
        effect.durationMode === "timed" &&
        effect.duration.units === "rounds" &&
        effect.duration.value != null &&
        Number.isFinite(effect.duration.value) &&
        effect.duration.value > 0 &&
        effect.duration.start?.round != null &&
        Number.isFinite(effect.duration.start.round) &&
        combat != null &&
        currentTick != null &&
        Number.isFinite(currentTick)
    ) {
        ticksToExpiration = effect.duration.start.round + effect.duration.value - currentTick;
        if (ticksToExpiration <= 0) {
            ticksToExpiration = null;
        }
    }

    return {
        type: effect.type,
        typeCssClass: effect.type in HIGHLIGHTED_TYPES ? `effect-type-${effect.type}` : "",
        badges,
        ticksToExpiration,
        showTicks: ticksToExpiration !== null,
    };
}

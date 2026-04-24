/**
 * Foundry's ActiveEffect is a global class. We declare a minimal local type
 * to satisfy the TypeScript compiler while extending it.
 */
// @ts-ignore -- ActiveEffect is a Foundry global
const BaseActiveEffect: typeof ActiveEffect = ActiveEffect;

/**
 * Splittermond system subclass of ActiveEffect.
 *
 * This is a test balloon: for now, status effect items propagate their parsed modifiers
 * as ActiveEffect documents. The effects are displayed in the actor's status tab but are
 * NOT yet consumed by the modifier system — the old pipeline still handles application.
 */
export class SplittermondActiveEffect extends BaseActiveEffect {
    /**
     * Determine whether this effect is suppressed based on the source item's state.
     * For example, weapon effects are suppressed when the weapon is not equipped.
     *
     * Currently only statuseffect items create effects, so this is mostly a no-op,
     * but it lays the groundwork for equipped/active suppression later.
     */
    get isSuppressed(): boolean {
        if (super.isSuppressed) return true;

        // For transferred effects, this.parent is the Actor, not the Item.
        // Resolve the source item via the origin UUID.
        //@ts-expect-error
        const sourceItem = this.item ?? null;
        if (!sourceItem) return false;

        switch (sourceItem.type) {
            case "weapon":
            case "shield":
            case "armor":
                return !(sourceItem.system as any).equipped;
            case "spelleffect":
                return !(sourceItem.system as any).active;
            default:
                return false;
        }
    }
}

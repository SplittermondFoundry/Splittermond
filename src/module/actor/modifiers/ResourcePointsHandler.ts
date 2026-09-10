import { BarebonesModifierHandler } from "module/actor/modifiers/BarebonesModifierHandler";
import { type IModifier, type ModifierRegistry } from "module/modifiers";
import type { ScalarModifier } from "module/modifiers/parsing";
import type { SplittermondDerivedAttribute } from "module/config/attributes";
import { Modifier } from "module/activeEffect";

export const resourcePoints = [
    "healthpoints",
    "focuspoints",
] as const satisfies readonly SplittermondDerivedAttribute[];
export type ResourcePoints = (typeof resourcePoints)[number];

export function isResourcePoints(derivedAttribute: string): derivedAttribute is ResourcePoints {
    return resourcePoints.includes(derivedAttribute as ResourcePoints);
}

export function registerResourcePointsHandlers(registry: ModifierRegistry<ScalarModifier>) {
    resourcePoints.forEach((slug) => {
        registry.addHandler(slug, ResourcePointsHandler(slug));
        registry.addHandler(`actor.${slug}`, ResourcePointsHandler(`actor.${slug}`));
    });
}

function ResourcePointsHandler(topLevelPath: ResourcePoints | `actor.${ResourcePoints}`) {
    const slug = topLevelPath.replace(/^actor\./, "") as ResourcePoints;
    return class extends BarebonesModifierHandler({ topLevelPath, subSegments: { bonus: {} } }) {
        protected buildModifier(modifier: ScalarModifier): IModifier[] {
            const canonicalGroupId = modifier.path.toLowerCase().endsWith(".bonus") ? `actor.${slug}.bonus` : slug;
            return super
                .buildModifier(modifier)
                .map((mod) =>
                    Modifier.create(canonicalGroupId, mod.value, mod.attributes, mod.selectable, this.actorProvider)
                );
        }
    };
}

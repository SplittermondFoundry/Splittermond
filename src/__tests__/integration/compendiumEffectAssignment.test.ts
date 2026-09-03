import { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { withActor } from "./fixtures";
import { copyCompendiumEffectToItem } from "module/activeEffect/compendiumEffectAssignment";
import { substituteSkill } from "module/activeEffect/sentinelSubstitution";
import { modifiers } from "module/config/modifiers";
import type SplittermondItem from "module/item/item";
import type { EffectDataObject } from "module/activeEffect";

declare const Item: { deleteDocuments(ids: string[]): Promise<void> };

export function compendiumEffectAssignmentTest(context: QuenchBatchContext) {
    const { describe, it, expect } = context;

    describe("copyCompendiumEffectToItem", () => {
        it(
            "copies the sturdy compendium effect onto an item with origin/sourceId/transfer set",
            withActor(async (actor) => {
                const [item] = await actor.createEmbeddedDocuments("Item", [
                    { type: "strength", name: "Sturdy Strength", system: {} },
                ]);

                await copyCompendiumEffectToItem(item as SplittermondItem, modifiers.sturdy);

                const effect = item.effects.find((e: { type: string }) => e.type === "modifier") as unknown as
                    EffectDataObject | undefined;
                expect(effect, "embedded modifier effect should exist").to.exist;

                const effectModifiers = effect!.system?.modifiers ?? [];
                expect(effectModifiers).to.have.length(1);
                expect(effectModifiers[0].path).to.equal("lp");
                expect(effectModifiers[0].attributes?.name).to.equal("LP +1");

                expect(effect!.flags?.core?.sourceId).to.equal(modifiers.sturdy);
                expect(effect!.origin).to.equal(item.uuid);
                expect(effect!.transfer).to.equal(true);
            })
        );

        it(
            "applies the substitutor to the beidhändige abwehr compendium effect's skill placeholder",
            withActor(async (actor) => {
                const [item] = await actor.createEmbeddedDocuments("Item", [
                    { type: "strength", name: "Beidhändige Abwehr Strength", system: { skill: "daggers" } },
                ]);

                await copyCompendiumEffectToItem(
                    item as SplittermondItem,
                    modifiers["beidhändige abwehr"],
                    substituteSkill("daggers")
                );

                const effect = item.effects.find((e: { type: string }) => e.type === "modifier") as unknown as
                    EffectDataObject | undefined;
                expect(effect, "embedded modifier effect should exist").to.exist;

                const effectModifiers = effect!.system?.modifiers ?? [];
                expect(effectModifiers).to.have.length(1);
                expect(effectModifiers[0].path).to.equal("item.defenseTickCost");
                expect(effectModifiers[0].attributes?.skill).to.equal("daggers");
                expect(effectModifiers[0].attributes?.name).to.equal("item.defenseTickCost skill= -1");

                const rawInput = effect!.flags?.splittermond?.rawInput;
                expect(rawInput).to.equal("item.defenseTickCost skill= -1");
                expect(rawInput).to.not.contain("__SKILL_PLACEHOLDER__");
                expect(effect!.flags?.core?.sourceId).to.equal(modifiers["beidhändige abwehr"]);
                expect(effect!.origin).to.equal(item.uuid);
                expect(effect!.transfer).to.equal(true);
            })
        );
    });
}

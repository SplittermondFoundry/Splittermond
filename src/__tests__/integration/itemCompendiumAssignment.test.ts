import { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { withActor } from "./fixtures";
import { modifiers } from "module/config/modifiers";
import type { EffectDataObject } from "module/activeEffect";
import type SplittermondItem from "module/item/item";
import { splittermond } from "module/config";
import { passesEventually } from "../util";

declare const Item: { deleteDocuments(ids: string[]): Promise<void> };

function findEffectBySourceId(effects: unknown, sourceId: string): EffectDataObject | undefined {
    const arr = effects as unknown as unknown[];
    return arr.find(
        (e: unknown) => (e as { flags?: { core?: { sourceId?: string } } }).flags?.core?.sourceId === sourceId
    ) as EffectDataObject | undefined;
}

export function itemCompendiumAssignmentTest(context: QuenchBatchContext) {
    const { describe, it, expect, afterEach } = context;

    let items: SplittermondItem[] = [];

    afterEach(() => {
        Item.deleteDocuments(items.map((i) => i.id));
        items = [];
    });

    async function add(item: SplittermondItem) {
        items.push(item);
        return item;
    }

    describe("SplittermondItem._onCreate compendium effect assignment", () => {
        it(
            "create strength item assigns the sturdy compendium effect via _onCreate",
            withActor(async (actor) => {
                const [rawItem] = await actor.createEmbeddedDocuments("Item", [
                    { type: "strength", name: "sturdy", system: {} },
                ]);
                const item = rawItem as unknown as SplittermondItem;
                await add(item);
                await passesEventually(() => expect(item.effects).to.have.length(1));

                const effect = item.effects.find((e: EffectDataObject) => e.type === "modifier");
                expect(effect, "embedded modifier effect should exist").to.exist;

                const effectModifiers = effect!.system?.modifiers ?? [];
                expect(effectModifiers).to.have.length(1);
                expect(effectModifiers[0].path).to.equal("lp");
                expect(effectModifiers[0].serializedValue).to.deep.equal({ type: "amount", amount: 1 });
                expect(effectModifiers[0].attributes?.name).to.equal("sturdy");

                expect(effect!.flags?.core?.sourceId).to.equal(splittermond.modifier.sturdy);
                expect(effect!.origin).to.equal(item.uuid);
                expect(effect!.transfer).to.equal(true);
            })
        );

        it(
            "create mastery item assigns the arcanespeed compendium effect via _onCreate",
            withActor(async (actor) => {
                const [rawItem] = await actor.createEmbeddedDocuments("Item", [
                    {
                        type: "mastery",
                        name: "arcanespeed",
                        system: {
                            skill: "fightmagic",
                            availableIn: "fightmagic 1",
                            level: 1,
                            description: "test",
                            isGrandmaster: false,
                            isManeuver: false,
                            source: "",
                        },
                    },
                ]);
                const item = rawItem as unknown as SplittermondItem;
                await add(item);
                await passesEventually(() => expect(item.effects).to.have.length(1));

                const effect = findEffectBySourceId(item.effects, modifiers.arcanespeed);
                expect(effect, "embedded modifier effect for arcanespeed should exist").to.exist;
                expect(effect!.flags?.core?.sourceId).to.equal(modifiers.arcanespeed);
                expect(effect!.origin).to.equal(item.uuid);
                expect(effect!.transfer).to.equal(true);
            })
        );

        it(
            "create non-modifier item type does not assign a compendium effect",
            withActor(async (actor) => {
                const [rawItem] = await actor.createEmbeddedDocuments("Item", [
                    {
                        type: "weapon",
                        name: "test sword",
                        system: { modifier: "P+2", equipped: "left" },
                    },
                ]);
                const item = rawItem as unknown as SplittermondItem;
                await add(item);

                const compendiumEffects = (item.effects as unknown as unknown[]).filter(
                    (e: unknown) =>
                        (e as EffectDataObject).type === "modifier" &&
                        !!(e as { flags?: { core?: { sourceId?: string } } }).flags?.core?.sourceId
                );
                expect(compendiumEffects, "non-modifier item type has no compendium effects").to.have.length(0);
            })
        );
    });
}

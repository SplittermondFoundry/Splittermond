import { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { withActor } from "../fixtures";
import { modifiers } from "module/config/modifiers";
import type { EffectDataObject } from "module/activeEffect";
import type SplittermondItem from "module/item/item";
import { splittermond } from "module/config";
import { passesEventually } from "../../util";

declare const Item: { deleteDocuments(ids: string[]): Promise<void> };

function findEffectBySourceId(effects: unknown, sourceId: string): EffectDataObject | undefined {
    const arr = effects as unknown as unknown[];
    return arr.find(
        (e: unknown) => (e as { flags?: { core?: { sourceId?: string } } }).flags?.core?.sourceId === sourceId
    ) as EffectDataObject | undefined;
}

function hasConfigSourceId(effect: unknown): boolean {
    const sourceId = (effect as EffectDataObject).flags?.core?.sourceId;
    return !!sourceId && Object.values<string>(modifiers).includes(sourceId);
}

function emphasisAttributes(effects: unknown): string[] {
    return (effects as EffectDataObject[])
        .map(e => e)
        .flatMap((e) => e.system?.modifiers ?? [])
        .map((m) => m.attributes.emphasis)
        .filter((emphasis): emphasis is string => !!emphasis);
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

                const compendiumEffects = (item.effects as unknown as unknown[]).filter(hasConfigSourceId);
                expect(compendiumEffects, "non-modifier item type has no compendium effects").to.have.length(0);
            })
        );
    });

    describe("SplittermondItem rename compendium effect sync", function () {
        this.timeout(15000);

        const robustTimeout = 3000;
        const pollInterval = 100;

        it(
            "assigns the compendium effect when a strength is renamed to a configured name",
            withActor(async (actor) => {
                const [rawItem] = await actor.createEmbeddedDocuments("Item", [
                    { type: "strength", name: "unbekannte staerke", system: {} },
                ]);
                const item = rawItem as unknown as SplittermondItem;
                await add(item);

                await item.update({ name: "sturdy" });

                await passesEventually(() => expect(item.effects).to.have.length(1), robustTimeout, pollInterval);
                const effect = findEffectBySourceId(item.effects, splittermond.modifier.sturdy);
                expect(effect, "renamed strength should have the sturdy compendium effect").to.exist;
                expect(effect!.flags?.core?.sourceId).to.equal(splittermond.modifier.sturdy);
                expect(effect!.system?.modifiers?.[0].attributes.name).to.equal("sturdy");
            })
        );

        it(
            "removes the machine-assigned compendium effect when a strength is renamed away",
            withActor(async (actor) => {
                const [rawItem] = await actor.createEmbeddedDocuments("Item", [
                    { type: "strength", name: "sturdy", system: {} },
                ]);
                const item = rawItem as unknown as SplittermondItem;
                await add(item);
                await passesEventually(() => expect(item.effects).to.have.length(1), robustTimeout, pollInterval);

                await item.update({ name: "my custom strength" });

                await passesEventually(() => expect(item.effects).to.have.length(0), robustTimeout, pollInterval);
            })
        );

        it(
            "substitutes the mastery skill when a rename assigns the compendium effect",
            withActor(async (actor) => {
                const [rawItem] = await actor.createEmbeddedDocuments("Item", [
                    {
                        type: "mastery",
                        name: "unbekannte meisterschaft",
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

                await item.update({ name: "Beidhändige Abwehr" });

                await passesEventually(
                    () =>
                        expect(
                            findEffectBySourceId(item.effects, modifiers["beidhändige abwehr"]),
                            "renamed mastery should have the beidhändige abwehr compendium effect"
                        ).to.exist,
                    robustTimeout,
                    pollInterval
                );
                const effect = findEffectBySourceId(item.effects, modifiers["beidhändige abwehr"])!;
                expect(effect.flags?.core?.sourceId).to.equal(modifiers["beidhändige abwehr"]);
                const entry = effect.system?.modifiers?.find((m) => "skill" in m.attributes);
                expect(entry, "the beidhändige abwehr compendium effect carries a skill attribute").to.exist;
                expect(entry!.attributes.skill).to.equal("fightmagic");
                expect(effect.system?.modifiers?.[0].attributes.name).to.equal("Beidhändige Abwehr");
            })
        );

        it(
            "keeps a manual effect without a config-matching sourceId when the strength is renamed away",
            withActor(async (actor) => {
                const [rawItem] = await actor.createEmbeddedDocuments("Item", [
                    { type: "strength", name: "sturdy", system: {} },
                ]);
                const item = rawItem as unknown as SplittermondItem;
                await add(item);
                await passesEventually(() => expect(item.effects).to.have.length(1), robustTimeout, pollInterval);
                await item.createEmbeddedDocuments("ActiveEffect", [
                    { name: "manual", type: "modifier", system: { modifiers: [], costModifiers: [] } },
                ]);
                await passesEventually(
                    () =>
                        expect(
                            item.effects.filter((e: EffectDataObject) => e.name === "manual"),
                            "the manual effect should exist before the rename"
                        ).to.have.length(1),
                    robustTimeout,
                    pollInterval
                );

                await item.update({ name: "my custom strength" });

                await passesEventually(
                    () => {
                        expect(
                            item.effects.filter((e: EffectDataObject) => hasConfigSourceId(e)),
                            "the machine-assigned effect should be gone"
                        ).to.have.length(0);
                        expect(
                            item.effects.filter((e: EffectDataObject) => e.name === "manual"),
                            "the manual effect should survive the rename"
                        ).to.have.length(1);
                    },
                    robustTimeout,
                    pollInterval
                );
            })
        );

        it(
            "does not assign or remove effects when a non-modifier item type is renamed",
            withActor(async (actor) => {
                const [rawItem] = await actor.createEmbeddedDocuments("Item", [
                    { type: "weapon", name: "test sword", system: { modifier: "P+2", equipped: "left" } },
                ]);
                const item = rawItem as unknown as SplittermondItem;
                await add(item);
                expect(item.effects.filter((e: EffectDataObject) => hasConfigSourceId(e))).to.have.length(0);

                await item.update({ name: "renamed sword" });

                await passesEventually(
                    () => expect(item.effects.filter((e: EffectDataObject) => hasConfigSourceId(e))).to.have.length(0),
                    robustTimeout,
                    pollInterval
                );
            })
        );

        it(
            "rebuilds the mastery ${name} effect reference when the item is renamed",
            withActor(async (actor) => {
                const [rawItem] = await actor.createEmbeddedDocuments("Item", [
                    {
                        type: "mastery",
                        name: "Schwerpunkt Sammeln",
                        system: {
                            skill: "academickunde",
                            availableIn: "academickunde 1",
                            level: 1,
                            description: "test",
                            isGrandmaster: false,
                            isManeuver: false,
                            source: "",
                            modifier: '${skill} emphasis="${name}" +2',
                        },
                    },
                ]);
                const item = rawItem as unknown as SplittermondItem;
                await add(item);
                await passesEventually(
                    () =>
                        expect(
                            JSON.stringify(item.effects),
                            "initial emphasis should reference the old name"
                        ).to.contain("Sammeln"),
                    robustTimeout,
                    pollInterval
                );

                await item.update({ name: "Schwerpunkt Inspizieren" });

                await passesEventually(
                    () => {
                        const effectData = JSON.stringify(item.effects);
                        expect(effectData, "the rebuilt effect should reference the new name").to.contain(
                            "Inspizieren"
                        );
                        expect(effectData, "the rebuilt effect should not reference the old name").to.not.contain(
                            "Sammeln"
                        );
                        expect(emphasisAttributes(item.effects)).to.include("Inspizieren");
                        expect(emphasisAttributes(item.effects)).to.not.include("Sammeln");
                    },
                    robustTimeout,
                    pollInterval
                );
            })
        );
    });
}

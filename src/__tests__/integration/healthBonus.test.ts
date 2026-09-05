import { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { withActor } from "./fixtures";
import { passesEventually } from "../util";
import { isGenerated } from "module/activeEffect/effectBuilder";
import type SplittermondActor from "module/actor/actor";
import type { FoundryActiveEffect } from "module/api/ActiveEffect";
import type { SplittermondActiveEffect } from "module/activeEffect";
import { parseCostString } from "module/util/costs/costParser";
import { Cost } from "module/util/costs/Cost";

const HEALTH_GRANT = "actor.healthpoints.bonus";
const FOCUS_GRANT = "actor.focuspoints.bonus";

function applyCost(actor: SplittermondActor, type: "health" | "focus", cost: string, description: string) {
    return actor.applyCost(type, parseCostString(cost).asPrimaryCost(), description);
}

function applyDamage(
    actor: SplittermondActor,
    type: "health" | "focus",
    counter: "consumed" | "exhausted",
    amount: number
) {
    const cost = counter === "consumed" ? new Cost(0, amount, false) : new Cost(amount, 0, false);
    return actor.applyCost(type, cost.asPrimaryCost(), "");
}

interface BonusEntrySummary {
    sourceId: string;
    value: number;
}

interface ResourceBar {
    value: number;
    max: number;
}

export function healthBonusTest(context: QuenchBatchContext) {
    const { describe, it, expect } = context;

    async function waitForItemEffects(items: readonly FoundryDocument[], timeout = 1500) {
        for (const item of items) {
            await passesEventually(
                () => {
                    expect(
                        item.effects.filter((e: { type: string }) => isGenerated(e)).length,
                        "Effect was not verifiably created"
                    ).to.be.greaterThan(0);
                },
                timeout,
                50
            );
        }
    }

    async function addGrantingItem(
        actor: SplittermondActor,
        groupId: string,
        value: number,
        name: string,
        systemExtra: Record<string, unknown> = {}
    ): Promise<FoundryDocument> {
        const [item] = await actor.createEmbeddedDocuments("Item", [
            { type: "strength", name, system: { modifier: `${groupId} ${value}`, ...systemExtra } },
        ]);
        await waitForItemEffects([item]);
        await actor.prepareData();
        return item;
    }

    function generatedEffect(item: FoundryDocument): FoundryActiveEffect {
        const effect = item.effects.find((e) => isGenerated(e));
        if (!effect) throw new Error(`Item ${item.id} has no generated effect`);
        return effect;
    }

    function bonusEntries(actor: SplittermondActor, type: "health" | "focus"): BonusEntrySummary[] {
        return actor.system[type].bonus.entries.map((entry) => ({
            sourceId: entry.sourceId,
            value: entry.value,
        }));
    }

    function resourceBar(actor: SplittermondActor, bar: "healthBar" | "focusBar"): ResourceBar {
        return (actor.system as unknown as Record<typeof bar, ResourceBar>)[bar];
    }

    function asSplittermondEffect(effect: { uuid: string }): SplittermondActiveEffect {
        return effect as unknown as SplittermondActiveEffect;
    }

    function modifierEntry(path: string, amount: number) {
        return {
            path,
            serializedValue: { type: "amount", amount },
            implementation: "additive",
            selectable: false,
            attributes: { name: "", type: "innate" },
        };
    }

    describe("Health bonus pool from ActiveEffects", function () {
        this.timeout(20000);

        it(
            "extends the health track, delays the wound malus and materializes its entry at cost application",
            withActor(async (actor) => {
                await applyCost(actor, "health", "8V8", "Wundsaat");
                await actor.prepareData();

                expect(actor.system.health.consumed.value).to.equal(8);
                expect(actor.system.health.available.value).to.equal(27);
                expect(actor.system.health.woundMalus).to.include({ level: 1, value: -1 });

                const item = await addGrantingItem(actor, HEALTH_GRANT, 5, "Gesegneter Körper");
                const effect = generatedEffect(item);

                expect(actor.system.health.bonusPool).to.include({ granted: 5, remaining: 5, used: 0 });
                expect(actor.system.health.available.value).to.equal(32);
                expect(actor.system.health.total.value).to.equal(32);
                expect(actor.system.health.max).to.equal(40);
                expect(actor.system.health.woundMalus).to.include({ level: 0, value: 0 });
                expect(actor.system.health.bonus.entries, "prepare is write-free").to.be.empty;

                await applyCost(actor, "health", "1V1", "Kleiner Treffer");
                await actor.prepareData();

                expect(bonusEntries(actor, "health")).to.deep.equal([{ sourceId: effect.uuid, value: 4 }]);
                expect(actor.system.health.max).to.equal(39);
                expect(actor.system.health.consumed.value).to.equal(8);
                expect(actor.system.health.exhausted.value).to.equal(0);
            })
        );

        it(
            "absorbs consumed-part damage from the pool before the counters",
            withActor(async (actor) => {
                const item = await addGrantingItem(actor, HEALTH_GRANT, 5, "Gesegneter Körper");

                await applyCost(actor, "health", "3V3", "Treffer");
                await actor.prepareData();

                expect(bonusEntries(actor, "health")).to.deep.equal([
                    { sourceId: generatedEffect(item).uuid, value: 2 },
                ]);
                expect(actor.system.health.consumed.value).to.equal(0);
                expect(actor.system.health.exhausted.value).to.equal(0);
            })
        );

        it(
            "continues from depleted entries on a second cost without re-materializing them",
            withActor(async (actor) => {
                await addGrantingItem(actor, HEALTH_GRANT, 5, "Gesegneter Körper");

                await applyCost(actor, "health", "3V3", "Erster Treffer");
                await applyCost(actor, "health", "3V3", "Zweiter Treffer");
                await actor.prepareData();

                expect(actor.system.health.max).to.equal(35);
                expect(bonusEntries(actor, "health")).to.have.length(1);
                expect(bonusEntries(actor, "health")[0].value, "entry is not re-materialized to 5").to.equal(0);
                expect(actor.system.health.consumed.value).to.equal(1);
                expect(actor.system.health.exhausted.value).to.equal(0);
                expect(actor.system.health.bonusPool).to.include({ granted: 5, remaining: 0, used: 5 });
            })
        );

        it(
            "lets cost overflow past an emptied pool into the counters",
            withActor(async (actor) => {
                const item = await addGrantingItem(actor, HEALTH_GRANT, 5, "Gesegneter Körper");

                await applyCost(actor, "health", "8V8", "Wuchtiger Treffer");
                await actor.prepareData();

                expect(bonusEntries(actor, "health")).to.deep.equal([
                    { sourceId: generatedEffect(item).uuid, value: 0 },
                ]);
                expect(actor.system.health.consumed.value).to.equal(3);
                expect(actor.system.health.exhausted.value).to.equal(0);
            })
        );

        it(
            "absorbs plain exhaustion costs from the pool",
            withActor(async (actor) => {
                const item = await addGrantingItem(actor, HEALTH_GRANT, 5, "Gesegneter Körper");

                await applyCost(actor, "health", "4", "Betäubung");
                await actor.prepareData();

                expect(bonusEntries(actor, "health")).to.deep.equal([
                    { sourceId: generatedEffect(item).uuid, value: 1 },
                ]);
                expect(actor.system.health.exhausted.value).to.equal(0);
                expect(actor.system.health.consumed.value).to.equal(0);
            })
        );

        it(
            "drops the remaining pool when the granting effect is deleted",
            withActor(async (actor) => {
                const item = await addGrantingItem(actor, HEALTH_GRANT, 5, "Gesegneter Körper");
                const effect = generatedEffect(item);
                await applyCost(actor, "health", "1V1", "Kleiner Treffer");

                await actor.deleteEmbeddedDocuments("Item", [item.id]);
                await actor.prepareData();

                expect(actor.system.health.bonusPool).to.include({ granted: 0, remaining: 0, used: 0 });
                expect(actor.system.health.available.value).to.equal(35);
                expect(actor.system.health.total.value).to.equal(35);
                expect(actor.system.health.consumed.value).to.equal(0);
                expect(actor.system.health.exhausted.value).to.equal(0);
                expect(bonusEntries(actor, "health"), "tombstone entry is kept").to.deep.equal([
                    { sourceId: effect.uuid, value: 4 },
                ]);
            })
        );

        it(
            "grants fresh full points from a newly applied effect",
            withActor(async (actor) => {
                const firstItem = await addGrantingItem(actor, HEALTH_GRANT, 5, "Gesegneter Körper I");
                const firstEffect = generatedEffect(firstItem);
                await applyCost(actor, "health", "3V3", "Treffer");
                await actor.deleteEmbeddedDocuments("Item", [firstItem.id]);

                const secondItem = await addGrantingItem(actor, HEALTH_GRANT, 5, "Gesegneter Körper II");
                const secondEffect = generatedEffect(secondItem);

                expect(actor.system.health.bonusPool, "fresh full grant despite the tombstone").to.include({
                    granted: 5,
                    remaining: 5,
                    used: 0,
                });

                await applyCost(actor, "health", "1V1", "Kleiner Treffer");
                await actor.prepareData();

                expect(bonusEntries(actor, "health")).to.deep.equal([
                    { sourceId: firstEffect.uuid, value: 2 },
                    { sourceId: secondEffect.uuid, value: 4 },
                ]);
                expect(actor.system.health.consumed.value).to.equal(0);
                expect(actor.system.health.exhausted.value).to.equal(0);
            })
        );

        it(
            "keeps the consumed state when the same effect is re-enabled",
            withActor(async (actor) => {
                const item = await addGrantingItem(actor, HEALTH_GRANT, 5, "Gesegneter Körper");
                const effect = generatedEffect(item);
                await applyCost(actor, "health", "3V3", "Treffer");

                await effect.update({ disabled: true });
                await actor.prepareData();

                expect(actor.system.health.bonusPool).to.include({ granted: 0, remaining: 0, used: 0 });
                expect(bonusEntries(actor, "health")).to.deep.equal([{ sourceId: effect.uuid, value: 2 }]);

                await effect.update({ disabled: false });
                await actor.prepareData();

                expect(actor.system.health.bonusPool, "entry is not topped up").to.include({
                    granted: 5,
                    remaining: 2,
                    used: 3,
                });

                await applyCost(actor, "health", "3V3", "Zweiter Treffer");
                await actor.prepareData();

                expect(bonusEntries(actor, "health")).to.deep.equal([{ sourceId: effect.uuid, value: 0 }]);
                expect(actor.system.health.consumed.value).to.equal(1);
                expect(actor.system.health.exhausted.value).to.equal(0);
            })
        );

        it(
            "does not persist a negative bonus entry value",
            withActor(async (actor) => {
                await actor.update({
                    system: { health: { bonus: { entries: [{ sourceId: "effect-1", value: -1 }] } } },
                });
                await actor.prepareData();

                expect(bonusEntries(actor, "health"), "invalid entry is dropped by schema validation").to.be.empty;

                await actor.update({
                    system: { health: { bonus: { entries: [{ sourceId: "effect-2", value: 3 }] } } },
                });
                await actor.prepareData();

                expect(bonusEntries(actor, "health")).to.deep.equal([{ sourceId: "effect-2", value: 3 }]);
            })
        );

        it(
            "clamps a shrunken grant to the grant value per withdrawal",
            withActor(async (actor) => {
                const item = await addGrantingItem(actor, HEALTH_GRANT, 5, "Doppelter Segen", { quantity: 2 });
                expect(actor.system.health.bonusPool).to.include({ granted: 10, remaining: 10 });

                await applyCost(actor, "health", "1V1", "Anzahlung");
                await item.update({ system: { quantity: 1 } });
                await actor.prepareData();

                expect(actor.system.health.bonusPool, "remaining is clamped to the shrunken grant").to.include({
                    granted: 5,
                    remaining: 5,
                    used: 0,
                });

                await applyCost(actor, "health", "7V7", "Großer Treffer");
                await actor.prepareData();

                expect(bonusEntries(actor, "health")).to.deep.equal([
                    { sourceId: generatedEffect(item).uuid, value: 4 },
                ]);
                expect(actor.system.health.consumed.value).to.equal(2);
                expect(actor.system.health.exhausted.value).to.equal(0);
            })
        );

        it(
            "reflects exhaustion damage applied via applyCost in the wound malus by depleting the pool",
            withActor(async (actor) => {
                await applyCost(actor, "health", "11V11", "Wundsaat");
                const item = await addGrantingItem(actor, HEALTH_GRANT, 5, "Gesegneter Körper");

                expect(
                    actor.system.health.woundMalus,
                    "the grant still covers the pre-seeded damage: baseline for the pinned contrast"
                ).to.include({ level: 0, value: 0 });

                await applyDamage(actor, "health", "exhausted", 3);
                await actor.prepareData();

                expect(actor.system.health.max).to.equal(37);
                expect(bonusEntries(actor, "health")).to.deep.equal([
                    { sourceId: generatedEffect(item).uuid, value: 2 },
                ]);
                expect(actor.system.health.exhausted.value, "the absorbed damage never lands on the counter").to.equal(
                    0
                );
                expect(actor.system.health.consumed.value).to.equal(11);
                expect(actor.system.health.bonusPool).to.include({ granted: 5, remaining: 2, used: 3 });
                expect(actor.system.health.total.value, "37 capacity - 11 consumed").to.equal(26);
                expect(actor.system.health.woundMalus, "26/7 crosses into the third wound level").to.include({
                    level: 1,
                    value: -1,
                });
            })
        );

        it(
            "absorbs focus exhaustion damage applied via applyCost from the focus pool",
            withActor(async (actor) => {
                const item = await addGrantingItem(actor, FOCUS_GRANT, 5, "Klarer Geist");

                await applyDamage(actor, "focus", "exhausted", 3);
                await actor.prepareData();

                expect(bonusEntries(actor, "focus")).to.deep.equal([
                    { sourceId: generatedEffect(item).uuid, value: 2 },
                ]);
                expect(actor.system.focus.exhausted.value).to.equal(0);
                expect(actor.system.focus.consumed.value).to.equal(0);
                expect(actor.system.focus.bonusPool).to.include({ granted: 5, remaining: 2, used: 3 });
            })
        );
    });

    describe("Health bonus pool channel lifecycle", function () {
        this.timeout(20000);

        it(
            "covers a channeled occupation with pool points while the channel runs",
            withActor(async (actor) => {
                await actor.update({ system: { species: { size: 2 } } });
                await addGrantingItem(actor, HEALTH_GRANT, 5, "Gesegneter Körper");
                expect(actor.system.health.available.value).to.equal(25);

                await applyCost(actor, "health", "K4", "Kanalisierter Zauber");
                await actor.prepareData();

                expect(actor.system.health.available.value, "covered occupation reduces available by 0").to.equal(25);
                expect(actor.system.health.channeled).to.include({ value: 4 });
                expect(actor.system.health.bonusPool).to.include({ remaining: 5, used: 0 });
                expect(actor.system.health.bonus.entries, "channeled costs are not prepaid").to.be.empty;
            })
        );

        it(
            "pays a channel's end cost from the pool and shrinks availability",
            withActor(async (actor) => {
                await actor.update({ system: { species: { size: 2 } } });
                const item = await addGrantingItem(actor, HEALTH_GRANT, 5, "Gesegneter Körper");

                await applyCost(actor, "health", "K4", "Kanalisierter Zauber");
                await actor.prepareData();
                expect(actor.system.health.available.value).to.equal(25);

                await actor.endChannel("health", 0);
                await actor.prepareData();

                expect(actor.system.health.max).to.equal(21);
                expect(actor.system.health.available.value, "available drops from 25 to 21").to.equal(21);
                expect(bonusEntries(actor, "health")).to.deep.equal([
                    { sourceId: generatedEffect(item).uuid, value: 1 },
                ]);
                expect(actor.system.health.exhausted.value).to.equal(0);
                expect(actor.system.health.channeled.entries).to.be.empty;
                expect(actor.system.health.channeled).to.include({ value: 0 });
                expect(actor.system.health.bonusPool).to.include({ granted: 5, remaining: 1, used: 4 });
            })
        );

        it(
            "exhausts the channeled points when no pool covers the channel",
            withActor(async (actor) => {
                await applyCost(actor, "health", "K4", "Kanalisierter Zauber");
                await actor.prepareData();
                expect(actor.system.health.available.value).to.equal(31);

                await actor.endChannel("health", 0);
                await actor.prepareData();

                expect(actor.system.health.exhausted.value).to.equal(4);
                expect(actor.system.health.consumed.value).to.equal(0);
                expect(actor.system.health.channeled.entries).to.be.empty;
                expect(actor.system.health.available.value).to.equal(31);
            })
        );

        it(
            "reverts a channel without touching pool or counters",
            withActor(async (actor) => {
                await actor.update({ system: { species: { size: 2 } } });
                const item = await addGrantingItem(actor, HEALTH_GRANT, 5, "Gesegneter Körper");
                const effect = generatedEffect(item);

                await applyCost(actor, "health", "1V1", "Vorbereitung");
                await applyCost(actor, "health", "K4", "Kanalisierter Zauber");
                await actor.prepareData();
                expect(
                    actor.system.health.available.value,
                    "the covered occupation leaves available at capacity"
                ).to.equal(24);
                expect(actor.system.health.channeled).to.include({ value: 4 });

                await actor.removeChannel("health", 0);
                await actor.prepareData();

                expect(bonusEntries(actor, "health"), "bonus entries are untouched").to.deep.equal([
                    { sourceId: effect.uuid, value: 4 },
                ]);
                expect(actor.system.health.exhausted.value).to.equal(0);
                expect(actor.system.health.consumed.value).to.equal(0);
                expect(actor.system.health.channeled).to.include({ value: 0 });
                expect(actor.system.health.channeled.entries).to.be.empty;
                expect(
                    actor.system.health.available.value,
                    "nothing is freed into available: the occupation was covered"
                ).to.equal(24);
                expect(actor.system.health.bonusPool).to.include({ remaining: 4, used: 1 });
            })
        );
    });

    describe("Focus bonus pool", function () {
        this.timeout(20000);

        it(
            "extends the focus track and absorbs focus costs",
            withActor(async (actor) => {
                await applyCost(actor, "focus", "4V4", "Zaubersaat");
                const item = await addGrantingItem(actor, FOCUS_GRANT, 5, "Klarer Geist");

                expect(actor.system.focus.bonusPool).to.include({ granted: 5, remaining: 5, used: 0 });
                expect(actor.system.focus.available.value).to.equal(9);
                expect(actor.system.focus.total.value).to.equal(9);

                await applyCost(actor, "focus", "3V3", "Zauber");
                await actor.prepareData();

                expect(bonusEntries(actor, "focus")).to.deep.equal([
                    { sourceId: generatedEffect(item).uuid, value: 2 },
                ]);
                expect(actor.system.focus.consumed.value).to.equal(4);
                expect(actor.system.focus.exhausted.value).to.equal(0);
            })
        );

        it(
            "pays a focus channel's end cost from the focus pool",
            withActor(async (actor) => {
                await actor.update({
                    system: {
                        attributes: {
                            mystic: { initial: 5, advances: 0 },
                            willpower: { initial: 5, advances: 0 },
                        },
                    },
                });
                const item = await addGrantingItem(actor, FOCUS_GRANT, 5, "Klarer Geist");
                expect(actor.system.focus.available.value).to.equal(25);

                await applyCost(actor, "focus", "K4", "Kanalisierter Zauber");
                await actor.prepareData();
                expect(actor.system.focus.available.value, "covered occupation reduces available by 0").to.equal(25);

                await actor.endChannel("focus", 0);
                await actor.prepareData();

                expect(actor.system.focus.max).to.equal(`${actor.derivedValues.focuspoints.value.display} + 1`);
                expect(actor.system.focus.available.value, "available drops from 25 to 21").to.equal(21);
                expect(bonusEntries(actor, "focus")).to.deep.equal([
                    { sourceId: generatedEffect(item).uuid, value: 1 },
                ]);
                expect(actor.system.focus.exhausted.value).to.equal(0);
                expect(actor.system.focus.channeled.entries).to.be.empty;
            })
        );

        it(
            "exhausts a focus channel's costs when no pool covers it",
            withActor(async (actor) => {
                await applyCost(actor, "focus", "K4", "Kanalisierter Zauber");

                await actor.endChannel("focus", 0);
                await actor.prepareData();

                expect(actor.system.focus.exhausted.value).to.equal(4);
                expect(actor.system.focus.consumed.value).to.equal(0);
                expect(actor.system.focus.channeled.entries).to.be.empty;
            })
        );

        it(
            "reverts a focus channel without touching pool or counters",
            withActor(async (actor) => {
                const item = await addGrantingItem(actor, FOCUS_GRANT, 5, "Klarer Geist");
                const effect = generatedEffect(item);

                await applyCost(actor, "focus", "1V1", "Vorbereitung");
                await applyCost(actor, "focus", "K4", "Kanalisierter Zauber");
                await actor.prepareData();

                await actor.removeChannel("focus", 0);
                await actor.prepareData();

                expect(bonusEntries(actor, "focus"), "bonus entries are untouched").to.deep.equal([
                    { sourceId: effect.uuid, value: 4 },
                ]);
                expect(actor.system.focus.exhausted.value).to.equal(0);
                expect(actor.system.focus.consumed.value).to.equal(0);
                expect(actor.system.focus.channeled.entries).to.be.empty;
            })
        );

        it(
            "reaches the zero-stat focus state with a live grant and zeroes its display",
            withActor(async (actor) => {
                await actor.update({
                    system: {
                        attributes: {
                            mystic: { initial: 0, advances: 0 },
                            willpower: { initial: 0, advances: 0 },
                        },
                    },
                });
                await addGrantingItem(actor, FOCUS_GRANT, 5, "Klarer Geist");

                expect(actor.system.focus.available.value).to.equal(0);
                expect(actor.system.focus.total.value).to.equal(0);
                expect(actor.system.focus.max).to.equal(0);
                expect(actor.system.focus.bonusPool).to.include({
                    granted: 5,
                    remaining: 5,
                    used: 0,
                    startPercentage: 0,
                    percentage: 0,
                });
                expect(resourceBar(actor, "focusBar")).to.deep.equal({ value: 0, max: 5 });
            })
        );
    });

    describe("Bonus exhaustion marking", function () {
        this.timeout(20000);

        it(
            "marks a bonus-only effect as ineffective once its pool is fully allocated",
            withActor(async (actor) => {
                const item = await addGrantingItem(actor, HEALTH_GRANT, 5, "Gesegneter Körper");
                const effect = asSplittermondEffect(generatedEffect(item));
                expect(actor.isEffectIneffective(effect), "an unspent grant is not ineffective").to.be.false;

                await applyCost(actor, "health", "3V3", "Erster Treffer");
                await actor.prepareData();
                expect(actor.isEffectIneffective(effect), "a partially spent grant is not ineffective").to.be.false;

                await applyCost(actor, "health", "3V3", "Zweiter Treffer");
                await actor.prepareData();

                expect(bonusEntries(actor, "health")).to.deep.equal([{ sourceId: effect.uuid, value: 0 }]);
                expect(actor.isEffectIneffective(effect)).to.be.true;
            })
        );

        it(
            "keeps an exhausted effect effective that applies further modifiers",
            withActor(async (actor) => {
                const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
                    {
                        name: "Segen mit Nachwirkung",
                        type: "modifier",
                        system: {
                            modifiers: [
                                modifierEntry(HEALTH_GRANT, 5),
                                modifierEntry("actor.focusregeneration.bonus", 1),
                            ],
                            costModifiers: [],
                        },
                    },
                ]);
                const splittermondEffect = asSplittermondEffect(effect);

                await applyCost(actor, "health", "5V5", "Voller Treffer");
                await actor.prepareData();

                expect(bonusEntries(actor, "health")).to.deep.equal([{ sourceId: splittermondEffect.uuid, value: 0 }]);
                expect(actor.isEffectIneffective(splittermondEffect)).to.be.false;
            })
        );
    });
}

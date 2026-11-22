import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import sinon from "sinon";
import type SplittermondActor from "module/actor/actor";
import { rollMagicFumble } from "module/actor/fumble/handleMagicFumble";
import { foundryApi } from "module/api/foundryApi";
import { modifiers, type SplittermondModifier } from "module/config/modifiers";
import { calculateDefenseTickCost } from "module/util/chat";
import { withActor } from "./fixtures";
import { passesEventually } from "../util";

interface EffectScenario {
    name: SplittermondModifier;
    type: "strength" | "mastery";
    before: number[];
    after: number[];
    setup?: (actor: SplittermondActor) => Promise<void>;
    values: (actor: SplittermondActor) => number[] | Promise<number[]>;
}

export function compendiumEffectValuesTest({ describe, it, expect, afterEach }: QuenchBatchContext) {
    const sandbox = sinon.createSandbox();
    let fumbleMessages: sinon.SinonStub<
        Parameters<typeof foundryApi.createChatMessage>,
        ReturnType<typeof foundryApi.createChatMessage>
    >;
    afterEach(() => sandbox.restore());

    const scenarios: EffectScenario[] = [
        ...(
            [
                ["blitzreflexe", "mastery", "initiative", 8, 5],
                ["flink", "strength", "speed", 7, 8],
                ["robust", "strength", "healthpoints", 7, 8],
                ["erhöhter fokuspool", "strength", "focuspoints", 8, 13],
                ["gute reflexe", "mastery", "defense", 16, 18],
                ["hoher körperlicher widerstand", "strength", "bodyresist", 16, 18],
                ["hoher geistiger widerstand", "strength", "mindresist", 16, 18],
            ] as const
        ).map(([name, type, value, before, after]) => ({
            name,
            type,
            before: [before],
            after: [after],
            values: (actor: SplittermondActor) => [actor.derivedValues[value].value.calculateSync()],
        })),
        {
            name: "natürlicher rüstungsschutz",
            type: "strength",
            before: [0],
            after: [1],
            values: (actor) => [actor.damageReduction.calculateSync()],
        },
        {
            name: "zusätzliche splitterpunkte",
            type: "strength",
            before: [3],
            after: [5],
            values: (actor) => [actor.splinterpoints.max],
        },
        {
            name: "schwächlich",
            type: "strength",
            before: [5, 35],
            after: [3, 21],
            values: (actor) => [actor.system.health.woundMalus.levels.length, actor.system.health.total.value],
        },
        ...(
            [
                ["schmerzresistenz", -1, 3],
                ["schmerzimmunität", 0, 4],
            ] as const
        ).map(([name, woundMalus, skillValue]) => ({
            name,
            type: "strength" as const,
            before: [-2, 2],
            after: [woundMalus, skillValue],
            setup: async (actor: SplittermondActor) => {
                await actor.update({ "system.health.consumed.value": 21 });
            },
            values: (actor: SplittermondActor) => [
                actor.system.health.woundMalus.value,
                actor.skills.acrobatics.value.calculateSync(),
            ],
        })),
        ...(
            [
                ["rüstungsträger i", "armor", 1, 2],
                ["schildträger i", "shield", 1, 2],
                ["rüstungsträger ii", "armor", 2, 1],
                ["schildträger ii", "shield", 2, 1],
            ] as const
        ).map(([name, equipmentType, handicap, tickMalus]) => ({
            name,
            type: "mastery" as const,
            before: [2, 2],
            after: [handicap, tickMalus],
            setup: async (actor: SplittermondActor) => {
                const [equipment] = await actor.createEmbeddedDocuments("Item", [
                    {
                        name: "Test equipment",
                        type: equipmentType,
                        system: { equipped: true, handicap: 2, tickMalus: 2, skill: "blades" },
                    },
                ]);
                await passesEventually(() => expect(equipment.effects.size).to.be.greaterThan(0));
            },
            values: (actor: SplittermondActor) => [actor.handicap.calculateSync(), actor.tickMalus.calculateSync()],
        })),
        ...(
            [
                ["erhöhte lebensregeneration", "health"],
                ["erhöhte fokusregeneration", "focus"],
            ] as const
        ).map(([name, resource]) => ({
            name,
            type: "strength" as const,
            before: [4],
            after: [2],
            values: async (actor: SplittermondActor) => {
                await actor.update({ [`system.${resource}.consumed.value`]: 8 });
                await actor.longRest(false, false);
                return [actor.system[resource].consumed.value];
            },
        })),
        ...(
            [
                ["schnelle schildabwehr", [2, 3, 3]],
                ["beidhändige abwehr", [2, 2, 3]],
            ] as const
        ).map(([name, after]) => ({
            name,
            type: "mastery" as const,
            before: [3, 3, 3],
            after: [...after],
            setup: async (actor: SplittermondActor) => {
                await actor.createEmbeddedDocuments("Item", [
                    { name: "Test shield", type: "shield", system: { equipped: true, skill: "blades" } },
                    ...(["blades", "staffs"] as const).map((skill) => ({
                        name: skill === "blades" ? "Test blade" : "Test staff",
                        type: "weapon",
                        system: { equipped: true, skill, attribute1: "agility", attribute2: "strength" },
                    })),
                ]);
            },
            values: (actor: SplittermondActor) =>
                Promise.all(
                    ["Test shield", "Test blade", "Test staff"].map((name) => {
                        const defense = actor.activeDefense.defense.find((entry) => entry.name === name);
                        expect(defense, `active defense for ${name}`).to.exist;
                        return calculateDefenseTickCost({ defenseType: "defense", itemData: defense }, 1);
                    })
                ),
        })),
        {
            name: "stabile magie",
            type: "strength",
            before: [36],
            after: [21],
            setup: async () => {
                // Inspect the real rendered result without posting chat messages to the test world.
                fumbleMessages = sandbox.stub(foundryApi, "createChatMessage").resolves();
            },
            values: async (actor) => {
                // 2d10 + 50 always lands in the 36–70 tier, independently of the dice result.
                await rollMagicFumble(actor, { eg: 1, costs: "50", skill: "firemagic", askUser: false });
                const chatData = fumbleMessages.lastCall.args[0];
                if (!("content" in chatData) || typeof chatData.content !== "string") {
                    throw new Error("Missing fumble chat data");
                }
                const html = new DOMParser().parseFromString(chatData.content, "text/html");
                const range = html.querySelector(".fumble-table-result-item-active .fumble-table-result-item-range");
                expect(range, "selected fumble table tier").to.exist;
                return [Number.parseInt(range!.textContent!, 10)];
            },
        },
    ];

    describe("Bundled effect values after automatic item assignment", () => {
        it("covers every effect template in the built compendium exactly once", async () => {
            const pack = foundryApi.collections.packs.get("splittermond.activeeffects");
            expect(pack, "active-effects compendium").to.exist;
            const index = await pack!.getIndex({ fields: ["_id"] });
            const coveredIds = scenarios.map(({ name }) => modifiers[name].split(".").pop());
            expect(coveredIds).to.have.length(new Set(coveredIds).size);
            expect(coveredIds).to.have.members(index.contents.map((entry) => entry._id));
        });

        for (const scenario of scenarios) {
            it(
                `${scenario.name} changes its computed values from ${scenario.before} to ${scenario.after}`,
                withActor(async (actor) => {
                    await scenario.setup?.(actor);
                    expect(await scenario.values(actor), "before assignment").to.deep.equal(scenario.before);

                    const [item] = await actor.createEmbeddedDocuments("Item", [
                        { name: scenario.name, type: scenario.type, system: { skill: "blades" } },
                    ]);
                    await passesEventually(() => {
                        expect(item.effects).to.have.length(1);
                        expect(item.effects.contents[0].getFlag("core", "sourceId")).to.equal(modifiers[scenario.name]);
                    });

                    expect(await scenario.values(actor), "after assignment").to.deep.equal(scenario.after);
                })
            );
        }
    });
}

import { expect } from "chai";
import { from14_3_1_migrateDerivedValuePaths } from "module/activeEffect/dataModel/migrations";

describe("Legacy compendium derived-value paths", () => {
    for (const path of ["initiative", "speed", "healthpoints", "focuspoints", "defense", "bodyresist", "mindresist"]) {
        it(`makes the legacy ${path} entry consumable without replacing its other data`, () => {
            const entry = {
                path: `actor.${path}`,
                serializedValue: { type: "reference", propertyPath: "attributes.intuition.value" },
                implementation: "inverse",
                selectable: true,
                attributes: { name: "Custom name", type: "magic" },
            };
            const source = { modifiers: [entry], costModifiers: [], changes: [] };
            const expected = structuredClone(source);
            expected.modifiers[0].path = path;

            from14_3_1_migrateDerivedValuePaths(source);
            from14_3_1_migrateDerivedValuePaths(source);

            expect(source).to.deep.equal(expected);
            expect(source.modifiers[0]).to.equal(entry);
        });
    }

    it("preserves resource bonuses, multipliers and unrelated modifier paths", () => {
        const paths = [
            "actor.healthpoints.bonus",
            "actor.focuspoints.bonus",
            "actor.initiative.multiplier",
            "actor.focusregeneration.multiplier",
            "actor.woundmalus.mod",
            "actor.skills",
            "item.defenseTickCost",
            "initiative",
        ];
        const source = { modifiers: paths.map((path) => ({ path })) };
        expect(from14_3_1_migrateDerivedValuePaths(structuredClone(source))).to.deep.equal(source);
    });

    for (const source of [
        undefined,
        null,
        {},
        { costModifiers: [] },
        { modifiers: null },
        { modifiers: [] },
        { modifiers: [null, {}, { path: null }, { path: 0 }] },
    ]) {
        it(`does not inject or replace missing data in ${JSON.stringify(source)}`, () => {
            expect(from14_3_1_migrateDerivedValuePaths(structuredClone(source))).to.deep.equal(source);
        });
    }

    it("normalizes case-insensitive legacy paths", () => {
        const source = { modifiers: [{ path: "Actor.Initiative" }] };
        expect(from14_3_1_migrateDerivedValuePaths(source)).to.deep.equal({ modifiers: [{ path: "initiative" }] });
    });
});

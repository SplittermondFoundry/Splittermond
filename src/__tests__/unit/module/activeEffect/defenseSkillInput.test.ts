import { expect } from "chai";
import { from14_3_1_restoreDefenseSkillInput } from "module/activeEffect/migrations/restoreDefenseSkillInput";
import { substituteSkill } from "module/activeEffect/sentinelSubstitution";

function legacyEffect(rawInput = "item.defenseTickCost skill= -1", skill = "blades") {
    return {
        name: "Beidhändige Abwehr",
        type: "modifier",
        disabled: true,
        flags: { core: { sourceId: "Compendium.source" }, splittermond: { rawInput, durationMode: "permanent" } },
        system: {
            modifiers: [
                {
                    path: "item.defenseTickCost",
                    serializedValue: { type: "amount", amount: -1 },
                    implementation: "additive",
                    selectable: false,
                    attributes: { skill, name: rawInput, type: "innate" as const },
                },
            ],
            costModifiers: [],
        },
    };
}

describe("Beidhändige Abwehr input repair", () => {
    it("recovers the selected skill while preserving custom labels, flags and disabled state", () => {
        const source = legacyEffect();
        source.system.modifiers[0].attributes.name = "Custom mastery";
        const expected = structuredClone(source);
        expected.flags.splittermond.rawInput = 'item.defenseTickCost skill="blades" -1';

        from14_3_1_restoreDefenseSkillInput(source);
        from14_3_1_restoreDefenseSkillInput(source);

        expect(source).to.deep.equal(expected);
    });

    it("fills the template input and its default label when a skill is assigned", () => {
        const source = legacyEffect('item.defenseTickCost skill="${skill}" -1', "");
        substituteSkill("blades")(source);
        expect(source.flags.splittermond.rawInput).to.equal('item.defenseTickCost skill="blades" -1');
        expect(source.system.modifiers[0].attributes.name).to.equal(source.flags.splittermond.rawInput);
        expect(source.system.modifiers[0].attributes.skill).to.equal("blades");
    });

    it("keeps an unresolved template until a concrete skill is available", () => {
        const source = legacyEffect('item.defenseTickCost skill="${skill}" -1', "");
        expect(from14_3_1_restoreDefenseSkillInput(structuredClone(source))).to.deep.equal(source);
    });

    it("does not overwrite valid user input", () => {
        const source = legacyEffect('item.defenseTickCost skill="staffs" -2');
        expect(from14_3_1_restoreDefenseSkillInput(structuredClone(source))).to.deep.equal(source);
    });

    it("does not rebuild a modified effect from the old template input", () => {
        const source = legacyEffect();
        source.system.modifiers[0].serializedValue.amount = -2;
        expect(from14_3_1_restoreDefenseSkillInput(structuredClone(source))).to.deep.equal(source);
    });

    it("does not discard additional filters", () => {
        const source = legacyEffect();
        Object.assign(source.system.modifiers[0].attributes, { item: "Custom weapon" });
        expect(from14_3_1_restoreDefenseSkillInput(structuredClone(source))).to.deep.equal(source);
    });

    for (const source of [
        null,
        {},
        { disabled: false },
        { flags: { splittermond: { rawInput: "item.defenseTickCost skill= -1" } } },
        { system: { modifiers: [] } },
    ]) {
        it(`leaves incomplete update data unchanged: ${JSON.stringify(source)}`, () => {
            expect(from14_3_1_restoreDefenseSkillInput(structuredClone(source))).to.deep.equal(source);
        });
    }
});

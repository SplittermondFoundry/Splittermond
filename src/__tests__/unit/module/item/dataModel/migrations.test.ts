import { expect } from "chai";
import {
    from13_5_2_migrate_fo_modifiers,
    from13_8_8_migrateSkillModifiers,
} from "../../../../../module/item/dataModel/migrations";

describe("Migrations from 13.5.2", () => {
    ["foreduction", "foenhancedreduction"].forEach((method) => {
        ["K2V1", "3V2", "K4", "5"].forEach((value) => {
            it(`should migrate ${method} modifiers with value ${value}`, () => {
                const input = { unrelated: 42, modifier: `${method} ${value}` };
                const result = from13_5_2_migrate_fo_modifiers(input);
                const expectedMethod = method === "foreduction" ? "focus.reduction" : "focus.enhancedreduction";
                expect(result).to.deep.equal({
                    unrelated: 42,
                    modifier: `${expectedMethod} ${value}`,
                });
            });
        });
        it(`should transfer skill selectors on ${method} modifiers`, () => {
            const input = { modifier: `${method}.deathmagic K2V1` };
            const result = from13_5_2_migrate_fo_modifiers(input);
            const expectedMethod = method === "foreduction" ? "focus.reduction" : "focus.enhancedreduction";
            expect(result).to.deep.equal({ modifier: `${expectedMethod} skill="deathmagic" K2V1` });
        });

        it(`should transfer type selectors on ${method} modifiers`, () => {
            const input = { modifier: `${method}.deathmagic.offensive K2V1` };
            const result = from13_5_2_migrate_fo_modifiers(input);
            const expectedMethod = method === "foreduction" ? "focus.reduction" : "focus.enhancedreduction";
            expect(result).to.deep.equal({ modifier: `${expectedMethod} skill="deathmagic" type="offensive" K2V1` });
        });
    });

    it("should keep migrated modifiers", () => {
        const input = { modifier: 'focus.reduction skill="deathmagic" K2V1' };
        const result = from13_5_2_migrate_fo_modifiers(input);
        expect(result).to.deep.equal({ modifier: 'focus.reduction skill="deathmagic" K2V1' });
    });

    it("should keep unaffected modifiers", () => {
        const input = { modifier: "damage +2, VTD -1, fightingSkill.melee +1" };
        const result = from13_5_2_migrate_fo_modifiers(input);
        expect(result).to.deep.equal({ modifier: "damage +2, VTD -1, fightingSkill.melee +1" });
    });

    it("should not touch inputs without modifiers", () => {
        const input = { unrelated: 42, name: "test" };
        const result = from13_5_2_migrate_fo_modifiers(input);
        expect(result).to.deep.equal({ unrelated: 42, name: "test" });
    });

    it("should handle mixed modifiers correctly", () => {
        const input = {
            modifier: "VTD +1, foreduction.deathmagic K2V1, damage +2, foenhancedreduction.lifemagic.defensive 3V2",
        };
        const result = from13_5_2_migrate_fo_modifiers(input);
        expect(result).to.deep.equal({
            modifier:
                'VTD +1, damage +2, focus.reduction skill="deathmagic" K2V1, focus.enhancedreduction skill="lifemagic" type="defensive" 3V2',
        });
    });

    it("should not add whitespace between modifiers", () => {
        const input = { modifier: "VTD +1, foreduction K2V1,   damage +2" };
        const result = from13_5_2_migrate_fo_modifiers(input);
        expect(result).to.deep.equal({
            modifier: "VTD +1, damage +2, focus.reduction K2V1",
        });
    });

    [null, undefined, "string input", { other: "property" }].forEach((input) => {
        it(`should return original object for unfit  input '${input}'`, () => {
            expect(from13_5_2_migrate_fo_modifiers(input)).to.equal(input);
        });
    });

    it("should return original object when modifier is not string", () => {
        const input = { modifier: 123 };
        const result = from13_5_2_migrate_fo_modifiers(input);
        expect(result).to.deep.equal(input);
    });
});

describe("Migrations from 13.8.8", () => {
    ["generalskills", "magicskills", "fightingskills"].forEach((oldPath) => {
        const newPath =
            oldPath === "generalskills"
                ? "actor.skills.general"
                : oldPath === "magicskills"
                  ? "actor.skills.magic"
                  : "actor.skills.fighting";

        it(`should migrate ${oldPath} to ${newPath}`, () => {
            const input = { modifier: `${oldPath} +2` };
            const result = from13_8_8_migrateSkillModifiers(input);
            expect(result).to.deep.equal({ modifier: `${newPath} +2` });
        });

        it(`should migrate ${oldPath} with negative value`, () => {
            const input = { modifier: `${oldPath} -1` };
            const result = from13_8_8_migrateSkillModifiers(input);
            expect(result).to.deep.equal({ modifier: `${newPath} -1` });
        });

        it(`should migrate ${oldPath} with attributes`, () => {
            const input = { modifier: `${oldPath} skill="athletics" +3` };
            const result = from13_8_8_migrateSkillModifiers(input);
            expect(result).to.deep.equal({ modifier: `${newPath} skill="athletics" +3` });
        });
    });

    it("should keep already migrated modifiers", () => {
        const input = { modifier: "actor.skills.general +2" };
        const result = from13_8_8_migrateSkillModifiers(input);
        expect(result).to.deep.equal({ modifier: "actor.skills.general +2" });
    });

    it("should keep unaffected modifiers", () => {
        const input = { modifier: "damage +2, VTD -1, item.weaponspeed +1" };
        const result = from13_8_8_migrateSkillModifiers(input);
        expect(result).to.deep.equal({ modifier: "damage +2, VTD -1, item.weaponspeed +1" });
    });

    it("should not touch inputs without modifiers", () => {
        const input = { unrelated: 42, name: "test" };
        const result = from13_8_8_migrateSkillModifiers(input);
        expect(result).to.deep.equal({ unrelated: 42, name: "test" });
    });

    it("should handle mixed modifiers correctly", () => {
        const input = {
            modifier: "VTD +1, generalskills +2, damage +3, magicskills -1, fightingskills +4",
        };
        const result = from13_8_8_migrateSkillModifiers(input);
        expect(result).to.deep.equal({
            modifier: "VTD +1, damage +3, actor.skills.general +2, actor.skills.magic -1, actor.skills.fighting +4",
        });
    });

    it("should handle multiple skill modifiers of the same type", () => {
        const input = {
            modifier: 'generalskills +1, generalskills skill="acrobatics" +2',
        };
        const result = from13_8_8_migrateSkillModifiers(input);
        expect(result).to.deep.equal({
            modifier: 'actor.skills.general +1, actor.skills.general skill="acrobatics" +2',
        });
    });

    it("should not add whitespace between modifiers", () => {
        const input = { modifier: "VTD +1, generalskills +2,   damage +3" };
        const result = from13_8_8_migrateSkillModifiers(input);
        expect(result).to.deep.equal({
            modifier: "VTD +1, damage +3, actor.skills.general +2",
        });
    });

    [null, undefined, "string input", { other: "property" }].forEach((input) => {
        it(`should return original object for unfit input '${input}'`, () => {
            expect(from13_8_8_migrateSkillModifiers(input)).to.equal(input);
        });
    });

    it("should return original object when modifier is not string", () => {
        const input = { modifier: 123 };
        const result = from13_8_8_migrateSkillModifiers(input);
        expect(result).to.deep.equal(input);
    });

    it("should preserve other properties in the source object", () => {
        const input = { modifier: "generalskills +2", name: "Test Item", value: 42 };
        const result = from13_8_8_migrateSkillModifiers(input);
        expect(result).to.deep.equal({ modifier: "actor.skills.general +2", name: "Test Item", value: 42 });
    });
});

import { expect } from "chai";
import {
    from0_12_20_migrateDamage,
    from0_12_20_migrateFeatures,
    from13_5_2_migrate_fo_modifiers,
    from13_8_8_migrateSkillModifiers,
    migrateFrom0_12_13,
    migrateFrom0_12_20,
} from "../../../../../module/item/dataModel/migrations";
import sinon from "sinon";
import { foundryApi } from "../../../../../module/api/foundryApi";

describe("Modifier migration from 0.12.13", () => {
    it("should replace emphasis with emphasis attribute", () => {
        const source = { modifier: "fightingSkill.melee/Hellebarde 1" };

        const result = migrateFrom0_12_13(source);

        expect(result).to.deep.equal({ modifier: 'fightingSkill.melee emphasis="Hellebarde" 1' });
    });

    it("should replace emphasis with spaces emphasis attribute", () => {
        const source = { modifier: "damage/Natürliche Waffe 1" };

        const result = migrateFrom0_12_13(source);

        expect(result).to.deep.equal({ modifier: 'damage emphasis="Natürliche Waffe" 1' });
    });

    it("should keep unaffected modifiers", () => {
        const source = {
            modifier: "FO -1,fightingSkill.melee/Hellebarde -1  ,   damage/Natürliche Waffe  +1,   VTD +2",
        };

        const result = migrateFrom0_12_13(source);

        expect(result).to.deep.equal({
            modifier:
                'FO -1, VTD +2, fightingSkill.melee emphasis="Hellebarde" -1, damage emphasis="Natürliche Waffe" +1',
        });
    });
});
describe("Modifier migration from 0.12.20", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "localize").callsFake((a) => a);
    });
    afterEach(() => sandbox.restore());

    ["damage", "weaponspeed"].forEach((path) => {
        it(`should replace emphasis with item attribute for ${path}`, () => {
            const source = { modifier: `${path}/Hellebarde 1` };

            const result = migrateFrom0_12_20(source);

            expect(result).to.deep.equal({ modifier: `${path} item="Hellebarde" 1` });
        });

        it(`should replace dot descriptor with item attribute for ${path}`, () => {
            const source = { modifier: `${path}.Hellebarde 1` };

            const result = migrateFrom0_12_20(source);

            expect(result).to.deep.equal({ modifier: `${path} item="Hellebarde" 1` });
        });

        it(`should replace emphasis with spaces emphasis attribute for ${path}`, () => {
            const source = { modifier: `${path} emphasis='Natürliche Waffe' 1` };

            const result = migrateFrom0_12_20(source);

            expect(result).to.deep.equal({ modifier: `${path} item="Natürliche Waffe" 1` });
        });

        it(`should keep unaffected modifiers for ${path}`, () => {
            const source = {
                modifier: `FO -1,fightingSkill.melee emphasis=Hellebarde -1  ,   ${path} emphasis='Natürliche Waffe'  +1,   VTD +2`,
            };

            const result = migrateFrom0_12_20(source);

            expect(result).to.deep.equal({
                modifier: `FO -1, fightingSkill.melee emphasis=Hellebarde -1, VTD +2, ${path} item="Natürliche Waffe" 1`,
            });
        });

        it(`should not engage new style modifiers`, () => {
            const source = { modifier: `${path} item="Hellebarde" damageType="Wasser" 1` };

            const result = migrateFrom0_12_20(source);

            expect(result).to.deep.equal({ modifier: `${path} item="Hellebarde" damageType="Wasser" 1` });
        });
    });

    it("should map features", () => {
        const source = { features: "Wurffähig  , Scharf       2,     Wuchtig" };

        const result = from0_12_20_migrateFeatures(source);

        expect(result).to.deep.equal({
            features: {
                internalFeatureList: [
                    { name: "Wurffähig", value: 1 },
                    { name: "Scharf", value: 2 },
                    { name: "Wuchtig", value: 1 },
                ],
            },
        });
    });

    it("should map secondary features ", () => {
        const source = { secondaryAttack: { features: "Wurffähig, Scharf 2, Wuchtig" } };

        const result = from0_12_20_migrateFeatures(source);

        expect(result).to.deep.equal({
            secondaryAttack: {
                features: {
                    internalFeatureList: [
                        { name: "Wurffähig", value: 1 },
                        { name: "Scharf", value: 2 },
                        { name: "Wuchtig", value: 1 },
                    ],
                },
            },
        });
    });

    it("should map damage", () => {
        const source = { damage: "1W6 +    3" };
        const replaced = from0_12_20_migrateDamage({ ...source });
        expect((replaced as any).damage.stringInput).to.deep.equal(source.damage);
    });

    it("should map secondary damage", () => {
        const source = { secondaryAttack: { damage: "1W6 +    3" } };
        const replaced = from0_12_20_migrateDamage({ secondaryAttack: { ...source.secondaryAttack } });
        expect((replaced as any).secondaryAttack.damage.stringInput).to.deep.equal(source.secondaryAttack.damage);
    });

    it("should not map migrated damage", () => {
        const source = { damage: { stringInput: "1W6 +    3" } };
        const replaced = from0_12_20_migrateDamage({ ...source });
        expect(replaced).to.deep.equal(source);
    });
});

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

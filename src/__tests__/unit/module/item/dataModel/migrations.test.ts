import { expect } from "chai";
import {
    from0_12_20_migrateDamage,
    from0_12_20_migrateFeatures,
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

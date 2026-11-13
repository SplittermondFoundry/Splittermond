import { expect } from "chai";
import { from13_40_0_migrateCastDuration } from "../../../../../module/item/dataModel/SpellDataModel";
import { from14_3_1_migrateSpellVariants as migrateSpellValues } from "module/item/dataModel/spellValueMigrations";

describe("Spell data model migrations", () => {
    it("does not inject castDuration for partial skill updates", () => {
        const source = { skillLevel: 2 };

        const result = from13_40_0_migrateCastDuration({ ...source }) as { skillLevel: number; castDuration?: unknown };

        expect(result).to.deep.equal(source);
    });

    it("does not add castDuration.value when partial object omits value", () => {
        const source = { castDuration: { unit: "min" } };

        const result = from13_40_0_migrateCastDuration({ castDuration: { unit: "min" } }) as {
            castDuration: { unit: string; value?: number };
        };

        expect(result).to.deep.equal(source);
    });

    it("retains preview text overrides while restoring inheritance for its empty defaults", () => {
        const source = { enhanced: { range: "20m", effectArea: "", effectDuration: "10 min" } };

        const result = migrateSpellValues(source);

        expect(result).to.deep.equal({
            range: { enhanced: "20m" },
            effectArea: { enhanced: null },
            effectDuration: { enhanced: "10 min" },
        });
    });

    it("preserves deliberately empty wrapped values and inherited nulls", () => {
        const source = { enhanced: { range: { value: "" }, effectArea: null, effectDuration: { value: "5 min" } } };

        const result = migrateSpellValues(structuredClone(source));

        expect(result).to.deep.equal({
            range: { enhanced: "" },
            effectArea: { enhanced: null },
            effectDuration: { enhanced: "5 min" },
        });
    });

    it("does not inject enhanced fields into unrelated partial updates", () => {
        const source = { description: "Unrelated update" };

        const result = migrateSpellValues({ ...source });

        expect(result).to.deep.equal(source);
    });

    it("does not reset omitted enhanced fields in a nested partial update", () => {
        const source = { enhanced: { range: "20m" } };

        const result = migrateSpellValues(source);

        expect(result).to.deep.equal({ range: { enhanced: "20m" } });
    });

    it("moves legacy normal values into base and preserves explicit no-type overrides", () => {
        const source = {
            range: "10m",
            damage: { stringInput: "1W6" },
            features: { internalFeatureList: [] },
            damageType: "wind",
            costType: null,
            enhanced: {
                range: { value: "20m" },
                damage: { stringInput: "0" },
                damageType: { value: null },
                costType: null,
            },
        };

        const result = migrateSpellValues(source);

        expect(result).to.deep.equal({
            range: { base: "10m", enhanced: "20m" },
            damage: { base: { stringInput: "1W6" }, enhanced: { stringInput: "0" } },
            features: { base: { internalFeatureList: [] } },
            damageType: { base: "wind", enhanced: "none" },
            costType: { base: "none", enhanced: null },
        });
    });

    it("preserves partial base and enhanced edits in the new format", () => {
        const source = {
            range: { enhanced: null },
            damage: { base: { stringInput: "2W6" } },
            costType: { enhanced: "none" },
            features: {},
            effectDuration: {},
        };

        const result = migrateSpellValues(structuredClone(source));

        expect(result).to.deep.equal(source);
    });

    it("does not replace a modern override with a stale preview value", () => {
        const source = { range: { base: "10m", enhanced: "30m" }, enhanced: { range: { value: "20m" } } };

        const result = migrateSpellValues(source);

        expect(result).to.deep.equal({ range: { base: "10m", enhanced: "30m" } });
    });

    it("is idempotent after converting the legacy schema", () => {
        const migrated = migrateSpellValues({ damageType: null, range: "10m", enhanced: { range: { value: "20m" } } });

        const result = migrateSpellValues(structuredClone(migrated));

        expect(result).to.deep.equal(migrated);
    });
});

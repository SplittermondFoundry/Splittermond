import { expect } from "chai";
import {
    from13_40_0_migrateCastDuration,
    from14_3_0_migrateEnhancedSpellTextValues,
} from "../../../../../module/item/dataModel/SpellDataModel";

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

        const result = from14_3_0_migrateEnhancedSpellTextValues(source);

        expect(result).to.deep.equal({
            enhanced: { range: { value: "20m" }, effectArea: null, effectDuration: { value: "10 min" } },
        });
    });

    it("preserves deliberately empty wrapped values and inherited nulls", () => {
        const source = { enhanced: { range: { value: "" }, effectArea: null, effectDuration: { value: "5 min" } } };

        const result = from14_3_0_migrateEnhancedSpellTextValues(structuredClone(source));

        expect(result).to.deep.equal(source);
    });

    it("does not inject enhanced fields into unrelated partial updates", () => {
        const source = { description: "Unrelated update" };

        const result = from14_3_0_migrateEnhancedSpellTextValues({ ...source });

        expect(result).to.deep.equal(source);
    });

    it("does not reset omitted enhanced fields in a nested partial update", () => {
        const source = { enhanced: { range: "20m" } };

        const result = from14_3_0_migrateEnhancedSpellTextValues(source);

        expect(result).to.deep.equal({ enhanced: { range: { value: "20m" } } });
    });
});

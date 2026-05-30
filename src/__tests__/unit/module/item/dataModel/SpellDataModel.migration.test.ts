import { expect } from "chai";
import { from13_40_0_migrateCastDuration } from "../../../../../module/item/dataModel/SpellDataModel";

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
});

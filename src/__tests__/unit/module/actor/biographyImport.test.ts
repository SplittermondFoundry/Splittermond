import { expect } from "chai";
import { genesisBiographyImport } from "module/actor/genesisImport/biographyImport";

describe("Genesis biography import", () => {
    it("maps descriptive fields and adds the exported measurement units", () => {
        const result = genesisBiographyImport({
            hairColor: " weißblond ",
            eyeColor: "blau",
            furColor: "hell",
            birthplace: "Tairion",
            size: 192,
            weight: 70,
        });

        expect(result).to.deep.equal({
            hairColor: "weißblond",
            eyeColor: "blau",
            skinColor: "hell",
            birthplace: "Tairion",
            height: "192 cm",
            weight: "70 kg",
        });
    });

    for (const value of [undefined, null, "", "  ", 0, false, {}]) {
        it(`omits unfilled or invalid text fields (${JSON.stringify(value)})`, () => {
            expect(
                genesisBiographyImport({ hairColor: value, eyeColor: value, furColor: value, birthplace: value })
            ).to.deep.equal({});
        });
    }

    for (const value of [undefined, null, 0, -1, NaN, Infinity, "192", {}, false]) {
        it(`omits unfilled or invalid measurements (${String(value)})`, () => {
            expect(genesisBiographyImport({ size: value, weight: value })).to.deep.equal({});
        });
    }

    it("does not supply defaults for keys missing from older exports", () => {
        expect(genesisBiographyImport({})).to.deep.equal({});
    });
});

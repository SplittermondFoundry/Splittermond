import { expect } from "chai";
import { from14_3_0_normalizeMasteryFieldTypes } from "module/item/dataModel/MasteryDataModel";

describe("Mastery field type normalization (from 14.3.0)", () => {
    it("returns non-object sources unchanged", () => {
        expect(from14_3_0_normalizeMasteryFieldTypes(null)).to.be.null;
        expect(from14_3_0_normalizeMasteryFieldTypes("mastery")).to.equal("mastery");
    });

    it("does not inject defaults into partial deltas that omit the normalized keys", () => {
        const source = { name: "Ausweichen I" };

        const result = from14_3_0_normalizeMasteryFieldTypes({ ...source });

        expect(result).to.deep.equal(source);
    });

    it("leaves explicit undefined values in partial deltas untouched", () => {
        const source = { skill: undefined, isGrandmaster: undefined };

        const result = from14_3_0_normalizeMasteryFieldTypes({ ...source });

        expect(result).to.deep.equal(source);
    });

    it("keeps well-typed values untouched", () => {
        const source = {
            description: "<p>text</p>",
            source: "W60",
            availableIn: "staffs, swords",
            modifier: "FO +1",
            skill: "staffs",
            isGrandmaster: false,
            isManeuver: true,
            level: 2,
        };

        const result = from14_3_0_normalizeMasteryFieldTypes({ ...source });

        expect(result).to.deep.equal(source);
    });

    it("coerces booleans from strings and numbers", () => {
        const result = from14_3_0_normalizeMasteryFieldTypes({ isGrandmaster: "true", isManeuver: 1 }) as Record<
            string,
            unknown
        >;

        expect(result.isGrandmaster).to.be.true;
        expect(result.isManeuver).to.be.true;
    });

    it("does not coerce the string 'false' or a zero number to true", () => {
        const result = from14_3_0_normalizeMasteryFieldTypes({ isGrandmaster: "false", isManeuver: 0 }) as Record<
            string,
            unknown
        >;

        expect(result.isGrandmaster).to.be.false;
        expect(result.isManeuver).to.be.false;
    });

    it("defaults unparseable booleans to false", () => {
        const result = from14_3_0_normalizeMasteryFieldTypes({
            isGrandmaster: null,
            isManeuver: "vielleicht",
        }) as Record<string, unknown>;

        expect(result.isGrandmaster).to.be.false;
        expect(result.isManeuver).to.be.false;
    });

    it("coerces numeric level strings and defaults garbage to 0", () => {
        const stringLevel = from14_3_0_normalizeMasteryFieldTypes({ level: "3" }) as unknown as { level: number };
        const nullLevel = from14_3_0_normalizeMasteryFieldTypes({ level: null }) as unknown as { level: number };
        const garbageLevel = from14_3_0_normalizeMasteryFieldTypes({ level: "III" }) as unknown as { level: number };

        expect(stringLevel.level).to.equal(3);
        expect(nullLevel.level).to.equal(0);
        expect(garbageLevel.level).to.equal(0);
    });

    it("coerces numeric skill values to strings", () => {
        const numericSkill = from14_3_0_normalizeMasteryFieldTypes({ skill: 7 }) as unknown as { skill: string };

        expect(numericSkill.skill).to.equal("7");
    });

    it("normalizes unparseable skill values to null", () => {
        const nullSkill = from14_3_0_normalizeMasteryFieldTypes({ skill: null }) as unknown as { skill: string | null };
        const objectSkill = from14_3_0_normalizeMasteryFieldTypes({
            skill: { id: "melee" },
        }) as unknown as { skill: string | null };

        expect(nullSkill.skill).to.be.null;
        expect(objectSkill.skill).to.be.null;
    });

    it("normalizes the legacy no-skill sentinels to null", () => {
        const emptySkill = from14_3_0_normalizeMasteryFieldTypes({ skill: "" }) as unknown as { skill: string | null };
        const noneSkill = from14_3_0_normalizeMasteryFieldTypes({ skill: "none" }) as unknown as {
            skill: string | null;
        };

        expect(emptySkill.skill).to.be.null;
        expect(noneSkill.skill).to.be.null;
    });

    it("coerces nullable string fields from numbers, booleans and arrays", () => {
        const result = from14_3_0_normalizeMasteryFieldTypes({
            availableIn: ["staffs", "swords"],
            modifier: 2,
            description: null,
            source: false,
        }) as Record<string, unknown>;

        expect(result.availableIn).to.equal("staffs, swords");
        expect(result.modifier).to.equal("2");
        expect(result.description).to.be.null;
        expect(result.source).to.equal("false");
    });

    it("normalizes unparseable nullable string fields to null", () => {
        const result = from14_3_0_normalizeMasteryFieldTypes({ availableIn: { skill: "staffs" } }) as Record<
            string,
            unknown
        >;

        expect(result.availableIn).to.be.null;
    });
});

import { expect } from "chai";
import { describe, it } from "mocha";
import { parseAvailableIn } from "module/actor/sheets/parseAvailableIn";

describe("parseAvailableIn", () => {
    const allowedSkills = ["firemagic", "illusionmagic", "deathmagic"];

    it("should return empty array for empty string", () => {
        expect(parseAvailableIn("", allowedSkills)).to.deep.equal([]);
    });

    it("should parse single skill with level", () => {
        expect(parseAvailableIn("firemagic 3", allowedSkills)).to.deep.equal([{ skill: "firemagic", level: 3 }]);
    });

    it("should parse multiple skills with levels", () => {
        expect(parseAvailableIn("firemagic 3, illusionmagic 2", allowedSkills)).to.deep.equal([
            { skill: "firemagic", level: 3 },
            { skill: "illusionmagic", level: 2 },
        ]);
    });

    it("should return null level for skill without level", () => {
        expect(parseAvailableIn("firemagic", allowedSkills)).to.deep.equal([{ skill: "firemagic", level: null }]);
    });

    it("should filter out invalid skills", () => {
        expect(parseAvailableIn("firemagic 3, invalidskill 1", allowedSkills)).to.deep.equal([
            { skill: "firemagic", level: 3 },
        ]);
    });
});

describe("parseMasteryAvailableIn", () => {
    const allowedSkills = ["athletics", "acrobatics", "melee"];

    it("should return empty array for empty string", () => {
        expect(parseAvailableIn("", allowedSkills)).to.deep.equal([]);
    });

    it("should parse single skill", () => {
        expect(parseAvailableIn("athletics", allowedSkills)).to.deep.equal([{ skill: "athletics", level: null }]);
    });

    it("should parse multiple skills", () => {
        expect(parseAvailableIn("athletics, acrobatics", allowedSkills)).to.deep.equal([
            { skill: "athletics", level: null },
            { skill: "acrobatics", level: null },
        ]);
    });

    it("should filter out invalid skills", () => {
        expect(parseAvailableIn("athletics, invalidskill", allowedSkills)).to.deep.equal([
            { skill: "athletics", level: null },
        ]);
    });

    it("should handle null input", () => {
        expect(parseAvailableIn(null as any, allowedSkills)).to.deep.equal([]);
    });
});

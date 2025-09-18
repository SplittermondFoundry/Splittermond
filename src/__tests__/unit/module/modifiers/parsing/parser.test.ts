import { parseModifiers } from "module/modifiers/parsing";
import { expect } from "chai";
import sinon, { SinonSandbox } from "sinon";
import { clearMappers } from "module/modifiers/parsing/normalizer";
import { foundryApi } from "module/api/foundryApi";
import { stubRollApi } from "../../../RollMock";

describe("Modifier Parser", () => {
    let sandbox: SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        clearMappers();
        stubRollApi(sandbox);
        sandbox.stub(foundryApi, "format").callsFake((key: string) => key);
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => key);
    });

    afterEach(() => {
        sandbox.restore();
    });
    (
        [
            ["AUS +1", { path: "AUS", attributes: { value: 1 } }],
            ["bonuscap -1", { path: "bonuscap", attributes: { value: -1 } }],
            ["speed.multiplier 2", { path: "speed.multiplier", attributes: { value: 2 } }],
            ["gsw.mult 0", { path: "gsw.mult", attributes: { value: 0 } }],
            [
                "generalskills.firemagic/Schaden +2",
                {
                    path: "generalskills.firemagic",
                    attributes: { emphasis: "Schaden", value: 2 },
                },
            ],
        ] as const
    ).forEach(([input, expected]) => {
        it(`should parse the old style ${input}`, () => {
            const parseResult = parseModifiers(input);
            expect(parseResult.modifiers).to.deep.equal([expected]);
        });
    });

    (
        [
            ["AUS +1", { path: "AUS", attributes: { value: 1 } }],
            ["bonuscap -1", { path: "boNuscap", attributes: { value: -1 } }],
            ["speed.multiplier 2", { path: "spEed.multiplier", attributes: { value: 2 } }],
            [
                "generalskills.firemagic/Schaden +2",
                {
                    path: "geNeralskills.firemagic",
                    attributes: { emphasis: "Schaden", value: 2 },
                },
            ],
        ] as const
    ).forEach(([input, expected]) => {
        it(`should parse ${input} with random capitalization`, () => {
            const enlargedPath = input.substring(0, 2) + input[2].toUpperCase() + input.substring(3);
            const parseResult = parseModifiers(enlargedPath);
            expect(parseResult.modifiers).to.deep.equal([expected]);
        });
    });
    (
        [
            [
                "AUS value=${GSW}",
                { path: "AUS", attributes: { value: { propertyPath: "GSW", sign: 1, original: "GSW" } } },
            ],
            [
                "AUS value=-${GSW}",
                { path: "AUS", attributes: { value: { propertyPath: "GSW", sign: -1, original: "GSW" } } },
            ],
            [
                "AUS value=+${GSW}",
                { path: "AUS", attributes: { value: { propertyPath: "GSW", sign: 1, original: "GSW" } } },
            ],
            ["AUS ${GSW}", { path: "AUS", attributes: { value: { propertyPath: "GSW", sign: 1, original: "GSW" } } }],
            ["AUS -${GSW}", { path: "AUS", attributes: { value: { propertyPath: "GSW", sign: -1, original: "GSW" } } }],
            ["AUS +${GSW}", { path: "AUS", attributes: { value: { propertyPath: "GSW", sign: 1, original: "GSW" } } }],
            [
                "AUS +${Geschichte und Mythen}",
                {
                    path: "AUS",
                    attributes: {
                        value: { propertyPath: "Geschichte und Mythen", sign: 1, original: "Geschichte und Mythen" },
                    },
                },
            ],
            [
                "AUS value=-${Geschichte und Mythen}",
                {
                    path: "AUS",
                    attributes: {
                        value: { propertyPath: "Geschichte und Mythen", sign: -1, original: "Geschichte und Mythen" },
                    },
                },
            ],
            [
                "AUS value='-${Geschichte und Mythen}'",
                {
                    path: "AUS",
                    attributes: {
                        value: { propertyPath: "Geschichte und Mythen", sign: -1, original: "Geschichte und Mythen" },
                    },
                },
            ],
            [
                "damage weapon='Fulnisches Doppelschwert' +1",
                {
                    path: "damage",
                    attributes: { weapon: "Fulnisches Doppelschwert", value: 1 },
                },
            ],
            [
                "generalSkills.firemagic emphasis=Schaden value=2",
                {
                    path: "generalSkills.firemagic",
                    attributes: { value: 2, emphasis: "Schaden" },
                },
            ],
            ['handicap.shield.mod value="3"', { path: "handicap.shield.mod", attributes: { value: 3 } }],
        ] as const
    ).forEach(([input, expected]) => {
        it(`should parse the new style mod '${input}'`, () => {
            const parseResult = parseModifiers(input);
            expect(parseResult.modifiers).to.deep.equal([expected]);
        });
    });

    ["", null, undefined].forEach((input) => {
        it(`should return empty array for empty input '${input}'`, () => {
            const parseResult = parseModifiers(input);
            expect(parseResult).to.deep.equal({ modifiers: [], errors: [] });
        });
    });

    [
        "AUS a='b\" 1",
        "AUS a='=' 1",
        "AUS ==1 1",
        "AUS",
        "AUS=1",
        'damage/Sehr gute Handschuhe damageType="fire" value=1',
    ].forEach((input) => {
        it(`should return error for invalid modifier format ${input}`, () => {
            const result = parseModifiers(input);
            expect(result.errors).to.deep.equal(["splittermond.modifiers.parseMessages.notAModifier"]);
            expect(result.modifiers).to.be.empty;
        });
    });
    it("split modifiers by comma", () => {
        const input = "npcattacks +1, generalskills +1";

        const result = parseModifiers(input).modifiers;
        expect(result[0]).to.deep.equal({
            path: "npcattacks",
            attributes: { value: 1 },
        });
        expect(result[1]).to.deep.equal({
            path: "generalskills",
            attributes: { value: 1 },
        });
    });

    it("should not split commas inside quotes", () => {
        const input = "damage Merkmale=\"Durchdringung 2, Kritisch 2\" 1, damage Merkmale='Feuer 1, Kälte 2' 1";

        const result = parseModifiers(input).modifiers;

        expect(result).to.have.length(2);
        expect(result[0]).to.deep.equal({
            path: "damage",
            attributes: {
                Merkmale: "Durchdringung 2, Kritisch 2",
                value: 1,
            },
        });
        expect(result[1]).to.deep.equal({
            path: "damage",
            attributes: {
                Merkmale: "Feuer 1, Kälte 2",
                value: 1,
            },
        });
    });

    it("should return error for duplicate emphasis declaration", () => {
        const input = 'AUS/Schaden emphasis="Schaden" +1';
        const result = parseModifiers(input);
        expect(result.errors).to.deep.equal(["splittermond.modifiers.parseMessages.duplicateEmphasis"]);
    });

    it("should return error for duplicate attribute declaration", () => {
        const input = "damage damageType=\"fire\" damageType='light' +1";
        const result = parseModifiers(input);
        expect(result.errors).to.deep.equal(["splittermond.modifiers.parseMessages.duplicateAttribute"]);
    });

    it("should return error for duplicate value declaration", () => {
        const input = "AUS value=2 -1";
        const result = parseModifiers(input);
        expect(result.errors).to.deep.equal(["splittermond.modifiers.parseMessages.duplicateValue"]);
    });

    it("should return error for missing value declaration", () => {
        const input = "AUS emphasis=Schaden";
        const result = parseModifiers(input);
        expect(result.errors).to.deep.equal(["splittermond.modifiers.parseMessages.noValue"]);
    });

    ["AUS 1='a' 1"].forEach((input) => {
        it(`should return error for invalid key ${input}`, () => {
            const result = parseModifiers(input);
            expect(result.errors).to.satisfy((errors: string[]) =>
                errors.some((e) => e.includes("splittermond.modifiers.parseMessages.invalidAttributeKey"))
            );
        });
    });
});

describe("Modifier Normalization", () => {
    let sandbox: SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        clearMappers();
        stubRollApi(sandbox);
        sandbox.stub(foundryApi, "format").callsFake((key: string) => key);
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => {
            switch (key) {
                case "splittermond.modifiers.keys.emphasis":
                    return "Schwerpunkt";
                case "splittermond.modifiers.keys.value":
                    return "Wert";
                default:
                    return key;
            }
        });
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should normalize emphasis keyword", () => {
        const input = "generalSkills.firemagic Schwerpunkt=Schaden value=2";

        const result = parseModifiers(input).modifiers;

        expect(result[0].attributes.emphasis).to.equal("Schaden");
    });

    it("should normalize value keyword", () => {
        const input = "generalSkills.firemagic Wert=2";

        const result = parseModifiers(input).modifiers;

        expect(result[0].attributes.value).to.equal(2);
    });

    it("should validate emphasis despite normalization", () => {
        const input = "generalSkills/Schaden Schwerpunkt=Schaden value=2";

        const result = parseModifiers(input).errors;

        expect(result[0]).to.equal("splittermond.modifiers.parseMessages.duplicateEmphasis");
    });

    it("should validate value despite normalization", () => {
        const input = "generalSkills.firemagic Wert=2 2";

        const result = parseModifiers(input).errors;

        expect(result[0]).to.equal("splittermond.modifiers.parseMessages.duplicateValue");
    });
});

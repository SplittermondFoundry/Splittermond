import { expect } from "chai";
import sinon, { SinonSandbox } from "sinon";
import { foundryApi } from "module/api/foundryApi";
import { clearMappers, normalizeKey, normalizeValue } from "module/modifiers/parsing/normalizer";

describe("normalizeModifiers", () => {
    let sandbox: SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        clearMappers();
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => {
            switch (key) {
                case "splittermond.modifiers.keys.emphasis":
                    return "Schwerpunkt";
                case "splittermond.modifiers.keys.damageType":
                    return "Schadensart";
                case "splittermond.modifiers.keys.value":
                    return "Wert";
                case "splittermond.derivedAttribute.speed.short":
                    return "GSW";
                case "splittermond.attribute.charisma.short":
                    return "AUS";
                case "splittermond.attribute.strength.short":
                    return "STR";
                case "splittermond.attribute.agility.short":
                    return "BEW";
                case "splittermond.skillLabel.history":
                    return "Geschichte und Mythen";
                default:
                    return key;
            }
        });
    });

    afterEach(() => {
        sandbox.restore();
    });
    [
        ["Schadensart", "damageType"],
        ["Wert", "value"],
        ["Schwerpunkt", "emphasis"],
        ["AUS", "AUS"],
        ["GSW", "GSW"],
    ].forEach(([key, expected]) => {
        it(`should replace key '${key}' with`, () => {
            expect(normalizeKey(key)).to.deep.equal(expected);
        });
    });

    (
        [
            [
                { propertyPath: "system.health.available", sign: 1, original: "system.health.available" },
                {
                    propertyPath: "system.health.available",
                    sign: 1,
                    original: "system.health.available",
                    isStable: false,
                },
            ],
            [
                { propertyPath: "AUS", sign: 1, original: "AUS" },
                {
                    propertyPath: "attributes.charisma.value",
                    sign: 1,
                    original: "AUS",
                    isStable: true,
                },
            ],
            ["+AUS", { propertyPath: "attributes.charisma.value", sign: 1, original: "+AUS", isStable: true }],
            ["-AUS", { propertyPath: "attributes.charisma.value", sign: -1, original: "-AUS", isStable: true }],
            [
                "Geschichte und Mythen",
                {
                    propertyPath: "skills.history.baseValue",
                    sign: 1,
                    original: "Geschichte und Mythen",
                    isStable: true,
                },
            ],
        ] as const
    )
        .map(([value, expected]) => [
            typeof value === "object" && "original" in value ? value.original : value,
            value,
            expected,
        ])
        .forEach(([title, value, expected]) => {
            it(`should replace value '${title}'`, () => {
                expect(normalizeValue(value)).to.deep.equal(expected);
            });
        });

    ["K2V2", "-K4V2", "-12V8", "12V8"].forEach((value) => {
        it(`should not replace value '${value}'`, () => {
            expect(normalizeValue(value)).to.deep.equal(value);
        });
    });
});

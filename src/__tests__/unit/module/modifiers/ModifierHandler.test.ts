import { describe } from "mocha";
import { expect } from "chai";
import { ModifierHandler } from "module/modifiers/ModiferHandler";
import type { ScalarModifier } from "module/modifiers/parsing";
import type { IModifier } from "module/actor/modifier-manager";
import sinon from "sinon";
import { type Expression, of } from "module/modifiers/expressions/scalar";
import { foundryApi } from "module/api/foundryApi";
import { type ConfigSegment, makeConfig } from "module/modifiers/ModifierConfig";

class TestModifierHandler extends ModifierHandler {
    static get config() {
        return makeConfig({
            topLevelPath: "test",
            subSegments: {
                one: {
                    subSegments: {
                        onedotone: {},
                    },
                },
                two: {},
            },
        });
    }

    buildModifier(_: ScalarModifier, __: ConfigSegment): IModifier | null {
        return null;
    }

    omitForValue(_: Expression): boolean {
        return false;
    }
}

describe("Modifier handler", () => {
    const sandbox = sinon.createSandbox();
    beforeEach(() => {
        sandbox.stub(foundryApi, "format").callsFake((key) => key);
    });

    afterEach(() => {
        sandbox.restore();
    });

    ["tst", "test.three", "tst.one", "test.one.onedottwo"].forEach((path) => {
        it(`should fail for invalid path '${path}'`, () => {
            const config = TestModifierHandler.config;
            const errors: string[] = [];
            const probe = new TestModifierHandler(toLog(errors), config);

            probe.processModifier({ path, value: of(1), attributes: {} });

            expect(errors).to.have.length(1);
            expect(errors[0]).to.equal("splittermond.modifiers.parseMessages.unknownGroupId");
        });
    });
    (
        [
            ["test", TestModifierHandler.config],
            ["test.one", TestModifierHandler.config.subSegments!.one],
            ["test.two", TestModifierHandler.config.subSegments!.two],
            ["test.one.onedotone", TestModifierHandler.config.subSegments!.one.subSegments!.onedotone],
        ] as const
    ).forEach(([path, expectedConfig]) => {
        it(`should produce modifier for valid path '${path}'`, () => {
            const config = TestModifierHandler.config;
            const errors: string[] = [];
            const probe = new TestModifierHandler(toLog(errors), config);
            const buildSpy = sandbox.spy(probe, "buildModifier");

            probe.processModifier({ path, value: of(1), attributes: {} });

            expect(errors).to.be.empty;
            expect(buildSpy.lastCall.lastArg).to.deep.equal(expectedConfig);
        });
    });

    it("should not proceed for invalid groupIds", () => {
        // Test that processing stops when an invalid path is encountered
        const config = TestModifierHandler.config;
        const probe = new TestModifierHandler(toLog(), config);
        const buildSpy = sandbox.spy(probe, "buildModifier");

        const result = probe.processModifier({ path: "invalid.path", value: of(1), attributes: {} });

        expect(result).to.be.null;
        expect(buildSpy.callCount).to.equal(0);
    });

    it("should consider uppercased paths as valid", () => {
        // Test that paths with uppercase letters are properly handled
        const config = TestModifierHandler.config;
        const probe = new TestModifierHandler(toLog(), config);
        const buildSpy = sandbox.spy(probe, "buildModifier");

        probe.processModifier({ path: "TEST.ONE", value: of(1), attributes: {} });

        expect(buildSpy.callCount).to.equal(1);
    });

    it("should report unknown attributes", () => {
        const config = { ...TestModifierHandler.config };
        config.subSegments!.one.requiredAttributes.push("required1");
        config.subSegments!.one.optionalAttributes.push("optional1");

        const errors: string[] = [];
        const probe = new TestModifierHandler(toLog(errors), config);

        probe.processModifier({
            path: "test.one",
            value: of(1),
            attributes: {
                required1: "value1",
                optional1: "value2",
                unknownAttr1: "unknown1",
                unknownAttr2: "unknown2",
            },
        });

        // Should report 2 unknown attributes
        expect(errors).to.have.length(2);
        expect(errors).to.include("splittermond.modifiers.parseMessages.unknownDescriptor");
    });

    it("should report missing required attributes", () => {
        const config = TestModifierHandler.config;
        config.subSegments!.one.requiredAttributes.push("iamrequired");
        const errors: string[] = [];
        const probe = new TestModifierHandler(toLog(errors), config);

        probe.processModifier({ path: "test.one", value: of(1), attributes: {} });

        expect(errors).to.have.length(1);
        expect(errors[0]).to.equal("splittermond.modifiers.parseMessages.missingDescriptor");
    });
    it("should not proceed for missing required attributes", () => {
        // Test that buildModifier is not called when required attributes are missing
        const config = TestModifierHandler.config;
        config.subSegments!.one.requiredAttributes.push("mustHave");

        const errors: string[] = [];
        const probe = new TestModifierHandler(toLog(errors), config);
        const buildSpy = sandbox.spy(probe, "buildModifier");

        const result = probe.processModifier({
            path: "test.one",
            value: of(1),
            attributes: {
                // Missing the required "mustHave" attribute
                someOtherAttr: "value",
            },
        });

        expect(result).to.be.null;
        expect(errors).to.have.length(1);
        expect(errors).to.include("splittermond.modifiers.parseMessages.missingDescriptor");
        expect(buildSpy.callCount).to.equal(0);
    });
});
function toLog(collector: string[] = []) {
    return (...msgs: string[]) => collector.push(...msgs);
}

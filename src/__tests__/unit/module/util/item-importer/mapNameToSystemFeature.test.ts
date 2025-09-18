import { describe } from "mocha";
import { mapNameToSystemFeature } from "../../../../../module/util/item-importer/mapNameToSystemFeature";
import { expect } from "chai";
import sinon, { SinonSandbox } from "sinon";
import { foundryApi } from "../../../../../module/api/foundryApi";
import { initLocalizer } from "./poorMansLocalizer";

describe("MapNameToSystemFeature", () => {
    it("should ignore features that are not susceptibilities", () => {
        const input = { name: "foo", type: "npcFeature", system: {} };

        const result = mapNameToSystemFeature({ ...input });

        expect(result).to.deep.equal(input);
    });

    describe("Susceptibility recognition", () => {
        let sandbox: SinonSandbox;
        beforeEach(() => {
            sandbox = sinon.createSandbox();
            sandbox.stub(foundryApi, "localize").callsFake(initLocalizer());
        });
        afterEach(() => sandbox.restore());

        (
            [
                ["Verwundbarkeit gegen Feuerschaden", "weakness.fire 1"],
                ["Resistenz gegen Elektrizitätsschaden", "resistance.electric 1"],
                ["Resistenz gegen Lichtschaden 6", "resistance.light 6"],
                ["Verwundbarkeit gegen Kälteschaden 3", "weakness.cold 3"],
            ] as const
        ).forEach(([name, expectedModifier]) => {
            it(`should recognize ${name}`, () => {
                const result = mapNameToSystemFeature({ ...{ name, type: "npcFeature", system: {} } });

                expect(result.system.modifier).to.deep.equal(expectedModifier);
            });
        });

        (
            [
                ["verwundbarkeit gegen Feuerschaden", "weakness.fire 1"],
                ["verwundbarkeit gegen      Feuerschaden", "weakness.fire 1"],
                ["resistenz gegen   Schattenschaden 4", "resistance.shadow 4"],
                ["verwundbarkeit    gegen Hitzeschaden 2", "weakness.heat 2"],
                ["Resistenz gegen felsSchaden      5", "resistance.rock 5"],
            ] as const
        ).forEach(([name, expectedModifier]) => {
            it(`should handle typing deviation ${name}`, () => {
                const result = mapNameToSystemFeature({ ...{ name, type: "npcFeature", system: {} } });

                expect(result.system.modifier).to.deep.equal(expectedModifier);
            });
        });

        (
            [
                ["Verwundbarkeit gegen Mentalen Schaden 4", "weakness.mental 4"],
                ["Resistenz gegen Physischen Schaden 3", "resistance.physical 3"],
            ] as const
        ).forEach(([name, expectedModifier]) => {
            it(`should handle typing deviation ${name}`, () => {
                const result = mapNameToSystemFeature({ ...{ name, type: "npcFeature", system: {} } });

                expect(result.system.modifier).to.be.equal(expectedModifier);
            });
        });
    });
});

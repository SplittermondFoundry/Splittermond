import { afterEach, beforeEach, describe, it } from "mocha";
import { expect } from "chai";
import sinon, { type SinonSandbox } from "sinon";
import { foundryApi } from "module/api/foundryApi";
import { warnStatusEffectTimer } from "module/item/statusEffectTimer";

describe("Status effect timer warnings", () => {
    let sandbox: SinonSandbox;
    beforeEach(() => (sandbox = sinon.createSandbox()));
    afterEach(() => sandbox.restore());

    for (const [interval, repeats] of [
        [null, null],
        ["", ""],
        [15, 6],
        ["15", "6"],
    ] as const) {
        it(`does not warn when both fields are empty or filled (${interval}, ${repeats})`, () => {
            const warning = sandbox.stub(foundryApi, "warnUser");

            warnStatusEffectTimer("Burning", interval, repeats);

            expect(warning.called).to.be.false;
        });
    }

    for (const [interval, repeats] of [
        [15, 0],
        ["15", "0"],
        ["15", "0.0"],
    ] as const) {
        it(`warns about zero repetitions with a filled interval (${interval}, ${repeats})`, () => {
            const warning = sandbox.stub(foundryApi, "warnUser");

            warnStatusEffectTimer("Burning", interval, repeats);

            expect(warning.calledOnceWithExactly("splittermond.message.statusEffectZeroRepeats", { name: "Burning" }))
                .to.be.true;
        });
    }

    for (const [interval, repeats] of [
        [15, null],
        ["15", ""],
    ] as const) {
        it(`warns about missing repetitions (${interval}, ${repeats})`, () => {
            const warning = sandbox.stub(foundryApi, "warnUser");

            warnStatusEffectTimer("Burning", interval, repeats);

            expect(
                warning.calledOnceWithExactly("splittermond.message.statusEffectMissingRepeats", {
                    name: "Burning",
                })
            ).to.be.true;
        });
    }

    for (const [interval, repeats] of [
        [null, 6],
        ["", "6"],
        [null, 0],
        ["", "0"],
    ] as const) {
        it(`warns about a missing interval (${interval}, ${repeats})`, () => {
            const warning = sandbox.stub(foundryApi, "warnUser");

            warnStatusEffectTimer("Burning", interval, repeats);

            expect(
                warning.calledOnceWithExactly("splittermond.message.statusEffectMissingInterval", {
                    name: "Burning",
                })
            ).to.be.true;
        });
    }
});

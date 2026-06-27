import { DamageType, damageTypes } from "module/config/damageTypes";
import { createDamageEvent, createDamageImplement } from "./damageEventTestHelper";
import sinon, { SinonSandbox } from "sinon";
import SplittermondActor from "../../../../../module/actor/actor";
import { calculateDamageOnTarget, UserReporter } from "module/util/damage/calculateDamageOnTarget";
import { Cost, CostModifier } from "module/util/costs/Cost";
import { expect } from "chai";
import { AgentReference } from "module/data/references/AgentReference";
import { CostBase } from "module/util/costs/costTypes";
import { Immunity } from "module/util/damage/immunities";
import { foundryApi } from "module/api/foundryApi";

describe("Damage Application", () => {
    let sandbox: SinonSandbox;
    const consumed = CostBase.create("V");
    beforeEach(() => (sandbox = sinon.createSandbox()));
    afterEach(() => sandbox.restore());

    it("should apply health damage to target", async () => {
        const damageImplement = createDamageImplement(5, 0);
        const damageEvent = createDamageEvent(sandbox, { implements: [damageImplement], _costBase: consumed });
        const target = setUpTarget(sandbox, 0, {});

        const result = await calculateDamageOnTarget(damageEvent, target);

        expect(result.render()).to.equal("5V5");
    });

    it("should add multiple implements", async () => {
        const damageImplement1 = createDamageImplement(5, 0);
        const damageImplement2 = createDamageImplement(3, 0);
        const damageEvent = createDamageEvent(sandbox, {
            implements: [damageImplement1, damageImplement2],
            _costBase: consumed,
        });
        const target = setUpTarget(sandbox, 0, {});

        const result = await calculateDamageOnTarget(damageEvent, target);

        expect(result.render()).to.equal("8V8");
    });

    it("should nullify implements with immunities", async () => {
        const damageImplement1 = createDamageImplement(5, 0);
        const damageImplement2 = createDamageImplement(3, 0);
        sandbox
            .stub(foundryApi.hooks, "call")
            .onFirstCall()
            .callsFake((_, __, ___, array) => array.push({ name: "MegaImmunity" }));
        const damageEvent = createDamageEvent(sandbox, {
            implements: [damageImplement1, damageImplement2],
            _costBase: consumed,
        });
        const target = setUpTarget(sandbox, 0, {});

        const result = await calculateDamageOnTarget(damageEvent, target);

        expect(result.render()).to.equal("3V3");
    });

    it("should reduce damage by grazing hit penalty", async () => {
        const damageImplement = createDamageImplement(21, 0);
        const damageEvent = createDamageEvent(sandbox, {
            implements: [damageImplement],
            _costBase: consumed,
            grazingHitPenalty: 10,
        });
        const target = setUpTarget(sandbox, 0, {});

        const result = await calculateDamageOnTarget(damageEvent, target);

        expect(result.render()).to.equal("11V11");
    });

    it("should nullify damage for event immunities", async () => {
        sandbox
            .stub(foundryApi.hooks, "call")
            .withArgs("splittermond.damage.onEventImmunity", sinon.match.any, sinon.match.any, sinon.match.any)
            .callsFake((_, __, ___, array) => array.push({ name: "MegaImmunity" }));
        const damageImplement = createDamageImplement(21, 0);
        const damageEvent = createDamageEvent(sandbox, {
            implements: [damageImplement],
            _costBase: consumed,
            grazingHitPenalty: 10,
        });
        const target = setUpTarget(sandbox, 0, {});

        const result = await calculateDamageOnTarget(damageEvent, target);

        expect(result.render()).to.equal("0");
    });

    it("should not apply damage reduction past zero", async () => {
        const damageImplement = createDamageImplement(1, 0);
        const damageEvent = createDamageEvent(sandbox, { implements: [damageImplement], _costBase: consumed });
        const target = setUpTarget(sandbox, 10, {});

        const result = await calculateDamageOnTarget(damageEvent, target);

        expect(result.render()).to.equal("0");
    });

    describe("Damage reduction", () => {
        it("should apply damage reduction", async () => {
            const damageImplement = createDamageImplement(21, 0);
            const damageEvent = createDamageEvent(sandbox, { implements: [damageImplement], _costBase: consumed });
            const target = setUpTarget(sandbox, 10, {});

            const result = await calculateDamageOnTarget(damageEvent, target);

            expect(result.render()).to.equal("11V11");
        });

        it("should account for reduction override", async () => {
            const damageImplement = createDamageImplement(21, 6);
            const damageEvent = createDamageEvent(sandbox, { implements: [damageImplement], _costBase: consumed });
            const target = setUpTarget(sandbox, 10, {});
            sandbox
                .stub(target, "protectedDamageReduction")
                .get(() => ({ display: "5", calculate: () => Promise.resolve(5) }));

            const result = await calculateDamageOnTarget(damageEvent, target);

            expect(result.render()).to.equal("12V12");
        });

        it("should keep protected reduction if override is greater than base reduction", async () => {
            const damageImplement = createDamageImplement(21, 6);
            const damageEvent = createDamageEvent(sandbox, { implements: [damageImplement], _costBase: consumed });
            const target = setUpTarget(sandbox, 5, {});
            sandbox
                .stub(target, "protectedDamageReduction")
                .get(() => ({ display: "5", calculate: () => Promise.resolve(5) }));

            const result = await calculateDamageOnTarget(damageEvent, target);

            expect(result.render()).to.equal("16V16");
        });

        it("should account for reduction override from multiple sources", async () => {
            const damageImplement1 = createDamageImplement(5, 3);
            const damageImplement2 = createDamageImplement(3, 5);
            const damageEvent = createDamageEvent(sandbox, {
                implements: [damageImplement1, damageImplement2],
                _costBase: consumed,
            });
            const target = setUpTarget(sandbox, 8, {});

            const result = await calculateDamageOnTarget(damageEvent, target);

            expect(result.render()).to.equal("6V6");
        });

        it("should calculate reduction after grazing", async () => {
            const damageImplement = createDamageImplement(5, 2);
            const damageEvent = createDamageEvent(sandbox, {
                implements: [damageImplement],
                _costBase: consumed,
                grazingHitPenalty: 2,
            });
            const target = setUpTarget(sandbox, 3, {});

            const result = await calculateDamageOnTarget(damageEvent, target);

            expect(result.render()).to.equal("2V2");
        });

        [5, 10, 15].forEach((number) => {
            it(`should ignore overrides if they are smaller the protection of ${number}`, async () => {
                const damageImplement = createDamageImplement(21, 3);
                const damageEvent = createDamageEvent(sandbox, { implements: [damageImplement], _costBase: consumed });
                const target = setUpTarget(sandbox, 10, {});
                sandbox
                    .stub(target, "protectedDamageReduction")
                    .get(() => ({ display: String(number), calculate: () => Promise.resolve(number) }));

                const result = await calculateDamageOnTarget(damageEvent, target);

                expect(result.render()).to.equal("11V11");
            });
        });
    });
    damageTypes.forEach((damageType) => {
        it(`should adjust damage for negative ${damageType} resistance`, async () => {
            const damageImplement = createDamageImplement(5, 0, damageType);
            const damageEvent = createDamageEvent(sandbox, { implements: [damageImplement], _costBase: consumed });
            const target = setUpTarget(sandbox, 0, { [damageType]: -5 });

            const result = await calculateDamageOnTarget(damageEvent, target);

            expect(result.render()).to.equal("10V10");
        });

        it(`should adjust damage for ${damageType} resistance`, async () => {
            const damageImplement = createDamageImplement(5, 0, damageType);
            const damageEvent = createDamageEvent(sandbox, { implements: [damageImplement], _costBase: consumed });
            const target = setUpTarget(sandbox, 0, { [damageType]: 2 });

            const result = await calculateDamageOnTarget(damageEvent, target);

            expect(result.render()).to.equal("3V3");
        });

        it(`should adjust damage for ${damageType} weakness`, async () => {
            const damageImplement = createDamageImplement(5, 0, damageType);
            const damageEvent = createDamageEvent(sandbox, { implements: [damageImplement], _costBase: consumed });
            const target = setUpTarget(sandbox, 0, {}, { [damageType]: 1 });

            const result = await calculateDamageOnTarget(damageEvent, target);

            expect(result.render()).to.equal("10V10");
        });

        it(`should adjust damage for negative ${damageType} weakness`, async () => {
            const damageImplement = createDamageImplement(5, 0, damageType);
            const damageEvent = createDamageEvent(sandbox, { implements: [damageImplement], _costBase: consumed });
            const target = setUpTarget(sandbox, 0, {}, { [damageType]: -1 });

            const result = await calculateDamageOnTarget(damageEvent, target);

            expect(result.render()).to.equal("3V3");
        });
    });

    it(`should account for resistances after weaknesses`, async () => {
        const damageImplement = createDamageImplement(5, 0, "physical");
        const damageEvent = createDamageEvent(sandbox, { implements: [damageImplement], _costBase: consumed });
        const target = setUpTarget(sandbox, 0, { physical: 2 }, { physical: 1 });

        const result = await calculateDamageOnTarget(damageEvent, target);

        expect(result.render()).to.equal("8V8");
    });

    it(`should not adjust damage for resistance past zero`, async () => {
        const damageImplement1 = createDamageImplement(5, 0, "physical");
        const damageImplement2 = createDamageImplement(5, 0, "light");
        const damageEvent = createDamageEvent(sandbox, {
            implements: [damageImplement1, damageImplement2],
            _costBase: consumed,
        });
        const target = setUpTarget(sandbox, 0, { physical: 99999 });

        const result = await calculateDamageOnTarget(damageEvent, target);

        expect(result.render()).to.equal("5V5");
    });

    it(`should not apply a targets resistance more than once`, async () => {
        const damageImplement1 = createDamageImplement(1, 0, "physical");
        const damageImplement2 = createDamageImplement(5, 0, "physical");
        const damageImplement3 = createDamageImplement(2, 0, "physical");
        const damageEvent = createDamageEvent(sandbox, {
            implements: [damageImplement1, damageImplement2, damageImplement3],
            _costBase: consumed,
        });
        const target = setUpTarget(sandbox, 0, { physical: 4 });

        const result = await calculateDamageOnTarget(damageEvent, target);

        expect(result.render()).to.equal("4V4");
    });

    describe("Reporting", () => {
        it("should report damage halving for grazing hits", async () => {
            const damageImplement = createDamageImplement(5, 0);
            const damageEvent = createDamageEvent(sandbox, {
                implements: [damageImplement],
                _costBase: consumed,
                grazingHitPenalty: 2,
            });
            const target = setUpTarget(sandbox, 0, {});
            const recorder = new MockReporter();

            await calculateDamageOnTarget(damageEvent, target, recorder);

            expect(recorder._event?.grazingHitPenalty).to.equal(2);
            expect(recorder.totalDamage.length).to.equal(3);
        });

        it("should report damage reduction", async () => {
            const damageImplement1 = createDamageImplement(5, 3);
            const damageImplement2 = createDamageImplement(3, 5);
            const damageEvent = createDamageEvent(sandbox, {
                implements: [damageImplement1, damageImplement2],
                _costBase: consumed,
            });
            const target = setUpTarget(sandbox, 8, {});
            sandbox
                .stub(target, "protectedDamageReduction")
                .get(() => ({ display: "1", calculate: () => Promise.resolve(1) }));
            const recorder = new MockReporter();

            await calculateDamageOnTarget(damageEvent, target, recorder);

            expect(recorder.resolvedDamageReduction.length).to.equal(8);
            expect(recorder.overriddenReduction.length).to.equal(5);
            expect(recorder.totalDamage.length).to.equal(5);
        });

        it("should report zero applied damage if reduction is higher than damage", async () => {
            const damageImplement = createDamageImplement(5, 3, "physical");
            const target = setUpTarget(sandbox, 8, { physical: 99999 });
            const recorder = new MockReporter();
            const damageEvent = createDamageEvent(sandbox, {
                implements: [damageImplement],
                _costBase: consumed,
            });

            await calculateDamageOnTarget(damageEvent, target, recorder);

            expect(recorder.records[0].appliedDamage.length).to.equal(0);
        });

        it("should report zero applied damage if target is immune", async () => {
            sandbox
                .stub(foundryApi.hooks, "call")
                .withArgs("splittermond.damage.onEventImmunity", sinon.match.any, sinon.match.any, sinon.match.any)
                .callsFake((_, __, ___, array) => array.push({ name: "MegaImmunity" }));
            const damageImplement = createDamageImplement(5, 3, "physical");
            const target = setUpTarget(sandbox, 8, {});
            const recorder = new MockReporter();
            const damageEvent = createDamageEvent(sandbox, {
                implements: [damageImplement],
                _costBase: consumed,
            });

            await calculateDamageOnTarget(damageEvent, target, recorder);

            expect(recorder.immunity?.name).to.equal("MegaImmunity");
            expect(recorder.totalDamage.length).to.equal(0);
        });

        it("should report resistance and weakness", async () => {
            const damageImplement1 = createDamageImplement(5, 3, "physical");
            const damageImplement2 = createDamageImplement(1, 0, "light");
            const damageEvent = createDamageEvent(sandbox, {
                implements: [damageImplement1, damageImplement2],
                _costBase: consumed,
            });

            const target = setUpTarget(sandbox, 8, { light: -5, physical: 1 }, { physical: -1 });
            const recorder = new MockReporter();

            await calculateDamageOnTarget(damageEvent, target, recorder);

            expect(recorder.records[0].appliedDamage.length).to.equal(2);
            expect(recorder.records[0].baseDamage.length).to.equal(5);
            expect(recorder.records[0]).to.contain({
                damageType: "physical",
                implementName: "Schwert",
            });
            expect(recorder.records[1].appliedDamage.length).to.equal(6);
            expect(recorder.records[1].baseDamage.length).to.equal(1);
            expect(recorder.records[1]).to.contain({
                damageType: "light",
                implementName: "Schwert",
            });
        });

        it("should report despite immunity", async () => {
            sandbox
                .stub(foundryApi.hooks, "call")
                .withArgs("splittermond.damage.onImplementImmunity", sinon.match.any, sinon.match.any, sinon.match.any)
                .onFirstCall()
                .callsFake((_, __, ___, array) => array.push({ name: "MegaImmunity" }));
            const damageImplement1 = createDamageImplement(5, 3, "physical");
            const damageImplement2 = createDamageImplement(1, 0, "light");
            const damageEvent = createDamageEvent(sandbox, {
                implements: [damageImplement1, damageImplement2],
                _costBase: consumed,
            });

            const target = setUpTarget(sandbox, 8, { light: -5, physical: 1 });
            const recorder = new MockReporter();

            await calculateDamageOnTarget(damageEvent, target, recorder);

            expect(recorder.overriddenReduction.length).to.equal(0);
            expect(recorder.records[0].immunity?.name).to.equal("MegaImmunity");
            expect(recorder.records[0].appliedDamage.length).to.equal(4);
            expect(recorder.records[0].baseDamage.length).to.equal(5);
            expect(recorder.records[0]).to.contain({
                damageType: "physical",
                implementName: "Schwert",
            });
            expect(recorder.records[1].immunity).to.be.undefined;
            expect(recorder.records[1].appliedDamage.length).to.equal(6);
            expect(recorder.records[1].baseDamage.length).to.equal(1);
            expect(recorder.records[1]).to.contain({
                damageType: "light",
                implementName: "Schwert",
            });
        });
    });
});

function setUpTarget(
    sandbox: SinonSandbox,
    damageReduction: number,
    resistances: Partial<Record<DamageType, number>>,
    weaknesses: Partial<Record<DamageType, number>> = {}
) {
    const target = sandbox.createStubInstance(SplittermondActor);
    sandbox.stub(target, "resistances").get(() => ({
        display: "",
        calculate: () => Promise.resolve({ ...defaultSusceptibilities(), ...resistances }),
    }));
    sandbox.stub(target, "weaknesses").get(() => ({
        display: "",
        calculate: () => Promise.resolve({ ...defaultSusceptibilities(), ...weaknesses }),
    }));
    sandbox.stub(target, "damageReduction").get(() => ({
        display: String(damageReduction),
        calculate: () => Promise.resolve(damageReduction),
    }));
    sandbox.stub(target, "protectedDamageReduction").get(() => ({
        display: "0",
        calculate: () => Promise.resolve(0),
    }));
    return target;
}

function defaultSusceptibilities() {
    return damageTypes.reduce(
        (acc, type) => {
            acc[type] = 0;
            return acc;
        },
        {} as Record<DamageType, number>
    );
}

type RecordItem = {
    implementName: string;
    damageType: DamageType;
    baseDamage: CostModifier;
    appliedDamage: CostModifier;
    immunity?: Immunity;
};

class MockReporter implements UserReporter {
    public _target: SplittermondActor | null = null;
    public _event: { causer: AgentReference | null; grazingHitPenalty: number; costBase: CostBase } | null = null;
    public records: RecordItem[] = [];
    public totalDamage: CostModifier = new Cost(0, 0, false).asModifier();
    public overriddenReduction: CostModifier = new Cost(0, 0, false).asModifier();
    public immunity: Immunity | undefined;
    public resolvedDamageReduction: CostModifier = new Cost(0, 0, false).asModifier();

    set event(value: { causer: AgentReference | null; grazingHitPenalty: number; costBase: CostBase }) {
        this._event = value;
    }

    set target(value: SplittermondActor) {
        this._target = value;
    }

    addRecord(
        implementName: string,
        damageType: DamageType,
        baseDamage: CostModifier,
        appliedDamage: CostModifier,
        immunity = undefined
    ): void {
        this.records.push({ implementName, damageType, baseDamage, appliedDamage, immunity });
    }

    public totalFromImplements: CostModifier = new Cost(0, 0, false).asModifier();
}

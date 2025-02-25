import {DamageType, damageTypes} from "../../../../../module/config/damageTypes";
import {createDamageEvent, createDamageImplement} from "./damageEventTestHelper";
import sinon, {SinonSandbox} from "sinon";
import SplittermondActor from "../../../../../module/actor/actor";
import {calculateDamageOnTarget, UserReporter} from "../../../../../module/util/damage/calculateDamageOnTarget";
import {Cost, CostModifier} from "../../../../../module/util/costs/Cost";
import {expect} from "chai";
import {AgentReference} from "module/data/references/AgentReference";
import {CostBase} from "../../../../../module/util/costs/costTypes";


describe("Damage Application", () => {
    let sandbox: SinonSandbox;
    const consumed = CostBase.create("V");
    beforeEach(() => sandbox = sinon.createSandbox());
    afterEach(() => sandbox.restore());

    it("should apply health damage to target", () => {
        const damageImplement = createDamageImplement(5, 0);
        const damageEvent = createDamageEvent(sandbox, {implements: [damageImplement], _costBase: consumed});
        const target = setUpTarget(sandbox, 0, {});

        const result = calculateDamageOnTarget(damageEvent, target);

        expect(result.render()).to.equal("5V5");

    });

    it("should add multiple implements", () => {
        const damageImplement1 = createDamageImplement(5, 0);
        const damageImplement2 = createDamageImplement(3, 0);
        const damageEvent = createDamageEvent(sandbox, {
            implements: [damageImplement1, damageImplement2],
            _costBase: consumed
        });
        const target = setUpTarget(sandbox, 0, {});

        const result = calculateDamageOnTarget(damageEvent, target);

        expect(result.render()).to.equal("8V8");
    });

    it("should halve damage for grazing hits", () => {
        const damageImplement = createDamageImplement(21, 0);
        const damageEvent = createDamageEvent(sandbox, {
            implements: [damageImplement],
            _costBase: consumed,
            isGrazingHit: true
        });
        const target = setUpTarget(sandbox, 0, {});

        const result = calculateDamageOnTarget(damageEvent, target);

        expect(result.render()).to.equal("11V11");
    });

    it("should apply damage reduction", () => {
        const damageImplement = createDamageImplement(21, 0);
        const damageEvent = createDamageEvent(sandbox, {implements: [damageImplement], _costBase: consumed});
        const target = setUpTarget(sandbox, 10, {});

        const result = calculateDamageOnTarget(damageEvent, target);

        expect(result.render()).to.equal("11V11");
    });

    it("should account for reduction override from multiple sources", () => {
        const damageImplement1 = createDamageImplement(5, 3);
        const damageImplement2 = createDamageImplement(3, 5);
        const damageEvent = createDamageEvent(sandbox, {
            implements: [damageImplement1, damageImplement2],
            _costBase: consumed
        });
        const target = setUpTarget(sandbox, 8, {});

        const result = calculateDamageOnTarget(damageEvent, target);

        expect(result.render()).to.equal("6V6");
    });

    it("should calculate reduction after grazing", () => {
        const damageImplement = createDamageImplement(5, 2);
        const damageEvent = createDamageEvent(sandbox, {
            implements: [damageImplement],
            _costBase: consumed,
            isGrazingHit: true
        });
        const target = setUpTarget(sandbox, 3, {});

        const result= calculateDamageOnTarget(damageEvent, target);

        expect(result.render()).to.equal("2V2");
    });

    damageTypes.forEach(damageType => {
        it(`should adjust damage for ${damageType} susceptibility`, () => {
            const damageImplement = createDamageImplement(5, 0, damageType);
            const damageEvent = createDamageEvent(sandbox, {implements: [damageImplement], _costBase: consumed});
            const target = setUpTarget(sandbox, 0, {[damageType]: 5});

            const result = calculateDamageOnTarget(damageEvent, target);

            expect(result.render()).to.equal("10V10");
        });
    });

    describe("Reporting", () => {

        it("should report damage halving for grazing hits", () => {
            const damageImplement = createDamageImplement(5, 0);
            const damageEvent = createDamageEvent(sandbox, {
                implements: [damageImplement],
                _costBase: consumed,
                isGrazingHit: true
            });
            const target = setUpTarget(sandbox, 0, {});
            const recorder = new MockReporter();

            calculateDamageOnTarget(damageEvent, target, recorder);

            expect(recorder._event?.isGrazingHit).to.be.true;
            expect(recorder.totalDamage.length).to.equal(3);
        });

        it("should report damage reduction", () => {
            const damageImplement1 = createDamageImplement(5, 3);
            const damageImplement2 = createDamageImplement(3, 5);
            const damageEvent = createDamageEvent(sandbox, {
                implements: [damageImplement1, damageImplement2],
                _costBase: consumed
            });
            const target = setUpTarget(sandbox, 8, {});
            const recorder = new MockReporter();

            calculateDamageOnTarget(damageEvent, target, recorder);

            expect(recorder._target?.damageReduction).to.equal(8);
            expect(recorder.overriddenReduction.length).to.equal(6);
            expect(recorder.totalDamage.length).to.equal(6);
        });

        it("should report susceptibility", () => {
            const damageImplement1 = createDamageImplement(5, 3, "physical");
            const damageImplement2 = createDamageImplement(1, 0, "light");
            const damageEvent = createDamageEvent(sandbox, {
                implements: [damageImplement1, damageImplement2],
                _costBase: consumed
            });

            const target = setUpTarget(sandbox, 8, {light: 5, physical: 1});
            const recorder = new MockReporter();

            calculateDamageOnTarget(damageEvent, target, recorder);

            expect(recorder.records[0].appliedDamage.length).to.equal(6);
            expect(recorder.records[0].baseDamage.length).to.equal(5);
            expect(recorder.records[0]).to.contain({
                damageType: "physical",
                implementName: "Schwert"
            });
            expect(recorder.records[1].appliedDamage.length).to.equal(6);
            expect(recorder.records[1].baseDamage.length).to.equal(1);
            expect(recorder.records[1]).to.contain({
                damageType: "light",
                implementName: "Schwert"
            });
        });
    });
});

function setUpTarget(sandbox: SinonSandbox, damageReduction: number, susceptibilties: Partial<Record<DamageType, number>>) {
    const target = sandbox.createStubInstance(SplittermondActor);
    sandbox.stub(target, "susceptibilities").get(() => ({...defaultSusceptibilities(), ...susceptibilties}));
    sandbox.stub(target, "damageReduction").get(() => damageReduction);
    return target;
}

function defaultSusceptibilities() {
    return damageTypes.reduce((acc, type) => {
        acc[type] = 0;
        return acc;
    }, {} as Record<DamageType, number>);
}

type RecordItem = {
    implementName: string;
    damageType: DamageType;
    baseDamage: CostModifier;
    appliedDamage: CostModifier
};

class MockReporter implements UserReporter {
    public _target: SplittermondActor|null = null;
    public _event: { causer: AgentReference | null; isGrazingHit: boolean; costBase: CostBase; }|null = null;
    public records: RecordItem[] = [];
    public totalDamage: CostModifier = new Cost(0, 0, false).asModifier();
    public overriddenReduction: CostModifier = new Cost(0, 0, false).asModifier();

    set event(value: { causer: AgentReference | null; isGrazingHit: boolean; costBase: CostBase }) {
        this._event = value;
    }

    set target(value: SplittermondActor) {
        this._target = value;
    }

    addRecord(implementName: string, damageType: DamageType, baseDamage: CostModifier, appliedDamage: CostModifier): void {
        this.records.push({implementName, damageType, baseDamage, appliedDamage});
    }

    public totalFromImplements: CostModifier = new Cost(0, 0, false).asModifier();

}
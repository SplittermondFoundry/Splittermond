import { describe, it } from "mocha";
import { expect } from "chai";
import { type EffectType, SplittermondActiveEffect } from "module/activeEffect/SplittermondActiveEffect";
import type { IModifier } from "module/modifiers";
import type { ICostModifier } from "module/util/costs/spellCostManagement";
import sinon, { type SinonSandbox } from "sinon";

/**
 * Creates a minimal SplittermondActiveEffect-like object for testing.
 * We bypass the constructor chain by directly assigning properties,
 * since FoundryActiveEffect is a declare class and the mock DataModel
 * handles property assignment from data.
 */
function createEffect(
    sandbox: SinonSandbox,
    overrides: {
        type: EffectType;
        system: IModifier | ICostModifier;
        disabled?: boolean;
        isSuppressed?: boolean;
    }
): SplittermondActiveEffect {
    const effect = sandbox.createStubInstance(SplittermondActiveEffect);
    effect.type = overrides.type;
    effect.system = overrides.system;
    Object.defineProperty(effect, "disabled", { configurable: true, writable: true });
    sandbox.stub(effect, "disabled").value(overrides.disabled ?? false);
    sandbox.stub(effect, "isSuppressed").get(() => overrides.isSuppressed ?? false);
    return effect as SplittermondActiveEffect;
}

/** Minimal mock implementing IModifier shape */
function mockModifier(): IModifier {
    return {
        value: { amount: 2 } as any,
        isBonus: true,
        groupId: "test.path",
        selectable: false,
        attributes: { name: "Test", type: "innate" },
        origin: null,
        effectType: "modifier",
        addTooltipFormulaElements() {},
    };
}

/** Minimal mock implementing ICostModifier shape */
function mockCostModifier(): ICostModifier {
    return {
        label: "focus.reduction",
        value: { amount: { _channeled: 0, _channeledConsumed: 0, _exhausted: 1, _consumed: 0 } } as any,
        skill: null,
        attributes: {},
        effectType: "costModifier",
    };
}

describe("SplittermondActiveEffect", () => {
    const sandbox = sinon.createSandbox();
    afterEach(() => sandbox.restore());
    describe("asModifier", () => {
        it("should return system as IModifier for type 'modifier'", () => {
            const system = mockModifier();
            const effect = createEffect(sandbox, { type: "modifier", system });
            expect(effect.asModifier).to.equal(system);
        });

        it("should return system as IModifier for type 'inverseModifier'", () => {
            const system = mockModifier();
            const effect = createEffect(sandbox, { type: "inverseModifier", system });
            expect(effect.asModifier).to.equal(system);
        });

        it("should return system as IModifier for type 'multiplicativeModifier'", () => {
            const system = mockModifier();
            const effect = createEffect(sandbox, { type: "multiplicativeModifier", system });
            expect(effect.asModifier).to.equal(system);
        });

        it("should return null for type 'costModifier'", () => {
            const system = mockCostModifier();
            const effect = createEffect(sandbox, { type: "costModifier", system });
            expect(effect.asModifier).to.be.null;
        });
    });

    describe("asCostModifier", () => {
        it("should return system as ICostModifier for type 'costModifier'", () => {
            const system = mockCostModifier();
            const effect = createEffect(sandbox, { type: "costModifier", system });
            expect(effect.asCostModifier).to.equal(system);
        });

        it("should return null for type 'modifier'", () => {
            const system = mockModifier();
            const effect = createEffect(sandbox, { type: "modifier", system });
            expect(effect.asCostModifier).to.be.null;
        });
    });

    describe("getModifiers", () => {
        it("should collect modifiers from active, non-suppressed effects", () => {
            const system1 = mockModifier();
            const system2 = mockModifier();
            const effects = [
                createEffect(sandbox, { type: "modifier", system: system1 }),
                createEffect(sandbox, { type: "inverseModifier", system: system2 }),
            ];
            const result = SplittermondActiveEffect.getModifiers(effects);
            expect(result).to.have.length(2);
            expect(result[0]).to.equal(system1);
            expect(result[1]).to.equal(system2);
        });

        it("should skip disabled effects", () => {
            const system = mockModifier();
            const effects = [createEffect(sandbox, { type: "modifier", system, disabled: true })];
            const result = SplittermondActiveEffect.getModifiers(effects);
            expect(result).to.have.length(0);
        });

        it("should skip suppressed effects", () => {
            const system = mockModifier();
            const effects = [createEffect(sandbox, { type: "modifier", system, isSuppressed: true })];
            const result = SplittermondActiveEffect.getModifiers(effects);
            expect(result).to.have.length(0);
        });

        it("should skip cost modifier types", () => {
            const effects = [createEffect(sandbox, { type: "costModifier", system: mockCostModifier() })];
            const result = SplittermondActiveEffect.getModifiers(effects);
            expect(result).to.have.length(0);
        });
    });

    describe("getCostModifiers", () => {
        it("should collect cost modifiers from active, non-suppressed effects", () => {
            const system = mockCostModifier();
            const effects = [createEffect(sandbox, { type: "costModifier", system })];
            const result = SplittermondActiveEffect.getCostModifiers(effects);
            expect(result).to.have.length(1);
            expect(result[0]).to.equal(system);
        });

        it("should skip disabled effects", () => {
            const system = mockCostModifier();
            const effects = [createEffect(sandbox, { type: "costModifier", system, disabled: true })];
            const result = SplittermondActiveEffect.getCostModifiers(effects);
            expect(result).to.have.length(0);
        });

        it("should skip suppressed effects", () => {
            const system = mockCostModifier();
            const effects = [createEffect(sandbox, { type: "costModifier", system, isSuppressed: true })];
            const result = SplittermondActiveEffect.getCostModifiers(effects);
            expect(result).to.have.length(0);
        });

        it("should skip scalar modifier types", () => {
            const effects = [createEffect(sandbox, { type: "modifier", system: mockModifier() })];
            const result = SplittermondActiveEffect.getCostModifiers(effects);
            expect(result).to.have.length(0);
        });
    });
});

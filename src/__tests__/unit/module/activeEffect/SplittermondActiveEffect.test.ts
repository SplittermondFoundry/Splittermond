import {describe, it} from "mocha";
import {expect} from "chai";
import {type EffectType, SplittermondActiveEffect} from "module/activeEffect/SplittermondActiveEffect";
import type {IModifier} from "module/modifiers";
import type {ICostModifier} from "module/util/costs/spellCostManagement";
import sinon, {type SinonSandbox} from "sinon";
import SplittermondItem from "module/item/item";
import {FoundryActiveEffect} from "module/api/ActiveEffect";


interface EffectOverrides {
    type: EffectType;
    system: IModifier | ICostModifier;
    disabled?: boolean;
    isSuppressed?: boolean;
    item?: SplittermondItem | null;
        }

function createEffect(sandbox: SinonSandbox, overrides: EffectOverrides) {
    const effect = sandbox.createStubInstance(SplittermondActiveEffect);
    effect.type = overrides.type;
    effect.system = overrides.system;
    sandbox.stub(effect, "disabled").value(overrides.disabled ?? false);
    sandbox.stub(effect, "item").get(() => overrides.item ?? null);
    if (overrides.isSuppressed !== undefined) {
        sandbox.stub(effect, "isSuppressed").get(() => overrides.isSuppressed);
    }
    return effect;
}

/** Minimal mock implementing IModifier shape */
function mockModifier(overrides: Partial<IModifier> = {}): IModifier {
    return {
        value: { amount: 2 } as any,
        isBonus: true,
        groupId: "test.path",
        selectable: false,
        attributes: { name: "Test", type: "innate" },
        origin: null,
        effectType: "modifier",
        addTooltipFormulaElements() {},
        ...overrides,
    };
}

/** Minimal mock implementing ICostModifier shape */
function mockCostModifier(overrides: Partial<ICostModifier> = {}): ICostModifier {
    return {
        label: "focus.reduction",
        value: { amount: { _channeled: 0, _channeledConsumed: 0, _exhausted: 1, _consumed: 0 } } as any,
        skill: null,
        attributes: {},
        effectType: "costModifier",
        ...overrides,
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

    describe("isSuppressed", () => {
        it("should be false without source item", () => {
            const effect = createEffect(sandbox, {
                type: "modifier",
                system: mockModifier(),
                item: null,
            });
            expect(effect.isSuppressed).to.be.false;
        });

        it("should be true when super is suppressed", () => {
            sandbox.stub(FoundryActiveEffect.prototype, "isSuppressed").get(() => true);
            const item = sandbox.createStubInstance(SplittermondItem);
            item.type = "weapon";
            Object.assign(item, { system: { equipped: true } });

            const effect = createEffect(sandbox, {
                type: "modifier",
                system: mockModifier(),
                item,
            });
            expect(effect.isSuppressed).to.be.true;
        });

        it("should be true for unequipped weapon", () => {
            const item = sandbox.createStubInstance(SplittermondItem);
            item.type = "weapon";
            Object.assign(item, { system: { equipped: false } });

            const effect = createEffect(sandbox, {
                type: "modifier",
                system: mockModifier(),
                item,
            });
            expect(effect.isSuppressed).to.be.true;
        });

        it("should be false for equipped weapon", () => {
            const item = sandbox.createStubInstance(SplittermondItem);
            item.type = "weapon";
            Object.assign(item, { system: { equipped: true } });

            const effect = createEffect(sandbox, {
                type: "modifier",
                system: mockModifier(),
                item,
            });
            expect(effect.isSuppressed).to.be.false;
        });

        it("should be true for unequipped shield", () => {
            const item = sandbox.createStubInstance(SplittermondItem);
            item.type = "shield";
            Object.assign(item, { system: { equipped: false } });

            const effect = createEffect(sandbox, {
                type: "modifier",
                system: mockModifier(),
                item,
            });
            expect(effect.isSuppressed).to.be.true;
        });

        it("should be true for unequipped armor", () => {
            const item = sandbox.createStubInstance(SplittermondItem);
            item.type = "armor";
            Object.assign(item, { system: { equipped: false } });

            const effect = createEffect(sandbox, {
                type: "modifier",
                system: mockModifier(),
                item,
            });
            expect(effect.isSuppressed).to.be.true;
        });

        it("should be true for inactive spelleffect", () => {
            const item = sandbox.createStubInstance(SplittermondItem);
            item.type = "spelleffect";
            Object.assign(item, { system: { active: false } });

            const effect = createEffect(sandbox, {
                type: "modifier",
                system: mockModifier(),
                item,
            });
            expect(effect.isSuppressed).to.be.true;
        });

        it("should be false for active spelleffect", () => {
            const item = sandbox.createStubInstance(SplittermondItem);
            item.type = "spelleffect";
            Object.assign(item, { system: { active: true } });

            const effect = createEffect(sandbox, {
                type: "modifier",
                system: mockModifier(),
                item,
            });
            expect(effect.isSuppressed).to.be.false;
        });

        it("should be false for unrelated item types", () => {
            const item = sandbox.createStubInstance(SplittermondItem);
            item.type = "equipment";
            Object.assign(item, { system: {} });

            const effect = createEffect(sandbox, {
                type: "modifier",
                system: mockModifier(),
                item,
            });
            expect(effect.isSuppressed).to.be.false;
        });
    });

    describe("withFilter", () => {
        it("should apply custom filter to scalar modifiers", () => {
            const allowed = createEffect(sandbox, {
                type: "modifier",
                system: mockModifier(),
            });
            const blocked = createEffect(sandbox, {
                type: "modifier",
                system: mockModifier({ groupId: "blocked.path" }),
            });

            const filtered = SplittermondActiveEffect.withFilter((effect) => effect.asModifier?.groupId !== "blocked.path");
            const result = filtered.getModifiers([allowed, blocked]);

            expect(result).to.have.length(1);
            expect(result[0].groupId).to.equal("test.path");
        });

        it("should still exclude disabled effects even when filter accepts", () => {
            const disabled = createEffect(sandbox, {
                type: "modifier",
                system: mockModifier(),
                disabled: true,
            });

            const filtered = SplittermondActiveEffect.withFilter(() => true);
            const result = filtered.getModifiers([disabled]);

            expect(result).to.have.length(0);
        });

        it("should still exclude suppressed effects even when filter accepts", () => {
            const suppressed = createEffect(sandbox, {
                type: "modifier",
                system: mockModifier(),
                isSuppressed: true,
            });

            const filtered = SplittermondActiveEffect.withFilter(() => true);
            const result = filtered.getModifiers([suppressed]);

            expect(result).to.have.length(0);
        });

        it("should apply custom filter to cost modifiers", () => {
            const allowed = createEffect(sandbox, {
                type: "costModifier",
                system: mockCostModifier({ label: "allowed" }),
            });
            const blocked = createEffect(sandbox, {
                type: "costModifier",
                system: mockCostModifier({ label: "blocked" }),
            });

            const filtered = SplittermondActiveEffect.withFilter((effect) => effect.asCostModifier?.label !== "blocked");
            const result = filtered.getCostModifiers([allowed, blocked]);

            expect(result).to.have.length(1);
            expect(result[0].label).to.equal("allowed");
        });

        it("should return no cost modifiers when custom filter rejects", () => {
            const cost = createEffect(sandbox, {
                type: "costModifier",
                system: mockCostModifier({ label: "forbidden" }),
            });

            const filtered = SplittermondActiveEffect.withFilter(() => false);
            const result = filtered.getCostModifiers([cost]);

            expect(result).to.have.length(0);
        });
    });
});

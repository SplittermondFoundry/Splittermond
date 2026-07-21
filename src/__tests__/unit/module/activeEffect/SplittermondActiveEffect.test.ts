import { describe, it } from "mocha";
import { expect } from "chai";
import { SplittermondActiveEffect } from "module/activeEffect/SplittermondActiveEffect";
import type { IModifier } from "module/modifiers";
import type { ICostModifier } from "module/util/costs/spellCostManagement";
import sinon, { type SinonSandbox } from "sinon";
import SplittermondItem from "module/item/item";
import { FoundryActiveEffect } from "module/api/ActiveEffect";

interface CostModifierSystem {
    readonly asCostModifiers: ICostModifier[];
}

interface ModifierSystem {
    readonly asModifiers: IModifier[];
}

interface EffectOverrides {
    type: string;
    system: ModifierSystem | CostModifierSystem | IModifier;
    disabled?: boolean;
    isSuppressed?: boolean;
    item?: SplittermondItem | null;
}

function createEffect(sandbox: SinonSandbox, overrides: EffectOverrides) {
    const effect = sandbox.createStubInstance(SplittermondActiveEffect);
    const writable = effect as unknown as { type: string; system: unknown };
    writable.type = overrides.type;
    writable.system = overrides.system;
    sandbox.stub(effect, "disabled").value(overrides.disabled ?? false);
    sandbox.stub(effect, "item").get(() => overrides.item ?? null);
    if (overrides.isSuppressed !== undefined) {
        sandbox.stub(effect, "isSuppressed").get(() => overrides.isSuppressed);
    }
    return effect;
}

/** Minimal mock implementing IModifier shape */
function mockModifier(overrides: Partial<IModifier> = {}): IModifier {
    const value = { amount: 2 } as IModifier["value"];
    return {
        value,
        isBonus: true,
        groupId: "test.path",
        selectable: false,
        attributes: { name: "Test", type: "innate" },
        addTooltipFormulaElements() {},
        applyMultiplier: () => value,
        ...overrides,
    };
}

/** Minimal mock implementing ICostModifier shape */
function mockCostModifier(overrides: Partial<ICostModifier> = {}): ICostModifier {
    const value = {
        amount: { _channeled: 0, _channeledConsumed: 0, _exhausted: 1, _consumed: 0 },
    } as ICostModifier["value"];
    return {
        label: "focus.reduction",
        value,
        skill: null,
        attributes: {},
        applyMultiplier: () => value,
        ...overrides,
    };
}

function mockCostModifierSystem(costModifiers: ICostModifier[] = [mockCostModifier()]): CostModifierSystem {
    return { asCostModifiers: costModifiers };
}

function mockModifierSystem(modifiers: IModifier[] = [mockModifier()]): ModifierSystem {
    return { asModifiers: modifiers };
}

describe("SplittermondActiveEffect", () => {
    const sandbox = sinon.createSandbox();
    afterEach(() => sandbox.restore());
    describe("asModifiers", () => {
        it("should return system.asModifiers for type 'modifier'", () => {
            const modifier = mockModifier();
            const system = mockModifierSystem([modifier]);
            const effect = createEffect(sandbox, { type: "modifier", system });
            expect(effect.asModifiers).to.deep.equal([modifier]);
        });

        it("should return empty array for base type", () => {
            const system = mockModifierSystem();
            const effect = createEffect(sandbox, { type: "base", system });
            expect(effect.asModifiers).to.deep.equal([]);
        });

        it("should return modifiers for non-base action types like spellEffect", () => {
            const modifier = mockModifier();
            const system = mockModifierSystem([modifier]);
            const effect = createEffect(sandbox, { type: "spellEffect", system });
            expect(effect.asModifiers).to.deep.equal([modifier]);
        });
    });

    describe("getModifiers", () => {
        it("should collect modifiers from active, non-suppressed effects", () => {
            const modifier1 = mockModifier();
            const modifier2 = mockModifier();
            const effects = [
                createEffect(sandbox, { type: "modifier", system: mockModifierSystem([modifier1]) }),
                createEffect(sandbox, { type: "modifier", system: mockModifierSystem([modifier2]) }),
            ];
            const result = SplittermondActiveEffect.getModifiers(effects);
            expect(result).to.have.length(2);
            expect(result[0]).to.equal(modifier1);
            expect(result[1]).to.equal(modifier2);
        });

        it("should skip disabled effects", () => {
            const system = mockModifierSystem();
            const effects = [createEffect(sandbox, { type: "modifier", system, disabled: true })];
            const result = SplittermondActiveEffect.getModifiers(effects);
            expect(result).to.have.length(0);
        });

        it("should skip suppressed effects", () => {
            const system = mockModifierSystem();
            const effects = [createEffect(sandbox, { type: "modifier", system, isSuppressed: true })];
            const result = SplittermondActiveEffect.getModifiers(effects);
            expect(result).to.have.length(0);
        });

        it("should skip base type effects", () => {
            const effects = [createEffect(sandbox, { type: "base", system: mockModifierSystem() })];
            const result = SplittermondActiveEffect.getModifiers(effects);
            expect(result).to.have.length(0);
        });
    });

    describe("getCostModifiers", () => {
        it("should collect cost modifiers from active, non-suppressed effects", () => {
            const system = mockCostModifierSystem();
            const effects = [createEffect(sandbox, { type: "modifier", system })];
            const result = SplittermondActiveEffect.getCostModifiers(effects);
            expect(result).to.have.length(1);
        });

        it("should skip disabled effects", () => {
            const system = mockCostModifierSystem();
            const effects = [createEffect(sandbox, { type: "modifier", system, disabled: true })];
            const result = SplittermondActiveEffect.getCostModifiers(effects);
            expect(result).to.have.length(0);
        });

        it("should skip suppressed effects", () => {
            const system = mockCostModifierSystem();
            const effects = [createEffect(sandbox, { type: "modifier", system, isSuppressed: true })];
            const result = SplittermondActiveEffect.getCostModifiers(effects);
            expect(result).to.have.length(0);
        });

        it("should skip effects without asCostModifiers", () => {
            const effects = [createEffect(sandbox, { type: "modifier", system: mockModifier() })];
            const result = SplittermondActiveEffect.getCostModifiers(effects);
            expect(result).to.have.length(0);
        });

        it("should collect cost modifiers from non-modifier action types like spellEffect", () => {
            const costModifier = mockCostModifier();
            const system = mockCostModifierSystem([costModifier]);
            const effect = createEffect(sandbox, { type: "spellEffect", system });
            const result = SplittermondActiveEffect.getCostModifiers([effect]);
            expect(result).to.have.length(1);
            expect(result[0]).to.equal(costModifier);
        });
    });

    describe("multiplier", () => {
        it("should return 1 when no source item is present", () => {
            const effect = createEffect(sandbox, {
                type: "modifier",
                system: mockModifier(),
                item: null,
            });
            expect(effect.multiplier).to.equal(1);
        });

        it("should return strength.quantity for a strength item", () => {
            const item = sandbox.createStubInstance(SplittermondItem);
            item.type = "strength";
            Object.assign(item, { system: { quantity: 3 } });

            const effect = createEffect(sandbox, {
                type: "modifier",
                system: mockModifier(),
                item,
            });
            expect(effect.multiplier).to.equal(3);
        });

        it("should default to 1 for a strength item without quantity", () => {
            const item = sandbox.createStubInstance(SplittermondItem);
            item.type = "strength";
            Object.assign(item, { system: {} });

            const effect = createEffect(sandbox, {
                type: "modifier",
                system: mockModifier(),
                item,
            });
            expect(effect.multiplier).to.equal(1);
        });

        it("should return statuseffect.level for a statuseffect item", () => {
            const item = sandbox.createStubInstance(SplittermondItem);
            item.type = "statuseffect";
            Object.assign(item, { system: { level: 4 } });

            const effect = createEffect(sandbox, {
                type: "modifier",
                system: mockModifier(),
                item,
            });
            expect(effect.multiplier).to.equal(4);
        });

        it("should default to 1 for a statuseffect item without level", () => {
            const item = sandbox.createStubInstance(SplittermondItem);
            item.type = "statuseffect";
            Object.assign(item, { system: {} });

            const effect = createEffect(sandbox, {
                type: "modifier",
                system: mockModifier(),
                item,
            });
            expect(effect.multiplier).to.equal(1);
        });

        it("should return 1 for an unrelated item type (weapon)", () => {
            const item = sandbox.createStubInstance(SplittermondItem);
            item.type = "weapon";
            Object.assign(item, { system: { equipped: true } });

            const effect = createEffect(sandbox, {
                type: "modifier",
                system: mockModifier(),
                item,
            });
            expect(effect.multiplier).to.equal(1);
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
                system: mockModifierSystem([mockModifier()]),
            });
            const blocked = createEffect(sandbox, {
                type: "modifier",
                system: mockModifierSystem([mockModifier({ groupId: "blocked.path" })]),
            });

            const filtered = SplittermondActiveEffect.withFilter(
                (effect) => !effect.asModifiers.some((m) => m.groupId === "blocked.path")
            );
            const result = filtered.getModifiers([allowed, blocked]);

            expect(result).to.have.length(1);
            expect(result[0].groupId).to.equal("test.path");
        });

        it("should still exclude disabled effects even when filter accepts", () => {
            const disabled = createEffect(sandbox, {
                type: "modifier",
                system: mockModifierSystem(),
                disabled: true,
            });

            const filtered = SplittermondActiveEffect.withFilter(() => true);
            const result = filtered.getModifiers([disabled]);

            expect(result).to.have.length(0);
        });

        it("should still exclude suppressed effects even when filter accepts", () => {
            const suppressed = createEffect(sandbox, {
                type: "modifier",
                system: mockModifierSystem(),
                isSuppressed: true,
            });

            const filtered = SplittermondActiveEffect.withFilter(() => true);
            const result = filtered.getModifiers([suppressed]);

            expect(result).to.have.length(0);
        });

        it("should apply custom filter to cost modifiers", () => {
            const allowed = createEffect(sandbox, {
                type: "modifier",
                system: mockCostModifierSystem([mockCostModifier({ label: "allowed" })]),
            });
            const blocked = createEffect(sandbox, {
                type: "modifier",
                system: mockCostModifierSystem([mockCostModifier({ label: "blocked" })]),
            });

            const filtered = SplittermondActiveEffect.withFilter((effect) => {
                return !effect.asCostModifiers.some((c) => c.label === "blocked");
            });
            const result = filtered.getCostModifiers([allowed, blocked]);

            expect(result).to.have.length(1);
            expect(result[0].label).to.equal("allowed");
        });

        it("should return no cost modifiers when custom filter rejects", () => {
            const cost = createEffect(sandbox, {
                type: "modifier",
                system: mockCostModifierSystem([mockCostModifier({ label: "forbidden" })]),
            });

            const filtered = SplittermondActiveEffect.withFilter(() => false);
            const result = filtered.getCostModifiers([cost]);

            expect(result).to.have.length(0);
        });
    });
});

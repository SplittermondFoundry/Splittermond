import { describe, it, beforeEach, afterEach } from "mocha";
import sinon from "sinon";
import { expect } from "chai";
import { buildEffectCardContext } from "module/activeEffect/effectCardContext";
import type { EffectCardEffect } from "module/activeEffect/effectCardContext";
import type { EffectType } from "module/activeEffect/dataModel/effectTypes";
import type SplittermondCombat from "module/combat/combat";
import { foundryApi } from "module/api/foundryApi";

function makeEffect(overrides: Partial<EffectCardEffect> = {}): EffectCardEffect {
    return {
        isSuppressed: false,
        disabled: false,
        type: "modifier",
        durationMode: "permanent",
        duration: {
            expired: false,
            value: null,
            units: "",
        },
        ...overrides,
    };
}

function makeCombat(currentTick: number): SplittermondCombat {
    return {
        currentTick,
    } as unknown as SplittermondCombat;
}

function makeActor(id: string): Actor | null {
    return { id } as unknown as Actor;
}

describe("buildEffectCardContext", () => {
    let sandbox: sinon.SinonSandbox;
    let getCombatForActorStub: sinon.SinonStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        getCombatForActorStub = sandbox.stub(foundryApi, "getCombatForActor");
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("badges", () => {
        it("suppressed effect includes the suppressed badge", () => {
            const effect = makeEffect({ isSuppressed: true });
            const result = buildEffectCardContext(effect, {
                actor: null,
            });

            expect(result.badges).to.have.length(1);
            expect(result.badges[0].icon).to.equal("fa-link-slash");
            expect(result.badges[0].tooltipKey).to.equal("splittermond.activeEffect.badge.suppressed");
            expect(result.badges[0].cssClass).to.equal("badge-suppressed");
        });

        it("expired effect includes the expired badge", () => {
            const effect = makeEffect({
                durationMode: "timed",
                duration: {
                    expired: true,
                    value: 3,
                    units: "rounds",
                    start: { round: 5 },
                },
            });
            const result = buildEffectCardContext(effect, {
                actor: makeActor("a1"),
            });

            expect(result.badges).to.have.length(1);
            expect(result.badges[0].icon).to.equal("fa-hourglass-end");
            expect(result.badges[0].tooltipKey).to.equal("splittermond.activeEffect.badge.expired");
            expect(result.badges[0].cssClass).to.equal("badge-expired");
        });

        it("channelled durationMode includes the channelled badge", () => {
            const effect = makeEffect({ durationMode: "channelled" });
            const result = buildEffectCardContext(effect, {
                actor: null,
            });

            expect(result.badges).to.have.length(1);
            expect(result.badges[0].icon).to.equal("fa-arrows-to-circle");
            expect(result.badges[0].tooltipKey).to.equal("splittermond.activeEffect.badge.channelled");
            expect(result.badges[0].cssClass).to.equal("badge-channelled");
        });

        it("disabled effect still computes badges (disabled is orthogonal)", () => {
            const effect = makeEffect({
                disabled: true,
                isSuppressed: true,
            });
            const result = buildEffectCardContext(effect, {
                actor: null,
            });

            expect(result.badges).to.have.length(1);
            expect(result.badges[0].cssClass).to.equal("badge-suppressed");
        });
    });

    describe("ticksToExpiration and showTicks", () => {
        it("channelled effect has ticksToExpiration === null and showTicks === false", () => {
            const effect = makeEffect({ durationMode: "channelled" });
            const result = buildEffectCardContext(effect, {
                actor: null,
            });

            expect(result.ticksToExpiration).to.be.null;
            expect(result.showTicks).to.be.false;
        });

        it("timed effect with rounds in combat computes correct tick count", () => {
            const startRound = 10;
            const value = 5;
            const currentTick = 12;
            const expected = startRound + value - currentTick; // 3

            const actor = makeActor("a1");
            getCombatForActorStub.withArgs(actor).returns(makeCombat(currentTick));
            const effect = makeEffect({
                durationMode: "timed",
                duration: {
                    expired: false,
                    value,
                    units: "rounds",
                    start: { round: startRound },
                },
            });
            const result = buildEffectCardContext(effect, {
                actor,
            });

            expect(result.ticksToExpiration).to.equal(expected);
            expect(result.showTicks).to.be.true;
        });

        it("timed effect but actor not in combat (getCombatForActor returns null) has ticksToExpiration === null", () => {
            const actor = makeActor("a1");
            getCombatForActorStub.withArgs(actor).returns(null);
            const effect = makeEffect({
                durationMode: "timed",
                duration: {
                    expired: false,
                    value: 5,
                    units: "rounds",
                    start: { round: 10 },
                },
            });
            const result = buildEffectCardContext(effect, {
                actor,
            });

            expect(result.ticksToExpiration).to.be.null;
            expect(result.showTicks).to.be.false;
        });

        it("timed effect with non-rounds units has ticksToExpiration === null", () => {
            const actor = makeActor("a1");
            getCombatForActorStub.withArgs(actor).returns(makeCombat(12));
            const effect = makeEffect({
                durationMode: "timed",
                duration: {
                    expired: false,
                    value: 5,
                    units: "hours",
                    start: { round: 10 },
                },
            });
            const result = buildEffectCardContext(effect, {
                actor,
            });

            expect(result.ticksToExpiration).to.be.null;
            expect(result.showTicks).to.be.false;
        });

        it("timed+rounds effect where count is 0 has ticksToExpiration === null", () => {
            const actor = makeActor("a1");
            getCombatForActorStub.withArgs(actor).returns(makeCombat(15));
            const effect = makeEffect({
                durationMode: "timed",
                duration: {
                    expired: false,
                    value: 5,
                    units: "rounds",
                    start: { round: 10 },
                },
            });
            const result = buildEffectCardContext(effect, {
                actor,
            });

            expect(result.ticksToExpiration).to.be.null;
            expect(result.showTicks).to.be.false;
        });

        it("timed+rounds effect where count is negative has ticksToExpiration === null", () => {
            const actor = makeActor("a1");
            getCombatForActorStub.withArgs(actor).returns(makeCombat(18));
            const effect = makeEffect({
                durationMode: "timed",
                duration: {
                    expired: false,
                    value: 5,
                    units: "rounds",
                    start: { round: 10 },
                },
            });
            const result = buildEffectCardContext(effect, {
                actor,
            });

            expect(result.ticksToExpiration).to.be.null;
            expect(result.showTicks).to.be.false;
        });

        it("actor is null has ticksToExpiration === null", () => {
            const effect = makeEffect({
                durationMode: "timed",
                duration: {
                    expired: false,
                    value: 5,
                    units: "rounds",
                    start: { round: 10 },
                },
            });
            const result = buildEffectCardContext(effect, {
                actor: null,
            });

            expect(getCombatForActorStub.called).to.be.false;
            expect(result.ticksToExpiration).to.be.null;
            expect(result.showTicks).to.be.false;
        });
    });

    describe("typeCssClass", () => {
        const highlightedPairs: Array<{
            rawType: EffectType;
            expectedClass: string;
        }> = [
            { rawType: "spellEffect", expectedClass: "effect-type-spellEffect" },
            {
                rawType: "attackEffect",
                expectedClass: "effect-type-attackEffect",
            },
            {
                rawType: "spellEnhancedEffect",
                expectedClass: "effect-type-spellEnhancedEffect",
            },
            { rawType: "modifier", expectedClass: "" },
        ];

        highlightedPairs.forEach(({ rawType, expectedClass }) => {
            it(`type "${rawType}" produces typeCssClass "${expectedClass}"`, () => {
                const result = buildEffectCardContext(makeEffect({ type: rawType }), { actor: null });

                expect(result.typeCssClass).to.equal(expectedClass);
            });
        });

        it('type "base" produces typeCssClass ""', () => {
            const result = buildEffectCardContext(makeEffect({ type: "base" }), { actor: null });

            expect(result.typeCssClass).to.equal("");
        });
    });
});

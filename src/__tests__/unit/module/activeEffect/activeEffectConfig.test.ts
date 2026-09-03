import { describe, it } from "mocha";
import { expect } from "chai";
import sinon, { type SinonSandbox } from "sinon";
import {
    defaultDurationUnit,
    isActorInCombat,
    processDurationFormData,
    readDurationUnits,
} from "module/activeEffect/sheets/SplittermondActiveEffectConfig";
import { foundryApi } from "module/api/foundryApi";
import { SplittermondActiveEffect } from "module/activeEffect/SplittermondActiveEffect";

function stubResolveProperty(sandbox: SinonSandbox): sinon.SinonStub {
    return sandbox.stub(foundryApi.utils, "resolveProperty").callsFake((source: object, path: string) => {
        const keys = path.split(".");
        let current: unknown = source;
        for (const key of keys) {
            if (current === null || current === undefined) return undefined;
            current = (current as Record<string, unknown>)[key];
        }
        return current;
    });
}

function makeEffectStub(sandbox: SinonSandbox, actor: unknown): SplittermondActiveEffect {
    const stub = sandbox.createStubInstance(SplittermondActiveEffect) as unknown as {
        actor: unknown;
    };
    Object.defineProperty(stub, "actor", { get: () => actor, configurable: true });
    return stub as SplittermondActiveEffect;
}

interface DurationSubmitData {
    flags: { splittermond: { durationMode: string } };
    duration: { value: unknown; units: string; expiry: unknown };
    [key: string]: unknown;
}

function durationData(
    durationMode: string,
    duration: { value: unknown; units: string; expiry?: unknown }
): DurationSubmitData {
    return {
        flags: { splittermond: { durationMode } },
        duration: { value: duration.value, units: duration.units, expiry: duration.expiry ?? null },
    };
}

describe("readDurationUnits", () => {
    it("preserves a valid unit", () => {
        expect(readDurationUnits("rounds", "hours")).to.equal("rounds");
    });

    it("falls back when the value is not in the choices list", () => {
        expect(readDurationUnits("seconds", "hours")).to.equal("hours");
    });

    it("falls back when the value is not a string", () => {
        expect(readDurationUnits(null, "rounds")).to.equal("rounds");
    });

    it("falls back when the value is an unknown string", () => {
        expect(readDurationUnits("invalid", "hours")).to.equal("hours");
    });
});

describe("defaultDurationUnit", () => {
    it("returns rounds for a combat actor", () => {
        expect(defaultDurationUnit(true)).to.equal("rounds");
    });

    it("returns hours for a non-combat actor", () => {
        expect(defaultDurationUnit(false)).to.equal("hours");
    });
});

describe("isActorInCombat", () => {
    it("returns false when the effect has no actor", () => {
        const sandbox = sinon.createSandbox();
        try {
            const effect = makeEffectStub(sandbox, null);
            expect(isActorInCombat(effect)).to.be.false;
        } finally {
            sandbox.restore();
        }
    });

    it("returns false when getCombatForActor returns null", () => {
        const sandbox = sinon.createSandbox();
        try {
            const actor = { id: "actor-1" } as unknown as Actor;
            const effect = makeEffectStub(sandbox, actor);
            const combatStub = sandbox.stub(foundryApi, "getCombatForActor").returns(null);
            expect(isActorInCombat(effect)).to.be.false;
            expect(combatStub.calledOnceWith(actor)).to.be.true;
        } finally {
            sandbox.restore();
        }
    });

    it("returns true when getCombatForActor returns a combat", () => {
        const sandbox = sinon.createSandbox();
        try {
            const actor = { id: "actor-2" } as unknown as Actor;
            const effect = makeEffectStub(sandbox, actor);
            const fakeCombat = { id: "combat-1" } as unknown as ReturnType<typeof foundryApi.getCombatForActor>;
            sandbox.stub(foundryApi, "getCombatForActor").returns(fakeCombat);
            expect(isActorInCombat(effect)).to.be.true;
        } finally {
            sandbox.restore();
        }
    });
});

describe("processDurationFormData", () => {
    it("defaults timed units to hours for a non-combat actor", () => {
        const sandbox = sinon.createSandbox();
        try {
            stubResolveProperty(sandbox);
            const effect = makeEffectStub(sandbox, null);
            const submitData = durationData("timed", { value: 5, units: "seconds" });
            processDurationFormData(submitData, effect);
            expect(submitData.duration.units).to.equal("hours");
            expect(submitData.duration.expiry).to.be.null;
        } finally {
            sandbox.restore();
        }
    });

    it("defaults timed units to rounds and roundEnd expiry for a combat actor", () => {
        const sandbox = sinon.createSandbox();
        try {
            stubResolveProperty(sandbox);
            const actor = { id: "actor-combat" } as unknown as Actor;
            const effect = makeEffectStub(sandbox, actor);
            const fakeCombat = { id: "combat-1" } as unknown as ReturnType<typeof foundryApi.getCombatForActor>;
            sandbox.stub(foundryApi, "getCombatForActor").returns(fakeCombat);
            const submitData = durationData("timed", { value: 3, units: "seconds" });
            processDurationFormData(submitData, effect);
            expect(submitData.duration.units).to.equal("rounds");
            expect(submitData.duration.expiry).to.equal("roundEnd");
        } finally {
            sandbox.restore();
        }
    });

    it("preserves an explicitly chosen valid unit", () => {
        const sandbox = sinon.createSandbox();
        try {
            stubResolveProperty(sandbox);
            const effect = makeEffectStub(sandbox, null);
            const submitData = durationData("timed", { value: 2, units: "days" });
            processDurationFormData(submitData, effect);
            expect(submitData.duration.units).to.equal("days");
            expect(submitData.duration.expiry).to.be.null;
        } finally {
            sandbox.restore();
        }
    });

    it("clears duration fields when mode is not timed", () => {
        const sandbox = sinon.createSandbox();
        try {
            stubResolveProperty(sandbox);
            const effect = makeEffectStub(sandbox, null);
            const submitData = durationData("permanent", { value: 3, units: "rounds" });
            processDurationFormData(submitData, effect);
            expect(submitData.duration.value).to.be.null;
            expect(submitData.duration.units).to.equal("seconds");
            expect(submitData.duration.expiry).to.be.null;
        } finally {
            sandbox.restore();
        }
    });
});

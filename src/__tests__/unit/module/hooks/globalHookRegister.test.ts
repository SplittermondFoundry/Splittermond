import { afterEach, beforeEach, describe, it } from "mocha";
import { expect } from "chai";
import sinon, { type SinonSandbox } from "sinon";
import { addToRegistry, setGlobalHookRegister } from "module/hooks/globalHookRegister";

const mockSubscriber = () => ({ unsubscribe: () => {}, id: 1 });

describe("globalHookRegister", () => {
    let sandbox: SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        setGlobalHookRegister(null);
        setGlobalHookRegister({});
    });

    afterEach(() => {
        setGlobalHookRegister(null);
        sandbox.restore();
    });

    describe("addToRegistry", () => {
        it("should return true for a new entry", () => {
            expect(addToRegistry("newHook", mockSubscriber)).to.be.true;
        });

        it("should return false for a duplicate entry", () => {
            addToRegistry("existingHook", mockSubscriber);
            expect(addToRegistry("existingHook", mockSubscriber)).to.be.false;
        });

        it("should add to preInitQueue when globalRegistry is null", () => {
            setGlobalHookRegister(null);
            addToRegistry("queuedHook", mockSubscriber);
            const registry: Record<string, any> = {};
            setGlobalHookRegister(registry);
            expect(registry).to.have.property("queuedHook");
        });

        it("should add to globalRegistry when it is set", () => {
            const registry: Record<string, any> = {};
            setGlobalHookRegister(registry);
            addToRegistry("directHook", mockSubscriber);
            expect(registry).to.have.property("directHook");
        });

        it("should store the subscriber function", () => {
            const registry: Record<string, any> = {};
            setGlobalHookRegister(registry);
            const sub = mockSubscriber;
            addToRegistry("storedHook", sub);
            expect(registry["storedHook"]).to.equal(sub);
        });
    });

    describe("setGlobalHookRegister", () => {
        it("should flush preInitQueue entries into the provided registry", () => {
            setGlobalHookRegister(null);
            addToRegistry("flushedHook", mockSubscriber);
            const registry: Record<string, any> = {};
            setGlobalHookRegister(registry);
            expect(registry).to.have.property("flushedHook");
        });

        it("should clear preInitQueue after flushing", () => {
            setGlobalHookRegister(null);
            addToRegistry("onceFlushed", mockSubscriber);
            setGlobalHookRegister({});
            const secondRegistry: Record<string, any> = {};
            setGlobalHookRegister(secondRegistry);
            expect(secondRegistry).to.not.have.property("onceFlushed");
        });

        it("should log error when flush encounters duplicate name", () => {
            const consoleErrorSpy = sandbox.spy(console, "error");
            setGlobalHookRegister(null);
            addToRegistry("dupHook", mockSubscriber);
            const registry: Record<string, any> = { dupHook: mockSubscriber };
            setGlobalHookRegister(registry);
            expect(consoleErrorSpy.calledOnce).to.be.true;
            expect(consoleErrorSpy.firstCall.firstArg).to.include("dupHook");
        });

        it("should clear preInitQueue when called with null", () => {
            setGlobalHookRegister(null);
            addToRegistry("shouldBeCleared", mockSubscriber);
            setGlobalHookRegister(null);
            const registry: Record<string, any> = {};
            setGlobalHookRegister(registry);
            expect(registry).to.not.have.property("shouldBeCleared");
        });

        it("should flush multiple queued entries", () => {
            setGlobalHookRegister(null);
            addToRegistry("hook1", mockSubscriber);
            addToRegistry("hook2", mockSubscriber);
            addToRegistry("hook3", mockSubscriber);
            const registry: Record<string, any> = {};
            setGlobalHookRegister(registry);
            expect(registry).to.have.property("hook1");
            expect(registry).to.have.property("hook2");
            expect(registry).to.have.property("hook3");
        });

        it("should handle empty preInitQueue without errors", () => {
            const consoleErrorSpy = sandbox.spy(console, "error");
            setGlobalHookRegister({});
            expect(consoleErrorSpy.called).to.be.false;
        });
    });
});

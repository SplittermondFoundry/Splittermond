import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { registerHook } from "module/hooks/registration";
import { initializeHooks } from "module/hooks";
import { fields } from "module/data/SplittermondDataModel";

type HookRegistry = NonNullable<Parameters<typeof initializeHooks>[0]>;
declare const game: { splittermond: { API: { hooks: HookRegistry } } };

export function hooksTest(context: QuenchBatchContext) {
    const { describe, it, expect, beforeEach, afterEach } = context;

    describe("hooks module (integration)", () => {
        let registeredHooks: HookRegistry;
        const originalRegistry = game.splittermond.API.hooks;
        let subscriptions: Array<{ unsubscribe(): void }> = [];

        beforeEach(() => {
            registeredHooks = {};
            initializeHooks(registeredHooks);
        });

        afterEach(() => {
            subscriptions.forEach((subscription) => subscription.unsubscribe());
            subscriptions = [];
            initializeHooks(originalRegistry);
        });

        describe("registerHook with real Foundry Hooks", () => {
            it("should call subscribed listeners", () => {
                const hook = registerHook("splittermond.integCall", () => [
                    new fields.StringField({ required: true, nullable: false }),
                ]);
                let received = "";
                subscriptions.push(
                    hook.subscribe((val) => {
                        received = val;
                        return true;
                    })
                );
                hook.call("testValue");
                expect(received).to.equal("testValue");
            });

            it("should support unsubscribe", () => {
                const hook = registerHook("splittermond.integUnsub", () => [
                    new fields.StringField({ required: true, nullable: false }),
                ]);
                let callCount = 0;
                const sub = hook.subscribe(() => {
                    callCount++;
                    return true;
                });
                subscriptions.push(sub);
                hook.call("first");
                sub.unsubscribe();
                hook.call("second");
                expect(callCount).to.equal(1);
            });

            it("should fire once listener only once", () => {
                const hook = registerHook("splittermond.integOnce", () => [
                    new fields.StringField({ required: true, nullable: false }),
                ]);
                let callCount = 0;
                hook.once(() => {
                    callCount++;
                    return true;
                });
                hook.call("first");
                hook.call("second");
                expect(callCount).to.equal(1);
            });

            it("should reject invalid params with HookParamValidationError", () => {
                const hook = registerHook("splittermond.integValid", () => [
                    new fields.NumberField({ required: true, nullable: false }),
                ]);
                expect(() => Reflect.apply(hook.call, hook, ["not-a-number"])).to.throw("Failed to validate candidate");
            });

            it("should register in the global hook registry", () => {
                registerHook("splittermond.integRegistry");
                expect(registeredHooks).to.have.property("integRegistry");
            });

            it("should throw on duplicate registration", () => {
                registerHook("splittermond.integDup");
                expect(() => registerHook("splittermond.integDup")).to.throw("already registered");
            });

            it("should pass multiple params to listeners", () => {
                const hook = registerHook("splittermond.integMulti", () => [
                    new fields.StringField({ required: true, nullable: false }),
                    new fields.NumberField({ required: true, nullable: false }),
                ]);
                let receivedP1: unknown;
                let receivedP2: unknown;
                subscriptions.push(
                    hook.subscribe((p1, p2) => {
                        receivedP1 = p1;
                        receivedP2 = p2;
                        return true;
                    })
                );
                hook.call("hello", 42);
                expect(receivedP1).to.equal("hello");
                expect(receivedP2).to.equal(42);
            });
        });
    });
}

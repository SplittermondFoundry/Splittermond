import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { registerHook } from "module/hooks/registration";
import { initializeHooks } from "module/hooks";

declare const Hooks: any;
declare const foundry: any;

export function hooksTest(context: QuenchBatchContext) {
    const { describe, it, expect, beforeEach, afterEach } = context;

    describe("hooks module (integration)", () => {
        let registeredHooks: Record<string, any>;

        beforeEach(() => {
            registeredHooks = {};
            initializeHooks(registeredHooks);
        });

        afterEach(() => {
            initializeHooks(null);
        });

        describe("registerHook with real Foundry Hooks", () => {
            it("should call subscribed listeners", () => {
                const hook = registerHook(
                    "splittermond.integCall",
                    new foundry.data.fields.StringField({ required: true, nullable: false })
                );
                let received = "";
                hook.subscribe((val: any) => {
                    received = val;
                    return true;
                });
                hook.call("testValue");
                expect(received).to.equal("testValue");
            });

            it("should support unsubscribe", () => {
                const hook = registerHook(
                    "splittermond.integUnsub",
                    new foundry.data.fields.StringField({ required: true, nullable: false })
                );
                let callCount = 0;
                const sub = hook.subscribe(() => {
                    callCount++;
                    return true;
                });
                hook.call("first");
                sub.unsubscribe();
                hook.call("second");
                expect(callCount).to.equal(1);
            });

            it("should fire once listener only once", () => {
                const hook = registerHook(
                    "splittermond.integOnce",
                    new foundry.data.fields.StringField({ required: true, nullable: false })
                );
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
                const hook = registerHook(
                    "splittermond.integValid",
                    new foundry.data.fields.NumberField({ required: true, nullable: false })
                );
                expect(() => hook.call("not-a-number" as any)).to.throw("Failed to validate candidate");
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
                const hook = registerHook(
                    "splittermond.integMulti",()=>[
                    new foundry.data.fields.StringField({ required: true, nullable: false }),
                    new foundry.data.fields.NumberField({ required: true, nullable: false })]
                );
                let receivedP1: any;
                let receivedP2: any;
                hook.subscribe((p1: any, p2: any) => {
                    receivedP1 = p1;
                    receivedP2 = p2;
                    return true;
                });
                hook.call("hello", 42);
                expect(receivedP1).to.equal("hello");
                expect(receivedP2).to.equal(42);
            });
        });
    });
}

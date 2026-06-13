import { afterEach, beforeEach, describe, it } from "mocha";
import { expect } from "chai";
import sinon, { type SinonSandbox, type SinonStub } from "sinon";
import { registerHook, HookParamValidationError } from "module/hooks/registration";
import { foundryApi } from "module/api/foundryApi";
import { setGlobalHookRegister } from "module/hooks/globalHookRegister";
import { fields } from "module/data/SplittermondDataModel";

describe("registerHook", () => {
    let sandbox: SinonSandbox;
    let hooksCallStub: SinonStub;
    let hooksOnStub: SinonStub;
    let hooksOffStub: SinonStub;
    let hooksOnceStub: SinonStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        hooksCallStub = sandbox.stub(foundryApi.hooks, "call").returns(true);
        hooksOnStub = sandbox.stub(foundryApi.hooks, "on").returns(1);
        hooksOffStub = sandbox.stub(foundryApi.hooks, "off");
        hooksOnceStub = sandbox.stub(foundryApi.hooks, "once");
        setGlobalHookRegister(null);
        setGlobalHookRegister({});
    });

    afterEach(() => {
        setGlobalHookRegister(null);
        sandbox.restore();
    });

    describe("call", () => {
        it("should delegate to foundryApi.hooks.call with hook name and params", () => {
            const hook = registerHook("splittermond.calltest", () => [
                new fields.StringField({ required: true, nullable: false }),
            ]);
            hook.call("hello");
            expect(hooksCallStub.calledOnceWith("splittermond.calltest", "hello")).to.be.true;
        });

        it("should pass all params to foundryApi.hooks.call", () => {
            const hook = registerHook("splittermond.multiparam", () => [
                new fields.StringField({ required: true, nullable: false }),
                new fields.NumberField({ required: true, nullable: false }),
            ]);
            hook.call("hello", 42);
            expect(hooksCallStub.calledOnceWith("splittermond.multiparam", "hello", 42)).to.be.true;
        });

        it("should validate param1 and throw HookParamValidationError on invalid input", () => {
            const hook = registerHook("splittermond.validated", () => [
                new fields.StringField({ required: true, nullable: false }),
            ]);
            expect(() => hook.call(123 as any)).to.throw(HookParamValidationError);
        });

        it("should call without validation when no params are defined", () => {
            const hook = registerHook("splittermond.noparams");
            hook.call();
            expect(hooksCallStub.calledOnce).to.be.true;
        });

        it("should include cause in error when validator throws Error or string", () => {
            const hook = registerHook("splittermond.causeErr", () => [
                new fields.StringField({ required: true, nullable: false }),
            ]);
            try {
                hook.call(42 as any);
                expect.fail("should have thrown");
            } catch (e: any) {
                expect(e.toString()).to.include("Cause:");
            }
        });

        it("should validate param3 against params[2] not params[1]", () => {
            const hook = registerHook("splittermond.param3valid", () => [
                new fields.StringField({ required: true, nullable: false }),
                new fields.NumberField({ required: true, nullable: false }),
                new fields.BooleanField({ required: true, nullable: false }),
            ]);
            hook.call("text", 99, true);
            expect(hooksCallStub.calledOnce).to.be.true;
        });

        it("should reject invalid param3 value", () => {
            const hook = registerHook("splittermond.param3invalid", () => [
                new fields.StringField({ required: true, nullable: false }),
                new fields.NumberField({ required: true, nullable: false }),
                new fields.BooleanField({ required: true, nullable: false }),
            ]);
            expect(() => hook.call("text", 99, "not-bool" as any)).to.throw(HookParamValidationError);
        });

        it("should allow extra args beyond the 3 validated params", () => {
            const hook = registerHook("splittermond.extraargs", () => [
                new fields.StringField({ required: true, nullable: false }),
                new fields.NumberField({ required: true, nullable: false }),
                new fields.BooleanField({ required: true, nullable: false }),
            ]);
            hook.call("text", 1, true, "extra", 42);
            expect(hooksCallStub.calledOnceWith("splittermond.extraargs", "text", 1, true, "extra", 42)).to.be.true;
        });

        it("should allow extra args when no params are defined", () => {
            const hook = registerHook("splittermond.noparamsextra");
            hook.call("anything", 42, true);
            expect(hooksCallStub.calledOnceWith("splittermond.noparamsextra", "anything", 42, true)).to.be.true;
        });
    });

    describe("subscribe", () => {
        it("should register a listener via foundryApi.hooks.on", () => {
            const hook = registerHook("splittermond.subhook", () => [
                new fields.StringField({ required: true, nullable: false }),
            ]);
            const listener = () => true;
            const result = hook.subscribe(listener);
            expect(hooksOnStub.calledOnceWith("splittermond.subhook", listener)).to.be.true;
            expect(result).to.have.property("id", 1);
            expect(result).to.have.property("unsubscribe");
        });

        it("should unsubscribe via foundryApi.hooks.off", () => {
            const hook = registerHook("splittermond.unsubhook", () => [
                new fields.StringField({ required: true, nullable: false }),
            ]);
            const result = hook.subscribe(() => true);
            result.unsubscribe();
            expect(hooksOffStub.calledOnceWith("splittermond.unsubhook", 1)).to.be.true;
        });
    });

    describe("once", () => {
        it("should register a one-time listener via foundryApi.hooks.once", () => {
            const hook = registerHook("splittermond.oncehook", () => [
                new fields.StringField({ required: true, nullable: false }),
            ]);
            const listener = () => true;
            hook.once(listener);
            expect(hooksOnceStub.calledOnceWith("splittermond.oncehook", listener)).to.be.true;
        });
    });

    describe("duplicate registration", () => {
        it("should throw when registering the same hook name twice", () => {
            registerHook("splittermond.duphook");
            expect(() => registerHook("splittermond.duphook")).to.throw("already registered");
        });

        it("should allow different hook names", () => {
            expect(() => {
                registerHook("splittermond.hookA");
                registerHook("splittermond.hookB");
            }).to.not.throw();
        });
    });

    describe("return value", () => {
        it("should return an object with call, subscribe, and once", () => {
            const hook = registerHook("splittermond.retval");
            expect(hook).to.have.property("call").that.is.a("function");
            expect(hook).to.have.property("subscribe").that.is.a("function");
            expect(hook).to.have.property("once").that.is.a("function");
        });
    });

    describe("nullable and optional params", () => {
        it("should accept null for nullable param", () => {
            const hook = registerHook("splittermond.nullable", () => [
                new fields.StringField({ required: false, nullable: true }),
            ]);
            hook.call(null as any);
            expect(hooksCallStub.calledOnce).to.be.true;
        });

        it("should accept undefined for optional param", () => {
            const hook = registerHook("splittermond.optional", () => [
                new fields.StringField({ required: false, nullable: false }),
            ]);
            hook.call(undefined as any);
            expect(hooksCallStub.calledOnce).to.be.true;
        });
    });
});

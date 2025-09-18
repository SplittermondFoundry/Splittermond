import { describe } from "mocha";
//import { expect } from 'chai'
import { registerRequestedSystemSettings, resetIsInitialized, settings } from "../../../module/settings";
import sinon, { SinonSpy } from "sinon";
import { foundryApi } from "../../../module/api/foundryApi";
import { asMock } from "../settingsMock";
import { expect } from "chai";

describe("Settings", () => {
    const sandbox = sinon.createSandbox();
    let registerStub: SinonSpy;
    let getStub: SinonSpy;
    let setStub: SinonSpy;

    beforeEach(() => {
        registerStub = sandbox.spy(sandbox.fake());
        getStub = sandbox.spy(sandbox.fake());
        setStub = sandbox.spy(sandbox.fake());
        sandbox.stub(foundryApi, "settings").get(() => {
            return {
                register: registerStub,
                get: getStub,
                set: setStub,
            };
        });
    });
    afterEach(() => {
        resetIsInitialized();
        sandbox.restore();
    });

    it("should not execute registrations immediately", async () => {
        asMock(settings.registerNumber).callOriginal("test", { position: 1, config: true, default: 3 });

        expect(registerStub.called).to.be.false;
    });

    it("should delay registration", async () => {
        asMock(settings.registerNumber).callOriginal("test", { position: 1, config: true, default: 3 });

        await registerRequestedSystemSettings();

        expect(registerStub.called).to.be.true;
    });

    it("should order settings by position", async () => {
        asMock(settings.registerNumber).callOriginal("last", { position: 4, config: true, default: 3 });
        asMock(settings.registerBoolean).callOriginal("first", { position: 1, config: true, default: false });
        asMock(settings.registerBoolean).callOriginal("third", { position: 3, config: true, default: false });
        asMock(settings.registerString).callOriginal("second", { position: 2, config: true, default: "bla" });

        await registerRequestedSystemSettings();

        expect(registerStub.getCalls().map((call) => call.args[1])).to.deep.equal(["first", "second", "third", "last"]);
    });

    it("should ignore ordering gaps", async () => {
        asMock(settings.registerNumber).callOriginal("last", { position: 45, config: true, default: 3 });
        asMock(settings.registerBoolean).callOriginal("first", { position: 10, config: true, default: false });
        asMock(settings.registerBoolean).callOriginal("third", { position: 33, config: true, default: false });
        asMock(settings.registerString).callOriginal("second", { position: 20, config: true, default: "" });

        await registerRequestedSystemSettings();

        expect(registerStub.getCalls().map((call) => call.args[1])).to.deep.equal(["first", "second", "third", "last"]);
    });

    it("should append settings with same position (two items special case)", async () => {
        asMock(settings.registerBoolean).callOriginal("second", { position: 3, config: true, default: false });
        asMock(settings.registerNumber).callOriginal("third", { position: 3, config: true, default: 3 });
        asMock(settings.registerBoolean).callOriginal("first", { position: 1, config: true, default: false });

        await registerRequestedSystemSettings();

        expect(registerStub.getCalls().map((call) => call.args[1])).to.deep.equal(["first", "second", "third"]);
    });
    it("should append settings with same position", async () => {
        asMock(settings.registerBoolean).callOriginal("first", { position: 10, config: true, default: false });
        asMock(settings.registerBoolean).callOriginal("third", { position: 33, config: true, default: false });
        asMock(settings.registerNumber).callOriginal("last", { position: 33, config: true, default: 3 });
        asMock(settings.registerString).callOriginal("second", { position: 20, config: true, default: "" });

        await registerRequestedSystemSettings();

        expect(registerStub.getCalls().map((call) => call.args[1])).to.deep.equal(["first", "second", "third", "last"]);
    });

    it("should always append null positioned settings", async () => {
        asMock(settings.registerBoolean).callOriginal("first", { config: true, default: false });
        asMock(settings.registerBoolean).callOriginal("third", { position: 33, config: true, default: false });
        asMock(settings.registerNumber).callOriginal("last", { position: 33, config: true, default: 3 });
        asMock(settings.registerString).callOriginal("second", { config: true, default: "" });

        await registerRequestedSystemSettings();

        expect(registerStub.getCalls().map((call) => call.args[1])).to.deep.equal(["third", "last", "first", "second"]);
    });
});

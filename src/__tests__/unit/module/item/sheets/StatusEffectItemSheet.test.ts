import { describe, it, beforeEach, afterEach } from "mocha";
import { expect } from "chai";
import sinon, { type SinonSandbox, type SinonStub } from "sinon";
import { JSDOM } from "jsdom";
import StatusEffectItemSheet from "module/item/sheets/StatusEffectItemSheet";
import SplittermondItemSheet from "module/item/sheets/item-sheet";
import { foundryApi } from "module/api/foundryApi";
import { splittermond } from "module/config";

function makeDataTransfer(payload: string | null): { getData: (type: string) => string } {
    return {
        getData: (type: string) => (type === "text/plain" && payload !== null ? payload : ""),
    };
}

function makeDropEvent(payload: string | null): DragEvent {
    const dataTransfer = makeDataTransfer(payload);
    return { type: "drop", dataTransfer } as unknown as DragEvent;
}

function makeSheet(updateStub?: SinonStub): StatusEffectItemSheet {
    const mockItem = {
        type: "statuseffect",
        effects: [],
        system: { description: "", combatEvent: { macroRef: { name: null, uuid: null } } },
        update: updateStub ?? sinon.stub().resolves({}),
    };
    const localizer = { localize: sinon.stub().returns("") };
    return new StatusEffectItemSheet(
        { document: mockItem },
        foundryApi.utils.resolveProperty,
        localizer,
        splittermond,
        sinon.stub().resolves("")
    );
}

describe("StatusEffectItemSheet — _onDrop macro handling", () => {
    let sandbox: SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "localize").callsFake((s: string) => s);
    });

    afterEach(() => sandbox.restore());

    it("persists macroRef uuid and name when a Macro is dropped", async () => {
        const update = sinon.stub().resolves({});
        const sheet = makeSheet(update);
        sandbox.stub(foundryApi.utils, "fromUUID").resolves({ name: "My Macro", execute: () => {} } as never);

        await sheet._onDrop(makeDropEvent(JSON.stringify({ type: "Macro", uuid: "Macro.abc123" })));

        expect(update.calledOnce).to.be.true;
        const arg = update.firstCall.args[0];
        expect(arg["system.combatEvent.macroRef.uuid"]).to.equal("Macro.abc123");
        expect(arg["system.combatEvent.macroRef.name"]).to.equal("My Macro");
    });

    it("sets macroRef name to null when the dropped uuid cannot be resolved", async () => {
        const update = sinon.stub().resolves({});
        const sheet = makeSheet(update);
        sandbox.stub(foundryApi.utils, "fromUUID").resolves(null);

        await sheet._onDrop(makeDropEvent(JSON.stringify({ type: "Macro", uuid: "Macro.missing" })));

        expect(update.calledOnce).to.be.true;
        const arg = update.firstCall.args[0];
        expect(arg["system.combatEvent.macroRef.uuid"]).to.equal("Macro.missing");
        expect(arg["system.combatEvent.macroRef.name"]).to.be.null;
    });

    it("does not persist and delegates to super for non-Macro drops", async () => {
        const update = sinon.stub().resolves({});
        const sheet = makeSheet(update);

        await sheet._onDrop(makeDropEvent(JSON.stringify({ type: "Item", uuid: "Item.xyz" })));

        expect(update.called).to.be.false;
    });

    it("does not throw when dataTransfer is absent or empty", async () => {
        const update = sinon.stub().resolves({});
        const sheet = makeSheet(update);

        await sheet._onDrop(makeDropEvent(null));
        await sheet._onDrop(makeDropEvent(""));

        expect(update.called).to.be.false;
    });

    it("delegates to super when the payload is malformed (non-JSON) without throwing", async () => {
        const update = sinon.stub().resolves({});
        const sheet = makeSheet(update);
        const superSpy = sandbox.stub(SplittermondItemSheet.prototype, "_onDrop").resolves();

        await sheet._onDrop(makeDropEvent("not-valid-json-{"));

        expect(update.called).to.be.false;
        expect(superSpy.calledOnce).to.be.true;
    });
});

describe("StatusEffectItemSheet — _onSubmitForm macroRef.uuid resolution", () => {
    let sandbox: SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "localize").callsFake((s: string) => s);
    });

    afterEach(() => sandbox.restore());

    function makeForm(values: Record<string, string>): HTMLFormElement {
        const dom = new JSDOM("<!DOCTYPE html><form></form>");
        const form = dom.window.document.querySelector("form")!;
        for (const [name, value] of Object.entries(values)) {
            const input = dom.window.document.createElement("input");
            input.name = name;
            input.value = value;
            form.appendChild(input);
        }
        return form as unknown as HTMLFormElement;
    }

    function makeSubmitEvent(form: HTMLFormElement): Event {
        return { currentTarget: form, type: "submit" } as unknown as Event;
    }

    type WithSubmitForm = { _onSubmitForm: (formConfig: unknown, event: Event) => Promise<void> };

    function stubSuperSubmitForm(): SinonStub {
        return sandbox.stub(SplittermondItemSheet.prototype as unknown as WithSubmitForm, "_onSubmitForm").resolves();
    }

    function makeSheet(macroRefUuid: string | null): { sheet: StatusEffectItemSheet; update: SinonStub } {
        const update = sinon.stub().resolves({});
        const mockItem = {
            type: "statuseffect",
            effects: [],
            system: { description: "", combatEvent: { macroRef: { name: null, uuid: macroRefUuid } } },
            update,
        };
        const localizer = { localize: sinon.stub().returns("") };
        const sheet = new StatusEffectItemSheet(
            { document: mockItem },
            foundryApi.utils.resolveProperty,
            localizer,
            splittermond,
            sinon.stub().resolves("")
        );
        return { sheet, update };
    }

    it("persists the resolved macro name via item.update when the typed uuid changes", async () => {
        const { sheet, update } = makeSheet("Macro.old");
        stubSuperSubmitForm();
        sandbox.stub(foundryApi.utils, "fromUUID").resolves({ name: "Typed Macro", execute: () => {} } as never);

        const form = makeForm({ "system.combatEvent.macroRef.uuid": "Macro.newUuid" });

        await (sheet as unknown as WithSubmitForm)._onSubmitForm({}, makeSubmitEvent(form));

        expect(update.calledOnce).to.be.true;
        expect(update.firstCall.args[0]["system.combatEvent.macroRef.name"]).to.equal("Typed Macro");
    });

    it("does not resolve and only calls super when the uuid is unchanged", async () => {
        const { sheet, update } = makeSheet("Macro.same");
        const superStub = stubSuperSubmitForm();
        const fromUuidSpy = sandbox.stub(foundryApi.utils, "fromUUID").resolves(null);

        const form = makeForm({ "system.combatEvent.macroRef.uuid": "Macro.same" });

        await (sheet as unknown as WithSubmitForm)._onSubmitForm({}, makeSubmitEvent(form));

        expect(fromUuidSpy.called).to.be.false;
        expect(superStub.calledOnce).to.be.true;
        expect(update.called).to.be.false;
    });

    it("clears the name via item.update when the typed uuid cannot be resolved", async () => {
        const { sheet, update } = makeSheet("Macro.old");
        stubSuperSubmitForm();
        sandbox.stub(foundryApi.utils, "fromUUID").resolves(null);

        const form = makeForm({ "system.combatEvent.macroRef.uuid": "Macro.missing" });

        await (sheet as unknown as WithSubmitForm)._onSubmitForm({}, makeSubmitEvent(form));

        expect(update.calledOnce).to.be.true;
        expect(update.firstCall.args[0]["system.combatEvent.macroRef.name"]).to.be.null;
    });

    it("clears the name via item.update when the resolved document is not a Macro", async () => {
        const { sheet, update } = makeSheet("Macro.old");
        stubSuperSubmitForm();
        sandbox.stub(foundryApi.utils, "fromUUID").resolves({} as never);

        const form = makeForm({ "system.combatEvent.macroRef.uuid": "Item.notMacro" });

        await (sheet as unknown as WithSubmitForm)._onSubmitForm({}, makeSubmitEvent(form));

        expect(update.calledOnce).to.be.true;
        expect(update.firstCall.args[0]["system.combatEvent.macroRef.name"]).to.be.null;
    });
});

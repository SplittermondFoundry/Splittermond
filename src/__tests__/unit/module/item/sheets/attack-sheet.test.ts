import { describe, it, beforeEach, afterEach } from "mocha";
import { expect } from "chai";
import type { SinonStub } from "sinon";
import type { SinonSandbox } from "sinon";
import sinon from "sinon";
import SplittermondAttackSheet from "module/item/sheets/attack-sheet";
import { foundryApi } from "module/api/foundryApi";
import { splittermond } from "module/config";

function makeDropEvent(payload: unknown): DragEvent {
    const data = payload === undefined ? undefined : JSON.stringify(payload);
    return {
        dataTransfer: { getData: () => data ?? "" },
    } as unknown as DragEvent;
}

function makeSheet(effects: unknown[], enricher?: SinonStub) {
    const resolvedEnricher = enricher ?? sinon.stub().resolves("");
    const mockItem = { type: "npcattack", effects, system: { description: "" } };
    const localizer = { localize: sinon.stub().returns("") };
    return new SplittermondAttackSheet(
        { document: mockItem },
        foundryApi.utils.resolveProperty,
        localizer,
        splittermond,
        resolvedEnricher
    );
}

describe("SplittermondAttackSheet — effects block on npcattack", () => {
    let sandbox: SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "localize").callsFake((s: string) => s);
    });

    afterEach(() => sandbox.restore());

    it("returns the effects part context unchanged for an npcattack-typed sheet", async () => {
        const sheet = makeSheet([]);
        const result = await sheet._preparePartContext("effects", {}, {});
        expect(result.effects).to.be.undefined;
        expect(result.modifierHelpText).to.be.undefined;
    });

    it("warns and blocks the drop when an ActiveEffect is dropped on an npcattack-typed sheet", async () => {
        const warnStub = sandbox.stub(foundryApi, "warnUser");
        const sheet = makeSheet([]);
        await sheet._onDropActiveEffect(makeDropEvent({ type: "ActiveEffect", uuid: "some-uuid" }), {
            type: "ActiveEffect",
            uuid: "some-uuid",
        });
        expect(warnStub.calledOnce).to.be.true;
        expect(warnStub.firstCall.args[0]).to.equal("splittermond.activeEffect.error.itemTypeEffectsNotSupported");
    });
});

describe("SplittermondAttackSheet — static PARTS/TABS do not include effects entries", () => {
    it("PARTS does not include the effects key", () => {
        expect(SplittermondAttackSheet.PARTS).to.not.have.property("effects");
    });

    it("TABS.primary.tabs does not include an effects entry", () => {
        const ids = SplittermondAttackSheet.TABS.primary.tabs.map((t) => t.id);
        expect(ids).to.not.include("effects");
    });

    it("PARTS preserves the non-effects keys from the base", () => {
        expect(SplittermondAttackSheet.PARTS).to.have.property("header");
        expect(SplittermondAttackSheet.PARTS).to.have.property("editor");
        expect(SplittermondAttackSheet.PARTS).to.have.property("properties");
    });

    it("TABS preserves the non-effects tabs from the base", () => {
        const ids = SplittermondAttackSheet.TABS.primary.tabs.map((t) => t.id);
        expect(ids).to.include("editor");
        expect(ids).to.include("properties");
    });
});

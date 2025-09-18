import sinon, { SinonSandbox, SinonStub } from "sinon";
import { foundryApi } from "../../../../../module/api/foundryApi";
import ItemImporter from "../../../../../module/util/item-importer";
import * as Baumwandler from "../../../../resources/importSamples/GRW/NSC/Baumwandler.resource";
import { expect } from "chai";
import { actorCreator } from "../../../../../module/data/EntityCreator";
import { initLocalizer } from "./poorMansLocalizer";
import SplittermondCompendium from "../../../../../module/util/compendium";

global.ClipboardEvent = class {
    constructor(private text: string) {}

    public clipboardData = {
        getData: () => this.text,
    };
} as any;

describe("Npc imports", () => {
    let sandbox: SinonSandbox;
    let npcCreationStub: SinonStub;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        npcCreationStub = sandbox.stub(actorCreator, "createNpc").returns(Promise.resolve({} as any));
        sandbox.stub(foundryApi, "localize").callsFake(initLocalizer());
        sandbox.stub(foundryApi, "format").callsFake(initLocalizer());
        sandbox.stub(foundryApi, "informUser");
        sandbox.stub(foundryApi, "warnUser");
        sandbox.stub(SplittermondCompendium, "findItem").resolves(null);
        sandbox.stub(foundryApi, "reportError").callsFake(() => {});
        sandbox.stub(ItemImporter, "_folderDialog").returns(Promise.resolve("folderId"));
        sandbox.stub(ItemImporter, "_skillDialog").returns(Promise.resolve("fightmagic"));
    });
    afterEach(() => sandbox.restore());

    it(`should import npc ${Baumwandler.testname}`, async () => {
        const text = Baumwandler.input;
        const expectedItems = [...Baumwandler.expected.items];
        const susceptibleFeature = expectedItems.find(
            (item) => item.name === "Verwundbarkeit gegen Feuerschaden"
        )!.system;
        Object.defineProperty(susceptibleFeature, "modifier", { value: "weakness.fire 1", enumerable: true });

        await ItemImporter.pasteEventhandler(new ClipboardEvent(text));

        expect(npcCreationStub.calledOnce).to.be.true;
        expect(npcCreationStub.lastCall.args[0].system).to.deep.equal(Baumwandler.expected.system);
        expect(npcCreationStub.lastCall.args[0].items).to.deep.equal(expectedItems);
    });
});

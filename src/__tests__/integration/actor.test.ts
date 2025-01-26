import {QuenchBatchContext} from "@ethaks/fvtt-quench";
import sinon from "sinon";
import ItemImporter from "../../module/util/item-importer";
import * as Baumwandler from "../resources/importSamples/GRW/NSC/Baumwandler.resource";
import {foundryApi} from "../../module/api/foundryApi";
import SplittermondActor from "../../module/actor/actor";

declare const Actor: any

export function actorTest(context:QuenchBatchContext){
    const {it, expect, afterEach} = context;

    describe("Foundry API compatibility", () => {

    });
    describe("Actor import", () => {
        const sandbox = sinon.createSandbox();
        afterEach(() => {
            sandbox.restore()
        });


        it("can import an NSC via text import", async () => {
            sandbox.stub(ItemImporter, "_folderDialog").returns(Promise.resolve(""));
            sandbox.stub(ItemImporter, "_skillDialog").returns(Promise.resolve("fightmagic"));
            const actorSpy = sandbox.stub(foundryApi, "createActor");
            let actor:Actor = sandbox.createStubInstance(SplittermondActor);
            actorSpy.callsFake(async (data)=> {actor = await Actor.create(data);return Promise.resolve(actor)});

            const probe = sandbox.createStubInstance(ClipboardEvent);
            sandbox.stub(probe, "clipboardData").get(() => ({getData: () => Baumwandler.input}));
            await ItemImporter.pasteEventhandler(probe);

            expect(actor.system.biography).to.deep.contain(Baumwandler.expected.system.biography);
            expect(actor.system.attributes).to.deep.contain(Baumwandler.expected.system.attributes);
            expect(actor.system.derivedAttributes).to.deep.contain(Baumwandler.expected.system.derivedAttributes);
            expect(actor.system.skills).to.deep.contain(Baumwandler.expected.system.skills);
            expect(actor.system.type).to.deep.contain(Baumwandler.expected.system.type);
            expect(actor.system.currency).to.deep.contain(Baumwandler.expected.system.currency);
            expect("img" in actor && actor.img).to.equal("icons/svg/mystery-man.svg")

            await Actor.deleteDocuments([actor.id]);
        });
    });
}
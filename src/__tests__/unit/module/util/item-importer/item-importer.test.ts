import ItemImporter from "../../../../../module/util/item-importer";
import * as Machtexplosion from "../../../../resources/importSamples/GRW/spells/Machtexplosion.resource";
import * as Maskerade from "../../../../resources/importSamples/GRW/spells/Maskerade.resource";
import * as Stahlhaut from "../../../../resources/importSamples/GRW/spells/Stahlhaut.resource";
import * as Bannmagie from "../../../../resources/importSamples/GRW/masteries/Bannmagie.resource";
import * as BannendeHand from "../../../../resources/importSamples/GRW/masteries/BannendeHand.resource";
import * as Baumwandler from "../../../../resources/importSamples/GRW/NSC/Baumwandler.resource";
import * as Oger from "../../../../resources/importSamples/GRW/NSC/Oger.resource";
import * as Vorarbeiter from "../../../../resources/importSamples/Hexenkönigin/Vorarbeiter.resource";
import * as Regenbogenschwinge from "../../../../resources/importSamples/Hexenkönigin/Regenbogenschwinge.resource";
import {describe, it} from "mocha";
import sinon, {SinonSandbox, SinonStub} from "sinon";
import {actorCreator, itemCreator} from "../../../../../module/data/EntityCreator";
import {expect} from "chai";
import {foundryApi} from "../../../../../module/api/foundryApi";
import {initLocalizer} from "./poorMansLocalizer";
import SplittermondCompendium from "../../../../../module/util/compendium";

global.ClipboardEvent = class {
    constructor(private text: string) {
    }

    public clipboardData = {
        getData: () => this.text,
    }
} as any;
describe("ItemImporter", () => {
    let sandbox: SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "localize").callsFake(initLocalizer());
        sandbox.stub(foundryApi, "format").callsFake(initLocalizer());
        sandbox.stub(foundryApi, "informUser");
        sandbox.stub(foundryApi, "warnUser");
        sandbox.stub(SplittermondCompendium, "findItem").callsFake((type, name)=>{
            const fakeItem= {_id:1, type, name, system:{} };
            return Promise.resolve({...fakeItem, toObject:()=>fakeItem});
        })
    });
    afterEach(() => {
        sandbox.restore();
    });


    describe("Imports from the core rulebook", () => {

        describe("Spell imports", () => {
            let spellCreationStub: SinonStub;
            beforeEach(() => {
                spellCreationStub = sandbox.stub(itemCreator, "createSpell");
                sandbox.stub(ItemImporter, "_folderDialog").returns(Promise.resolve("folderId"));
                sandbox.stub(ItemImporter, "_skillDialog").returns(Promise.resolve("fightmagic"));
            });

            [Machtexplosion, Maskerade, Stahlhaut].forEach((resource) => {

                it(`should import spell '${resource.testname}'`, async () => {
                    const text = resource.input

                    await ItemImporter.pasteEventhandler(new ClipboardEvent(text));

                    expect(spellCreationStub.calledOnce).to.be.true;
                    expect(spellCreationStub.getCalls()[0].args[0]).to.deep.equal(
                        {folder: "folderId", ...resource.expected});
                })
            });
        });

        describe("Mastery imports", () => {
            let masteryCreationStub: SinonStub;
            beforeEach(() => {
                masteryCreationStub = sandbox.stub(itemCreator, "createMastery").returns(Promise.resolve({} as any));
                sandbox.stub(ItemImporter, "_folderDialog").returns(Promise.resolve("folderId"));
                sandbox.stub(ItemImporter, "_skillDialog").returns(Promise.resolve("fightmagic"));
            });

            it(`should import ${Bannmagie.testname}`, async () => {
                const text = Bannmagie.input

                await ItemImporter.pasteEventhandler(new ClipboardEvent(text));

                expect(masteryCreationStub.calledTwice).to.be.true;
                expect(masteryCreationStub.getCalls()[0].args[0]).to.deep.equal(
                    {
                        folder: "folderId", ...Bannmagie.expected[0],
                        system: {availableIn: "fightmagic", skill: 'fightmagic', ...Bannmagie.expected[0].system}
                    });
                expect(masteryCreationStub.getCalls()[1].args[0]).to.deep.equal(
                    {
                        folder: "folderId", ...Bannmagie.expected[1],
                        system: {availableIn: "fightmagic", skill: 'fightmagic', ...Bannmagie.expected[1].system}
                    });
            });

            it(`should import mastery '${BannendeHand.testname}'`, async () => {

                const text = BannendeHand.input

                await ItemImporter.pasteEventhandler(new ClipboardEvent(text));

                expect(masteryCreationStub.calledOnce).to.be.true;
                expect(masteryCreationStub.getCalls()[0].args[0]).to.deep.equal(
                    {
                        folder: "folderId", ...BannendeHand.expected,
                        system: {availableIn: "fightmagic", skill: 'fightmagic', ...BannendeHand.expected.system}
                    });
            });
        });

        describe("Npc imports", () => {
            let npcCreationStub: SinonStub;
            beforeEach(() => {
                npcCreationStub = sandbox.stub(actorCreator, "createNpc").returns(Promise.resolve({} as any));
                sandbox.stub(foundryApi, "reportError").callsFake(() => {});
                sandbox.stub(ItemImporter, "_folderDialog").returns(Promise.resolve("folderId"));
                sandbox.stub(ItemImporter, "_skillDialog").returns(Promise.resolve("fightmagic"));
            });
            afterEach(() => sandbox.restore());

            [Baumwandler, Oger].forEach((resource) => {
                it(`should import npc ${resource.testname}`, async () => {
                    const text = resource.input;

                    await ItemImporter.pasteEventhandler(new ClipboardEvent(text));

                    expect(npcCreationStub.calledOnce).to.be.true;
                    expect(npcCreationStub.lastCall.args[0].system).to.deep.equal(resource.expected.system)
                    expect(npcCreationStub.lastCall.args[0].items).to.deep.equal(resource.expected.items)
                });
            });
        });
    });

    describe("Imports from adventure books",()=>{
        let npcCreationStub: SinonStub;
        beforeEach(() => {
            npcCreationStub = sandbox.stub(actorCreator, "createNpc").returns(Promise.resolve({} as any));
            sandbox.stub(foundryApi, "reportError").callsFake(() => {});
            sandbox.stub(ItemImporter, "_folderDialog").returns(Promise.resolve("folderId"));
            sandbox.stub(ItemImporter, "_skillDialog").returns(Promise.resolve("fightmagic"));
        });
        afterEach(() => sandbox.restore());

        //This input comes with a mangled attribute table. We cannot reliably reconstruct the attributes and derived
        //attributes here.
        [Vorarbeiter,Regenbogenschwinge].forEach((resource) => {
            it(`should import npc ${resource.testname}`, async () => {
                const text = resource.input;

                await ItemImporter.pasteEventhandler(new ClipboardEvent(text));

                expect(npcCreationStub.calledOnce).to.be.true;
                expect(npcCreationStub.lastCall.args[0].system.biography).equals(resource.expected.system.biography);
                expect(Object.values(npcCreationStub.lastCall.args[0].system.attributes).map((a:any)=>a.value)).not.all.members([0]);
                expect(Object.values(npcCreationStub.lastCall.args[0].system.derivedAttributes).map((a:any)=>a.value)).not.all.members([0]);
                expect(npcCreationStub.lastCall.args[0].system.skills).to.deep.equal(resource.expected.system.skills)
                expect(npcCreationStub.lastCall.args[0].items).to.deep.equal(resource.expected.items)
            });
        });
    })
});
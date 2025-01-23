import ItemImporter from "../../../../../module/util/item-importer";
import * as Machtexplosion from "../../../../resources/importSamples/GRW/spells/Machtexplosion.resource";
import * as Maskerade from "../../../../resources/importSamples/GRW/spells/Maskerade.resource";
import * as Stahlhaut from "../../../../resources/importSamples/GRW/spells/Stahlhaut.resource";
import * as Bannmagie from "../../../../resources/importSamples/GRW/masteries/Bannmagie.resource";
import * as BannendeHand from "../../../../resources/importSamples/GRW/masteries/BannendeHand.resource";
import {describe, it} from "mocha";
import sinon, {SinonSandbox, SinonStub} from "sinon";
import {itemCreator} from "../../../../../module/data/ItemCreator";
import {expect} from "chai";
import {foundryApi} from "../../../../../module/api/foundryApi";
import {initLocalizer} from "./poorMansLocalizer";

declare const game: any;
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

            [Machtexplosion,Maskerade,Stahlhaut].forEach((resource) => {

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
                masteryCreationStub = sandbox.stub(itemCreator, "createMastery").returns(Promise.resolve({}as any));
                sandbox.stub(ItemImporter, "_folderDialog").returns(Promise.resolve("folderId"));
                sandbox.stub(ItemImporter, "_skillDialog").returns(Promise.resolve("fightmagic"));
            });

            it(`should import ${Bannmagie.testname}`, async () =>{
                const text = Bannmagie.input

                await ItemImporter.pasteEventhandler(new ClipboardEvent(text));

                expect(masteryCreationStub.calledTwice).to.be.true;
                expect(masteryCreationStub.getCalls()[0].args[0]).to.deep.equal(
                    {folder: "folderId", ...Bannmagie.expected[0], system: {availableIn: "fightmagic", skill: 'fightmagic', ...Bannmagie.expected[0].system}});
                expect(masteryCreationStub.getCalls()[1].args[0]).to.deep.equal(
                    {folder: "folderId", ...Bannmagie.expected[1], system: {availableIn: "fightmagic", skill: 'fightmagic', ...Bannmagie.expected[1].system}});
            });

            it(`should import mastery '${BannendeHand.testname}'`, async () => {

                const text = BannendeHand.input

                await ItemImporter.pasteEventhandler(new ClipboardEvent(text));

                expect(masteryCreationStub.calledOnce).to.be.true;
                expect(masteryCreationStub.getCalls()[0].args[0]).to.deep.equal(
                    {folder: "folderId", ...BannendeHand.expected, system: {availableIn: "fightmagic", skill: 'fightmagic', ...BannendeHand.expected.system}});
            });
        });
    });
});
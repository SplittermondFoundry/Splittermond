import {foundryApi} from "../../module/api/foundryApi";
import {splittermond} from "../../module/config.js";
import {MasteryDataModel} from "../../module/item/dataModel/MasteryDataModel.js";
import {SpellDataModel} from "../../module/item/dataModel/SpellDataModel";
import SplittermondSpellItem from "../../module/item/spell";
import {itemCreator} from "../../module/data/EntityCreator";
import ItemImporter from "../../module/util/item-importer";
import * as Machtexplosion from "../resources/importSamples/GRW/spells/Machtexplosion.resource";
import sinon from "sinon";
import type {QuenchBatchContext} from "@ethaks/fvtt-quench";

import {itemTypes} from "../../module/config/itemTypes";

declare const Item: any;
declare const game: any;

export function itemTest(this:any, context: QuenchBatchContext) {
    const {describe, it, expect, afterEach} = context;
    describe("foundry API compatibility", () => {
        it("has an actor attached if on an actor", () => {
            const actorWithItem = game.actors.filter((actor:Actor) => actor.items.size > 0)
            if (actorWithItem.length === 0) {
                it.skip("No actor with items found");
            }
            const actor = actorWithItem[0];
            const underTest = actor.items.find(() => true) //get first item

            expect(underTest.actor).to.equal(actor);
        });

        it("can create a new mastery item", async () => {
            let itemData = {
                type: "mastery",
                name: "Supermastery",
                folder: null,
                system: {
                    skill: "deathmagic",
                    availableIn: "deathmagic 1",
                    level: 1,
                    modifier: splittermond.modifier["arcanespeed"],
                    description: "abc",
                    isGrandmaster: false,
                    isManeuver: false,
                    source: ""
                }
            };
            const item = await foundryApi.createItem(itemData);

            expect(item.system).to.deep.equal(itemData.system);
            expect(item.system).to.be.instanceOf(MasteryDataModel)
            expect(item.name).to.equal(itemData.name);
            expect(item.type).to.equal(itemData.type);

            await Item.deleteDocuments([item.id]);
        });

        it("can create a new spell item", async () => {
            let itemData = {
                type: "spell",
                name: "Megaspell",
                folder: null,
                system: {
                    skill: "deathmagic",
                    availableIn: "deathmagic 1",
                    castDuration: {value: 5, unit: "min"},
                    costs: "5000V5000",
                    skillLevel: 6,
                    description: "abc",
                    damage: {
                        stringInput: "500d10+200"
                    },
                    damageType: "physical",
                    costType: "V",
                    effectArea: "50km²",
                    enhancementDescription: "Obliterates everything",
                    enhancementCosts: "1",
                    degreeOfSuccessOptions:{
                        castDuration: false,
                        consumedFocus: false,
                        exhaustedFocus: false,
                        channelizedFocus: false,
                        effectDuration: false,
                        damage: false,
                        range: false,
                        effectArea: false
                    },
                    difficulty:"",
                    effectDuration: "",
                    spellType:"",
                    features:{
                        internalFeatureList:[],
                    },
                    range: "",
                    source: ""
                }
            };
            const item = await foundryApi.createItem(itemData);

            expect(item).to.be.instanceOf(SplittermondSpellItem)
            expect(item.name).to.equal(itemData.name);
            expect(item.type).to.equal(itemData.type);
            expect(item.system).to.be.instanceOf(SpellDataModel)
            expect(item.system.toObject()).to.deep.equal(itemData.system);

            await Item.deleteDocuments([item.id]);
        });
    });
    describe("import test",() => {
        const sandbox = sinon.createSandbox();
        afterEach(() => sandbox.restore());

        it("can import a spell", async () => {
            sandbox.stub(ItemImporter, "_folderDialog").returns(Promise.resolve(""));
            sandbox.stub(ItemImporter, "_skillDialog").returns(Promise.resolve("fightmagic"));
            const itemCreatorSpy = sandbox.spy(itemCreator, "createSpell");

            const probe =sandbox.createStubInstance(ClipboardEvent);
            sandbox.stub(probe,"clipboardData").get(()=>({getData:()=>Machtexplosion.input}));
            await ItemImporter.pasteEventhandler(probe);

            const item = await itemCreatorSpy.lastCall.returnValue
            const expectedItemSystem = {
                ...Machtexplosion.expected.system,
                features: {
                    _document: null,
                    internalFeatureList: Machtexplosion.expected.system.features.internalFeatureList,
                    triedToFindDocument: false
                }

            };
            expect(item.system).to.deep.equal(expectedItemSystem);
            expect("img" in item && item.img).to.equal("icons/svg/daze.svg")

            await Item.deleteDocuments([item.id]);
        });
    });

    describe("item type completeness", () => {
        itemTypes.forEach(itemType => {
            it(`itemType is present in item data models config '${itemType}'`, () => {
                expect(CONFIG.Item.dataModels).to.have.property(itemType);
            });
        });

        Object.keys(CONFIG.Item.dataModels).forEach(itemType => {
            it(`Item data models key exists in item Type '${itemType}'`, () => {
                expect(itemTypes).to.contain(itemType)
            });
        })
    });
}

import {foundryApi} from "../../module/api/foundryApi";
import {splittermond} from "../../module/config.js";
import {MasteryDataModel} from "../../module/item/dataModel/MasteryDataModel.js";
import {QuenchContext} from "./resources/types";
import {SpellDataModel} from "../../module/item/dataModel/SpellDataModel";
import SplittermondSpellItem from "../../module/item/spell";

declare const Item: any;
declare const game: any;

export function itemTest(this:any, context: QuenchContext) {
    const {describe, it, expect} = context;
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
                    castDuration: "5m",
                    costs: "5000V5000",
                    skillLevel: 6,
                    description: "abc",
                    damage: "500d10+200",
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
                    features: "",
                    range: "",
                    source: ""
                }
            };
            const item = await foundryApi.createItem(itemData);

            expect(item.system).to.deep.equal(itemData.system);
            expect(item.system).to.be.instanceOf(SpellDataModel)
            expect(item).to.be.instanceOf(SplittermondSpellItem)
            expect(item.name).to.equal(itemData.name);
            expect(item.type).to.equal(itemData.type);

            await Item.deleteDocuments([item.id]);
        });
    });
}
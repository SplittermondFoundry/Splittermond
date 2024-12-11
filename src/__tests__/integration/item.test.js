import {foundryApi} from "../../module/api/foundryApi";
import {splittermond} from "../../module/config.js";

export function itemTest(context) {
    const {describe, it, expect} = context;
    describe("foundry API compatibility", () => {
        it("has an actor attached if on an actor",()=>{
            const actorWithItem = game.actors.filter(actor => actor.items.size > 0)
            if(actorWithItem.length === 0) {
                this.skip();
            }
            const actor = actorWithItem[0];
            const underTest = actor.items.find(item => true) //get first item

            expect(underTest.actor).to.equal(actor);
        });

        it("can create a new item", async () => {
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
                    isGrandmaster: 0,
                    isManeuver: false,
                    source: ""
                }
            };
            const item = await foundryApi.createItem(itemData);

            expect(item.system).to.deep.equal(itemData.system);
            expect(item.name).to.equal(itemData.name);
            expect(item.type).to.equal(itemData.type);
        });
    });
}
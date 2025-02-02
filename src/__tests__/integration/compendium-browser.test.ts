import {simplePropertyResolver} from "../util";
import {QuenchBatchContext} from "@ethaks/fvtt-quench";

declare const game:any;
declare const deepClone:any;
declare class Collection{}

export function compendiumBrowserTest(context:QuenchBatchContext) {
    const {describe, it, expect} = context;

    describe("foundry API compatibility", () => {
        it("game.packs can be sorted by documentName", () => {
            expect(game.packs.filter).to.be.a("function");
            expect(game.packs.filter((pack:any) => pack.documentName === "Item")).to.have.length.greaterThan(0);
            expect(game.packs.filter((pack:any) => pack.documentName === "Item")).and.to.have.length.lessThan(game.packs.size);
        });

        it("receives an index with objects that have the expected properties", async () => {
            const searchParam = {fields: ["system.skill", "name"]};
            const firstItemCompendium = game.packs.find((p:any) => p.documentName === "Item")
            if (!firstItemCompendium) {
                it.skip("No item compendium found");
            }
            const index = await firstItemCompendium.getIndex(searchParam);
            expect(index).to.be.instanceOf(Collection).and.to.have.length.greaterThan(0);
            const indexKey = index.keys().next().value;
            searchParam.fields.forEach(expectedProperty => {
                expect(simplePropertyResolver(index.get(indexKey), expectedProperty), `Property ${expectedProperty}`)
                    .not.to.be.undefined; //jshint ignore:line
            });
        });

        it("i18n contains a localize function that translates the given string", async () => {
            expect(game.i18n).to.have.property("localize");
            expect(game.i18n.localize("splittermond.skillLabel.deathmagic")).to.equal("Todesmagie");
        });

        it("i18n contains a format function that translates the given string, inserting templateArgs", async () => {
            expect(game.i18n).to.have.property("format");
            expect(game.i18n.format("splittermond.chatCard.spellMessage.tooManyHandlers", {action: "Handlung"}))
                .to.equal("Es gibt mehr als einen eingetragenen Bearbeiter für die Aktion 'Handlung'. Bitte wenden Sie sich an den Entwickler.");
        });

        it("i18n contains a format function ignores strings without templates", async () => {
            expect(game.i18n.format("splittermond.skillLabel.deathmagic", {})).to.equal("Todesmagie");
        });

        it("i18n contains a format function ignores no template args input", async () => {
            expect(game.i18n.format("splittermond.skillLabel.deathmagic")).to.equal("Todesmagie");
        });

        it("deepClone clones deeply", () => {
            const probe = {
               topLevel :{secondLevel: "value2", deleteMe:""},
               next: "value",
            };
            const clone = deepClone(probe);
            delete clone.topLevel.deleteMe;
            expect(probe.topLevel).to.have.property("deleteMe");
        });
    });

    describe("getData", () => {
        it("should return an object with the expected properties", async () => {
            if(game.packs.length === 0) {
                it.skip("No compendiums found");
            }
            const data = await game.splittermond.compendiumBrowser.getData();
            expect(data).to.have.property("items");
            expect(data.items).to.have.property("mastery");
            expect(data.items).to.have.property("spell");
            expect(data.items).to.have.property("weapon");
        });

    });
}
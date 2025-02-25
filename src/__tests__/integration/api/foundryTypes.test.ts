import type {QuenchBatchContext} from "@ethaks/fvtt-quench";
import {foundryApi} from "../../../module/api/foundryApi";
import {actorCreator} from "../../../module/data/EntityCreator";

declare const game: any

export function foundryTypeDeclarationsTest(context: QuenchBatchContext) {
    const {describe, it, expect} = context;

    describe("Item", () => {
        it("should be a class", () => {
            expect(typeof Item).to.equal("function");
        });

        ["img", "name", "type",].forEach(property => {
            it(`should have a string property ${property}`, () => {
                    game.items.forEach((item: FoundryDocument) => {
                        expect(item, `Item ${item.id} does not have ${property}`).to.have.property(property);
                        expect(typeof item[property as keyof typeof item], `item property ${property} is not a string`)
                            .to.equal("string");
                    });
                }
            )
        });
        ["system"].forEach(property => {
            it(`should have an object property ${property}`, () => {
                    game.items.forEach((item: FoundryDocument) => {
                        expect(item, `Item ${item.id} does not have ${property}`).to.have.property(property);
                        expect(typeof item[property as keyof typeof item], `item property ${property} is not an object`)
                            .to.equal("object");
                    });
                }
            )
        });
        ["prepareBaseData", "prepareDerivedData", "toObject", "getFlag", "updateSource"].forEach(property => {
            it(`should have a method ${property}`, () => {
                expect(Item.prototype, `Item prototype does not have ${property}`).to.have.property(property);
                expect(typeof Item.prototype[property as keyof typeof Item.prototype], `item property ${property} is not a function`)
                    .to.equal("function");

            });
        });

    });
    describe("Actor", () => {
        ["system","owner"].forEach(property => {
            it(`should have an object property ${property}`, () => {
                    game.actors.forEach((actor: FoundryDocument) => {
                        expect(actor, `Item ${actor.id} does not have ${property}`).to.have.property(property);
                        expect(typeof actor[property as keyof typeof actor], `item property ${property} is not an object`)
                            .to.equal("object");
                    });
                }
            )
        });
        ["prepareBaseData", "prepareDerivedData", "toObject", "getFlag", "updateSource"].forEach(property => {
            it(`should have a method ${property}`, () => {
                expect(Item.prototype, `Item prototype does not have ${property}`).to.have.property(property);
                expect(typeof Item.prototype[property as keyof typeof Item.prototype], `item property ${property} is not a function`)
                    .to.equal("function");

            });
        });
    });

    describe("Token", () => {
        it("should be a class", () => {
            expect(typeof Token).to.equal("function");
        });

        ["document"].forEach(property => {
            const sampleToken = new Token(game.scenes.find(()=>true).tokens.find(()=>true));
            it(`should have a property called ${property}`, () => {
                expect(sampleToken, `Token does not have ${property}`).to.have.property(property);
                expect(typeof sampleToken[property as keyof typeof sampleToken], `Token property ${property} is a function`)
                    .to.not.equal("function");
            });
        });
    });

    describe("User", () => {
        ["isGM", "active", "id", "targets","name"].forEach(property => {
            it(`should have a property called ${property}`, () => {
                expect(foundryApi.currentUser, `User does not have ${property}`).to.have.property(property);
                expect(typeof foundryApi.currentUser[property as keyof typeof foundryApi.currentUser], `User property ${property} is a function`)
                    .to.not.equal("function");
            });
        });

        it("should return null for an unset character", () => {
            const gm = foundryApi.users.find(user => user.isGM);
            expect(gm?.character).to.be.null;
        });

        it("should return an actor for a set character", async () => {
            const testActor = await actorCreator.createCharacter({
                type: "character",
                name: "Test Character",
                system: {}
            });
            const nonGM = foundryApi.users.find(user => !user.isGM);
            expect(nonGM, "No non-GM user found").to.not.be.null;
            nonGM!.character = testActor;
            expect(nonGM!.character).to.be.instanceof(Actor);
            await Actor.deleteDocuments([testActor.id]);
        });
    });

    describe("CONFIG", () => {
        it("should have a property called Item", () => {
            expect(CONFIG, "CONFIG does not have a property called Item").to.have.property("Item");
        });

        it("should have a property called Actor", () => {
            expect(CONFIG, "CONFIG does not have a property called Actor").to.have.property("Actor");
        });

        it("should have required Item properties", () => {
            expect(CONFIG.Item.dataModels, "CONFIG.Item is not initialized").to.deep.contain.keys(["education", "resource", "ancestry", "culturelore"]);
        });

        it("should have splittermond properties", () => {
            const underTest = CONFIG.splittermond;
            expect(underTest, "CONFIG does not have a property called splittermond").to.be.an("object");
            expect(underTest instanceof Object && "Item" in underTest && underTest.Item,
                "CONFIG.splittermond does not have a property called splittermond").to.be.an("object");
        });
    });
}

import type {QuenchBatchContext} from "@ethaks/fvtt-quench";

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
        ["prepareBaseData", "prepareDerivedData", "toObject", "getFlag", "updateSource"].forEach(property => {
            it(`should have a method ${property}`, () => {
                expect(Item.prototype, `Item prototype does not have ${property}`).to.have.property(property);
                expect(typeof Item.prototype[property as keyof typeof Item.prototype], `item property ${property} is not a function`)
                    .to.equal("function");

            });
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

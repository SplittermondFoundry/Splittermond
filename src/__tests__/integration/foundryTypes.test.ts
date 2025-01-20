import {QuenchContext} from "./resources/types";

declare const game: any

export function foundryTypeDeclarationsTest(context: QuenchContext) {
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
}

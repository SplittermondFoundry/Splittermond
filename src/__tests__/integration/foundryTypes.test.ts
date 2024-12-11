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
                    game.items.forEach((item: FoundryDocument)=> {
                        expect(item, `Item ${item.id} does not have ${property}`).to.have.property(property);
                        expect(typeof item[property as keyof typeof item], `item property ${property} is not a string`)
                            .to.equal("string");
                    });
                }
            )
        });
    });
}

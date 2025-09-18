import { describe, it } from "mocha";
import { expect } from "chai";
import { produceAttackableItemTags } from "../../../../../module/item/tags/attackableItemTags.js";

describe("attackableItemTags", () => {
    //I have no clue why we would expect system.features to be an array.
    ["", undefined, null, [], 3].forEach((invalidValue) => {
        it(`should return an empty list if features takes value '${invalidValue}'`, () => {
            const system = { features: invalidValue };

            const actual = produceAttackableItemTags(system);

            expect(actual).to.be.empty; //jshint ignore:line
        });
    });

    it("should return an empty list if the features property is only whitespace", () => {
        const actual = produceAttackableItemTags({ features: " \t \n   \r" });

        expect(actual).to.be.empty; //jshint ignore:line
    });

    it("should split a comma separated list of features", () => {
        const actual = produceAttackableItemTags({ features: "Scharf 1, Vielseitig" });

        expect(actual).to.deep.equal(["Scharf 1", "Vielseitig"]);
    });
});

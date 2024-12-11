import foundryMocks from "../../foundryMocks.js";
import SplittermondMasteryItem from "../../../../module/item/mastery.js";
import {expect} from 'chai';
import {getMasteryAvailabilityParser} from "../../../../module/item/availabilityParser.ts";

describe("availableInList",() => {
    const mastery = new SplittermondMasteryItem({},{splittermond: {ready: true}}, getMasteryAvailabilityParser({localize: (str) => str.split(".").pop()}, ["staffs", "swords"]));

    it("should return an empty list if availableIn is not set", () => {
        mastery.system = {skill : "staffs", availableIn:""};
        expect(mastery.availableInList).to.deep.equal([{label: "staffs"}]);
    });

    it("should return a list of available skills",() => {
        mastery.system = {availableIn : "staffs, swords" };

        expect(mastery.availableInList.length).to.equal(2);
        expect(mastery.availableInList[0]).to.deep.equal({label: "staffs"});
        expect(mastery.availableInList[1]).to.deep.equal({label: "swords"});
    });

    it("should handle null availability",() => {
        mastery.system = {availableIn : null, skill: "staffs"};

        expect(mastery.availableInList).to.deep.equal([{label: "staffs"}]);
    });

    it("should handle whitespace availability",() => {
        mastery.system = {availableIn : "staffs swords", skill: "staffs"};

        expect(mastery.availableInList[0]).to.deep.equal({label:"staffs swords"});
        expect(mastery.availableInList[1]).to.deep.equal({label: "staffs"});
    });
});
import SplittermondMasteryItem from "../../../../module/item/mastery.js";
import { expect } from "chai";
import sinon from "sinon";
import { getMasteryAvailabilityParser } from "../../../../module/item/availabilityParser.ts";
import { modifiers } from "../../../../module/config/modifiers.ts";

describe("availableInList", () => {
    const mastery = new SplittermondMasteryItem(
        {},
        { splittermond: { ready: true } },
        getMasteryAvailabilityParser({ localize: (str) => str.split(".").pop() }, ["staffs", "swords"])
    );

    it("should return an empty list if availableIn is not set", () => {
        mastery.system = { skill: "staffs", availableIn: "" };
        expect(mastery.availableInList).to.deep.equal([{ label: "staffs" }]);
    });

    it("should return a list of available skills", () => {
        mastery.system = { availableIn: "staffs, swords" };

        expect(mastery.availableInList.length).to.equal(2);
        expect(mastery.availableInList[0]).to.deep.equal({ label: "staffs" });
        expect(mastery.availableInList[1]).to.deep.equal({ label: "swords" });
    });

    it("should handle null availability", () => {
        mastery.system = { availableIn: null, skill: "staffs" };

        expect(mastery.availableInList).to.deep.equal([{ label: "staffs" }]);
    });

    it("should handle whitespace availability", () => {
        mastery.system = { availableIn: "staffs swords", skill: "staffs" };

        expect(mastery.availableInList[0]).to.deep.equal({ label: "staffs swords" });
        expect(mastery.availableInList[1]).to.deep.equal({ label: "staffs" });
    });
});

describe("automatic mastery modifiers", () => {
    const mastery = new SplittermondMasteryItem(
        {},
        { splittermond: { ready: true } },
        getMasteryAvailabilityParser({ localize: (str) => str.split(".").pop() }, ["blades"])
    );

    it("should map Beidhändige Abwehr to a skill scoped defense tick cost modifier", () => {
        expect(modifiers["beidhändige abwehr"]).to.equal('item.defenseTickCost skill="${skill}" -1');
    });

    it("should scope Beidhändige Abwehr to the skill selected for the mastery", () => {
        const addModifier = sinon.stub();
        mastery.type = "mastery";
        mastery.name = "Beidhändige Abwehr";
        mastery.system = {
            skill: "blades",
            modifier: modifiers["beidhändige abwehr"],
        };
        mastery.actor = { addModifier };

        mastery.prepareActorData();

        expect(addModifier.calledOnce).to.be.true;
        expect(addModifier.firstCall.args[1]).to.equal('item.defenseTickCost skill="blades" -1');
        expect(addModifier.firstCall.args[2]).to.equal("innate");
    });
});

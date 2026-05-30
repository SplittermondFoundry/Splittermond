import { describe, it } from "mocha";
import { expect } from "chai";
import ModifierManager from "module/actor/modifiers/modifier-manager";
import { of } from "module/modifiers/expressions/scalar";
import { calculateDefenseTickCost } from "module/util/chat";

describe("defense tick cost", () => {
    it("should use the default active defense tick cost", () => {
        const data = makeActiveDefenseData();

        expect(calculateDefenseTickCost(data, 1)).to.equal(3);
    });

    it("should reduce default active defense tick cost for outstanding success", () => {
        const data = makeActiveDefenseData();

        expect(calculateDefenseTickCost(data, 5)).to.equal(2);
    });

    it("should increase active defense tick cost for positive modifiers", () => {
        const data = makeActiveDefenseData();
        data.itemData.actor.modifier.add(
            "item.defenseTickCost",
            { name: "Slower Defense", type: "innate", itemType: "shield" },
            of(1)
        );

        expect(calculateDefenseTickCost(data, 1)).to.equal(4);
    });

    it("should reduce active defense tick cost for negative modifiers", () => {
        const data = makeActiveDefenseData();
        data.itemData.actor.modifier.add(
            "item.defenseTickCost",
            { name: "Schnelle Schildabwehr", type: "innate", itemType: "shield" },
            of(-1)
        );

        expect(calculateDefenseTickCost(data, 1)).to.equal(2);
    });

    it("should ignore shield defense tick cost modifiers for weapons", () => {
        const data = makeActiveDefenseData({ itemType: "weapon" });
        data.itemData.actor.modifier.add(
            "item.defenseTickCost",
            { name: "Schnelle Schildabwehr", type: "innate", itemType: "shield" },
            of(-1)
        );

        expect(calculateDefenseTickCost(data, 1)).to.equal(3);
    });

    it("should apply unfiltered defense tick cost modifiers to mind resistance active defenses", () => {
        const data = makeActiveDefenseData({
            id: "determination",
            name: "Entschlossenheit",
            itemType: null,
            skill: { id: "determination" },
            defenseType: "mindresist",
        });
        data.itemData.actor.modifier.add("item.defenseTickCost", { name: "Universal Defense", type: "innate" }, of(-1));

        expect(calculateDefenseTickCost(data, 1)).to.equal(2);
    });

    it("should apply unfiltered defense tick cost modifiers to body resistance active defenses", () => {
        const data = makeActiveDefenseData({
            id: "endurance",
            name: "Zähigkeit",
            itemType: null,
            skill: { id: "endurance" },
            defenseType: "bodyresist",
        });
        data.itemData.actor.modifier.add("item.defenseTickCost", { name: "Universal Defense", type: "innate" }, of(-1));

        expect(calculateDefenseTickCost(data, 1)).to.equal(2);
    });

    it("should apply defense type scoped modifiers only to matching active defenses", () => {
        const data = makeActiveDefenseData();
        data.itemData.actor.modifier.add(
            "item.defenseTickCost",
            { name: "VTD Defense", type: "innate", defenseType: "defense" },
            of(-1)
        );

        expect(calculateDefenseTickCost(data, 1)).to.equal(2);
    });

    it("should ignore defense type scoped modifiers for other active defenses", () => {
        const data = makeActiveDefenseData({
            id: "determination",
            name: "Entschlossenheit",
            itemType: null,
            skill: { id: "determination" },
            defenseType: "mindresist",
        });
        data.itemData.actor.modifier.add(
            "item.defenseTickCost",
            { name: "VTD Defense", type: "innate", defenseType: "defense" },
            of(-1)
        );

        expect(calculateDefenseTickCost(data, 1)).to.equal(3);
    });

    it("should not reduce active defense tick cost below one tick", () => {
        const data = makeActiveDefenseData();
        data.itemData.actor.modifier.add(
            "item.defenseTickCost",
            { name: "Very Fast Defense", type: "innate" },
            of(-10)
        );

        expect(calculateDefenseTickCost(data, 5)).to.equal(1);
    });
});

function makeActiveDefenseData(overrides: Record<string, unknown> = {}) {
    const actor = { modifier: new ModifierManager() };
    const { defenseType = "defense", ...itemDataOverrides } = overrides;
    return {
        defenseType,
        itemData: {
            id: "shield-id",
            name: "Rundschild",
            itemType: "shield",
            skill: { id: "melee" },
            actor,
            ...itemDataOverrides,
        },
    } as any;
}

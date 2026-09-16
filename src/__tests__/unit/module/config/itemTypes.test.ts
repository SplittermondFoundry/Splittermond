import { expect } from "chai";
import { describe, it } from "mocha";
import { droppableCharacterItemTypes, droppableNpcItemTypes } from "module/config/itemTypes";

describe("actor sheet item drop rules", () => {
    it("allows languages and culture lore on character sheets", () => {
        expect(droppableCharacterItemTypes).to.include("language");
        expect(droppableCharacterItemTypes).to.include("culturelore");
    });

    it("rejects languages and culture lore on NPC sheets", () => {
        expect(droppableNpcItemTypes).not.to.include("language");
        expect(droppableNpcItemTypes).not.to.include("culturelore");
    });
});

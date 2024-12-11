import {getMasteryAvailabilityParser, getSpellAvailabilityParser} from "../../../../module/item/availabilityParser.js";
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {identity} from "../../foundryMocks.js";

const magicSkills = [
    "fatemagic",
    "deathmagic",
] as const;

const masterySkills = [
    "staffs",
    "blades"
] as const;

const masteryI18n = {
    localize: (str:string) => str === `splittermond.skillLabel.${masterySkills[0]}` ? "Stangenwaffen" : "Klingenwaffen"
};

const spellI18n = {
    localize: spellLocalizerFunction
};

function spellLocalizerFunction(str:string){
    if(str.includes("splittermond.skillLabel.")){
        return str === `splittermond.skillLabel.${magicSkills[0]}` ? "Schicksalsmagie" : "Todesmagie";
    }else if(str.includes("splittermond.skillAbbreviation.")) {
       return str === `splittermond.skillAbbreviation.${magicSkills[0]}` ? "Schicksal" : "Tod";
    }else{
        return str;
    }

}
describe("spell availabilty display transformation", () => {
    const parser = getSpellAvailabilityParser(spellI18n, magicSkills);
    it("should return the input if no transformation is set", () => {
        const input = "Maggie";
        expect(parser.toDisplayRepresentation(input)).to.equal(input);
    });

    it("should localize all the availabilities", () => {
        const expectedString = `Schicksalsmagie 1, Todesmagie 2`;
        expect(parser.toDisplayRepresentation(`${magicSkills[0]} 1, ${magicSkills[1]}:2`)).to.equal(expectedString);
    });

    it("should handle null input", () => {
        expect(parser.toDisplayRepresentation(null)).to.equal(null);
    });

    it("should handle typing errors", () => {
        expect(parser.toDisplayRepresentation("FateMagic 2, deaThmagic:1"))
            .to.equal("Schicksalsmagie 2, Todesmagie 1");
    });

    it("should pass on illegal values inbetween legal values",()=>{
        expect(parser.toDisplayRepresentation("Cederion2, deaThmagic:1, GRW 234"))
            .to.equal("Cederion2, Todesmagie 1, GRW 234");
    });

    it("should handle spell abbreviations",()=>{
        expect(parser.toInternalRepresentation("Schicksal 1, Tod:2"))
            .to.equal("fatemagic 1, deathmagic 2");
    })
});

describe("spell availabilty internal transformation", () => {
    'use strict';
    const parser = getSpellAvailabilityParser(spellI18n, magicSkills);
    it("should return the input if no transformation is set", () => {
        const input = "Maggie";
        expect(parser.toInternalRepresentation(input)).to.equal(input);
    });

    it("should translate localized availabilities", () => {
        const expectedString = `${magicSkills[0]} 1, ${magicSkills[1]} 2`;
        expect(parser.toInternalRepresentation(`Schicksalsmagie 1, Todesmagie:2`)).to.equal(expectedString);
    });

    it("should handle null input", () => {
        expect(parser.toInternalRepresentation(null as any)).to.equal(null);
    });
    it("should handle empty input", () => {
        expect(parser.toInternalRepresentation("")).to.equal("");
    });

    it("should handle typing errors", () => {
        expect(parser.toInternalRepresentation("schiCksalsMagie 1, deaThmagic:2"))
            .to.equal("fatemagic 1, deaThmagic 2");
    });

    it("should pass on illegal values inbetween legal values",()=>{
        expect(parser.toInternalRepresentation("Cederion2, todesmagie:1, GRW 234"))
            .to.equal("Cederion2, deathmagic 1, GRW 234");
    });

    it("should remove superfluous whitespace",()=>{
        expect(parser.toInternalRepresentation("  Cederion2    ,    todesmagie    1, "))
            .to.equal("Cederion2, deathmagic 1");
    });

});
describe("mastery availability display transformation", () => {
    const parser = getMasteryAvailabilityParser(masteryI18n, masterySkills);
    it("should return the input if no transformation is set", () => {
        const input = "Maggie";
        expect(parser.toDisplayRepresentation(input)).to.equal(input);
    });

    it("should localize all the availabilities", () => {
        const expectedString = `Stangenwaffen, Klingenwaffen`;
        expect(parser.toDisplayRepresentation(masterySkills.join(", "))).to.equal(expectedString);
    });

    it("should handle null input", () => {
        expect(parser.toDisplayRepresentation(null)).to.equal(null);
    });

    it("should handle typing errors", () => {
        expect(parser.toDisplayRepresentation("sTaFFs, bLAdes"))
            .to.equal("Stangenwaffen, Klingenwaffen");
    });

    it("should pass on illegal values inbetween legal values",()=>{
        expect(parser.toDisplayRepresentation("Cederion2, blaDEs, GRW 234"))
            .to.equal("Cederion2, Klingenwaffen, GRW 234");
    });
});


describe("mastery availabilty internal transformation", () => {
    const parser = getMasteryAvailabilityParser(masteryI18n, masterySkills);
    it("should return the input if no transformation is set", () => {
        const input = "Maggie";
        expect(parser.toInternalRepresentation(input)).to.equal(input);
    });

    it("should translate localized availabilities", () => {
        const expectedString = "staffs, blades";
        expect(parser.toInternalRepresentation(`Stangenwaffen, Klingenwaffen`)).to.equal(expectedString);
    });

    it("should handle null input", () => {
        expect(parser.toInternalRepresentation(null as any)).to.equal(null);
    });

    it("should handle typing errors", () => {
        expect(parser.toInternalRepresentation("stAnGenWAffen, kLInGenWafFen"))
            .to.equal("staffs, blades");
    });

    it("should pass on illegal values inbetween legal values",()=>{
        expect(parser.toInternalRepresentation("Cederion2, sTANGenWAffeN, GRW 234"))
            .to.equal("Cederion2, staffs, GRW 234");
    });

    it("should remove superfluous whitespace",()=>{
        expect(parser.toInternalRepresentation("  Cederion2    ,    stAnGenWAffen   , "))
            .to.equal("Cederion2, staffs");
    });
});
describe("cache consistency", () => {

    it("should return new instance if skillsets differs", () => {
        const firstParser = getSpellAvailabilityParser({localize: identity}, ["fatemagic", "deathmagic"]);
        const secondParser= getSpellAvailabilityParser({localize: identity}, ["deathmagic", "fatemagic"]);

        expect(firstParser).not.to.equal(secondParser);
    });

    it("should return new instance if localizer differs", () => {
        const firstParser = getSpellAvailabilityParser({localize: identity}, ["fatemagic", "deathmagic"]);
        const secondParser= getSpellAvailabilityParser({localize: (a:string)=> a}, ["fatemagic", "deathmagic"]);

        expect(firstParser).not.to.equal(secondParser);
    });
});

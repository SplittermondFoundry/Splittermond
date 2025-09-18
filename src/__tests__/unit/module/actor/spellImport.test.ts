import * as CaraAeternia from "__tests__/resources/importSamples/Hexenkönigin/Cara_Aeternia.json";
import { clearSkillMapper, genesisSpellImport } from "../../../../module/actor/genesisImport/spellImport";
import { afterEach, beforeEach, describe, it } from "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { foundryApi } from "../../../../module/api/foundryApi";

describe("Genesis Spell Import", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "format").callsFake((a: string) => a);
    });
    afterEach(() => {
        sandbox.restore();
        clearSkillMapper();
    });

    it("should import Cara Aeternia's Blenden spell correctly", () => {
        sandbox
            .stub(foundryApi, "localize")
            .callsFake((key: string) => (key === "splittermond.skillLabel.lightmagic" ? "Lichtmagie" : key));
        const spell = getSpell("Blenden");

        const importedSpell = genesisSpellImport(spell);

        expect(importedSpell).to.deep.equal({
            img: "icons/svg/daze.svg",
            name: "Blenden",
            system: {
                castDuration: {
                    value: 3,
                    unit: "T",
                    _document: null,
                    triedToFindDocument: false,
                },
                costs: "4V1",
                damage: {
                    stringInput: null,
                },
                degreeOfSuccessOptions: {
                    castDuration: true,
                    channelizedFocus: false,
                    consumedFocus: true,
                    damage: false,
                    effectArea: false,
                    effectDuration: false,
                    exhaustedFocus: true,
                    range: true,
                },
                description: "I",
                difficulty: "KW",
                effectDuration: "",
                enhancementCosts: "1 EG/+1V1",
                enhancementDescription: "Das Ziel erhält den Zustand Geblendet 2.",
                features: {
                    internalFeatureList: [],
                },
                range: "5m",
                skill: "lightmagic",
                skillLevel: 1,
            },
            type: "spell",
        });
    });

    it("should import Cara Aeternia's Einstellung verbessern spell correctly", () => {
        sandbox
            .stub(foundryApi, "localize")
            .callsFake((key: string) => (key === "splittermond.skillLabel.controlmagic" ? "Beherrschungsmagie" : key));
        const spell = getSpell("Einstellung verbessern");

        const importedSpell = genesisSpellImport(spell);

        expect(importedSpell).to.deep.equal({
            img: "icons/svg/daze.svg",
            name: "Einstellung verbessern",
            system: {
                castDuration: {
                    value: 3,
                    unit: "T",
                    _document: null,
                    triedToFindDocument: false,
                },
                costs: "K1",
                damage: {
                    stringInput: null,
                },
                degreeOfSuccessOptions: {
                    castDuration: true,
                    channelizedFocus: true,
                    consumedFocus: false,
                    damage: false,
                    effectArea: false,
                    effectDuration: true,
                    exhaustedFocus: false,
                    range: false,
                },
                description: "",
                difficulty: "GW",
                effectDuration: "K",
                enhancementCosts: "2 EG/+K1V1",
                enhancementDescription:
                    "Die Einstellung verbessert sich um insgesamt 2 Stufen (maximal auf Hilfsbereit).",
                features: {
                    internalFeatureList: [],
                },
                range: "Ber.",
                skill: "controlmagic",
                skillLevel: 0,
            },
            type: "spell",
        });
    });

    it("should import be lenient with dice mentions in Geschärfte Klinge", () => {
        sandbox
            .stub(foundryApi, "localize")
            .callsFake((key: string) => (key === "splittermond.skillLabel.controlmagic" ? "Beherrschungsmagie" : key));
        const importedSpell = genesisSpellImport({
            name: "Geschärfte Klinge",
            id: "sharpended_blade",
            school: "Felsmagie",
            schoolGrade: 1,
            difficulty: "31",
            focus: "K5V1",
            castDuration: "7T",
            castRange: "Ber.",
            spellDuration: "K",
            enhancement: "2 EG/+K2V3",
            longDescription:
                "Der Zauber verleiht einem Zauber einen Bonus in Höhe von drei Punkten Schaden sowie das Merkmal Scharf 2 (falls schon vorhanden, steigt es um einen Punkt bis zu einem Maximum von Scharf 3 bei Waffen mit W6 als Schadenswürfel bzw. Scharf 5 bei Waffen mit W10 als Schadenswürfel).",
            enhancementDescription:
                "Der Zauber erhält zudem das Merkmal Ablenkend 1. Sollte sie dieses Merkmal schon besitzen, erhöht es sich um zwei Stufen.",
            enhancementOptions: "Auslösezeit, Kanalisierter Fokus, Verzehrter Fokus",
        });

        expect(importedSpell?.system.damage.stringInput).to.equal("1W6");
    });

    it("should import damage from description", () => {
        sandbox
            .stub(foundryApi, "localize")
            .callsFake((key: string) => (key === "splittermond.skillLabel.fightmagic" ? "Kampfmagie" : key));
        const importedSpell = genesisSpellImport({
            name: "Schicksalsschlag",
            id: "stun",
            school: "Kampfmagie",
            schoolGrade: 0,
            difficulty: "KW",
            focus: "1",
            castDuration: "1T",
            castRange: "5m",
            spellDuration: "",
            enhancement: "1 EG/+1V1",
            longDescription: "Ziel erleidet 1W6 kanalisierter Schaden",
            enhancementDescription: "Schaden +1",
            enhancementOptions: "Auslösezeit, Erschöpfter Fokus, Verzehrter Fokus, Reichweite",
        });

        expect(importedSpell?.system.damage.stringInput).to.equal("1W6");
    });

    it("should recognize several errors at once", () => {
        sandbox
            .stub(foundryApi, "localize")
            .callsFake((key: string) => (key === "splittermond.skillLabel.fightmagic" ? "Kampfmagie" : key));
        const consoleSpy = sandbox.spy(console, "error");
        genesisSpellImport({
            name: "Schicksalsschlag",
            id: "stun",
            school: "Kampfmagie",
            schoolGrade: -1,
            difficulty: "Kv",
            focus: "",
            castDuration: "1T",
            castRange: "5m",
            spellDuration: "",
            enhancement: "1 EG/+1V1",
            longDescription: "Ziel erleidet 1W6 kanalisierter Schaden",
            enhancementDescription: "Schaden +1",
            enhancementOptions: "Auslösezeit, Erschöpfter Fokus, Verzehrter Fokus, Reichweite",
        });

        expect(consoleSpy.callCount).to.equal(3);
        expect(consoleSpy.args.flatMap((args) => args[0])).to.include.members([
            "Splittermond | splittermond.genesisImport.spellValidation.invalidSkillLevel",
            "Splittermond | splittermond.genesisImport.spellValidation.invalidFokusCosts",
            "Splittermond | splittermond.genesisImport.spellValidation.invalidDifficulty",
        ]);
    });
});

function getSpell(name: string) {
    const spell = CaraAeternia.spells.find((s) => s.name === name);
    if (!spell) {
        expect.fail("Spell 'Blenden' not found in test data");
    }
    return spell;
}

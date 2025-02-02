import SplittermondSpellItem from "../../item/spell";
import {splittermond} from "../../config";
import {foundryApi} from "../../api/foundryApi";
import {itemCreator} from "../../data/EntityCreator";
import {getSpellAvailabilityParser} from "../../item/availabilityParser";
import {SplittermondSpellSystemData} from "../../data/ItemSystemData";

export async function importSpell(spellName: string, rawData: string, folder: string): Promise<SplittermondSpellItem> {
    let spellData = {
        type: "spell" as const,
        name: spellName,
        img: splittermond.icons.spell.default,
        folder: folder,
        system: {
            damage: null,
            features: null,
            skill: null,
            skillLevel: null,
            source: null,
            availableIn: null,
            spellType: null,
            difficulty: null,
            costs: null,
            castDuration: null,
            range: null,
            description: null,
            effectDuration: null,
            effectArea: null,
            enhancementCosts: null,
            enhancementDescription: null,
            degreeOfSuccessOptions: {
                castDuration: false,
                consumedFocus: false,
                exhaustedFocus: false,
                channelizedFocus: false,
                effectDuration: false,
                damage: false,
                range: false,
                effectArea: false
            }
        } as SplittermondSpellSystemData
    };

    const sectionLabels = ["Schulen", "Typus", "Schwierigkeit", "Kosten", "Zauberdauer", "Reichweite", "Wirkung", "Wirkungsdauer", "Wirkungsbereich", "Erfolgsgrade"];
    let tokens = rawData.split(new RegExp(`(${sectionLabels.map(sl => sl + ":").join("|")})`, "gm"));

    for (let k = 0; k < tokens.length - 1; k++) {
        const sectionHeading = tokens[k].trim();
        const sectionData = tokens[k + 1].trim();
        switch (sectionHeading) {
            case "Schulen:":
                spellData.system.availableIn = getSpellAvailabilityParser(foundryApi, splittermond.skillGroups.magic).toInternalRepresentation(sectionData);
                break;
            case "Typus:":
                spellData.system.spellType = sectionData;
                break;
            case "Schwierigkeit:":
                spellData.system.difficulty = sectionData;
                if (spellData.system.difficulty.search("Geistiger Widerstand") >= 0 ||
                    spellData.system.difficulty.search("Geist") >= 0) {
                    spellData.system.difficulty = "GW";
                }

                if (spellData.system.difficulty.search("Körperlicher Widerstand") >= 0 ||
                    spellData.system.difficulty.search("Körper") >= 0) {
                    spellData.system.difficulty = "KW";
                }

                if (spellData.system.difficulty.search("Verteidigung") >= 0) {
                    spellData.system.difficulty = "VTD";
                }
                break;
            case "Kosten:":
                spellData.system.costs = sectionData;
                break;
            case "Zauberdauer:":
                spellData.system.castDuration = sectionData;
                break;
            case "Reichweite:":
                spellData.system.range = sectionData;
                break;
            case "Wirkung:":
                spellData.system.description = sectionData;
                spellData.system.description = spellData.system.description.replace(/\n/g, " ");
                spellData.system.description = spellData.system.description.replace(/  /g, " ");
                break;
            case "Wirkungsdauer:":
                spellData.system.effectDuration = sectionData;
                break;
            case "Wirkungsbereich:":
                spellData.system.effectArea = sectionData;
                break;
            case "Erfolgsgrade:":
                let enhancementData = sectionData.match(/([0-9] EG) \(Kosten ([KV0-9+]+)\):? ([^]+)/);
                if (!enhancementData) {
                    foundryApi.reportError("The imported data appeared to be a spell, but the spell enhancement section did not contain any spell enhancement cost.")
                    return Promise.reject(new Error("Enhancement data not found"));
                }
                spellData.system.enhancementCosts = `${enhancementData[1]}/${enhancementData[2]}`;
                spellData.system.enhancementDescription = enhancementData[3].replace(/\n/g, " ");
                spellData.system.enhancementDescription = spellData.system.enhancementDescription.replace(/  /g, " ");
                spellData.system.degreeOfSuccessOptions = {
                    castDuration: sectionData.search("Auslösezeit") >= 0,
                    consumedFocus: sectionData.search("Verzehrter") >= 0,
                    exhaustedFocus: sectionData.search("Erschöpfter") >= 0,
                    channelizedFocus: sectionData.search("Kanalisierter") >= 0,
                    effectDuration: sectionData.search("Wirkungsd") >= 0 || sectionData.search("dauer") >= 0,
                    damage: sectionData.search("Schaden,") >= 0,
                    range: sectionData.search("Reichw") >= 0,
                    effectArea: sectionData.search("Wirkungsb") >= 0 || sectionData.search("bereich") >= 0
                }
        }
    }

    let damage = /([0-9]*[wWdD][0-9]{1,2}[ \-+0-9]*)/.exec(spellData.system.description ?? "");
    if (damage) {
        spellData.system.damage = (damage[0] || "").trim();
    }

    const itemPromise = itemCreator.createSpell(spellData);

    foundryApi.informUser("splittermond.message.itemImported", {
        name: spellData.name,
        type: foundryApi.localize("ITEM.TypeSpell")
    });
    console.debug(spellData);
    return itemPromise;
}
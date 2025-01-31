import {foundryApi} from "../../api/foundryApi";
import {splittermond} from "../../config";
import {actorCreator} from "../../data/EntityCreator";
import SplittermondCompendium from "../compendium";
import {SplittermondFightingSkill, SplittermondSkill} from "../../config/skillGroups";
import {DataModelConstructorInput} from "../../data/SplittermondDataModel";
import type {
    MasteryDataModelType,
    NpcFeatureDataModelType,
    SpellDataModelType,
    SplittermondItemDataModelType
} from "../../item";

type NpcCreationData = typeof actorCreator["createNpc"]["arguments"][0];
type PartialItemData<T extends SplittermondItemDataModelType> = {
    type: string,
    name: string,
    system: Partial<DataModelConstructorInput<T>>
};

export async function importNpc(rawData: string) {
    let rawString = rawData.replace(/\r|\x02/g, "").replace(/\r\n/g, "\n");
    let tokenizedData = rawString.split(/(AUS\s+BEW\s+INT\s+KON\s+MYS\s+STÄ\s+VER\s+WIL\s+GK\s+GSW\s+LP\s+FO\s+VTD\s+SR\s+KW\s+GW|GK\s+GSW\s+LP\s+FO\s+VTD\s+SR\s+KW\s+GW|AUS\s+BEW\s+INT\s+KON\s+MYS\s+STÄ\s+VER\s+WIL|AUS\s+BEW\s+INT\s+KON\s+MYS\s+STÄ\s+VER\s+WIL\s+GK\s+GSW\s+LP\s+FO\s+VTD\s+SR\s+KW\s+GW|Fertigkeiten:|Monstergrad:|Zauber:|Meisterschaften:|Merkmale:|Beute:|Wichtige Attribute:|Wichtige abgeleitete Werte:|Waffen Wert Schaden WGS.*|Kampfweise:|Typus:|Übliche Anzahl:|Anmerkung:|Besonderheiten:)/);

    tokenizedData = handleMangledTableData(rawString, tokenizedData)
    let temp = tokenizedData[0].match(/([^]+?)\n([^]*?)/g);
    type ActorDataType = {
        items: PartialItemData<SplittermondItemDataModelType>[],
        system: NpcCreationData,
        name: string,
        type: "npc"
    };
    let actorData: ActorDataType = {
        name: temp?.[0].trim() ?? "NSC",
        type: "npc" as const,
        system: {
            biography: "<p>" + (temp?.slice(1)?.join(" ")?.replace(/\n/g, "") || "") + "</p>",
            attributes: {
                "charisma": {
                    "value": 0
                },
                "agility": {
                    "value": 0
                },
                "intuition": {
                    "value": 0
                },
                "constitution": {
                    "value": 0
                },
                "mystic": {
                    "value": 0
                },
                "strength": {
                    "value": 0
                },
                "mind": {
                    "value": 0
                },
                "willpower": {
                    "value": 0
                }
            },
            currency: {
                S: 0,
                L: 0,
                T: 0,
            },
            derivedAttributes: {
                "size": {
                    "value": 0
                },
                "speed": {
                    "value": 0
                },
                "initiative": {
                    "value": 0
                },
                "healthpoints": {
                    "value": 0
                },
                "focuspoints": {
                    "value": 0
                },
                "defense": {
                    "value": 0
                },
                "bodyresist": {
                    "value": 0
                },
                "mindresist": {
                    "value": 0
                }
            },
            damageReduction: {
                value: 0
            },
            skills: {},
            level: "",
        },
        items: []
    };


    for (let i = 1; i < tokenizedData.length; i++) {
        try {
            switch (true) {
                case /AUS\s+BEW\s+INT\s+KON\s+MYS\s+STÄ\s+VER\s+WIL/.test(tokenizedData[i]):
                    let attributeData = tokenizedData[i + 1].trim().split(/\s+/);
                    actorData.system.attributes.charisma.value = parseInt(attributeData[0]);
                    actorData.system.attributes.agility.value = parseInt(attributeData[1]);
                    actorData.system.attributes.intuition.value = parseInt(attributeData[2]);
                    actorData.system.attributes.constitution.value = parseInt(attributeData[3]);
                    actorData.system.attributes.mystic.value = parseInt(attributeData[4]);
                    actorData.system.attributes.strength.value = parseInt(attributeData[5]);
                    actorData.system.attributes.mind.value = parseInt(attributeData[6]);
                    actorData.system.attributes.willpower.value = parseInt(attributeData[7]);
                    if (attributeData.length === 8) break;
                    tokenizedData[i + 1] = attributeData.slice(8).join(" ");
                case /GK\s+GSW\s+LP\s+FO\s+VTD\s+SR\s+KW\s+GW/.test(tokenizedData[i]):
                    let derivedValueData = tokenizedData[i + 1].trim().match(/([0-9]+(:?\s+\/\s+[0-9]+)*)/g)
                        ?.map(item => parseInt(item));
                    actorData.system.derivedAttributes.size.value = derivedValueData?.[0] || 0;
                    actorData.system.derivedAttributes.speed.value = derivedValueData?.[1] || 0;
                    actorData.system.derivedAttributes.healthpoints.value = derivedValueData?.[2] ?? 0;
                    actorData.system.derivedAttributes.focuspoints.value = derivedValueData?.[3] ?? 0;
                    actorData.system.derivedAttributes.defense.value = derivedValueData?.[4] ?? 0;
                    actorData.system.damageReduction.value = derivedValueData?.[5] ?? 0;
                    actorData.system.derivedAttributes.bodyresist.value = derivedValueData?.[6] ?? 0;
                    actorData.system.derivedAttributes.mindresist.value = derivedValueData?.[7] ?? 0;
                    break;
                case /Wichtige Attribute:/.test(tokenizedData[i]):
                    tokenizedData[i + 1].split(",").forEach((i) => {
                        let iData = i.trim().split(" ");
                        switch (iData[0]) {
                            case "AUS":
                                actorData.system.attributes.charisma.value = parseInt(iData[1]);
                                break;
                            case "BEW":
                                actorData.system.attributes.agility.value = parseInt(iData[1]);
                                break;
                            case "INT":
                                actorData.system.attributes.intuition.value = parseInt(iData[1]);
                                break;
                            case "KON":
                                actorData.system.attributes.constitution.value = parseInt(iData[1]);
                                break;
                            case "MYS":
                                actorData.system.attributes.mystic.value = parseInt(iData[1]);
                                break;
                            case "STÄ":
                                actorData.system.attributes.strength.value = parseInt(iData[1]);
                                break;
                            case "VER":
                                actorData.system.attributes.mind.value = parseInt(iData[1]);
                                break;
                            case "WILL":
                            case "WIL":
                                actorData.system.attributes.willpower.value = parseInt(iData[1]);
                                break;
                        }
                    });
                    break;
                case /Wichtige abgeleitete Werte:/.test(tokenizedData[i]):
                    tokenizedData[i + 1].split(",").forEach((i) => {
                        let iData = i.trim().split(" ");
                        switch (iData[0]) {
                            case "GK":
                                actorData.system.derivedAttributes.size.value = parseInt(iData[1]);
                                break;
                            case "GSW":
                                actorData.system.derivedAttributes.speed.value = parseInt(iData[1]);
                                break;
                            case "LP":
                                actorData.system.derivedAttributes.healthpoints.value = parseInt(iData[1]);
                                break;
                            case "FO":
                                actorData.system.derivedAttributes.focuspoints.value = parseInt(iData[1]);
                                break;
                            case "VTD":
                                actorData.system.derivedAttributes.defense.value = parseInt(iData[1]);
                                break;
                            case "SR":
                                actorData.system.damageReduction.value = parseInt(iData[1]);
                                break;
                            case "KW":
                                actorData.system.derivedAttributes.bodyresist.value = parseInt(iData[1]);
                                break;
                            case "GW":
                                actorData.system.derivedAttributes.mindresist.value = parseInt(iData[1]);
                                break;
                        }
                    });
                    break;
                case /Fertigkeiten:/.test(tokenizedData[i]):
                    tokenizedData[i + 1].replace(/\n/g, " ").replace("  ", " ").split(",").forEach(skillStr => {
                        let skillData = skillStr.trim().match(/(.*?)\s+([0-9]+)/) ?? ["0", "0", "0"];
                        let skill = splittermond.skillGroups.all.find(i => foundryApi.localize(`splittermond.skillLabel.${i}`).toLowerCase() === skillData[1].trim().toLowerCase());
                        let skillValue = parseInt(skillData[2]) || 0;
                        if (skill) {
                            actorData.system.skills[skill] = {
                                value: skillValue
                            };

                            if (isNoFightingSkill(skill) && splittermond.skillAttributes[skill]) {
                                actorData.system.skills[skill].points = actorData.system.skills[skill].value;
                                actorData.system.skills[skill].points -= parseInt(actorData.system.attributes[splittermond.skillAttributes[skill][0]].value) || 0;
                                actorData.system.skills[skill].points -= parseInt(actorData.system.attributes[splittermond.skillAttributes[skill][1]].value) || 0;
                                if (skill === "stealth") {
                                    actorData.system.skills[skill].points -= 5 - parseInt(actorData.system.derivedAttributes.size.value);
                                }
                            }
                        }
                    });
                    break;
                case /Waffen Wert Schaden WGS.*/.test(tokenizedData[i]):
                    let weaponRegExpStr = `([\\s\\S]*?)\\s+([0-9]+)\\s+([0-9W+\\-]+)\\s+([0-9]+)(?:\\s+Tick[s]?)?\\s+([\\-–]+|[0-9]+|[0-9]+\\s*m)?\\s?([0-9]+)\\-1?W6\\s*((?:${splittermond.weaponFeatures.join("|").replace(/\s+/, "\\s+")}|\\s+|\s*[\\-–]\s*)\\s*[0-9]*\\s*,?\\s*)*[\r\n]*`;
                    let weaponData = (tokenizedData[i + 1].trim().match(new RegExp(weaponRegExpStr, "g")) ?? []).map(weaponStr => {
                        weaponStr = weaponStr.trim().replace(/\s/g, " ").replace(/\s{2,}/g, " ");
                        let weaponMatch = weaponStr.match(new RegExp(`(.*?)\\s+([0-9]+)\\s+([0-9W+\\-]+)\\s+([0-9]+)(?:\\s+Tick[s]?)?\\s+([\\-–]+|[0-9]+|[0-9]+\\s*m)?\\s?([0-9]+)\\-1?W6\\s*(.*)`));
                        let weaponName = weaponMatch?.[1].trim() ?? null;
                        return {
                            name: weaponName,
                            skillValue: parseInt(weaponMatch?.[2].trim() ?? "0") || 0,
                            damage: weaponMatch?.[3].trim() ?? null,
                            weaponSpeed: parseInt(weaponMatch?.[4].trim() ?? "0") || 0,
                            range: weaponMatch?.[6].trim() || "-",
                            features: weaponMatch?.[7].trim() ?? null,
                        };
                    });

                    actorData.items.push(...await Promise.all(weaponData.map(async data => {
                        let weaponData = await SplittermondCompendium.findItem("weapon", data.name);
                        if (!weaponData) {
                            weaponData = {
                                type: "npcattack",
                                name: data.name,
                                //@ts-expect-error screw this! we are saveguarding the access with the OR operator.
                                img: splittermond.icons.weapon[data.name] || splittermond.icons.weapon.default,
                                system: {}
                            };
                        } else {
                            weaponData = weaponData.toObject();
                        }
                        weaponData.system.damage = data.damage;
                        weaponData.system.weaponSpeed = data.weaponSpeed;
                        weaponData.system.range = data.range;
                        weaponData.system.features = data.features;
                        if (weaponData.type == "npcattack") {
                            weaponData.system.skillValue = data.skillValue;
                        } else {
                            if (!weaponData.data.skill) {
                                weaponData.system.skill = "melee";
                                weaponData.system.attribute1 = "agility";
                                weaponData.system.attribute2 = "strength";
                            }
                            actorData.system.skills[weaponData.data.skill] = {
                                value: data.skillValue,
                                points: data.skillValue - actorData.system.attributes[weaponData.system.attribute1].value - actorData.system.attributes[weaponData.system.attribute2].value
                            };
                        }
                        return weaponData;
                    })));
                    break;
                case /Meisterschaften:/.test(tokenizedData[i]):
                    let masteries: PartialItemData<MasteryDataModelType>[] = [];
                    tokenizedData[i + 1].replace(/\n/g, " ").replace("  ", " ").match(/[^(]+\s*\([^)]+\),?/g)?.forEach((skillEntryStr) => {
                        let masteryEntryData = skillEntryStr.trim().match(/([^(]+)\s*\(([^)]+)\)/);
                        if(!masteryEntryData){
                            return;
                        }
                        let skill = [...splittermond.skillGroups.general, ...splittermond.skillGroups.magic, ...splittermond.skillGroups.fighting].find(i => foundryApi.localize(`splittermond.skillLabel.${i}`).toLowerCase() === masteryEntryData[1].trim().toLowerCase());
                        let level = 1;
                        (masteryEntryData[2].split(/[,;:]/) ?? []).forEach((masteryStr) => {
                            masteryStr = masteryStr.trim();
                            if (masteryStr === "I") {
                                level = 1;
                            } else if (masteryStr === "II") {
                                level = 2;
                            } else if (masteryStr === "III") {
                                level = 3;
                            } else if (masteryStr === "IV") {
                                level = 4;
                            } else {
                                let masteryName = masteryStr.trim();
                                masteries.push({
                                    type: "mastery",
                                    name: masteryName,
                                    system: {
                                        skill: skill,
                                        level: level
                                    }
                                });
                            }
                        });
                    });

                    actorData.items.push(...await Promise.all(masteries.map(async data => {
                        let searchString = data.name.match(/([^(,\[]+)(?:\([^)]+?\)|\[[^\]]+?\])?/);
                        let masteryData = await (searchString ? SplittermondCompendium.findItem("mastery", searchString[1].trim()) : null);
                        if (masteryData) {
                            masteryData = masteryData.toObject();
                            delete masteryData._id;
                            masteryData.system.skill = data.system.skill;
                            masteryData.system.level = data.system.level;
                            return masteryData
                        }
                        return data;
                    })));
                    break;
                case /Merkmale:/.test(tokenizedData[i]):
                    let features: PartialItemData<NpcFeatureDataModelType>[] = [];
                    tokenizedData[i + 1].replace(/\n/g, " ").replace("  ", " ").match(/[^,(]+(?:\([^)]+?\))?/gm)?.forEach((f) => {
                        if (f.trim()) {
                            features.push({
                                name: f.trim(),
                                type: "npcfeature",
                                system: {}
                            });
                        }
                    });
                    actorData.items.push(...await Promise.all(features.map(async data => {
                        let searchString = data.name.match(/([^(,0-9]+)(?:\s*[0-9]+)?(?:\s*\([^)]+?\))?/);
                        if (searchString && searchString[1].split(" ").length > 2) {
                            searchString[1] = searchString[1].split(" ")[0];
                        }
                        let featureData = await (searchString ? SplittermondCompendium.findItem("npcfeature", searchString[1].trim()) : null);
                        if (featureData) {
                            featureData = featureData.toObject();
                            delete featureData._id;
                            featureData.name = data.name;
                            return featureData
                        }
                        return data;
                    })));
                    break;
                case /Typus:/.test(tokenizedData[i]):
                    actorData.system.type = tokenizedData[i + 1].trim();
                    break;
                case /Monstergrad:/.test(tokenizedData[i]):
                    actorData.system.level = tokenizedData[i + 1].trim();
                    break;
                case /Zauber:/.test(tokenizedData[i]):
                    let spells: PartialItemData<SpellDataModelType>[] = [];
                    let skill = "";
                    let level = 0;
                    tokenizedData[i + 1].replace(/\n/g, " ").replace("  ", " ").split(/[;,]/)?.forEach(skillEntryStr => {
                        let spellEntryData = skillEntryStr.trim().match(/(:?([^ ]{3,})?\s*([0IV]+):)?\s*([^]+)/);
                        if (!spellEntryData) {
                            return;
                        }
                        if (spellEntryData[2]) {
                            let newSkill = splittermond.skillGroups.magic.find(i => foundryApi.localize(`splittermond.skillLabel.${i}`).toLowerCase().startsWith(spellEntryData[2].toLowerCase()));
                            if (newSkill) {
                                skill = newSkill;
                            }
                        }

                        switch (spellEntryData[3]) {
                            case "0":
                                level = 0;
                                break;
                            case "I":
                                level = 1;
                                break;
                            case "II":
                                level = 2;
                                break;
                            case "III":
                                level = 3;
                                break;
                            case "IV":
                                level = 4;
                                break;
                            case "V":
                                level = 5;
                                break;
                        }

                        spellEntryData[4].split(",").forEach((s) => {
                            let spellName = s.trim().replace(/\n/g, " ");
                            spells.push({
                                type: "spell",
                                name: spellName,
                                system: {
                                    skill: skill,
                                    skillLevel: level
                                }
                            });
                        })
                    });
                    actorData.items.push(...await Promise.all(spells.map(async data => {
                        let searchString = data.name.match(/([^\[]+)(?:\[[\[]+\])?/);
                        let spellData = await (searchString ? SplittermondCompendium.findItem("spell", searchString[1]) : null);
                        if (spellData) {
                            spellData = spellData.toObject();
                            delete spellData._id;
                            spellData.name = data.name;
                            spellData.system.skill = data.system.skill;
                            spellData.system.skillLevel = data.system.skillLevel;
                            return spellData;
                        }
                        return data;
                    })));
                    break;
                case /Beute:/.test(tokenizedData[i]):
                    tokenizedData[i + 1].match(/[^(,]+\([^)]+\)/g)?.forEach?.(lootEntryStr => {
                        lootEntryStr = lootEntryStr.replace(/\n/, " ");
                        let lootEntryData = lootEntryStr.match(/([^(,]+)\(([^)]+)\)/);
                        if (!lootEntryData) {
                            return;
                        }
                        let price = "0";
                        let description = lootEntryData[2];
                        if (lootEntryData[2]) {
                            const priceMatch = lootEntryStr.match(/([0-9]+) (L?|T?|S?)(.*)/);
                            price = priceMatch ? `${priceMatch[1]} ${priceMatch[2]}`: "0";
                        }
                        actorData.items.push({
                            type: "equipment",
                            name: lootEntryData[1].trim(),
                            system: {
                                description,
                                physicalProperties: {
                                    quantity: 1,
                                    price,
                                    weight:0,
                                    hardness: null,
                                    complexity:null,
                                    availability:null,
                                    quality:null,
                                    durability:null,
                                    sufferedDamage:null,
                                    damageLevel:null
                                }
                            }
                        });
                    });
                case /Besonderheiten:/.test(tokenizedData[i]):
                    actorData.system.biography += `<h2>Besonderheiten</h2>`;
                    actorData.system.biography += `<p>${tokenizedData[i + 1].trim()}</p>`;
                    break;
                case /Kampfweise:/.test(tokenizedData[i]):
                    actorData.system.biography += `<h2>Kampfweise</h2>`;
                    actorData.system.biography += `<p>${tokenizedData[i + 1].trim()}</p>`;
                    break;
                case /Anmerkung:/.test(tokenizedData[i]):
                    actorData.system.biography += `<h2>Anmerkung</h2>`;
                    actorData.system.biography += `<p>${tokenizedData[i + 1].trim()}</p>`;
                    break;
            }
        } catch (e) {
            foundryApi.reportError("splittermond.error.parseError", {section: tokenizedData[i]});
            console.log(foundryApi.format("splittermond.error.parseError", {section: tokenizedData[i]}) + tokenizedData[i + 1]);
        }


    }

    return actorCreator.createNpc(actorData, {renderSheet: true});

}

function isNoFightingSkill(skill: SplittermondSkill): skill is Exclude<SplittermondSkill, SplittermondFightingSkill> {
    return !(splittermond.skillGroups.fighting as readonly string[]).includes(skill);
}

const attributeKeys = ["AUS", "BEW", "INT", "KON", "MYS", "STÄ", "VER", "WIL"] as const;
const derivedAttributes2 = ["GK", "GSW", "LP", "FO", "VTD", "SR", "KW", "GW"] as const;

function handleMangledTableData(rawData: string, tokenizedData: string[]) {
    if (attributeKeys.every(a => tokenizedData[1].includes(a))) {
        return tokenizedData;
    }
    foundryApi.warnUser("splittermond.message.mangledTableData");
    const attributeResult = fillRecord(attributeKeys, rawData, /\s[1-9]\s/);
    const attributes = attributeResult.record;
    const derivedAttributes = fillRecord(derivedAttributes2, attributeResult.source, /\s[1-9][0-9]?\s/).record;
    tokenizedData = tokenizedData.map(line => {
        for(const key of attributeKeys) {
            line = replaceKeyValue(key, attributes[key]).in(line)
        }
        for(const key of derivedAttributes2) {
            line = replaceKeyValue(key, derivedAttributes[key]).in(line)
        }
        return line;
    })

    tokenizedData.splice(1, 0,
        Object.keys(attributes).join(" "),
        Object.values(attributes).join(" "),
        Object.keys(derivedAttributes).join(" "),
        Object.values(derivedAttributes).join(" "),
    )
    return tokenizedData;
}

function initRecord<T extends string>(keys: Readonly<T[]>) {
    return keys.reduce((rec, key) => {
        rec[key] = "0";
        return rec
    }, {} as Record<T, string>)
}

function fillRecord<T extends string>(keys: Readonly<T[]>, source: string, valuePattern: RegExp) {
    const record = initRecord(keys);
    for (const key of keys) {
        const result = findKeyValue(key, valuePattern).in(source);
        record[key] = result.record[key] ?? record[key];
        source = result.source;
    }
    return {source, record};
}

function findKeyValue<T extends string>(keyPattern: T, valuePattern: RegExp) {
    function findRecord(source: string) {
        const key = source.match(new RegExp(keyPattern))?.[0].trim()
        if (!key) {
            return {source, record: {}}
        }
        const keyIndex = source.indexOf(key);
        const value = source.slice(keyIndex).match(valuePattern)?.[0].trim();
        if (!value) {
            return {source, record: {}}
        }
        source = replaceKeyValue(key, value).in(source);
        return {source,  record: {[key]: value}}

    }

    return {
        in(source: string) {
            return findRecord(source)
        }
    }
}

function replaceKeyValue(key:string, value:string){
    function replace(source: string){
        const keyIndex = source.indexOf(key);
        const beforeKey = source.slice(0, keyIndex);
        const recordRemoved = source.slice(keyIndex)
            .replace(key, "") //
            .replace(value, "") //
            .replace(/\s\s+/g, " "); //normalize whitespace
        return beforeKey + recordRemoved;
    }

    return {in: (source:string)=>replace(source)};
}

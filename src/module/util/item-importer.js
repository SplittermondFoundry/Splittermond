import SplittermondCompendium from "./compendium.js";
import {itemCreator} from "../data/EntityCreator.ts";
import {foundryApi} from "../api/foundryApi";
import {splittermond} from "../config.js";
import {importSpell as spellImporter} from "./item-importer/spellImporter";

export default class ItemImporter {

    static async _folderDialog() {
        let folderList = game.items.directory.folders.reduce((str, folder) => {
            return `${str} <option value="${folder.id}">${folder.name}</option>`;
        }, "");
        let p = new Promise((resolve, reject) => {
            let dialog = new Dialog({
                title: foundryApi.localize("splittermond.selectAFolder"),
                content: `<label>Ordner</label> <select name="folder">
                <option value="">keinen Ordner</option>
            ${folderList}
        </select>`,
                buttons: {
                    ok: {
                        label: foundryApi.localize("splittermond.ok"),
                        callback: html => {
                            resolve(html.find('[name="folder"]')[0].value);
                        }
                    }
                }
            });
            dialog.render(true);
        });

        return p;
    }

    static async _skillDialog(skillOptions) {
        let optionsList = skillOptions.reduce((str, skill) => {
            let skillLabel = foundryApi.localize(`splittermond.skillLabel.${skill}`);
            return `${str} <option value="${skill}">${skillLabel}</option>`;
        }, "");
        let p = new Promise((resolve, reject) => {
            let dialog = new Dialog({
                title: "Waffenimport",
                content: `<label>Kampffertigkeit</label> <select name="skill">
            ${optionsList}
        </select>`,
                buttons: {
                    ok: {
                        label: foundryApi.localize("splittermond.ok"),
                        callback: html => {
                            resolve(html.find('[name="skill"]')[0].value);
                        }
                    }
                }
            });
            dialog.render(true);
        });

        return p;
    }

    static async pasteEventhandler(e) {
        //let rawData = e.clipboardData.getData("text");
        let rawData = "";

        if (e instanceof ClipboardEvent) {
            rawData = e.clipboardData.getData("text");
        } else {
            rawData = await navigator.clipboard.readText();
        }
        rawData = rawData.replace(/\r\n/g, "\n");
        rawData = rawData.replace(/-\n/g, "");
        rawData = rawData.replace(//g, "");
        console.log(rawData);

        // Check Spell

        if (rawData.includes("Schulen:") && rawData.includes("Typus:") && rawData.includes("Kosten:")) {
            let folder = await this._folderDialog();
            let spellTokens = rawData.replace(/^[0-9]{3}\n/g, "") // Remove page numbers
                .split(/(.*\s+\((?:Spruch|Ritus)\))/gm); // Split into spell tokens
            let spellName = "";
            for (let k = 0; k < spellTokens.length; k++) {
                const spellToken = spellTokens[k];
                if (spellToken === "") {
                    continue;
                }
                if (spellName !== "") {
                    this.importSpell(spellName, spellToken, folder);
                    spellName = "";
                    continue;
                }

                if (spellToken.match(/(.*\s+\((?:Spruch|Ritus)\))/gm)) {
                    spellName = spellToken.match(/(.*?)\s+\((?:Spruch|Ritus)\)/m)[1];
                }
            }
            return;
        }

        // Check Weapons
        let weaponRegex = `(.*?\\s*.*?)\\s+(?:Dorf|Kleinstadt|Großstadt|Metropole)\\s+(?:([0-9]+ [LST]|-|–)(?:\\s*\\/\\s*[0-9]+\\s[LST])?)\\s+([0-9]+|-|–)\\s+([0-9]+|-|–)\\s+([UGFMA]|-|–)\\s+([0-9+\\-W]+)\\s+([0-9]+)\\s+((AUS|BEW|INT|KON|MYS|STÄ|VER|WIL|\\+){3})\\s+(((AUS|BEW|INT|KON|MYS|STÄ|VER|WIL|)\\s*[0-9],?\\s*)*|–)\\s+((?:${splittermond.weaponFeatures.join("|").replace(/\s+/, "\\s+")}|\\s+|\s*[\\-–]\s*)\\s*[0-9]*\\s*,?\\s*)+`;
        let test = rawData.match(new RegExp(weaponRegex, "gm"));
        if (test && test.length > 0) {
            let skills = CONFIG.splittermond.skillGroups.fighting.map(s => foundryApi.localize(`splittermond.skillLabel.${s}`)).join('|');
            weaponRegex = `${skills}|${weaponRegex}`;
            test = rawData.match(new RegExp(weaponRegex, "gm"));
            if (test.length > 0) {
                let folder = await this._folderDialog();
                let skill = "";

                for (let k = 0; k < test.length; k++) {
                    const m = test[k].trim().replace(/\s{2,}/gm, " ").replace("(*)", "");
                    if (m.match(new RegExp(skills, "gm"))) {
                        skill = CONFIG.splittermond.skillGroups.fighting.find(s => foundryApi.localize(`splittermond.skillLabel.${s}`).trim().toLowerCase() === m.trim().toLowerCase());
                        continue;
                    }
                    if (skill === "") {
                        skill = await this._skillDialog(CONFIG.splittermond.skillGroups.fighting);
                    }

                    this.importWeapon(m, skill, folder);
                }
                return;
            }
        }


        // Check multiple Armor
        test = rawData.match(/(.*?) +(Dorf|Kleinstadt|Großstadt|Metropole) +([0-9]+ [LST]) +([0-9]+) +([0-9]+) +([UGFMA]) +(\+[0-9]+|0) +([0-9]+) +([0-9]+) +([0-9]+) +([0-9]+) +(.+)/g);
        if (test) {
            if (test.length > 1) {
                let folder = await this._folderDialog();
                test.forEach(m => {
                    this.importArmor(m, folder);
                });
                return;
            }
        }

        // Check Armor
        if (rawData.match(/([^]*)\s+(Dorf|Kleinstadt|Großstadt|Metropole)\s+([0-9]+ [LST])\s+([0-9]+)\s+([0-9]+)\s+([UGFMA])\s+(\+[0-9]+|0)\s+([0-9]+)\s+([0-9]+)\s+([0-9]+)\s+([0-9]+)\s+([^]+)/)) {
            this.importArmor(rawData);
            return;
        }

        // Check multiple Shield
        test = rawData.match(/(.*?) +(Dorf|Kleinstadt|Großstadt|Metropole) +([0-9]+ [LST]) +([0-9]+) +([0-9]+) +([UGFMA]) +(\+[0-9]+|0) +([0-9]+) +([0-9]+) +((?:AUS|BEW|INT|KON|MYS|STÄ|VER|WIL) [0-9]) +(.+)/g);
        if (test) {
            if (test.length > 1) {
                let folder = await this._folderDialog();
                test.forEach(m => {
                    this.importShield(m, folder);
                });
                return;
            }
        }

        // Check Shield
        if (rawData.match(/([^]*)\s+(Dorf|Kleinstadt|Großstadt|Metropole)\s+([0-9]+ [LST])\s+([0-9]+)\s+([0-9]+)\s+([UGFMA])\s+(\+[0-9]+|0)\s+([0-9]+)\s+([0-9]+)\s+((?:AUS|BEW|INT|KON|MYS|STÄ|VER|WIL) [0-9])\s+([^]+)/)) {
            this.importShield(rawData);
            return;
        }

        // Import NPC
        if (rawData.includes("Fertigkeiten:")) {
            return this.importNpc(rawData);
        }

        // Import Strengths
        if (rawData.match(/^(.*) \(([0-9])(\*?)\): .*/gm)) {
            this.importStrengths(rawData);
            return;
        }

        // Import mastery
        if (rawData.match(/Schwelle [0-9]/gm)) {
            return this.importMastery(rawData);
        }

        // Import npcfeature
        if (rawData.match(/^(.*): .*/gm)) {
            this.importNpcFeatures(rawData);
            return;
        }
    }

    static async importMastery(rawData) {
        const itemPromises= [];
        let folder = await this._folderDialog();
        let skill = await this._skillDialog([...splittermond.skillGroups.general, ...splittermond.skillGroups.fighting, ...splittermond.skillGroups.magic]);

        rawData.match(/Schwelle\s+[0-9]\n.+/gm).forEach((s) => {

            let token = s.match(/(Schwelle\s+([0-9]))\n.+/);
            let level = parseInt(token[2]);
            let escapeStr = token[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            let levelData = rawData.match(new RegExp(`${escapeStr}\n([^]+?)\nSchwelle +[0-9]`));
            if (levelData === null) {
                levelData = rawData.match(new RegExp(`${escapeStr}\n([^]+)`));
            }


            levelData[1].match(/^(.*): .*/gm).forEach((m) => {
                let token = m.match(/(.*):/);

                if (token[1].includes("Voraussetzung")) {
                    return;
                }

                let itemData = {
                    type: "mastery",
                    name: token[1].trim(),
                    folder: folder,
                    system: {
                        skill: skill,
                        availableIn: skill,
                        level: level,
                        modifier: splittermond.modifier[token[1].trim().toLowerCase()] || ""
                    }
                };
                let escapeStr = token[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                let descriptionData = levelData[1].match(new RegExp(`${escapeStr} ([^]+?(?:Voraussetzung:[^]+?))(?=^.*:)`, "m"));
                if (descriptionData === null) {
                    descriptionData = levelData[1].match(new RegExp(`${escapeStr} ([^]+?)(?=^.*:)`, "m"));
                }
                if (descriptionData === null) {
                    descriptionData = levelData[1].match(new RegExp(`${escapeStr} ([^]+)`));
                }
                itemData.system.description = descriptionData[1].replace("\n", "").replace("", "");

                itemPromises.push(itemCreator.createMastery(itemData));

                console.log(itemData);
                foundryApi.informUser("splittermond.message.itemImported", { name: itemData.name, type: foundryApi.localize("ITEM.TypeMastery") });
            });

        });
        return Promise.all(itemPromises);
    }

    static async importNpcFeatures(rawData) {
        let folder = await this._folderDialog();

        rawData.match(/^(.*): .*/gm).forEach((m) => {
            let token = m.match(/(.*):/);

            let itemData = {
                type: "npcfeature",
                name: token[1].trim(),
                folder: folder,
                system: {
                    modifier: CONFIG.splittermond.modifier[token[1].trim().toLowerCase()] || ""
                }
            }
            let escapeStr = token[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            let descriptionData = rawData.match(new RegExp(`${escapeStr} ([^]+?)(?=^.*:)`, "m"));
            if (descriptionData === null) {
                descriptionData = rawData.match(new RegExp(`${escapeStr} ([^]+)`));
            }
            itemData.system.description = descriptionData[1].replaceAll("\n", " ").replaceAll("", "").replaceAll("  ", " ");

            Item.create(itemData);

            console.log(itemData);
            ui.notifications.info(game.i18n.format("splittermond.message.itemImported", { name: itemData.name, type: foundryApi.localize("ITEM.TypeNpcfeature") }));
        });
    }

    static async importStrengths(rawData) {
        let folder = await this._folderDialog();
        rawData.match(/^(.*) \(([0-9])(\*?)\): .*/gm).forEach((m) => {
            let token = m.match(/(.*) \(([0-9])(\*?)\):/);
            let itemData = {
                type: "strength",
                name: token[1].trim(),
                folder: folder,
                system: {
                    quantity: 1,
                    level: parseInt(token[2]),
                    onCreationOnly: token[3] === "*",
                    modifier: CONFIG.splittermond.modifier[token[1].trim().toLowerCase()] || ""
                }
            }
            let escapeStr = token[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            let descriptionData = rawData.match(new RegExp(`${escapeStr} ([^]+?)(?=^.* \\([0-9]\\*?\\):)`, "m"));
            if (descriptionData === null) {
                descriptionData = rawData.match(new RegExp(`${escapeStr} ([^]+)`));
            }
            itemData.system.description = descriptionData[1].replace("\n", "").replace("", "");

            Item.create(itemData);

            console.log(itemData);
            ui.notifications.info(game.i18n.format("splittermond.message.itemImported", { name: itemData.name, type: foundryApi.localize("ITEM.TypeStrength") }));
        });
    }

    static async importShield(rawData, folder = "") {
        rawData = rawData.replace(/\n/g, " ");
        let tokens = rawData.match(/(.*)\s+(Dorf|Kleinstadt|Großstadt|Metropole)\s+([0-9]+ [LST])\s+([0-9]+)\s+([0-9]+)\s+([UGFMA])\s+(\+[0-9]+|0)\s+([0-9]+)\s+([0-9]+)\s+((?:AUS|BEW|INT|KON|MYS|STÄ|VER|WIL) [0-9])\s+(.+)/);

        let itemData = {
            type: "shield",
            name: tokens[1].trim(),
            folder: folder,
            img: CONFIG.splittermond.icons.shield[tokens[1].trim()] || CONFIG.splittermond.icons.shield.default,
            system: {}
        };

        switch (tokens[2].trim()) {
            case "Metropole":
                itemData.system.availability = "metropolis";
                break;
            case "Kleinstadt":
                itemData.system.availability = "town";
                break;
            case "Großstadt":
                itemData.system.availability = "city";
                break;
            case "Dorf":
            default:
                itemData.system.availability = "village";
                break;
        }

        itemData.system.price = tokens[3].trim();

        itemData.system.weight = parseInt(tokens[4]);
        itemData.system.hardness = parseInt(tokens[5]);
        itemData.system.complexity = tokens[6].trim();
        itemData.system.defenseBonus = tokens[7].trim();
        itemData.system.handicap = parseInt(tokens[8]);
        itemData.system.tickMalus = parseInt(tokens[9]);
        itemData.system.minAttributes = tokens[10];
        itemData.system.features = tokens[11];

        Item.create(itemData);

        console.log(itemData);
        ui.notifications.info(game.i18n.format("splittermond.message.itemImported", { name: itemData.name, type: foundryApi.localize("ITEM.TypeShield") }));
    }

    static async importArmor(rawData, folder = "") {
        rawData = rawData.replace(/\n/g, " ");

        let tokens = rawData.match(/(.*)\s+(Dorf|Kleinstadt|Großstadt|Metropole)\s+([0-9]+ [LST])\s+([0-9]+)\s+([0-9]+)\s+([UGFMA])\s+(\+[0-9]+|0)\s+([0-9]+)\s+([0-9]+)\s+([0-9]+)\s+([0-9]+)\s+(.+)/);

        let itemData = {
            type: "armor",
            name: tokens[1].trim(),
            folder: folder,
            img: CONFIG.splittermond.icons.armor[tokens[1].trim()] || CONFIG.splittermond.icons.armor.default,
            system: {}
        };

        switch (tokens[2].trim()) {
            case "Metropole":
                itemData.system.availability = "metropolis";
                break;
            case "Kleinstadt":
                itemData.system.availability = "town";
                break;
            case "Großstadt":
                itemData.system.availability = "city";
                break;
            case "Dorf":
            default:
                itemData.system.availability = "village";
                break;
        }

        itemData.system.price = tokens[3].trim();

        itemData.system.weight = parseInt(tokens[4]);
        itemData.system.hardness = parseInt(tokens[5]);
        itemData.system.complexity = tokens[6].trim();
        itemData.system.defenseBonus = tokens[7].trim();
        itemData.system.damageReduction = parseInt(tokens[8]);
        itemData.system.handicap = parseInt(tokens[9]);
        itemData.system.tickMalus = parseInt(tokens[10]);
        itemData.system.minStr = parseInt(tokens[11]);
        itemData.system.features = tokens[12].trim();

        Item.create(itemData);

        console.log(itemData);
        ui.notifications.info(game.i18n.format("splittermond.message.itemImported", { name: itemData.name, type: foundryApi.localize("ITEM.TypeArmor") }));
    }

    static async importWeapon(rawData, skill = "", folder = "") {
        rawData = rawData.replace(/\n/g, " ");
        if (skill === "") {
            skill = await this._skillDialog(CONFIG.splittermond.skillGroups.fighting);
        }


        let isRanged = ["throwing", "longrange"].includes(skill);

        let tokens = rawData.match(/([\s\S]*?)\s+(Dorf|Kleinstadt|Großstadt|Metropole)\s+(?:([0-9]+ [LST]|-|–)(?:\s*\/\s*[0-9]+ [LST])?)\s+([0-9]+)\s+([0-9]+)\s+([UGFMA])\s+([0-9+\-W]+)\s+([0-9]+)\s+((?:AUS|BEW|INT|KON|MYS|STÄ|VER|WIL|\+){3})\s+((?:(?:AUS|BEW|INT|KON|MYS|STÄ|VER|WIL)\s*[0-9],?\s*)*|–)\s+(.+)/);

        let itemData = {
            type: "weapon",
            name: tokens[1].trim().replace(/[0-9]/g, ""),
            img: CONFIG.splittermond.icons.weapon[tokens[1].trim()] || CONFIG.splittermond.icons.weapon.default,
            folder: folder,
            system: {}
        };

        itemData.system.skill = skill;
        switch (tokens[2].trim()) {
            case "Metropole":
                itemData.system.availability = "metropolis";
                break;
            case "Kleinstadt":
                itemData.system.availability = "town";
                break;
            case "Großstadt":
                itemData.system.availability = "city";
                break;
            case "Dorf":
            default:
                itemData.system.availability = "village";
                break;
        }

        itemData.system.price = tokens[3].trim();

        itemData.system.weight = parseInt(tokens[4]);
        itemData.system.hardness = parseInt(tokens[5]);
        itemData.system.complexity = tokens[6].trim();
        itemData.system.damage = tokens[7].trim();
        itemData.system.weaponSpeed = parseInt(tokens[8]);
        let attributes = tokens[9].split("+").map((i) => {
            switch (i) {
                case "AUS":
                    return "charisma";
                case "BEW":
                    return "agility";
                case "INT":
                    return "intuition";
                case "KON":
                    return "constitution";
                case "MYS":
                    return "mystic";
                case "STÄ":
                    return "strength";
                case "VER":
                    return "mind";
                case "WIL":
                    return "willpower";
            }
            throw new Error(`Consumed unknown attribute token ${i}`);
        });

        itemData.system.attribute1 = attributes[0];
        itemData.system.attribute2 = attributes[1];

        itemData.system.minAttributes = tokens[10].trim();

        if (isRanged) {
            let temp = tokens[11].match(/(.+)\s+([0-9]+)/);
            itemData.system.range = temp[2];
            tokens[11] = temp[1];
        } else {
            itemData.system.range = 0;
        }

        itemData.system.features = tokens[11].split(",").map((i) => {
            let temp = i.match(/([^(]*)\s?\(?([0-9]*)\)?/);
            if (temp[2]) {
                return temp[1] + " " + temp[2];
            } else {
                return temp[1];
            }

        }).join(", ");

        Item.create(itemData);

        console.log(itemData);
        ui.notifications.info(game.i18n.format("splittermond.message.itemImported", { name: itemData.name, type: foundryApi.localize("ITEM.TypeWeapon") }));
    }

    static importSpell = spellImporter;

    static async importNpc(rawData) {
        let rawString = rawData.replace(/\r|\x02/g, "").replace(/\r\n/g, "\n");
        let tokenizedData = rawString.split(/(AUS\s+BEW\s+INT\s+KON\s+MYS\s+STÄ\s+VER\s+WIL\s+GK\s+GSW\s+LP\s+FO\s+VTD\s+SR\s+KW\s+GW|GK\s+GSW\s+LP\s+FO\s+VTD\s+SR\s+KW\s+GW|AUS\s+BEW\s+INT\s+KON\s+MYS\s+STÄ\s+VER\s+WIL|AUS\s+BEW\s+INT\s+KON\s+MYS\s+STÄ\s+VER\s+WIL\s+GK\s+GSW\s+LP\s+FO\s+VTD\s+SR\s+KW\s+GW|Fertigkeiten:|Monstergrad:|Zauber:|Meisterschaften:|Merkmale:|Beute:|Wichtige Attribute:|Wichtige abgeleitete Werte:|Waffen Wert Schaden WGS.*|Kampfweise:|Typus:|Übliche Anzahl:|Anmerkung:|Besonderheiten:)/);
        let temp = tokenizedData[0].match(/([^]+?)\n([^]*?)/g);

        let actorData = {
            name: temp[0].trim(),
            type: "npc",
            system: {
                biography: "<p>" + (temp.slice(1)?.join(" ")?.replace(/\n/g, "") || "") + "</p>",
                attributes: {
                    "charisma": {
                        "species": 0,
                        "initial": 0,
                        "advances": 0,
                        "value": 0
                    },
                    "agility": {
                        "species": 0,
                        "initial": 0,
                        "advances": 0,
                        "value": 0
                    },
                    "intuition": {
                        "species": 0,
                        "initial": 0,
                        "advances": 0,
                        "value": 0
                    },
                    "constitution": {
                        "species": 0,
                        "initial": 0,
                        "advances": 0,
                        "value": 0
                    },
                    "mystic": {
                        "species": 0,
                        "initial": 0,
                        "advances": 0,
                        "value": 0
                    },
                    "strength": {
                        "species": 0,
                        "initial": 0,
                        "advances": 0,
                        "value": 0
                    },
                    "mind": {
                        "species": 0,
                        "initial": 0,
                        "advances": 0,
                        "value": 0
                    },
                    "willpower": {
                        "species": 0,
                        "initial": 0,
                        "advances": 0,
                        "value": 0
                    }
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
                biography: "",
            },
            items: []
        };

        actorData.system.biography = "<p>" + (temp.slice(1)?.join(" ")?.replace(/\n/g, "") || "") + "</p>";

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
                        let derivedValueData = tokenizedData[i + 1].trim().match(/([0-9]+(:?\s+\/\s+[0-9]+)*)/g);
                        actorData.system.derivedAttributes.size.value = parseInt(derivedValueData[0]);
                        actorData.system.derivedAttributes.speed.value = parseInt(derivedValueData[1]);
                        actorData.system.derivedAttributes.healthpoints.value = parseInt(derivedValueData[2]);
                        actorData.system.derivedAttributes.focuspoints.value = parseInt(derivedValueData[3]);
                        actorData.system.derivedAttributes.defense.value = parseInt(derivedValueData[4]);
                        actorData.system.damageReduction.value = parseInt(derivedValueData[5]);
                        actorData.system.derivedAttributes.bodyresist.value = parseInt(derivedValueData[6]);
                        actorData.system.derivedAttributes.mindresist.value = parseInt(derivedValueData[7]);
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
                            let skillData = skillStr.trim().match(/(.*?)\s+([0-9]+)/);
                            let skill = [...CONFIG.splittermond.skillGroups.general, ...CONFIG.splittermond.skillGroups.magic, ...CONFIG.splittermond.skillGroups.fighting].find(i => foundryApi.localize(`splittermond.skillLabel.${i}`).toLowerCase() === skillData[1].trim().toLowerCase());
                            let skillValue = parseInt(skillData[2]) || 0;
                            actorData.system.skills[skill] = {
                                value: skillValue
                            };
                            if (CONFIG.splittermond.skillAttributes[skill]) {
                                actorData.system.skills[skill].points = actorData.system.skills[skill].value;
                                actorData.system.skills[skill].points -= parseInt(actorData.system.attributes[CONFIG.splittermond.skillAttributes[skill][0]].value) || 0;
                                actorData.system.skills[skill].points -= parseInt(actorData.system.attributes[CONFIG.splittermond.skillAttributes[skill][1]].value) || 0;
                                if (skill === "stealth") {
                                    actorData.system.skills[skill].points -= 5 - parseInt(actorData.system.derivedAttributes.size.value);
                                }
                            }
                        });
                        break;
                    case /Waffen Wert Schaden WGS.*/.test(tokenizedData[i]):
                        let weaponRegExpStr = `([\\s\\S]*?)\\s+([0-9]+)\\s+([0-9W+\\-]+)\\s+([0-9]+)(?:\\s+Tick[s]?)?\\s+([\\-–]+|[0-9]+|[0-9]+\\s*m)?\\s?([0-9]+)\\-1?W6\\s*((?:${CONFIG.splittermond.weaponFeatures.join("|").replace(/\s+/, "\\s+")}|\\s+|\s*[\\-–]\s*)\\s*[0-9]*\\s*,?\\s*)*[\r\n]*`;
                        let weaponData = tokenizedData[i + 1].trim().match(new RegExp(weaponRegExpStr, "g")).map(weaponStr => {
                            weaponStr = weaponStr.trim().replace(/\s/g, " ").replace(/\s{2,}/g, " ");
                            let weaponMatch = weaponStr.match(new RegExp(`(.*?)\\s+([0-9]+)\\s+([0-9W+\\-]+)\\s+([0-9]+)(?:\\s+Tick[s]?)?\\s+([\\-–]+|[0-9]+|[0-9]+\\s*m)?\\s?([0-9]+)\\-1?W6\\s*(.*)`));
                            let weaponName = weaponMatch[1].trim();
                            return {
                                name: weaponName,
                                skillValue: parseInt(weaponMatch[2].trim()) || 0,
                                damage: weaponMatch[3].trim(),
                                weaponSpeed: parseInt(weaponMatch[4].trim()) || 0,
                                range: weaponMatch[6].trim() || "-",
                                features: weaponMatch[7].trim(),
                            };
                        });

                        actorData.items.push(...await Promise.all(weaponData.map(async data => {
                            let weaponData = await SplittermondCompendium.findItem("weapon", data.name);
                            if (!weaponData) {
                                weaponData = {
                                    type: "npcattack",
                                    name: data.name,
                                    img: CONFIG.splittermond.icons.weapon[data.name] || CONFIG.splittermond.icons.weapon.default,
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
                        let masteries = [];
                        tokenizedData[i + 1].replace(/\n/g, " ").replace("  ", " ").match(/[^(]+\s*\([^)]+\),?/g)?.forEach((skillEntryStr) => {
                            let masteryEntryData = skillEntryStr.trim().match(/([^(]+)\s*\(([^)]+)\)/);
                            let skill = [...CONFIG.splittermond.skillGroups.general, ...CONFIG.splittermond.skillGroups.magic, ...CONFIG.splittermond.skillGroups.fighting].find(i => foundryApi.localize(`splittermond.skillLabel.${i}`).toLowerCase() === masteryEntryData[1].trim().toLowerCase());
                            let level = 1;
                            masteryEntryData[2].split(/[,;:]/).forEach((masteryStr) => {
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
                            let masteryData = await SplittermondCompendium.findItem("mastery", searchString[1].trim());
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
                        let features = [];
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
                            if (searchString[1].split(" ").length > 2) {
                                searchString[1] = searchString[1].split(" ")[0];
                            }
                            let featureData = await SplittermondCompendium.findItem("npcfeature", searchString[1].trim());
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
                        let spells = [];
                        let skill = "";
                        let level = 0;
                        tokenizedData[i + 1].replace(/\n/g, " ").replace("  ", " ").split(/[;,]/)?.forEach(skillEntryStr => {
                            let spellEntryData = skillEntryStr.trim().match(/(:?([^ ]{3,})?\s*([0IV]+):)?\s*([^]+)/);
                            if (spellEntryData[2]) {
                                let newSkill = CONFIG.splittermond.skillGroups.magic.find(i => foundryApi.localize(`splittermond.skillLabel.${i}`).toLowerCase().startsWith(spellEntryData[2].toLowerCase()));
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
                            let spellData = await SplittermondCompendium.findItem("spell", searchString[1]);
                            if (spellData) {
                                spellData = spellData.toObject();
                                delete spellData._id;
                                spellData.name = data.name;
                                spellData.system.skill = data.system.skill;
                                spellData.system.skillLevel = data.system.level;
                                return spellData;
                            }
                            return data;
                        })));
                        break;
                    case /Beute:/.test(tokenizedData[i]):
                        tokenizedData[i + 1].match(/[^(,]+\([^)]+\)/g)?.forEach?.(lootEntryStr => {
                            lootEntryStr = lootEntryStr.replace(/\n/, " ");
                            let lootEntryData = lootEntryStr.match(/([^(,]+)\(([^)]+)\)/);
                            let price = 0;
                            let description = lootEntryData[2];
                            if (lootEntryData[2]) {
                                lootEntryStr.match(/([0-9]+) (L?|T?|S?)(.*)/);
                                price = lootEntryStr[1] + " " + lootEntryStr[2];
                            }
                            actorData.items.push({
                                type: "equipment",
                                name: lootEntryData[1].trim(),
                                system: {
                                    description: description,
                                    price: price
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
                ui.notifications.error(game.i18n.format("splittermond.error.parseError", { section: tokenizedData[i] }));
                console.log(game.i18n.format("splittermond.error.parseError", { section: tokenizedData[i] }) + tokenizedData[i + 1]);
            }


        }

        return foundryApi.createActor(actorData, { renderSheet: true });

    }
}
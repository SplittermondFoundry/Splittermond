import SplittermondCompendium from "./compendium.js";
import {actorCreator, itemCreator} from "../data/EntityCreator.ts";
import {foundryApi} from "../api/foundryApi";
import {splittermond} from "../config.js";
import {importSpell as spellImporter} from "./item-importer/spellImporter";
import {importNpc as npcImporter} from "./item-importer/npcImporter";

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
            let skills = splittermond.skillGroups.fighting.map(s => foundryApi.localize(`splittermond.skillLabel.${s}`)).join('|');
            weaponRegex = `${skills}|${weaponRegex}`;
            test = rawData.match(new RegExp(weaponRegex, "gm"));
            if (test.length > 0) {
                let folder = await this._folderDialog();
                let skill = "";

                for (let k = 0; k < test.length; k++) {
                    const m = test[k].trim().replace(/\s{2,}/gm, " ").replace("(*)", "");
                    if (m.match(new RegExp(skills, "gm"))) {
                        skill = splittermond.skillGroups.fighting.find(s => foundryApi.localize(`splittermond.skillLabel.${s}`).trim().toLowerCase() === m.trim().toLowerCase());
                        continue;
                    }
                    if (skill === "") {
                        skill = await this._skillDialog(splittermond.skillGroups.fighting);
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
                    modifier: splittermond.modifier[token[1].trim().toLowerCase()] || ""
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
                    modifier: splittermond.modifier[token[1].trim().toLowerCase()] || ""
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
            img: splittermond.icons.shield[tokens[1].trim()] || splittermond.icons.shield.default,
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
            img: splittermond.icons.armor[tokens[1].trim()] || splittermond.icons.armor.default,
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
            skill = await this._skillDialog(splittermond.skillGroups.fighting);
        }


        let isRanged = ["throwing", "longrange"].includes(skill);

        let tokens = rawData.match(/([\s\S]*?)\s+(Dorf|Kleinstadt|Großstadt|Metropole)\s+(?:([0-9]+ [LST]|-|–)(?:\s*\/\s*[0-9]+ [LST])?)\s+([0-9]+)\s+([0-9]+)\s+([UGFMA])\s+([0-9+\-W]+)\s+([0-9]+)\s+((?:AUS|BEW|INT|KON|MYS|STÄ|VER|WIL|\+){3})\s+((?:(?:AUS|BEW|INT|KON|MYS|STÄ|VER|WIL)\s*[0-9],?\s*)*|–)\s+(.+)/);

        let itemData = {
            type: "weapon",
            name: tokens[1].trim().replace(/[0-9]/g, ""),
            img: splittermond.icons.weapon[tokens[1].trim()] || splittermond.icons.weapon.default,
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

    static importNpc = npcImporter;
}
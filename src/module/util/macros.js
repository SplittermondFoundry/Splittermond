import RequestCheckDialog from "../apps/dialog/request-check-dialog.js";

export function skillCheck(skill, options = {}) {
    const speaker = ChatMessage.getSpeaker();
    let actor;
    if (speaker.token) actor = game.actors.tokens[speaker.token];
    if (!actor) actor = game.actors.get(speaker.actor);
    if (!actor) {
        ui.notifications.info(game.i18n.localize("splittermond.pleaseSelectAToken"));
        return;
    }
    actor.rollSkill(skill, options);
}

export function attackCheck(actorId, attack) {
    const actor = game.actors.get(actorId);
    if (!actor) {
        ui.notifications.info(game.i18n.localize("splittermond.pleaseSelectAToken"));
        return;
    }
    actor.rollAttack(attack);
}

export function itemCheck(itemType, itemName, actorId = "", itemId = "") {
    let actor;
    if (actorId) actor = game.actors.get(actorId);
    else {
        const speaker = ChatMessage.getSpeaker();
        if (speaker.token) actor = game.actors.tokens[speaker.token];
        if (!actor) actor = game.actors.get(speaker.actor);
    }

    if (actor) {
        let item;
        if (itemId) {
            item = actor.items.find((el) => el.id === itemId);
            if (!item) {
                item = game.data.items.find((el) => el.id === itemId);
                item = actor.items.find((el) => el.name === item?.name && el.type === item?.type);
            }
        } else {
            item = actor.items.find((el) => el.name === itemName && el.type === itemType);
        }
        if (item) {
            if (item.type === "spell") {
                actor.rollSpell(item.id);
            }

            if (item.type === "weapon") {
                actor.rollAttack(item.id);
            }
        } else {
            ui.notifications.error(game.i18n.localize("splittermond.invalidItem"));
        }
    } else {
        ui.notifications.info(game.i18n.localize("splittermond.pleaseSelectAToken"));
    }
}

export function requestSkillCheck(preSelectedSkill = "", difficulty = 15) {
    RequestCheckDialog.create({
        skill: preSelectedSkill,
        difficulty: difficulty,
    });
}

export async function importNpc() {
    let clipboard = await navigator.clipboard.readText();
    clipboard = clipboard.replace(/\r\n/g, "\n");
    let stats = clipboard;
    let name = "";
    let description = "";
    if (!clipboard.startsWith("AUS")) {
        let temp = clipboard.match(/([^]+?)\n([^]*?)(AUS BEW[^]*)/);
        if (temp) {
            name = temp[1].trim();
            temp[2] = temp[2].replace(/-\n/g, "");
            description = temp[2].replace(/\n/g, " ");
            stats = temp[3];
        }
    }
    let d = new Dialog({
        title: game.i18n.localize(`splittermond.importNpcData`),
        content: `<form><label>Name</label><input type="text" name="name" value="${name}"><label>Beschreibung</label><textarea style="height: 300px" name='description'>${description}</textarea><label>Data</label><textarea style="height: 300px;" name='data'>${stats}</textarea></form>`,
        buttons: {
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel",
            },
            import: {
                icon: '<i class="fas fa-check"></i>',
                label: "Import",
                callback: (html) => {
                    let importData = html.find('[name="data"]')[0].value;
                    let parsedData =
                        /AUS BEW INT KON MYS STÄ VER WIL\s*([0-9]+)\s*([0-9]+)\s*([0-9]+)\s*([0-9]+)\s*([0-9]+)\s*([0-9]+)\s*([0-9]+)\s*([0-9]+)/.exec(
                            importData
                        );
                    let AUS = parseInt(parsedData[1]);
                    let BEW = parseInt(parsedData[2]);
                    let INT = parseInt(parsedData[3]);
                    let KON = parseInt(parsedData[4]);
                    let MYS = parseInt(parsedData[5]);
                    let STÄ = parseInt(parsedData[6]);
                    let VER = parseInt(parsedData[7]);
                    let WIL = parseInt(parsedData[8]);
                    parsedData =
                        /GK GSW LP FO VTD SR KW GW\s*([0-9]+)\s*([0-9]+)\s*([0-9]+)\s*([0-9]+)\s*([0-9]+)\s*([0-9]+)\s*([0-9]+)\s*([0-9]+)/.exec(
                            importData
                        );
                    let GK = parseInt(parsedData[1]);
                    let GSW = parseInt(parsedData[2]);
                    let LP = parseInt(parsedData[3]);
                    let FO = parseInt(parsedData[4]);
                    let VTD = parseInt(parsedData[5]);
                    let SR = parseInt(parsedData[6]);
                    let KW = parseInt(parsedData[7]);
                    let GW = parseInt(parsedData[8]);
                    let INI = 0;
                    let weaponData = /(Waffen Wert Schaden WGS.*)\n([^]*?)\n[^\s]+:/g.exec(importData);
                    let weapons = [];
                    if (weaponData) {
                        if (weaponData[1].match(/Reichw/)) {
                            weaponData[2]
                                .match(/.* [0-9]+ [0-9W\-+]+ [0-9]+ Tick[s]? [0-9\-]+\-1W6 [0-9\-–]* .*/g)
                                .forEach((weaponStr) => {
                                    let weaponDataRaw = weaponStr.match(
                                        /(.*) ([0-9]+) ([0-9W\-+]+) ([0-9]+) Tick[s]? ([0-9\-]+)\-1W6 ([0-9\-–]*) (.*)/
                                    );
                                    INI = parseInt(weaponDataRaw[5].trim()) || 0;
                                    weapons.push({
                                        type: "weapon",
                                        name: weaponDataRaw[1].trim(),
                                        data: {
                                            damage: weaponDataRaw[3].trim(),
                                            weaponSpeed: parseInt(weaponDataRaw[4].trim()) || 0,
                                            range: parseInt(weaponDataRaw[6].trim()) || 0,
                                            features: weaponDataRaw[7].trim(),
                                        },
                                    });
                                });
                        } else {
                            weaponData[2]
                                .match(/.* [0-9]+ [0-9W\-+]+ [0-9]+ Tick[s]? [0-9\-]+\-1W6 .*/g)
                                .forEach((weaponStr) => {
                                    let weaponDataRaw = weaponStr.match(
                                        /(.*) ([0-9]+) ([0-9W\-+]+) ([0-9]+) Tick[s]? ([0-9\-]+)\-1W6 (.*)/
                                    );
                                    INI = parseInt(weaponDataRaw[5].trim()) || 0;
                                    weapons.push({
                                        type: "weapon",
                                        name: weaponDataRaw[1].trim(),
                                        data: {
                                            damage: weaponDataRaw[3].trim(),
                                            weaponSpeed: parseInt(weaponDataRaw[4].trim()) || 0,
                                            range: 0,
                                            features: weaponDataRaw[6].trim(),
                                        },
                                    });
                                });
                        }
                    }

                    let skillData = /Fertigkeiten: ([^]*?)\n[^\s]+:/g.exec(importData);
                    let skillObj = {};
                    if (skillData[1]) {
                        skillData[1].split(",").forEach((skillStr) => {
                            let skillData = skillStr.trim().match(/(.*?)\s+([0-9]+)/);
                            let skill = [
                                ...CONFIG.splittermond.skillGroups.general,
                                ...CONFIG.splittermond.skillGroups.magic,
                                ...CONFIG.splittermond.skillGroups.fighting,
                            ].find(
                                (i) =>
                                    game.i18n.localize(`splittermond.skillLabel.${i}`).toLowerCase() ===
                                    skillData[1].toLowerCase()
                            );
                            skillObj[skill] = {
                                value: skillData[2],
                            };
                        });
                    }

                    let masteriesData = /Meisterschaften: ([^]*?)\n(Merkmale|Zauber|Beute|Fertigkeiten):/g.exec(
                        importData
                    );
                    let masteries = [];
                    if (masteriesData[1]) {
                        masteriesData[1].match(/[^(]+ \([^)]+\),?/g).forEach((skillEntryStr) => {
                            let masteryEntryData = skillEntryStr.trim().match(/([^(]+)\s+\(([^)]+)\)/);
                            let skill = [
                                ...CONFIG.splittermond.skillGroups.general,
                                ...CONFIG.splittermond.skillGroups.magic,
                                ...CONFIG.splittermond.skillGroups.fighting,
                            ].find(
                                (i) =>
                                    game.i18n.localize(`splittermond.skillLabel.${i}`).toLowerCase() ===
                                    masteryEntryData[1].toLowerCase()
                            );
                            let level = 1;
                            masteryEntryData[2].split(/,|;|:/).forEach((masteryStr) => {
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
                                    masteries.push({
                                        type: "mastery",
                                        name: masteryStr.trim(),
                                        data: {
                                            skill: skill,
                                            level: level,
                                        },
                                    });
                                }
                            });
                        });
                    }

                    let featuresData = /Merkmale: ([^:]*)\n(Beute:)?/g.exec(importData);
                    let features = [];
                    featuresData[1].split(/,/).forEach((f) => {
                        if (f.trim()) {
                            features.push({
                                type: "npcfeature",
                                name: f.trim(),
                            });
                        }
                    });

                    let typeData = /Typus: ([^]*?)\n[^\s]+:/g.exec(importData);
                    let type = "";
                    if (typeData) {
                        type = typeData[1];
                    }

                    let levelData = /Monstergrad: ([^]*?)\n[^\s]+:/g.exec(importData);
                    let level = "";
                    if (typeData) {
                        level = levelData[1];
                    }

                    let spellsData = /Zauber: ([^]*?)\n[\w]+:/g.exec(importData);
                    let spells = [];
                    if (spellsData) {
                        let skill = "";
                        spellsData[1].split(";").forEach((skillEntryStr) => {
                            let spellEntryData = skillEntryStr.trim().match(/([^ ]*)\s*([0IV]+):\s+([^]+)/);
                            if (spellEntryData[1]) {
                                skill = CONFIG.splittermond.skillGroups.magic.find((i) =>
                                    game.i18n
                                        .localize(`splittermond.skillLabel.${i}`)
                                        .toLowerCase()
                                        .startsWith(spellEntryData[1].toLowerCase())
                                );
                            }
                            let level = 0;
                            switch (spellEntryData[2]) {
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
                                default:
                                    level = 0;
                            }
                            spellEntryData[3].split(",").forEach((s) => {
                                spells.push({
                                    type: "spell",
                                    name: s.trim().replace(/\n/, " "),
                                    data: {
                                        skill: skill,
                                        skillLevel: level,
                                    },
                                });
                            });
                        });
                    }

                    let lootData = /Beute: ([^]*)\n(Anmerkung:)?/g.exec(importData);
                    let equipment = [];
                    if (lootData) {
                        lootData[1].match(/[^(,]+\([^)]+\)/g).forEach((lootEntryStr) => {
                            lootEntryStr = lootEntryStr.replace(/\n/, " ");
                            let lootEntryData = lootEntryStr.match(/([^(,]+)\(([^)]+)\)/);
                            let costs = 0;
                            let description = lootEntryData[2];
                            if (lootEntryData[2]) {
                                lootEntryStr.match(/([0-9]+) (L?|T?|S?)(.*)/);
                                costs = lootEntryStr[1] + " " + lootEntryStr[2];
                            }
                            equipment.push({
                                type: "equipment",
                                name: lootEntryData[1].trim(),
                                data: {
                                    description: description,
                                    costs: costs,
                                },
                            });
                        });
                    }

                    let attributes = {
                        charisma: {
                            species: 0,
                            initial: AUS,
                            advances: 0,
                        },
                        agility: {
                            species: 0,
                            initial: BEW,
                            advances: 0,
                        },
                        intuition: {
                            species: 0,
                            initial: INT,
                            advances: 0,
                        },
                        constitution: {
                            species: 0,
                            initial: KON,
                            advances: 0,
                        },
                        mystic: {
                            species: 0,
                            initial: MYS,
                            advances: 0,
                        },
                        strength: {
                            species: 0,
                            initial: STÄ,
                            advances: 0,
                        },
                        mind: {
                            species: 0,
                            initial: VER,
                            advances: 0,
                        },
                        willpower: {
                            species: 0,
                            initial: WIL,
                            advances: 0,
                        },
                    };

                    Object.keys(skillObj).forEach((skill) => {
                        if (CONFIG.splittermond.skillAttributes[skill]) {
                            skillObj[skill].points = skillObj[skill].value;
                            skillObj[skill].points -= parseInt(
                                attributes[CONFIG.splittermond.skillAttributes[skill][0]].initial
                            );
                            skillObj[skill].points -= parseInt(
                                attributes[CONFIG.splittermond.skillAttributes[skill][1]].initial
                            );
                        }
                    });

                    return Actor.update({
                        name: name,
                        type: "npc",
                        data: {
                            biography: description,
                            type: type,
                            level: level,
                            attributes: attributes,
                            derivedAttributes: {
                                size: {
                                    value: GK,
                                },
                                speed: {
                                    value: GSW,
                                },
                                initiative: {
                                    value: INI,
                                },
                                healthpoints: {
                                    value: LP,
                                },
                                focuspoints: {
                                    value: FO,
                                },
                                defense: {
                                    value: VTD,
                                },
                                bodyresist: {
                                    value: KW,
                                },
                                mindresist: {
                                    value: GW,
                                },
                            },
                            skills: skillObj,
                        },
                        items: [...masteries, ...features, ...equipment, ...spells, ...weapons],
                    });
                },
            },
        },
        default: "ok",
    });
    d.render(true);
}

export function magicFumble(eg = 0, costs = 0, skill = "") {
    const speaker = ChatMessage.getSpeaker();
    let actor;
    if (speaker.token) actor = game.actors.tokens[speaker.token];
    if (!actor) actor = game.actors.get(speaker.actor);
    if (!actor) {
        ui.notifications.info(game.i18n.localize("splittermond.pleaseSelectAToken"));
        return;
    }
    actor.rollMagicFumble(eg, costs, skill);
}

export function attackFumble(eg = 0, costs = 0) {
    const speaker = ChatMessage.getSpeaker();
    let actor;
    if (speaker.token) actor = game.actors.tokens[speaker.token];
    if (!actor) actor = game.actors.get(speaker.actor);
    if (!actor) {
        ui.notifications.info(game.i18n.localize("splittermond.pleaseSelectAToken"));
        return;
    }
    actor.rollAttackFumble();
}

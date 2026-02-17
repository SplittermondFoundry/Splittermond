import { describe, it } from "mocha";
import { expect } from "chai";
import { initializeDisplayPreparation } from "../../../../../module/apps/compendiumBrowser/itemDisplayPreparation.js";
import { identity } from "../../../foundryMocks.js";

const defautItem = {
    folder: "",
    sort: 0,
    img: "",
    uuid: "",
    _id: "",
};
/**@returns{ItemIndexEntity}*/
function getSampleSpellItem() {
    return {
        ...defautItem,
        type: "spell",
        name: "Licht",
        system: {
            level: "",
            availableIn: "lightmagic 1, shadowmagic 3",
            skill: "lightmagic",
            features: "",
            skillLevel: 1,
            spellType: "Leuchten",
        },
    };
}

/**@returns {ItemIndexEntity}*/
function getSampleMasteryItem() {
    return {
        ...defautItem,
        type: "mastery",
        name: "Abdrängen",
        system: {
            level: "1",
            availableIn: "staffs",
            skill: "staffs",
            features: "",
            skillLevel: 0,
            damage: "",
        },
    };
}

function getSampleWeaponItem() {
    return {
        ...defautItem,
        type: "weapon",
        name: "Schwert",
        system: {
            level: "",
            availableIn: "",
            spellType: "",
            skill: "swords",
            features: "Scharf 2",
            skillLevel: 0,
            damage: "1W6+2",
            secondaryAttack: {
                skill: "staffs",
            },
        },
    };
}

function getSampleArmorItem() {
    return {
        ...defautItem,
        type: "armor",
        name: "Kettenhemd",
        system: {
            features: "Schwer",
            defenseBonus: 2,
            damageReduction: 3,
            handicap: 2,
        },
    };
}

function getSampleShieldItem() {
    return {
        ...defautItem,
        type: "shield",
        name: "Holzschild",
        system: {
            features: "Extraschwer",
            defenseBonus: 1,
            handicap: 1,
        },
    };
}

function getSampleNpcItem() {
    return {
        ...defautItem,
        type: "npc",
        name: "Goblin",
        system: {
            type: "Goblinoid, Kulturschaffender",
            level: "3",
        },
    };
}

const sampleCompendiumData = { id: "world.discarded", label: "Ablage P" };
const getAllItemData = () => [
    getSampleSpellItem(),
    getSampleMasteryItem(),
    getSampleWeaponItem(),
    getSampleArmorItem(),
    getSampleShieldItem(),
    getSampleNpcItem(),
];

describe("spell item preparation for compendium browser", () => {
    /** @type {{localize: (x:string)=>string}} */
    const spellI18n = {
        localize: /**@param {string} str*/ (str) =>
            str === `splittermond.skillLabel.lightmagic` ? "Lichtmagie" : "Schattenmagie",
    };
    const produceDisplayableItems = initializeDisplayPreparation(spellI18n, ["lightmagic", "shadowmagic"], []);
    it("should sort item types into separate arrays", async () => {
        const collector = {};
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve(getAllItemData()), collector);
        expect(collector).to.include.keys("spell");
        expect(collector.spell[0]).to.deep.contain(getSampleSpellItem());
    });

    it("should add metadata to spells", async () => {
        const collector = {};
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve(getAllItemData()), collector);
        expect(collector.spell[0]).to.deep.contain({ compendium: { metadata: sampleCompendiumData } });
    });

    it("should throw an error if the item is not a spell", async () => {
        const malformedSpell = getSampleSpellItem();
        delete malformedSpell.system.skill;
        await produceDisplayableItems(
            sampleCompendiumData,
            Promise.resolve([malformedSpell, getSampleMasteryItem()]),
            {}
        ).catch((err) => {
            expect(err).to.be.an.instanceOf(Error);
            expect(err.message).to.equal(`Item '${malformedSpell.name}' is not a spell`);
        });
    });

    it("should produce tags for skills where the spell is available in", async () => {
        const collector = {};
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve(getAllItemData()), collector);
        expect(collector.spell[0].availableInList).to.deep.equal([
            { label: "Lichtmagie 1" },
            { label: "Schattenmagie 3" },
        ]);
    });

    it("should produce tags for the spell type", async () => {
        const collector = {};
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve(getAllItemData()), collector);
        expect(collector.spell[0].spellTypeList).to.deep.equal(["Leuchten"]);
    });

    it("should have skill, and skill level", async () => {
        const collector = {};
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve(getAllItemData()), collector);
        expect(collector.spell[0].system.skillLevel).not.to.be.undefined; //jshint ignore:line
        expect(collector.spell[0].system.skill).not.to.be.undefined; //jshint ignore:line
    });
});

describe("mastery item preparation for compendium browser", () => {
    /** @type {{localize: (x:string)=>string}} */
    const masteryI18n = {
        localize: /*@param {string} str*/ (str) =>
            str === `splittermond.skillLabel.staffs` ? "Stangenwaffen" : "Klingenwaffen",
    };
    const produceDisplayableItems = initializeDisplayPreparation(masteryI18n, [], ["swords", "staffs"]);
    it("should sort item types into separate arrays", async () => {
        const collector = {};
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve(getAllItemData()), collector);
        expect(collector).to.include.keys("mastery");
        expect(collector.mastery[0]).to.deep.contain(getSampleMasteryItem());
    });

    it("should add metadata to masteries", async () => {
        const collector = {};
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve(getAllItemData()), collector);
        expect(collector.mastery[0]).to.deep.contain({ compendium: { metadata: sampleCompendiumData } });
    });

    it("should throw an error if the item is not a mastery", async () => {
        const malformedMastery = getSampleMasteryItem();
        delete malformedMastery.system.skill;
        await produceDisplayableItems(
            sampleCompendiumData,
            Promise.resolve([malformedMastery, getSampleMasteryItem()]),
            {}
        ).catch((err) => {
            expect(err).to.be.an.instanceOf(Error);
            expect(err.message).to.equal(`Item '${malformedMastery.name}' is not a mastery`);
        });
    });

    it("should produce mastery tags", async () => {
        const collector = {};
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve([getSampleMasteryItem()]), collector);
        expect(collector.mastery[0].availableInList).to.deep.equal([{ label: "Stangenwaffen" }]);
    });

    it("should not have propertyModel, nor skill, nor skill level", async () => {
        const collector = {};
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve(getAllItemData()), collector);
        expect(collector.mastery[0].skillLevel).to.be.undefined; //jshint ignore:line
        expect(collector.mastery[0].features).to.be.undefined; //jshint ignore:line
    });
});

describe("weapon item preparation for compendium browser", () => {
    const produceDisplayableItems = initializeDisplayPreparation({ localize: identity }, [], []);
    it("should sort item types into separate arrays", async () => {
        const collector = {};
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve(getAllItemData()), collector);
        expect(collector).to.include.keys("weapon");
        expect(collector.weapon[0]).to.deep.contain(getSampleWeaponItem());
    });
    it("should throw an error if the item is not a weapon", async () => {
        const malformedWeapon = getSampleWeaponItem();
        delete malformedWeapon.system.features;
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve(getAllItemData()), {}).catch((err) => {
            expect(err).to.be.an.instanceOf(Error);
            expect(err.message).to.equal(`Item '${malformedWeapon.name}' is not a weapon`);
        });
    });

    it("should produce weapon tags", async () => {
        const collector = {};
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve(getAllItemData()), collector);
        expect(collector.weapon[0].featuresList).to.deep.equal(["Scharf 2"]);
    });

    it("should tell that weapon has a secondary attack", async () => {
        const collector = {};
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve(getAllItemData()), collector);
        expect(collector.weapon[0].hasSecondaryAttack).to.be.true; //jshint ignore:line
    });

    ["none", ""].forEach((value) => {
        it(`should tell weapon does not have a secondary attack when skill is ${value}`, async () => {
            const probe = getSampleWeaponItem();
            probe.system.secondaryAttack.skill = value;
            const collector = {};
            await produceDisplayableItems(sampleCompendiumData, Promise.resolve([probe]), collector);
            expect(collector.weapon[0].hasSecondaryAttack).to.be.false; //jshint ignore:line
        });
    });

    it("should have propertyModel, skill and secondary attack skill", async () => {
        const collector = {};
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve(getAllItemData()), collector);
        expect(collector.weapon[0].system.features).not.to.be.undefined; //jshint ignore:line
        expect(collector.weapon[0].system.skill).not.to.be.undefined; //jshint ignore:line
    });
});

describe("armor item preparation for compendium browser", () => {
    const produceDisplayableItems = initializeDisplayPreparation({ localize: identity }, [], []);
    it("should sort armor items into separate array", async () => {
        const collector = {};
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve(getAllItemData()), collector);
        expect(collector).to.include.keys("armor");
        expect(collector.armor[0]).to.deep.contain(getSampleArmorItem());
    });

    it("should add metadata to armor", async () => {
        const collector = {};
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve(getAllItemData()), collector);
        expect(collector.armor[0]).to.deep.contain({ compendium: { metadata: sampleCompendiumData } });
    });

    it("should throw an error if the item is not an armor", async () => {
        const malformedArmor = getSampleArmorItem();
        delete malformedArmor.system.features;
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve([malformedArmor]), {}).catch((err) => {
            expect(err).to.be.an.instanceOf(Error);
            expect(err.message).to.equal(`Item '${malformedArmor.name}' is not an armor`);
        });
    });

    it("should produce armor feature tags", async () => {
        const collector = {};
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve(getAllItemData()), collector);
        expect(collector.armor[0].featuresList).to.deep.equal(["Schwer"]);
    });
});

describe("shield item preparation for compendium browser", () => {
    const produceDisplayableItems = initializeDisplayPreparation({ localize: identity }, [], []);
    it("should sort shield items into separate array", async () => {
        const collector = {};
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve(getAllItemData()), collector);
        expect(collector).to.include.keys("shield");
        expect(collector.shield[0]).to.deep.contain(getSampleShieldItem());
    });

    it("should add metadata to shields", async () => {
        const collector = {};
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve(getAllItemData()), collector);
        expect(collector.shield[0]).to.deep.contain({ compendium: { metadata: sampleCompendiumData } });
    });

    it("should throw an error if the item is not a shield", async () => {
        const malformedShield = getSampleShieldItem();
        delete malformedShield.system.features;
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve([malformedShield]), {}).catch((err) => {
            expect(err).to.be.an.instanceOf(Error);
            expect(err.message).to.equal(`Item '${malformedShield.name}' is not a shield`);
        });
    });

    it("should produce shield feature tags", async () => {
        const collector = {};
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve(getAllItemData()), collector);
        expect(collector.shield[0].featuresList).to.deep.equal(["Extraschwer"]);
    });
});

describe("npc item preparation for compendium browser", () => {
    const produceDisplayableItems = initializeDisplayPreparation({ localize: identity }, [], []);
    it("should sort npc items into separate array", async () => {
        const collector = {};
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve(getAllItemData()), collector);
        expect(collector).to.include.keys("npc");
        expect(collector.npc[0]).to.deep.contain(getSampleNpcItem());
    });

    it("should add metadata to npcs", async () => {
        const collector = {};
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve(getAllItemData()), collector);
        expect(collector.npc[0]).to.deep.contain({ compendium: { metadata: sampleCompendiumData } });
    });

    it("should throw an error if the actor is not an npc", async () => {
        const malformedNpc = getSampleNpcItem();
        malformedNpc.type = "character";
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve([malformedNpc]), {}).catch((err) => {
            expect(err).to.be.an.instanceOf(Error);
            expect(err.message).to.equal(`Actor '${malformedNpc.name}' is not an NPC`);
        });
    });

    it("should produce npc type tags", async () => {
        const collector = {};
        await produceDisplayableItems(sampleCompendiumData, Promise.resolve(getAllItemData()), collector);
        expect(collector.npc[0].typeList).to.deep.equal([{ label: "Goblinoid" }, { label: "Kulturschaffender" }]);
    });
});

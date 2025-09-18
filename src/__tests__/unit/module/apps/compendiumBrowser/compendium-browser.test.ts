import "../../../foundryMocks.js";
import sinon, { SinonSandbox } from "sinon";
import { afterEach, beforeEach, describe, it } from "mocha";
import { expect } from "chai";
import { createHtml } from "../../../../handlebarHarness";
import SplittermondCompendiumBrowser from "../../../../../module/apps/compendiumBrowser/compendium-browser";
import { JSDOM } from "jsdom";
import {
    SplittermondFightingSkill,
    SplittermondMagicSkill,
    SplittermondSkill,
} from "../../../../../module/config/skillGroups";
import SplittermondSpellItem from "../../../../../module/item/spell";
import { SpellDataModel } from "../../../../../module/item/dataModel/SpellDataModel";

describe("compendium-browser filters", async () => {
    let sandbox: SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });
    afterEach(() => {
        sandbox.restore();
    });

    function addWorldSpell(skill: SplittermondMagicSkill, level: number, availableOnly: boolean = false) {
        const spellId = id.next().value;
        const spell = sandbox.createStubInstance(SplittermondSpellItem);
        spell.system = sandbox.createStubInstance(SpellDataModel);
        sandbox.stub(spell, "id").get(() => spellId);
        sandbox.stub(spell, "uuid").get(() => `Item.${spellId}`);
        if (availableOnly) {
            spell.system.availableIn = `${skill} ${level}`;
            sandbox.stub(spell, "availableIn").get(() => spell.system.availableIn);
            sandbox.stub(spell, "availableInList").get(() => [spell.system.availableIn]);
        } else {
            spell.system.availableIn = "";
            spell.system.skill = skill;
            spell.system.skillLevel = level;
            sandbox.stub(spell, "availableInList").get(() => []);
            sandbox.stub(spell, "availableIn").get(() => spell.system.availableIn);
        }
        return spell;
    }

    describe(`compendium-browser spell tab`, () => {
        it("should only display items of the selected skill", async () => {
            const display1 = addCompendiumSpell("lightmagic", 1);
            const display2 = addCompendiumSpell("lightmagic", 1, true);
            const notDisplay1 = addCompendiumSpell("shadowmagic", 1);
            const notDisplay2 = addCompendiumSpell("shadowmagic", 1, true);
            const objectUnderTest = await setupCompendiumBrowser((probe) =>
                probe.items.spell.push(display1, display2, notDisplay1, notDisplay2)
            );

            objectUnderTest.setSkill("lightmagic", "spell");

            objectUnderTest.getListItems("spell").forEach((el) => {
                const li = el as HTMLOListElement;
                const liItemName = li.querySelector("label")?.textContent ?? "No item found";
                const message = `List item  ${liItemName} has incorrect display style`;
                if ([display1.name, display2.name].includes(liItemName)) {
                    expect(li.style.display, message).to.equal("flex");
                } else if ([notDisplay1.name, notDisplay2.name].includes(liItemName)) {
                    expect(li.style.display, message).to.equal("none");
                } else {
                    expect.fail(`List item ${liItemName} is not expected to be in the list`);
                }
            });
        });

        it("should only display items that have or are available in the selected Level", async () => {
            const display1 = addCompendiumSpell("lightmagic", 1);
            const display2 = addCompendiumSpell("lightmagic", 1, true);
            const notDisplay1 = addCompendiumSpell("shadowmagic", 2);
            const notDisplay2 = addCompendiumSpell("shadowmagic", 2, true);
            const objectUnderTest = await setupCompendiumBrowser((probe) =>
                probe.items.spell.push(display1, display2, notDisplay1, notDisplay2)
            );

            objectUnderTest.setLevel(1, "spell");

            objectUnderTest.element.querySelectorAll("li.list-item").forEach((el) => {
                const li = el as HTMLOListElement;
                const liItemName = li.querySelector("label")?.textContent ?? "No item found";
                const message = `List item  ${liItemName} has incorrect display style`;
                if ([display1.name, display2.name].includes(liItemName)) {
                    expect(li.style.display, message).to.equal("flex");
                } else if ([notDisplay1.name, notDisplay2.name].includes(liItemName)) {
                    expect(li.style.display, message).to.equal("none");
                } else {
                    expect.fail(`List item ${liItemName} is not expected to be in the list`);
                }
            });
        });

        it("should not display world spells when the filter is set to off", async () => {
            const notDisplayed = addWorldSpell("lightmagic", 1);
            const objectUnderTest = await setupCompendiumBrowser((probe) => probe.items.spell.push(notDisplayed));

            objectUnderTest.setWorldItemFilter(false, "spell");

            objectUnderTest.getListItems("spell").forEach((el) => {
                const li = el as HTMLOListElement;
                const liItemName = li.querySelector("label")?.textContent ?? "No item found";
                expect(li.style.display, `List item ${liItemName} should not be displayed`).to.equal("none");
            });
        });

        it("should filter spells by name", async () => {
            const spell1 = addCompendiumSpell("lightmagic", 1);
            spell1.name = "Light Beam";
            const spell2 = addCompendiumSpell("shadowmagic", 2);
            spell2.name = "Shadow Veil";
            const objectUnderTest = await setupCompendiumBrowser((probe) => probe.items.spell.push(spell1, spell2));

            objectUnderTest.setNameFilter("Light", "spell");

            const visible = Array.from(objectUnderTest.getListItems("spell"))
                .filter((li) => (li as HTMLElement).style.display !== "none")
                .map((li) => li.querySelector("label")?.textContent);

            expect(visible).to.include("Light Beam");
            expect(visible).to.not.include("Shadow Veil");
        });
    });

    describe("compendium-browser mastery tab", () => {
        it("should filter masteries by name", async () => {
            const mastery1 = addCompendiumMastery("melee", 1, "Sword Mastery");
            const mastery2 = addCompendiumMastery("longrange", 2, "Bow Mastery");
            const objectUnderTest = await setupCompendiumBrowser((probe) =>
                probe.items.mastery.push(mastery1, mastery2)
            );

            objectUnderTest.setNameFilter("Sword", "mastery");

            const visible = Array.from(objectUnderTest.getListItems("mastery"))
                .filter((li) => (li as HTMLElement).style.display !== "none")
                .map((li) => li.querySelector("label")?.textContent);

            expect(visible).to.include(mastery1.name);
            expect(visible).to.not.include(mastery2.name);
        });

        it("should filter masteries by skill and level in combination", async () => {
            const mastery1 = addCompendiumMastery("melee", 1, "Sword Mastery");
            const mastery2 = addCompendiumMastery("melee", 2, "Axe Mastery");
            const mastery3 = addCompendiumMastery("longrange", 1, "Bow Mastery");
            const objectUnderTest = await setupCompendiumBrowser((probe) =>
                probe.items.mastery.push(mastery1, mastery2, mastery3)
            );

            // Use TestCompendiumBrowser methods for setting filters
            objectUnderTest.setSkill("melee", "mastery");
            objectUnderTest.setLevel(2, "mastery");

            const visible = Array.from(objectUnderTest.getListItems("mastery"))
                .filter((li) => (li as HTMLElement).style.display !== "none")
                .map((li) => li.querySelector("label")?.textContent);

            expect(visible).to.include("Axe Mastery");
            expect(visible).to.not.include("Sword Mastery");
            expect(visible).to.not.include("Bow Mastery");
        });

        it("should not display world masteries when the filter is set to off", async () => {
            const mastery = addCompendiumMastery("melee", 1, "World Mastery");
            // Simulate a world item by giving it a Compendium-like uuid
            mastery.uuid = `Item.${mastery._id}`;
            const objectUnderTest = await setupCompendiumBrowser((probe) => probe.items.mastery.push(mastery));
            objectUnderTest.setWorldItemFilter(false, "mastery");

            objectUnderTest.getListItems("mastery").forEach((el) => {
                const li = el as HTMLOListElement;
                const liItemName = li.querySelector("label")?.textContent ?? "No item found";
                expect(li.style.display, `List item ${liItemName} should not be displayed`).to.equal("none");
            });
        });
    });

    describe("compendium-browser weapon tab", () => {
        it("should filter weapons by name", async () => {
            const weapon1 = addCompendiumWeapon("melee", "Longsword", "sharp", "1W6");
            const weapon2 = addCompendiumWeapon("longrange", "Shortbow", "light", "1W6");
            const objectUnderTest = await setupCompendiumBrowser((probe) => probe.items.weapon.push(weapon1, weapon2));

            objectUnderTest.setNameFilter("Long", "weapon");

            const visible = Array.from(objectUnderTest.element.querySelectorAll('[data-tab="weapon"] li.list-item'))
                .filter((li) => (li as HTMLElement).style.display !== "none")
                .map((li) => li.querySelector("label")?.textContent);

            expect(visible).to.include("Longsword");
            expect(visible).to.not.include("Shortbow");
        });

        it("should filter weapons by skill and name in combination", async () => {
            const weapon1 = addCompendiumWeapon("melee", "Longsword", "sharp", "1W6");
            const weapon2 = addCompendiumWeapon("melee", "Dagger", "light", "1W4");
            const weapon3 = addCompendiumWeapon("longrange", "Shortbow", "light", "1W6");
            const objectUnderTest = await setupCompendiumBrowser((probe) =>
                probe.items.weapon.push(weapon1, weapon2, weapon3)
            );

            // Use TestCompendiumBrowser helpers for skill and name filter
            objectUnderTest.setSkill("melee", "weapon");
            objectUnderTest.setNameFilter("Long", "weapon");

            const visible = Array.from(objectUnderTest.element.querySelectorAll('[data-tab="weapon"] li.list-item'))
                .filter((li) => (li as HTMLElement).style.display !== "none")
                .map((li) => li.querySelector("label")?.textContent);

            expect(visible).to.include("Longsword");
            expect(visible).to.not.include("Dagger");
            expect(visible).to.not.include("Shortbow");
        });

        it("should only display items of the selected skill", async () => {
            const weapon1 = addCompendiumWeapon("melee", "Longsword", "sharp", "1W6");
            const weapon2 = addCompendiumWeapon("melee", "Dagger", "light", "1W4");
            const weapon3 = addCompendiumWeapon("longrange", "Shortbow", "light", "1W6");
            const objectUnderTest = await setupCompendiumBrowser((probe) =>
                probe.items.weapon.push(weapon1, weapon2, weapon3)
            );

            objectUnderTest.setSkill("melee", "weapon");

            objectUnderTest.getListItems("weapon").forEach((el) => {
                const li = el as HTMLOListElement;
                const liItemName = li.querySelector("label")?.textContent ?? "No item found";
                const message = `List item  ${liItemName} has incorrect display style`;
                if ([weapon1.name, weapon2.name].includes(liItemName)) {
                    expect(li.style.display, message).to.equal("flex");
                } else if ([weapon3.name].includes(liItemName)) {
                    expect(li.style.display, message).to.equal("none");
                } else {
                    expect.fail(`List item ${liItemName} is not expected to be in the list`);
                }
            });
        });

        it("should not display world weapons when the filter is set to off", async () => {
            const weapon = addCompendiumWeapon("melee", "World Sword", "sharp", "1W6");
            // Simulate a world item by giving it a Compendium-like uuid
            weapon.uuid = `Item.${weapon._id}`;
            const objectUnderTest = await setupCompendiumBrowser((probe) => probe.items.weapon.push(weapon));
            objectUnderTest.setWorldItemFilter(false, "weapon");

            objectUnderTest.getListItems("weapon").forEach((el) => {
                const li = el as HTMLOListElement;
                const liItemName = li.querySelector("label")?.textContent ?? "No item found";
                expect(li.style.display, `List item ${liItemName} should not be displayed`).to.equal("none");
            });
        });
    });
});

type SetupProbe = (probe: ReturnType<typeof getProbe>) => void;
async function setupCompendiumBrowser(setupProbe: SetupProbe) {
    const probe = getProbe();
    setupProbe(probe);
    const spell = createHtml("./templates/apps/compendium-browser/parts/spell.hbs", probe);
    const mastery = createHtml("./templates/apps/compendium-browser/parts/mastery.hbs", probe);
    const weapon = createHtml("./templates/apps/compendium-browser/parts/weapon.hbs", probe);
    const html = `${spell}\n${mastery}\n${weapon}`;
    const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });
    const objectUnderTest = new TestCompendiumBrowser(dom);
    await objectUnderTest._onRender({}, {});
    await objectUnderTest.render();
    return objectUnderTest;
}

function getProbe() {
    return {
        spellFilter: {
            skills: {
                lightmagic: "splittermond.skilllabel.lightmagic",
                shadowmagic: "splittermond.skilllabel.shadowmagic",
                none: "splittermond.skilllabel.none",
            },
        },
        masteryFilter: {
            skills: {
                lightmagic: "splittermond.skilllabel.lightmagic",
                shadowmagic: "splittermond.skilllabel.shadowmagic",
                melee: "splittermond.skilllabel.melee",
                longrange: "splittermond.skilllabel.longrange",
                none: "splittermond.skilllabel.none",
            },
        },
        weaponFilter: {
            skills: {
                melee: "splittermond.skilllabel.melee",
                longrange: "splittermond.skilllabel.longrange",
                none: "splittermond.skilllabel.none",
            },
        },
        items: {
            mastery: [] as unknown[],
            weapon: [] as unknown[],
            spell: [] as unknown[],
        },
    };
}

const id = (function* getNewId() {
    let id = 1;
    while (true) {
        yield id++;
    }
})();

function addCompendiumSpell(skill: SplittermondMagicSkill, level: number, availableOnly: boolean = false) {
    const myId = id.next().value;
    return {
        availableInList: availableOnly ? [`splittermond.skilllabel.${skill} ${level}`] : [],
        spellTypeList: [],
        name: "Compendium Spell " + myId,
        _id: `${myId}`,
        id() {
            return `${myId}`;
        },
        type: "spell",
        uuid: `Compendium.world.zauber.Item.${myId}`,
        compendium: {
            metadata: {
                id: "world.zauber",
                label: "Zauber",
            },
        },
        system: {
            availableIn: `${skill} ${level}`,
            skill: availableOnly ? "arcanelore" : skill,
            skillLevel: availableOnly ? "0" : level,
        },
    };
}
function addCompendiumMastery(skill: SplittermondSkill, level: number, name?: string) {
    const myId = id.next().value;
    return {
        name: name ?? "Compendium Mastery " + myId,
        _id: `${myId}`,
        uuid: `Compendium.world.masteries.Item.${myId}`,
        type: "mastery",
        system: {
            availableIn: `${skill} ${level}`,
            skill,
            level,
        },
        availableInList: [{ label: `splittermond.skilllabel.${skill} ${level}` }],
    };
}
function addCompendiumWeapon(
    skill: SplittermondFightingSkill,
    name: string,
    features: string = "",
    damage: string = ""
) {
    const myId = id.next().value;
    return {
        name,
        _id: `${myId}`,
        uuid: `Compendium.world.weapons.Item.${myId}`,
        type: "weapon",
        system: {
            skill,
            features: { internalFeatureList: features },
            damage: { stringInput: damage },
            secondaryAttack: {
                skill: "none",
                features: { internalFeatureList: "" },
                damage: { stringInput: "" },
            },
        },
        featuresList: features ? features.split(",") : [],
        hasSecondaryAttack: false,
        compendium: {
            metadata: {
                id: "world.weapons",
                label: "Weapons",
            },
        },
    };
}

class TestCompendiumBrowser extends SplittermondCompendiumBrowser {
    private dom: JSDOM;

    constructor(dom: JSDOM) {
        super();
        // @ts-expect-error element should be not writable, but we need to set it for the test
        this.element = dom.window.document.documentElement;
        this.dom = dom;
    }

    setSkill(skill: SplittermondSkill, tab: string) {
        const input = this.element.querySelector(`[data-tab="${tab}"] select`) as HTMLSelectElement;
        input.value = skill;
        input.dispatchEvent(new this.dom.window.Event("change", { bubbles: true }));
    }

    setLevel(level: number, tab: string) {
        let input = this.element.querySelector(
            `[data-tab="${tab}"] .compendium-item-filters input[type=checkbox][value="${level}"]`
        ) as HTMLInputElement;
        input.checked = true;
        input.dispatchEvent(new this.dom.window.Event("change", { bubbles: true }));
    }

    setWorldItemFilter(value: boolean, tab: string) {
        let input = this.element.querySelector(
            `[data-tab="${tab}"] .filter input[type=checkbox][name=show-world-items]`
        ) as HTMLInputElement;
        input.checked = value;
        input.dispatchEvent(new this.dom.window.Event("change", { bubbles: true }));
    }

    setNameFilter(name: string, tab: string) {
        let input = this.element.querySelector(
            `[data-tab="${tab}"] .filter input[type=text][name=search]`
        ) as HTMLInputElement;
        input.value = name;
        input.dispatchEvent(new this.dom.window.Event("change", { bubbles: true }));
    }

    getListItems(tab: string) {
        return this.element.querySelectorAll(`[data-tab="${tab}"] li.list-item`);
    }
}

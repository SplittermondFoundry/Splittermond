import "../../foundryMocks.js";
import { expect } from "chai";
import { afterEach, beforeEach, describe, it } from "mocha";
import SplittermondActor from "../../../../module/actor/actor.js";
import { CharacterDataModel } from "module/actor/dataModel/CharacterDataModel";
import { CharacterAttribute } from "module/actor/dataModel/CharacterAttribute";
import { HealthDataModel } from "module/actor/dataModel/HealthDataModel";
import { FocusDataModel } from "module/actor/dataModel/FocusSchemaModel";
import { foundryApi } from "module/api/foundryApi";
import sinon from "sinon";

declare const global: any;

interface ResourceAttributes {
    constitution: number;
    mystic: number;
    willpower: number;
}

function attribute(initial: number) {
    return new CharacterAttribute({ initial, species: 0, advances: 0 });
}

function zeroedSkills() {
    const zeroed = { points: 0, value: 0 };
    return {
        melee: zeroed,
        slashing: zeroed,
        chains: zeroed,
        blades: zeroed,
        longrange: zeroed,
        staffs: zeroed,
        throwing: zeroed,
        acrobatics: zeroed,
        alchemy: zeroed,
        leadership: zeroed,
        arcanelore: zeroed,
        athletics: zeroed,
        performance: zeroed,
        diplomacy: zeroed,
        clscraft: zeroed,
        empathy: zeroed,
        determination: zeroed,
        dexterity: zeroed,
        history: zeroed,
        craftmanship: zeroed,
        heal: zeroed,
        stealth: zeroed,
        hunting: zeroed,
        countrylore: zeroed,
        nature: zeroed,
        eloquence: zeroed,
        locksntraps: zeroed,
        swim: zeroed,
        seafaring: zeroed,
        streetlore: zeroed,
        animals: zeroed,
        survival: zeroed,
        perception: zeroed,
        endurance: zeroed,
        antimagic: zeroed,
        controlmagic: zeroed,
        motionmagic: zeroed,
        insightmagic: zeroed,
        stonemagic: zeroed,
        firemagic: zeroed,
        healmagic: zeroed,
        illusionmagic: zeroed,
        combatmagic: zeroed,
        lightmagic: zeroed,
        naturemagic: zeroed,
        shadowmagic: zeroed,
        fatemagic: zeroed,
        protectionmagic: zeroed,
        enhancemagic: zeroed,
        deathmagic: zeroed,
        transformationmagic: { points: 0 },
        watermagic: { points: 0 },
        windmagic: { points: 0 },
    };
}

function createCharacterData({ constitution, mystic, willpower }: ResourceAttributes): CharacterDataModel {
    return new CharacterDataModel({
        splinterpoints: { value: 3, max: 3 },
        experience: { heroLevel: 1, free: 0, spent: 0, nextLevelValue: 100 },
        species: { value: "Human", size: 5 },
        sex: "Male",
        ancestry: "Commoner",
        culture: "Urban",
        education: "Scholar",
        biography: "<p>Test biography</p>",
        attributes: {
            charisma: attribute(2),
            agility: attribute(3),
            intuition: attribute(2),
            constitution: attribute(constitution),
            mystic: attribute(mystic),
            strength: attribute(4),
            mind: attribute(2),
            willpower: attribute(willpower),
        },
        skills: zeroedSkills(),
        health: new HealthDataModel({
            consumed: { value: 0 },
            exhausted: { value: 0 },
            channeled: { entries: [] },
        }),
        focus: new FocusDataModel({ consumed: { value: 0 }, exhausted: { value: 0 }, channeled: { entries: [] } }),
        currency: { S: 0, L: 0, T: 0 },
    });
}

describe("SplittermondActor health and focus preparation", () => {
    const sandbox = sinon.createSandbox();

    beforeEach(() => {
        global.Actor.prototype.prepareBaseData = () => {};
        global.Actor.prototype.prepareDerivedData = () => {};
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => key);
    });

    afterEach(() => {
        sandbox.restore();
        delete global.Actor.prototype.prepareDerivedData;
    });

    function prepareActor(attributes: ResourceAttributes): SplittermondActor {
        const actor = new SplittermondActor({});
        Object.defineProperty(actor, "type", { value: "character" });
        actor.system = createCharacterData(attributes);
        Object.defineProperty(actor, "items", { value: [], writable: true, configurable: true });
        actor.prepareBaseData();
        actor.prepareDerivedData();
        return actor;
    }

    it("should derive health.max as the total points across all wound malus levels", () => {
        const actor = prepareActor({ constitution: 2, mystic: 1, willpower: 3 });

        expect(actor.derivedValues.healthpoints.value.calculateSync()).to.equal(7);
        expect(actor.system.health.max).to.equal(35);
    });

    it("should zero percentages and max of a focus track without stat points", () => {
        const actor = prepareActor({ constitution: 2, mystic: 0, willpower: 0 });

        expect(actor.derivedValues.focuspoints.value.calculateSync()).to.equal(0);
        expect(actor.system.focus.available.percentage).to.equal(0);
        expect(actor.system.focus.total.percentage).to.equal(0);
        expect(actor.system.focus.exhausted).to.include({ value: 0, percentage: 0 });
        expect(actor.system.focus.channeled).to.include({ value: 0, percentage: 0 });
        expect(actor.system.focus.max).to.equal(0);
    });
});

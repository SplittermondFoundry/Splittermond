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

interface BonusGrantSeed {
    sourceId: string;
    value: number;
}

interface TrackSeed {
    consumedValue?: number;
    exhaustedValue?: number;
    channeledCosts?: number;
    bonusEntries?: BonusGrantSeed[];
}

interface PreparedActorSeed {
    healthGrants?: BonusGrantSeed[];
    focusGrants?: BonusGrantSeed[];
    health?: TrackSeed;
    focus?: TrackSeed;
}

function healthTrackFixture(seed: TrackSeed): HealthDataModel {
    return new HealthDataModel({
        consumed: { value: seed.consumedValue ?? 0 },
        exhausted: { value: seed.exhaustedValue ?? 0 },
        channeled: {
            entries:
                seed.channeledCosts !== undefined ? [{ description: "Testkanal", costs: seed.channeledCosts }] : [],
        },
        bonus: { entries: seed.bonusEntries?.map((entry) => ({ ...entry })) ?? [] },
    });
}

function focusTrackFixture(seed: TrackSeed): FocusDataModel {
    return new FocusDataModel({
        consumed: { value: seed.consumedValue ?? 0 },
        exhausted: { value: seed.exhaustedValue ?? 0 },
        channeled: {
            entries:
                seed.channeledCosts !== undefined ? [{ description: "Testkanal", costs: seed.channeledCosts }] : [],
        },
        bonus: { entries: seed.bonusEntries?.map((entry) => ({ ...entry })) ?? [] },
    });
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
        transformationmagic: zeroed,
        watermagic: zeroed,
        windmagic: zeroed,
    };
}

function createCharacterData(
    { constitution, mystic, willpower }: ResourceAttributes,
    healthSeed: TrackSeed = {},
    focusSeed: TrackSeed = {}
): CharacterDataModel {
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
        health: healthTrackFixture(healthSeed),
        focus: focusTrackFixture(focusSeed),
        currency: { S: 0, L: 0, T: 0 },
        preparedAction: { attack: null, spell: null },
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

interface ResourceBar {
    value: number;
    max: number;
}

describe("SplittermondActor health and focus bonus pool preparation", () => {
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

    function prepareSeededActor(attributes: ResourceAttributes, seed: PreparedActorSeed = {}): SplittermondActor {
        const actor = new SplittermondActor({});
        Object.defineProperty(actor, "type", { value: "character" });
        actor.system = createCharacterData(attributes, seed.health ?? {}, seed.focus ?? {});
        Object.defineProperty(actor, "items", { value: [], writable: true, configurable: true });
        actor.prepareBaseData();
        actor.bonusGrants = {
            healthpoints: seed.healthGrants ?? [],
            focuspoints: seed.focusGrants ?? [],
        };
        actor.prepareDerivedData();
        return actor;
    }

    function resourceBar(actor: SplittermondActor, bar: "healthBar" | "focusBar"): ResourceBar {
        return (actor.system as unknown as Record<typeof bar, ResourceBar>)[bar];
    }

    it("extends available and total by the remaining pool and divides the percentages by the capacity", () => {
        const actor = prepareSeededActor(
            { constitution: 2, mystic: 1, willpower: 3 },
            { healthGrants: [{ sourceId: "effect-1", value: 5 }], health: { consumedValue: 3 } }
        );
        const health = actor.system.health;

        expect(health.available.value).to.equal(37);
        expect(health.total.value).to.equal(37);
        expect(health.available.percentage).to.equal(92.5);
        expect(health.total.percentage).to.equal(92.5);
        expect(health.exhausted).to.include({ value: 0, percentage: 0 });
        expect(health.bonusPool).to.include({ granted: 5, remaining: 5, used: 0 });
        expect(health.max).to.equal(40);
        expect(resourceBar(actor, "healthBar")).to.deep.equal({ value: 37, max: 40 });
    });

    it("lays out the bar so available, uncovered channeled, exhausted and consumed fill the capacity", () => {
        const actor = prepareSeededActor(
            { constitution: 2, mystic: 1, willpower: 3 },
            {
                healthGrants: [{ sourceId: "effect-1", value: 5 }],
                health: { consumedValue: 3, exhaustedValue: 2, channeledCosts: 4 },
            }
        );
        const health = actor.system.health;

        expect(health.channeled).to.include({ value: 4, percentage: 0 });
        expect(health.exhausted).to.include({ value: 2, percentage: 5 });
        expect(health.available.value).to.equal(35);
        expect(health.available.percentage).to.equal(87.5);
        expect(health.total.value).to.equal(37);
        expect(health.total.percentage).to.equal(92.5);
        expect(health.bonusPool).to.deep.equal({
            granted: 5,
            remaining: 5,
            used: 0,
            startPercentage: 75,
            percentage: 12.5,
        });
    });

    it("clamps the bonus overlay to the available segment when pre-existing damage over-subscribes the track", () => {
        const actor = prepareSeededActor(
            { constitution: 2, mystic: 1, willpower: 3 },
            {
                healthGrants: [{ sourceId: "effect-1", value: 5 }],
                health: { consumedValue: 6, exhaustedValue: 30 },
            }
        );
        const health = actor.system.health;

        expect(health.available.value).to.equal(4);
        expect(health.available.percentage).to.equal(10);
        expect(health.total.value).to.equal(34);
        expect(health.bonusPool.startPercentage).to.equal(0);
        expect(health.bonusPool.percentage).to.equal(10);
    });

    it("lets a sufficient pool cover a channeled channel completely", () => {
        const actor = prepareSeededActor(
            { constitution: 2, mystic: 1, willpower: 3 },
            { healthGrants: [{ sourceId: "effect-1", value: 5 }], health: { channeledCosts: 4 } }
        );
        const health = actor.system.health;

        expect(health.available.value).to.equal(40);
        expect(health.channeled).to.include({ value: 4, percentage: 0 });
        expect(health.bonusPool).to.deep.equal({
            granted: 5,
            remaining: 5,
            used: 0,
            startPercentage: 87.5,
            percentage: 12.5,
        });
    });

    it("reduces available only by the uncovered remainder of a partially covered channel", () => {
        const actor = prepareSeededActor(
            { constitution: 2, mystic: 1, willpower: 3 },
            { healthGrants: [{ sourceId: "effect-1", value: 5 }], health: { channeledCosts: 8 } }
        );
        const health = actor.system.health;

        expect(health.available.value).to.equal(37);
        expect(health.channeled).to.include({ value: 8, percentage: 7.5 });
        expect(health.bonusPool.startPercentage).to.equal(80);
        expect(health.bonusPool.percentage).to.equal(12.5);
    });

    it("degenerates to the plain track when bonus entries outlive their grants", () => {
        const actor = prepareSeededActor(
            { constitution: 2, mystic: 1, willpower: 3 },
            { health: { consumedValue: 7, bonusEntries: [{ sourceId: "effect-gone", value: 5 }] } }
        );
        const health = actor.system.health;

        expect(health.available.value).to.equal(28);
        expect(health.available.percentage).to.equal(80);
        expect(health.total.value).to.equal(28);
        expect(health.max).to.equal(35);
        expect(health.bonusPool).to.include({ granted: 0, remaining: 0, used: 0, percentage: 0 });
    });

    it("rebases the bonus overlay geometry onto the remaining capacity as the pool is consumed", () => {
        const actor = prepareSeededActor(
            { constitution: 2, mystic: 1, willpower: 3 },
            {
                healthGrants: [{ sourceId: "effect-1", value: 5 }],
                health: { bonusEntries: [{ sourceId: "effect-1", value: 3 }] },
            }
        );
        const health = actor.system.health;

        expect(health.bonusPool).to.deep.equal({
            granted: 5,
            remaining: 3,
            used: 2,
            startPercentage: (100 * 35) / 38,
            percentage: (100 * 3) / 38,
        });
        expect(health.available.value).to.equal(38);
        expect(resourceBar(actor, "healthBar")).to.deep.equal({ value: 38, max: 38 });
    });

    it("delays the wound malus while the bonus pool absorbs damage", () => {
        const actor = prepareSeededActor(
            { constitution: 2, mystic: 1, willpower: 3 },
            { healthGrants: [{ sourceId: "effect-1", value: 5 }], health: { consumedValue: 15 } }
        );

        expect(actor.system.health.woundMalus).to.include({ level: 1, value: -1 });

        actor.prepareBaseData();
        actor.prepareDerivedData();

        expect(actor.system.health.woundMalus).to.include({ level: 2, value: -2 });
    });

    it("keeps the focus max display formula and appends remaining points while remaining is positive", () => {
        const granted = prepareSeededActor(
            { constitution: 2, mystic: 1, willpower: 3 },
            { focusGrants: [{ sourceId: "effect-1", value: 5 }] }
        );
        const ungranted = prepareSeededActor({ constitution: 2, mystic: 1, willpower: 3 }, {});

        expect(granted.system.focus.max).to.equal(`${granted.derivedValues.focuspoints.value.display} + 5`);
        expect(ungranted.system.focus.max).to.equal(ungranted.derivedValues.focuspoints.value.display);
    });

    it("extends the focus track and the token bar by the remaining pool", () => {
        const actor = prepareSeededActor(
            { constitution: 2, mystic: 1, willpower: 3 },
            {
                focusGrants: [{ sourceId: "effect-1", value: 5 }],
                focus: { exhaustedValue: 2, bonusEntries: [{ sourceId: "effect-1", value: 3 }] },
            }
        );
        const focuspoints = actor.derivedValues.focuspoints.value.calculateSync();
        const focus = actor.system.focus;

        expect(focus.available.value).to.equal(focuspoints + 1);
        expect(focus.total.value).to.equal(focuspoints + 3);
        expect(focus.available.percentage).to.equal((100 * (focuspoints + 1)) / (focuspoints + 3));
        expect(focus.total.percentage).to.equal(100);
        expect(focus.bonusPool).to.include({ granted: 5, remaining: 3, used: 2 });
        expect(resourceBar(actor, "focusBar")).to.deep.equal({ value: focuspoints + 1, max: focuspoints + 3 });
    });

    it("zeroes the focus track values and pool geometry without stat points even with a live grant", () => {
        const actor = prepareSeededActor(
            { constitution: 2, mystic: 0, willpower: 0 },
            { focusGrants: [{ sourceId: "effect-1", value: 5 }] }
        );
        const focus = actor.system.focus;

        expect(focus.available.value).to.equal(0);
        expect(focus.available.percentage).to.equal(0);
        expect(focus.total.value).to.equal(0);
        expect(focus.total.percentage).to.equal(0);
        expect(focus.exhausted).to.include({ value: 0, percentage: 0 });
        expect(focus.channeled).to.include({ value: 0, percentage: 0 });
        expect(focus.max).to.equal(0);
        expect(focus.bonusPool).to.include({
            granted: 5,
            remaining: 5,
            used: 0,
            startPercentage: 0,
            percentage: 0,
        });
        expect(resourceBar(actor, "focusBar")).to.deep.equal({ value: 0, max: 5 });
    });

    it("reduces health.max to the remaining capacity as the pool is consumed", () => {
        const freshGrant = prepareSeededActor(
            { constitution: 2, mystic: 1, willpower: 3 },
            { healthGrants: [{ sourceId: "effect-1", value: 5 }] }
        );
        const partiallyConsumed = prepareSeededActor(
            { constitution: 2, mystic: 1, willpower: 3 },
            {
                healthGrants: [{ sourceId: "effect-1", value: 5 }],
                health: { bonusEntries: [{ sourceId: "effect-1", value: 3 }] },
            }
        );
        const fullyDepleted = prepareSeededActor(
            { constitution: 2, mystic: 1, willpower: 3 },
            {
                healthGrants: [{ sourceId: "effect-1", value: 5 }],
                health: { bonusEntries: [{ sourceId: "effect-1", value: 0 }] },
            }
        );

        expect(freshGrant.system.health.max).to.equal(40);
        expect(partiallyConsumed.system.health.max).to.equal(38);
        expect(fullyDepleted.system.health.max).to.equal(35);
    });

    it("reduces focus.max to the remaining capacity as the pool is consumed", () => {
        const freshGrant = prepareSeededActor(
            { constitution: 2, mystic: 1, willpower: 3 },
            { focusGrants: [{ sourceId: "effect-1", value: 5 }] }
        );
        const partiallyConsumed = prepareSeededActor(
            { constitution: 2, mystic: 1, willpower: 3 },
            {
                focusGrants: [{ sourceId: "effect-1", value: 5 }],
                focus: { bonusEntries: [{ sourceId: "effect-1", value: 3 }] },
            }
        );
        const fullyDepleted = prepareSeededActor(
            { constitution: 2, mystic: 1, willpower: 3 },
            {
                focusGrants: [{ sourceId: "effect-1", value: 5 }],
                focus: { bonusEntries: [{ sourceId: "effect-1", value: 0 }] },
            }
        );

        expect(freshGrant.system.focus.max).to.equal(`${freshGrant.derivedValues.focuspoints.value.display} + 5`);
        expect(partiallyConsumed.system.focus.max).to.equal(
            `${partiallyConsumed.derivedValues.focuspoints.value.display} + 3`
        );
        expect(fullyDepleted.system.focus.max).to.equal(fullyDepleted.derivedValues.focuspoints.value.display);
    });
});

interface BonusPoolSchemaShape {
    bonus: {
        schema: {
            entries: {
                options: { required: boolean; nullable: boolean; initial: unknown };
                type: {
                    schema: {
                        sourceId: { options: { required: boolean; nullable: boolean } };
                        value: {
                            options: {
                                required: boolean;
                                nullable: boolean;
                                initial: number;
                                validate: (x: number) => boolean;
                            };
                        };
                    };
                };
            };
        };
    };
}

function bonusSchema(dataModel: { defineSchema(): unknown }) {
    return (dataModel.defineSchema() as unknown as BonusPoolSchemaShape).bonus;
}

describe("health and focus bonus pool schema", () => {
    it("initializes the bonus entries of health and focus as an empty array", () => {
        expect(bonusSchema(HealthDataModel).schema.entries.options).to.deep.equal({
            required: true,
            nullable: false,
            initial: [],
        });
        expect(bonusSchema(FocusDataModel).schema.entries.options).to.deep.equal({
            required: true,
            nullable: false,
            initial: [],
        });
    });

    it("requires a non-nullable sourceId on bonus entries", () => {
        expect(bonusSchema(HealthDataModel).schema.entries.type.schema.sourceId.options).to.deep.equal({
            required: true,
            nullable: false,
        });
        expect(bonusSchema(FocusDataModel).schema.entries.type.schema.sourceId.options).to.deep.equal({
            required: true,
            nullable: false,
        });
    });

    it("initializes bonus entry values at 0 and rejects negative ones", () => {
        for (const dataModel of [HealthDataModel, FocusDataModel]) {
            const valueOptions = bonusSchema(dataModel).schema.entries.type.schema.value.options;

            expect(valueOptions.required).to.be.true;
            expect(valueOptions.nullable).to.be.false;
            expect(valueOptions.initial).to.equal(0);
            expect(valueOptions.validate(-1)).to.be.false;
            expect(valueOptions.validate(0)).to.be.true;
            expect(valueOptions.validate(5)).to.be.true;
        }
    });
});

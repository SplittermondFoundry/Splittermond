import { expect } from "chai";
import { from14_2_6_migrateCombatEvent } from "../../../../../module/item/dataModel/migrations";
import { StatusEffectDataModel } from "../../../../../module/item/dataModel/StatusEffectDataModel";

describe("StatusEffect combatEvent migration (from 14.0.0)", () => {
    it("moves legacy timing fields into a combatEvent group", () => {
        const source = { startTick: 5, interval: 3, times: 2, modifier: "x", level: 1 };

        const result = from14_2_6_migrateCombatEvent({ ...source }) as Record<string, unknown>;

        expect(result).to.deep.equal({
            combatEvent: {
                startTick: 5,
                interval: 3,
                repeats: 2,
                macroRef: { name: null, uuid: null },
                postDescription: true,
            },
            modifier: "x",
            level: 1,
        });
    });

    it("is idempotent when run on already-migrated data", () => {
        const source = {
            combatEvent: {
                startTick: 5,
                interval: 3,
                repeats: 2,
                macroRef: { name: null, uuid: null },
                postDescription: true,
            },
            modifier: "x",
            level: 1,
        };

        const result = from14_2_6_migrateCombatEvent({ ...source }) as Record<string, unknown>;

        expect(result).to.deep.equal(source);
    });

    it("does not inject combatEvent for a partial delta omitting all timing fields", () => {
        const source = { modifier: "x" };

        const result = from14_2_6_migrateCombatEvent({ ...source }) as Record<string, unknown>;

        expect(result).to.deep.equal({ modifier: "x" });
        expect("combatEvent" in result).to.be.false;
    });

    it("does not inject combatEvent for a partial delta with a single timing field", () => {
        const source = { startTick: 5 };

        const result = from14_2_6_migrateCombatEvent({ ...source }) as Record<string, unknown>;

        expect(result).to.deep.equal({ startTick: 5 });
        expect("combatEvent" in result).to.be.false;
    });

    it("declares combatEvent schema defaults (postDescription true, macroRef nulls)", () => {
        const schema = StatusEffectDataModel.defineSchema() as unknown as {
            combatEvent: {
                schema: {
                    postDescription: { options: unknown };
                    macroRef: {
                        schema: {
                            name: { options: unknown };
                            uuid: { options: unknown };
                        };
                    };
                };
            };
        };
        const combatEvent = schema.combatEvent;

        expect(combatEvent.schema.postDescription.options).to.deep.equal({
            required: true,
            nullable: false,
            initial: true,
        });
        expect(combatEvent.schema.macroRef.schema.name.options).to.deep.equal({
            required: true,
            nullable: true,
            initial: null,
        });
        expect(combatEvent.schema.macroRef.schema.uuid.options).to.deep.equal({
            required: true,
            nullable: true,
            initial: null,
        });
    });
});

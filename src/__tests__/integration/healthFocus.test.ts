import { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { withActor } from "./fixtures";

export function healthFocusTest(context: QuenchBatchContext) {
    const { describe, it, expect } = context;

    describe("Health and focus track preparation", () => {
        it(
            "should derive health.max as the total points across all wound malus levels",
            withActor(async (actor) => {
                await actor.update({
                    system: {
                        species: { size: 5 },
                        attributes: { constitution: { initial: 2, advances: 0 } },
                    },
                });

                await actor.prepareData();

                const healthpointsPerLevel = await actor.derivedValues.healthpoints.value.calculate();
                expect(healthpointsPerLevel).to.equal(7);
                expect(actor.system.health.max).to.equal(35);
                expect(actor.system.health.max).to.equal(
                    healthpointsPerLevel * actor.system.health.woundMalus.nbrLevels
                );
            })
        );

        it(
            "should zero percentages and max of a focus track without stat points",
            withActor(async (actor) => {
                await actor.update({
                    system: {
                        attributes: {
                            mystic: { initial: 0, advances: 0 },
                            willpower: { initial: 0, advances: 0 },
                        },
                    },
                });

                await actor.prepareData();

                expect(await actor.derivedValues.focuspoints.value.calculate()).to.equal(0);
                expect(actor.system.focus.available.percentage).to.equal(0);
                expect(actor.system.focus.total.percentage).to.equal(0);
                expect(actor.system.focus.exhausted).to.include({ value: 0, percentage: 0 });
                expect(actor.system.focus.channeled).to.include({ value: 0, percentage: 0 });
                expect(actor.system.focus.channeled.entries).to.be.empty;
                expect(actor.system.focus.max).to.equal(0);
            })
        );
    });
}

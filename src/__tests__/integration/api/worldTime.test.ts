import { expect } from "chai";
import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { foundryApi } from "module/api/foundryApi";
import type { WorldTime } from "module/api/foundryTypes";
import { withWorldTimeClock } from "../fixtures";

declare const game: {
    time: WorldTime & { sync(): Promise<unknown> };
    settings: { get(namespace: "core", key: "time"): number };
};
declare const ui: { players: { element: HTMLElement } };

export function worldTimeApiTests(this: Mocha.Suite, { it }: QuenchBatchContext) {
    // Include the round trips needed to restore the native clock on slower connections.
    this.timeout(10000);

    it(
        "preserves signed half seconds after synchronizing with the server",
        withWorldTimeClock(async () => {
            for (const time of [123.5, -0.5]) {
                await foundryApi.time.set(time);
                await game.time.sync();

                expect(foundryApi.time.worldTime).to.equal(time);
            }
        })
    );

    for (const initial of [123.5, -0.5]) {
        it(
            `advances and rewinds from ${initial} seconds through repeated server synchronization`,
            withWorldTimeClock(async () => {
                await foundryApi.time.set(initial);
                await game.time.sync();
                let expected = initial;

                for (const delta of [0.5, -0.5, 60, -60, -0.5, 0.5]) {
                    expected += delta;
                    const result = await foundryApi.time.advance(delta);
                    // This also leaves the clock synchronized before the next relative change.
                    await game.time.sync();

                    expect(result).to.equal(expected);
                    expect(game.settings.get("core", "time")).to.equal(expected);
                    expect(foundryApi.time.worldTime).to.equal(expected);
                }
            })
        );
    }

    it(
        "reads native time changes without keeping a separate clock",
        withWorldTimeClock(async () => {
            const clock = foundryApi.time;
            for (const time of [123.5, -0.5]) {
                await game.time.set(time);
                await game.time.sync();

                expect(clock.worldTime).to.equal(time);
            }
        })
    );

    it(
        "exposes the exact absolute time during native hooks after server synchronization",
        withWorldTimeClock(async () => {
            const updates: { time: number; readTime: number }[] = [];
            const hook = foundryApi.hooks.on("updateWorldTime", (time: number) => {
                updates.push({ time, readTime: foundryApi.time.worldTime });
            });
            try {
                for (const delta of [0.5, -0.5]) {
                    await foundryApi.time.set(123.5);
                    await game.time.sync();
                    updates.length = 0;

                    await foundryApi.time.advance(delta);

                    const expected = 123.5 + delta;
                    expect(updates).to.deep.equal([{ time: expected, readTime: expected }]);
                }
            } finally {
                foundryApi.hooks.off("updateWorldTime", hook);
            }
        })
    );

    it(
        "sets and advances the native world time with signed half seconds and emits its hook",
        withWorldTimeClock(async () => {
            const updates: { time: number; delta: number }[] = [];
            const hook = foundryApi.hooks.on("updateWorldTime", (time: number, delta: number) => {
                updates.push({ time, delta });
            });
            try {
                await foundryApi.time.set(100);

                await foundryApi.time.advance(0.5);
                await foundryApi.time.advance(-1);

                expect(game.time.worldTime).to.equal(99.5);
                expect(foundryApi.time.worldTime).to.equal(game.time.worldTime);
                expect(updates).to.deep.include({ time: 100.5, delta: 0.5 });
                expect(updates).to.deep.include({ time: 99.5, delta: -1 });
            } finally {
                foundryApi.hooks.off("updateWorldTime", hook);
            }
        })
    );

    it("places a HUD inside the active player box without replacing its contents", async () => {
        const element = document.createElement("aside");
        const players = ui.players.element;
        const list = players.querySelector("#players-active .players-list");
        try {
            foundryApi.placeWorldTimeHud(element);

            expect(element.parentElement).to.equal(players.querySelector("#players-active"));
            expect(list?.isConnected, "the original active player list remains in the box").to.equal(true);
            expect(players.querySelector("#performance-stats")?.isConnected).to.equal(true);
            expect(players.isConnected).to.equal(true);
        } finally {
            element.remove();
        }
    });

    it("configures half-second rounds without per-combatant turn time", () => {
        expect(CONFIG.time.roundTime).to.equal(0.5);
        expect(CONFIG.time.turnTime).to.equal(0);
    });
}

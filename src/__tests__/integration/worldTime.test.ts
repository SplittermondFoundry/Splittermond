import { expect } from "chai";
import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { foundryApi } from "module/api/foundryApi";
import { setWorldTimeSetting, worldTimeSetting, worldTimeSettingKeys } from "module/worldTime/settings";
import { advanceWorldTime } from "module/worldTime/service";
import { formatWorldTime } from "module/worldTime/presentation";
import {
    withClockCombat,
    withWorldTime,
    worldTimeHud,
    worldTimeMenu,
    worldTimeQuickSteps,
    openWorldTimeMenu,
    closeWorldTimeMenu,
    readWorldTimeFields,
    writeWorldTimeFields,
    waitForWorldTimeUi,
    removeRenderedChatMessages,
    renderPlayerList,
    setWorldTimeStepsExpanded,
    synchronizeWorldTime,
} from "./worldTime.fixtures";
import { withActiveEffect, withActor } from "./fixtures";
import { passesEventually } from "../util";

function readTimeFields(): Record<string, number> {
    return Object.fromEntries(Object.entries(readWorldTimeFields()).map(([name, value]) => [name, Number(value)]));
}

export function worldTimeTests(this: Mocha.Suite, { it }: QuenchBatchContext) {
    // Serial document writes and fixture restoration also need time on slower connections.
    this.timeout(30000);

    it(
        "opens a compact single-row editor and preserves the draft while expanding and collapsing extra steps",
        withWorldTime(async () => {
            const menu = await openWorldTimeMenu({ reset: true });
            const details = menu.querySelector<HTMLDetailsElement>(".world-time-extra-steps")!;
            const step = details.querySelector<HTMLButtonElement>('[data-seconds="60"]')!;
            const baseline = foundryApi.time.worldTime;
            const inputs = Array.from(menu.querySelectorAll<HTMLInputElement>(".world-time-fields input"));
            expect(details.open).to.equal(false);
            expect(step.checkVisibility()).to.equal(false);
            expect(new Set(inputs.map((input) => Math.round(input.getBoundingClientRect().top))).size).to.equal(1);
            writeWorldTimeFields({ year: 7 });
            const draft = readWorldTimeFields();

            setWorldTimeStepsExpanded(true);
            expect(step.checkVisibility()).to.equal(true);
            setWorldTimeStepsExpanded(false);

            expect(step.checkVisibility()).to.equal(false);
            expect(readWorldTimeFields()).to.deep.equal(draft);
            expect(foundryApi.time.worldTime).to.equal(baseline);
            await closeWorldTimeMenu();
            const reopened = await openWorldTimeMenu();
            expect(reopened.querySelector<HTMLDetailsElement>(".world-time-extra-steps")!.open).to.equal(false);
        })
    );

    it(
        "uses the date arrow buttons across a year boundary and only persists the draft on submission",
        withWorldTime(async () => {
            await foundryApi.time.set(365 * 86400 - 0.5);
            const menu = await openWorldTimeMenu({ reset: true });
            const baseline = foundryApi.time.worldTime;
            const second = menu.querySelector<HTMLInputElement>('[name="second"]')!;
            const increase = second.parentElement!.querySelector<HTMLButtonElement>('button[data-seconds="0.5"]')!;
            const decrease = second.parentElement!.querySelector<HTMLButtonElement>('button[data-seconds="-0.5"]')!;

            increase.click();
            await passesEventually(() =>
                expect(readTimeFields()).to.deep.equal({ year: 1, day: 0, hour: 0, minute: 0, second: 0 })
            );
            decrease.click();
            await passesEventually(() =>
                expect(readTimeFields()).to.deep.equal({ year: 0, day: 364, hour: 23, minute: 59, second: 59.5 })
            );
            expect(foundryApi.time.worldTime).to.equal(baseline);
            increase.click();
            await passesEventually(() => expect(readTimeFields().year).to.equal(1));
            menu.querySelector<HTMLButtonElement>('[type="submit"]')!.click();

            await passesEventually(() => {
                expect(foundryApi.time.worldTime).to.equal(baseline + 0.5);
                expect(worldTimeMenu()).to.equal(null);
            }, 2000);
        })
    );

    it(
        "adjusts a focused minute with keyboard arrows and carries through midnight without changing the clock",
        withWorldTime(async () => {
            const menu = await openWorldTimeMenu({ reset: true });
            const baseline = foundryApi.time.worldTime;
            writeWorldTimeFields({ year: 0, day: 2, hour: 23, minute: 59, second: 0.5 });
            const minute = menu.querySelector<HTMLInputElement>('[name="minute"]')!;
            minute.focus();

            minute.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
            expect(readTimeFields()).to.deep.equal({ year: 0, day: 3, hour: 0, minute: 0, second: 0.5 });
            minute.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));

            expect(readTimeFields()).to.deep.equal({ year: 0, day: 2, hour: 23, minute: 59, second: 0.5 });
            expect(document.activeElement).to.equal(minute);
            expect(foundryApi.time.worldTime).to.equal(baseline);
        })
    );

    it(
        "changes the draft under the mouse wheel without scrolling or treating zoom gestures as time steps",
        withWorldTime(async () => {
            const menu = await openWorldTimeMenu({ reset: true });
            const baseline = foundryApi.time.worldTime;
            writeWorldTimeFields({ year: 0, day: 0, hour: 0, minute: 0, second: 0 });
            const second = menu.querySelector<HTMLInputElement>('[name="second"]')!;
            const down = new WheelEvent("wheel", { deltaY: 100, bubbles: true, cancelable: true });

            second.dispatchEvent(down);
            expect(down.defaultPrevented).to.equal(true);
            expect(readTimeFields()).to.deep.equal({ year: -1, day: 364, hour: 23, minute: 59, second: 59.5 });
            second.dispatchEvent(new WheelEvent("wheel", { deltaY: -100, bubbles: true, cancelable: true }));
            const zoom = new WheelEvent("wheel", { deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true });
            second.dispatchEvent(zoom);

            expect(readTimeFields()).to.deep.equal({ year: 0, day: 0, hour: 0, minute: 0, second: 0 });
            expect(foundryApi.time.worldTime).to.equal(baseline);
        })
    );

    it(
        "keeps the live HUD inside the player box when Foundry renders the player list again",
        withWorldTime(async () => {
            await renderPlayerList();

            await waitForWorldTimeUi();
            expect(worldTimeHud().parentElement).to.equal(document.querySelector("#players-active"));
        })
    );

    it(
        "does not advance time on combat start or reset",
        withClockCombat(async (combat) => {
            const baseline = foundryApi.time.worldTime;

            await combat.startCombat();
            await combat.resetAll();

            expect(foundryApi.time.worldTime).to.equal(baseline);
        })
    );

    it(
        "counts 120 ticks as a minute and rewinds a correction across server synchronization",
        withClockCombat(async (combat, _actor, id) => {
            await combat.startCombat();
            const baseline = foundryApi.time.worldTime;

            await combat.setInitiative(id, 129);
            await synchronizeWorldTime();
            expect(combat.currentTick).to.equal(129);
            expect(combat.round).to.equal(129);
            expect(foundryApi.time.worldTime - baseline).to.equal(59.5);
            await combat.setInitiative(id, 130);
            await synchronizeWorldTime();
            expect(combat.currentTick).to.equal(130);
            expect(combat.round).to.equal(130);
            expect(foundryApi.time.worldTime - baseline).to.equal(60);
            await combat.setInitiative(id, 10);
            await synchronizeWorldTime();

            expect(combat.currentTick).to.equal(10);
            expect(combat.round).to.equal(10);
            expect(Math.round(combat.combatants.get(id)!.initiative!)).to.equal(10);
            expect(foundryApi.time.worldTime).to.equal(baseline);
        })
    );

    it(
        "counts negative and zero ticks despite Foundry's clamped round",
        withClockCombat(async (combat, _actor, id) => {
            await combat.startCombat();
            const baseline = foundryApi.time.worldTime;

            await combat.setInitiative(id, 0);
            expect(combat.currentTick).to.equal(0);
            expect(combat.round, "Foundry keeps round 1 while the actual tick is zero").to.equal(1);
            expect(foundryApi.time.worldTime - baseline).to.equal(1);
            await combat.setInitiative(id, 1);
            expect(combat.currentTick).to.equal(1);
            expect(foundryApi.time.worldTime - baseline).to.equal(1.5);
            await combat.setInitiative(id, -2);

            expect(combat.currentTick).to.equal(-2);
            expect(combat.round, "negative ticks still use Foundry round 1").to.equal(1);
            expect(foundryApi.time.worldTime).to.equal(baseline);
        }, -2)
    );

    it(
        "waits for the shared combat tick instead of adding each actor's action",
        withClockCombat(async (combat, _actor, id) => {
            await withActor(async (secondActor) => {
                const [second] = await combat.createEmbeddedDocuments("Combatant", [
                    { actorId: secondActor.id, initiative: 10 },
                ]);
                await combat.startCombat();
                const baseline = foundryApi.time.worldTime;

                await combat.setInitiative(id, 20);
                expect(foundryApi.time.worldTime).to.equal(baseline);
                await combat.setInitiative(second.id, 20);

                expect(foundryApi.time.worldTime - baseline).to.equal(5);
            })();
        })
    );

    it(
        "counts overlapping tick updates once from the final combat position",
        withClockCombat(async (combat, _actor, id) => {
            await combat.startCombat();
            const baseline = foundryApi.time.worldTime;

            await Promise.all([combat.setInitiative(id, 12), combat.setInitiative(id, 14)]);

            expect(foundryApi.time.worldTime - baseline).to.equal(2);
        })
    );

    it(
        "preserves a HUD minute clicked while a two-tick combat update is being committed",
        withClockCombat(async (combat, _actor, id) => {
            await combat.startCombat();
            const baseline = foundryApi.time.worldTime;
            const hook = foundryApi.hooks.on("combatRound", (changed: { id: string }) => {
                if (changed.id === combat.id)
                    worldTimeHud().querySelector<HTMLButtonElement>('[data-seconds="60"]')!.click();
            });
            try {
                // Trigger the click at the persistence boundary instead of relying on incidental network timing.
                await combat.setInitiative(id, 12);
                await waitForWorldTimeUi();

                expect(combat.currentTick).to.equal(12);
                expect(foundryApi.time.worldTime - baseline, "one manual minute plus two half-second ticks").to.equal(
                    61
                );
            } finally {
                foundryApi.hooks.off("combatRound", hook);
            }
        })
    );

    it(
        "preserves interleaved manual and combat increments on one client",
        withClockCombat(async (combat, _actor, id) => {
            await combat.startCombat();
            const baseline = foundryApi.time.worldTime;
            const changes: Promise<unknown>[] = [];

            for (let index = 1; index <= 10; index++)
                changes.push(advanceWorldTime(1), combat.setInitiative(id, 10 + index * 2));
            await Promise.all(changes);

            expect(combat.currentTick).to.equal(30);
            expect(foundryApi.time.worldTime - baseline, "ten manual seconds plus twenty half-second ticks").to.equal(
                20
            );
        })
    );

    it(
        "does not treat rolling initiative in a running combat as elapsed time",
        withClockCombat(async (combat, actor, id) => {
            await combat.startCombat();
            const baseline = foundryApi.time.worldTime;
            const messages: string[] = [];
            const asynchronousErrors: unknown[] = [];
            const onRejection = (event: PromiseRejectionEvent) => asynchronousErrors.push(event.reason);
            window.addEventListener("unhandledrejection", onRejection);
            const hook = foundryApi.hooks.on(
                "createChatMessage",
                (message: { id: string; speaker: { actor: string } }) => {
                    if (message.speaker.actor === actor.id) messages.push(message.id);
                }
            );
            try {
                await combat.rollInitiative(id);

                expect(messages, "the initiative roll creates one test chat message").to.have.lengthOf(1);
                expect(foundryApi.time.worldTime).to.equal(baseline);
            } finally {
                foundryApi.hooks.off("createChatMessage", hook);
                try {
                    await removeRenderedChatMessages(messages);
                    expect(
                        asynchronousErrors,
                        "chat rendering and cleanup must not reject asynchronously"
                    ).to.deep.equal([]);
                } finally {
                    window.removeEventListener("unhandledrejection", onRejection);
                }
            }
        })
    );

    it(
        "does not interpret wait and ready positions as elapsed time",
        withClockCombat(async (combat, _actor, id) => {
            await combat.startCombat();
            const baseline = foundryApi.time.worldTime;

            await combat.setInitiative(id, 10000);
            await combat.setInitiative(id, 20000);
            await combat.setInitiative(id, 10);

            expect(foundryApi.time.worldTime).to.equal(baseline);
        })
    );

    for (const key of ["pauseWorldTime", "worldTimeFromTicks"] as const) {
        it(
            `resumes after ${key} without catching up skipped ticks`,
            withClockCombat(async (combat, _actor, id) => {
                await combat.startCombat();
                const baseline = foundryApi.time.worldTime;
                await setWorldTimeSetting(key, key === "pauseWorldTime");

                await combat.setInitiative(id, 30);
                expect(foundryApi.time.worldTime).to.equal(baseline);
                await setWorldTimeSetting(key, key !== "pauseWorldTime");
                await combat.setInitiative(id, 31);

                expect(foundryApi.time.worldTime - baseline).to.equal(0.5);
            })
        );
    }

    it(
        "hiding the clock does not stop combat time",
        withClockCombat(async (combat, _actor, id) => {
            await combat.startCombat();
            await setWorldTimeSetting("hideWorldTime", true);
            const baseline = foundryApi.time.worldTime;

            await combat.setInitiative(id, 12);

            expect(foundryApi.time.worldTime - baseline).to.equal(1);
        })
    );

    it(
        "advances through the HUD and expires a native effect from a whole-second start",
        withWorldTime(async () => {
            // Native effect start times are rounded; this smoke test needs a deterministic whole-second baseline.
            await foundryApi.time.set(100);
            await withActiveEffect(
                {
                    name: "World time expiry test",
                    type: "modifier",
                    flags: { splittermond: { durationMode: "timed" } },
                    duration: { value: 60, units: "seconds" },
                    system: { modifiers: [], costModifiers: [] },
                },
                async (effect) => {
                    const baseline = foundryApi.time.worldTime;
                    expect(effect.duration.expired, "the new effect has not expired before the HUD step").to.equal(
                        false
                    );

                    worldTimeHud().querySelector<HTMLButtonElement>('[data-seconds="60"]')!.click();

                    await passesEventually(() => {
                        expect(foundryApi.time.worldTime - baseline).to.equal(60);
                        expect(effect.duration.expired).to.equal(true);
                    });
                    await waitForWorldTimeUi();
                }
            )();
        })
    );

    it(
        "keeps the menu available when hidden and persists its recording controls",
        withWorldTime(async () => {
            await closeWorldTimeMenu();
            await setWorldTimeSetting("hideWorldTime", true);
            await waitForWorldTimeUi();
            expect(worldTimeHud().querySelectorAll("button").length).to.equal(1);
            const menu = await openWorldTimeMenu();

            menu.querySelector<HTMLInputElement>('[name="pauseWorldTime"]')!.click();

            await passesEventually(() => {
                expect(worldTimeSetting("pauseWorldTime")).to.equal(true);
                expect(menu.querySelector<HTMLButtonElement>('[data-seconds="60"]')!.disabled).to.equal(false);
            });
            await waitForWorldTimeUi();
        })
    );

    it(
        "hides and restores the live HUD quick steps through the recording checkbox",
        withWorldTime(async () => {
            const menu = await openWorldTimeMenu();
            const pauseCheckbox = () => menu.querySelector<HTMLInputElement>('[name="pauseWorldTime"]')!;
            const baseline = foundryApi.time.worldTime;
            expect(worldTimeQuickSteps().map((button) => Number(button.dataset.seconds))).to.deep.equal([
                60, 300, 1800, 21600,
            ]);

            pauseCheckbox().click();

            await passesEventually(() => {
                expect(worldTimeSetting("pauseWorldTime")).to.equal(true);
                expect(worldTimeQuickSteps().length, "paused quick steps are removed from the live HUD").to.equal(0);
                expect(worldTimeHud().querySelector(".world-time-label")?.checkVisibility()).to.equal(true);
                expect(worldTimeHud().querySelector<HTMLButtonElement>('[data-action="menu"]')?.disabled).to.equal(
                    false
                );
                expect(pauseCheckbox().disabled).to.equal(false);
            });
            expect(foundryApi.time.worldTime).to.equal(baseline);

            pauseCheckbox().click();

            await passesEventually(() => {
                expect(worldTimeSetting("pauseWorldTime")).to.equal(false);
                expect(worldTimeQuickSteps().map((button) => Number(button.dataset.seconds))).to.deep.equal([
                    60, 300, 1800, 21600,
                ]);
                expect(
                    worldTimeQuickSteps().every((button) => button.checkVisibility() && !button.disabled),
                    "all restored quick steps are visible and enabled"
                ).to.equal(true);
            });
            expect(foundryApi.time.worldTime).to.equal(baseline);
            worldTimeHud().querySelector<HTMLButtonElement>('[data-seconds="300"]')!.click();

            await passesEventually(() => {
                expect(foundryApi.time.worldTime).to.equal(baseline + 300);
                expect(worldTimeQuickSteps().every((button) => !button.disabled)).to.equal(true);
            });
        })
    );

    it(
        "sets a 365-day date while paused and keeps the input independent of clock updates",
        withWorldTime(async () => {
            await setWorldTimeSetting("pauseWorldTime", true);
            const menu = await openWorldTimeMenu();
            const draft = { year: 1, day: 4, hour: 14, minute: 50, second: 0 };
            const destination = 369 * 86400 + 14 * 3600 + 50 * 60;
            writeWorldTimeFields(draft);

            await foundryApi.time.advance(60);

            await passesEventually(() => {
                expect(readTimeFields()).to.deep.equal(draft);
                expect(menu.querySelector(".world-time-current")!.textContent).to.equal(
                    formatWorldTime(foundryApi.time.worldTime)
                );
                expect(menu.querySelector(".world-time-preview")!.textContent).to.equal(
                    foundryApi.format("splittermond.worldTime.changePreview", {
                        seconds: String(destination - foundryApi.time.worldTime),
                    })
                );
            });
            menu.querySelector<HTMLButtonElement>('[type="submit"]')!.click();

            await passesEventually(() => {
                expect(foundryApi.time.worldTime).to.equal(destination);
                expect(worldTimeMenu(), "setting the date closes the live menu").to.equal(null);
            }, 2000);
        })
    );

    it(
        "changes world time during combat without moving its combatants, then continues counting ticks",
        withClockCombat(async (combat, _actor, id) => {
            await combat.startCombat();
            const baseline = foundryApi.time.worldTime;
            const initiative = combat.combatants.get(id)!.initiative;

            await advanceWorldTime(60);
            expect(combat.currentTick).to.equal(10);
            expect(combat.round).to.equal(10);
            expect(combat.combatants.get(id)!.initiative).to.equal(initiative);
            await advanceWorldTime(-120);
            expect(foundryApi.time.worldTime).to.equal(baseline - 60);
            expect(combat.currentTick).to.equal(10);
            expect(combat.round).to.equal(10);
            expect(combat.combatants.get(id)!.initiative).to.equal(initiative);

            await combat.setInitiative(id, 12);

            expect(combat.currentTick).to.equal(12);
            expect(foundryApi.time.worldTime).to.equal(baseline - 59);
        })
    );

    it(
        "preserves rapid successive manual increments",
        withWorldTime(async () => {
            const baseline = foundryApi.time.worldTime;

            await Promise.all([advanceWorldTime(60), advanceWorldTime(300), advanceWorldTime(28800)]);

            expect(foundryApi.time.worldTime - baseline).to.equal(29160);
        })
    );

    it(
        "previews menu steps across a year boundary and only sets the clock on submission",
        withWorldTime(async () => {
            await foundryApi.time.set(365 * 86400 - 29.5);
            const menu = await openWorldTimeMenu({ reset: true });
            setWorldTimeStepsExpanded(true);
            const baseline = foundryApi.time.worldTime;

            menu.querySelector<HTMLButtonElement>('[data-seconds="60"]')!.click();

            await passesEventually(() => {
                expect(readTimeFields()).to.deep.equal({ year: 1, day: 0, hour: 0, minute: 0, second: 30.5 });
                expect(menu.querySelector(".world-time-preview")!.textContent).to.equal(
                    foundryApi.format("splittermond.worldTime.changePreview", { seconds: "60" })
                );
                expect(foundryApi.time.worldTime, "previewing does not advance the world clock").to.equal(baseline);
                expect(menu.querySelector<HTMLButtonElement>('[data-seconds="-60"]')!.disabled).to.equal(false);
            });
            menu.querySelector<HTMLButtonElement>('[data-seconds="-60"]')!.click();

            await passesEventually(() =>
                expect(readTimeFields()).to.deep.equal({ year: 0, day: 364, hour: 23, minute: 59, second: 30.5 })
            );
            expect(foundryApi.time.worldTime).to.equal(baseline);
            menu.querySelector<HTMLButtonElement>('[data-seconds="60"]')!.click();
            menu.querySelector<HTMLButtonElement>('[type="submit"]')!.click();

            await passesEventually(() => {
                expect(foundryApi.time.worldTime).to.equal(baseline + 60);
                expect(worldTimeMenu()).to.equal(null);
            }, 2000);
        })
    );

    it(
        "adjusts an entered date while paused and discards it when the menu is closed without submitting",
        withWorldTime(async () => {
            await setWorldTimeSetting("pauseWorldTime", true);
            const baseline = foundryApi.time.worldTime;
            const menu = await openWorldTimeMenu();
            setWorldTimeStepsExpanded(true);
            writeWorldTimeFields({ year: 1, day: 4, hour: 14, minute: 50, second: 0.5 });

            menu.querySelector<HTMLButtonElement>('[data-seconds="3600"]')!.click();
            menu.querySelector<HTMLButtonElement>('[data-seconds="-300"]')!.click();

            await passesEventually(() =>
                expect(readTimeFields()).to.deep.equal({ year: 1, day: 4, hour: 15, minute: 45, second: 0.5 })
            );
            expect(foundryApi.time.worldTime).to.equal(baseline);
            await closeWorldTimeMenu();
            const reopened = await openWorldTimeMenu();

            expect(foundryApi.time.worldTime).to.equal(baseline);
            expect(reopened.querySelector(".world-time-preview")!.textContent).to.equal(
                foundryApi.format("splittermond.worldTime.changePreview", { seconds: "0" })
            );
        })
    );

    it(
        "updates an open menu's date inputs after the six-hour HUD button",
        withWorldTime(async () => {
            await foundryApi.time.set(23 * 3600 + 15 * 60 + 0.5);
            const menu = await openWorldTimeMenu({ reset: true });
            writeWorldTimeFields({ year: 99 });

            worldTimeHud().querySelector<HTMLButtonElement>('[data-seconds="21600"]')!.click();

            await passesEventually(() => {
                expect(foundryApi.time.worldTime).to.equal(86400 + 5 * 3600 + 15 * 60 + 0.5);
                expect(readTimeFields()).to.deep.equal({ year: 0, day: 1, hour: 5, minute: 15, second: 0.5 });
                expect(menu.querySelector(".world-time-preview")!.textContent).to.equal(
                    foundryApi.format("splittermond.worldTime.changePreview", { seconds: "0" })
                );
            });
        })
    );

    it(
        "finishes queued changes before removing a failed test's combat and restoring its clock",
        withWorldTime(async () => {
            const baseline = foundryApi.time.worldTime;
            const combatIds = Array.from(foundryApi.combats.keys());
            const failure = new Error("Expected fixture failure with queued combat and clock changes");
            let changes: Promise<unknown> = Promise.resolve();

            const error = await withClockCombat(async (combat, _actor, id) => {
                await combat.startCombat();
                changes = Promise.all([advanceWorldTime(60), combat.setInitiative(id, 12)]).catch(
                    (error: unknown) => error
                );
                throw failure;
            })().catch((error: unknown) => error);

            expect(error).to.equal(failure);
            expect(await changes, "queued operations finish before their combat is deleted").to.be.an("array");
            expect(Array.from(foundryApi.combats.keys())).to.deep.equal(combatIds);
            expect(foundryApi.time.worldTime).to.equal(baseline);
        })
    );

    it(
        "restores the clock, settings and an unfinished open draft after a failed test",
        withWorldTime(async () => {
            await foundryApi.time.set(123.5);
            await synchronizeWorldTime();
            for (const key of worldTimeSettingKeys) await setWorldTimeSetting(key, key !== "worldTimeFromTicks");
            await openWorldTimeMenu();
            setWorldTimeStepsExpanded(true);
            const draft = { year: "7", day: "", hour: "14", minute: "50", second: "0.5" };
            writeWorldTimeFields(draft);
            const failure = new Error("Expected fixture failure after submitting the live menu");
            expect(foundryApi.time.worldTime, "the outer fixture's clock before nesting").to.equal(123.5);

            const error = await withWorldTime(async () => {
                const menu = await openWorldTimeMenu();
                writeWorldTimeFields({ year: 1, day: 4, hour: 14, minute: 50, second: 0 });
                menu.querySelector<HTMLButtonElement>('[type="submit"]')!.click();
                // Fail with the asynchronous clock change still in flight: cleanup must wait before restoring.
                throw failure;
            })().catch((error: unknown) => error);

            expect(error).to.equal(failure);
            expect(foundryApi.time.worldTime).to.equal(123.5);
            expect(worldTimeSettingKeys.map(worldTimeSetting)).to.deep.equal([true, true, false]);
            expect(worldTimeMenu(), "the originally open menu is reopened").not.to.equal(null);
            expect(readWorldTimeFields()).to.deep.equal(draft);
            expect(worldTimeMenu()!.querySelector<HTMLDetailsElement>(".world-time-extra-steps")!.open).to.equal(true);
            expect(worldTimeMenu()!.querySelector(".world-time-preview")!.textContent).to.equal("");
        })
    );

    it(
        "restores an originally closed menu and waits for a pending HUD step after a failed test",
        withWorldTime(async () => {
            await closeWorldTimeMenu();
            const baseline = foundryApi.time.worldTime;
            const failure = new Error("Expected fixture failure with a pending HUD step");

            const error = await withWorldTime(async () => {
                await openWorldTimeMenu();
                worldTimeHud().querySelector<HTMLButtonElement>('[data-seconds="300"]')!.click();
                throw failure;
            })().catch((error: unknown) => error);

            expect(error).to.equal(failure);
            expect(foundryApi.time.worldTime).to.equal(baseline);
            expect(worldTimeSettingKeys.map(worldTimeSetting)).to.deep.equal([false, false, true]);
            expect(worldTimeMenu()).to.equal(null);
            expect(worldTimeQuickSteps().every((button) => !button.disabled)).to.equal(true);
        })
    );
}

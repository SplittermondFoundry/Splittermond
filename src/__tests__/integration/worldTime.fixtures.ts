import { expect } from "chai";
import { foundryApi } from "module/api/foundryApi";
import { FoundryCombat } from "module/api/Combat";
import { ChatMessage } from "module/api/ChatMessage";
import SplittermondCombat from "module/combat/combat";
import type SplittermondActor from "module/actor/actor";
import { worldTimeSettingKeys, worldTimeSetting, setWorldTimeSetting } from "module/worldTime/settings";
import { formatWorldTime } from "module/worldTime/presentation";
import { queueWorldTimeChange } from "module/worldTime/service";
import { withActor } from "./fixtures";
import { passesEventually } from "../util";

declare const ui: { players: { render(options: { force: boolean }): Promise<unknown> } };
declare const game: { time: { sync(): Promise<unknown> } };

export async function synchronizeWorldTime(): Promise<void> {
    await game.time.sync();
}

export async function renderPlayerList(): Promise<void> {
    await ui.players.render({ force: true });
}

export async function removeRenderedChatMessages(ids: string[]): Promise<void> {
    try {
        // Foundry reveals notification cards asynchronously. Deleting a still-hidden card races that reveal.
        await passesEventually(() => {
            for (const id of ids) {
                const cards = Array.from(document.querySelectorAll<HTMLElement>(`[data-message-id="${id}"]`));
                expect(cards.length, "the initiative chat message is rendered").to.be.greaterThan(0);
                expect(
                    cards.every((card) => !card.hidden),
                    "all message cards have finished appearing"
                ).to.equal(true);
            }
        }, 2000);
    } finally {
        await ChatMessage.deleteDocuments(ids);
        await passesEventually(() => {
            for (const id of ids)
                expect(document.querySelector(`[data-message-id="${id}"]`), "test chat is removed").to.equal(null);
        });
    }
}

export function worldTimeHud(): HTMLElement {
    const hud = document.querySelector<HTMLElement>("#players-active #splittermond-world-time");
    expect(hud, "the initialized world-time HUD is inside the player box").not.to.equal(null);
    return hud!;
}

export function worldTimeMenu(): HTMLFormElement | null {
    return document.querySelector<HTMLFormElement>("#splittermond-world-time-menu");
}

export function worldTimeQuickSteps(): HTMLButtonElement[] {
    return Array.from(worldTimeHud().querySelectorAll<HTMLButtonElement>('[data-action="advance"]'));
}

export function readWorldTimeFields(): Record<string, string> {
    return Object.fromEntries(
        Array.from(worldTimeMenu()!.querySelectorAll<HTMLInputElement>(".world-time-fields input"), (input) => [
            input.name,
            input.value,
        ])
    );
}

export function writeWorldTimeFields(values: Record<string, string | number>): void {
    for (const [name, value] of Object.entries(values)) {
        const input = worldTimeMenu()!.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
        input.value = String(value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
    }
}

export async function waitForWorldTimeUi(): Promise<void> {
    // Observe the real hooks and controls, without forcing a render that could hide a lifecycle regression.
    await passesEventually(() => {
        expect(document.querySelectorAll(".world-time-hud").length).to.equal(1);
        expect(document.querySelectorAll(".world-time-menu").length).to.be.at.most(1);
        const hidden = worldTimeSetting("hideWorldTime");
        const paused = worldTimeSetting("pauseWorldTime");
        const label = worldTimeHud().querySelector(".world-time-label");
        expect(label?.textContent ?? null).to.equal(hidden ? null : formatWorldTime(foundryApi.time.worldTime));
        expect(worldTimeQuickSteps().map((button) => Number(button.dataset.seconds))).to.deep.equal(
            hidden || paused ? [] : [60, 300, 1800, 21600]
        );
        expect(worldTimeQuickSteps().every((button) => !button.disabled)).to.equal(true);
        const menu = worldTimeMenu();
        if (menu) {
            expect(menu.querySelector(".world-time-current")?.textContent).to.equal(
                formatWorldTime(foundryApi.time.worldTime)
            );
            expect(menu.querySelectorAll("button:disabled").length).to.equal(0);
            for (const key of worldTimeSettingKeys) {
                const input = menu.querySelector<HTMLInputElement>(`[name="${key}"]`)!;
                expect(input.checked).to.equal(worldTimeSetting(key));
                expect(input.disabled).to.equal(false);
            }
        }
    }, 2000);
}

export async function openWorldTimeMenu({ reset = false } = {}): Promise<HTMLFormElement> {
    if (reset) await closeWorldTimeMenu();
    await waitForWorldTimeUi();
    if (!worldTimeMenu()) worldTimeHud().querySelector<HTMLButtonElement>('[data-action="menu"]')!.click();
    await passesEventually(() => expect(worldTimeMenu()).not.to.equal(null), 2000);
    await waitForWorldTimeUi();
    return worldTimeMenu()!;
}

export async function closeWorldTimeMenu(): Promise<void> {
    await waitForWorldTimeUi();
    worldTimeMenu()?.querySelector<HTMLButtonElement>('[data-action="close"]')!.click();
    await passesEventually(() => expect(worldTimeMenu()).to.equal(null), 2000);
}

export function setWorldTimeStepsExpanded(expanded: boolean): void {
    const details = worldTimeMenu()!.querySelector<HTMLDetailsElement>(".world-time-extra-steps")!;
    if (details.open !== expanded) details.querySelector("summary")!.click();
}

export function withWorldTime(test: () => Promise<void>) {
    return async () => {
        await waitForWorldTimeUi();
        const originalTime = foundryApi.time.worldTime;
        const originalSettings = worldTimeSettingKeys.map((key) => ({ key, value: worldTimeSetting(key) }));
        // Preserve raw input, including an empty or invalid draft that must never be submitted by cleanup.
        const originalDraft = worldTimeMenu() ? readWorldTimeFields() : null;
        const originalStepsExpanded =
            worldTimeMenu()?.querySelector<HTMLDetailsElement>(".world-time-extra-steps")?.open ?? false;
        const errors: unknown[] = [];
        try {
            for (const key of worldTimeSettingKeys) await setWorldTimeSetting(key, key === "worldTimeFromTicks");
            await waitForWorldTimeUi();
            await test();
        } catch (error) {
            errors.push(error);
        } finally {
            const restore = [
                waitForWorldTimeUi,
                () => queueWorldTimeChange(() => foundryApi.time.set(originalTime)),
                ...originalSettings.map(
                    ({ key, value }) =>
                        () =>
                            setWorldTimeSetting(key, value)
                ),
                waitForWorldTimeUi,
                async () => {
                    if (originalDraft) {
                        await openWorldTimeMenu();
                        writeWorldTimeFields(originalDraft);
                        setWorldTimeStepsExpanded(originalStepsExpanded);
                        expect(readWorldTimeFields()).to.deep.equal(originalDraft);
                    } else await closeWorldTimeMenu();
                },
            ];
            // A failed assertion or cleanup step must not prevent the remaining state from being restored.
            for (const operation of restore) {
                try {
                    await operation();
                } catch (error) {
                    errors.push(error);
                }
            }
        }
        if (errors.length === 1) throw errors[0];
        if (errors.length > 1)
            throw new Error(
                `World-time test or state restoration failed:\n${errors
                    .map((error) => (error instanceof Error ? error.stack : String(error)))
                    .join("\n\n")}`
            );
    };
}

export function withClockCombat(
    test: (combat: SplittermondCombat, actor: SplittermondActor, id: string) => Promise<void>,
    initialTick = 10
) {
    return withWorldTime(
        withActor(async (actor) => {
            const document = await FoundryCombat.create({ active: false });
            try {
                if (!(document instanceof SplittermondCombat))
                    throw new Error("Expected the registered Splittermond combat class");
                const [combatant] = await document.createEmbeddedDocuments("Combatant", [
                    { actorId: actor.id, initiative: initialTick },
                ]);
                await test(document, actor, combatant.id);
            } finally {
                await queueWorldTimeChange(() => FoundryCombat.deleteDocuments([document.id]));
            }
        })
    );
}

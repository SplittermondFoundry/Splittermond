import { foundryApi } from "module/api/foundryApi";
import {
    SplittermondApplication,
    TEMPLATE_BASE_PATH,
    type ApplicationContextOptions,
} from "module/data/SplittermondApplication";
import { quickTimeSteps, splitWorldTime } from "./time";
import { formatWorldTime, timeStepContext } from "./presentation";
import { worldTimeSetting } from "./settings";
import { advanceWorldTime } from "./service";
import { WorldTimeMenu } from "./WorldTimeMenu";
import type { WorldTimeHudContext } from "./templateInterface";

export class WorldTimeHud extends SplittermondApplication {
    readonly menu = new WorldTimeMenu();
    private busy = false;
    private refreshPending = false;
    private refreshPromise: Promise<void> | null = null;

    static DEFAULT_OPTIONS = {
        id: "splittermond-world-time",
        classes: ["splittermond", "world-time-hud"],
        window: { frame: false, positioned: false },
        actions: { menu: WorldTimeHud.openMenu, advance: WorldTimeHud.advance },
    };
    static PARTS = { hud: { template: `${TEMPLATE_BASE_PATH}/apps/world-time-hud.hbs` } };

    override async _prepareContext(options: ApplicationContextOptions): Promise<WorldTimeHudContext> {
        return {
            ...(await super._prepareContext(options)),
            isGM: foundryApi.currentUser.isGM,
            hidden: worldTimeSetting("hideWorldTime"),
            paused: worldTimeSetting("pauseWorldTime"),
            busy: this.busy,
            label: formatWorldTime(foundryApi.time.worldTime),
            secondsLabel: foundryApi.format("splittermond.worldTime.seconds", {
                value: String(splitWorldTime(foundryApi.time.worldTime).second),
            }),
            steps: quickTimeSteps.map(timeStepContext),
        };
    }

    override async _onRender(): Promise<void> {
        foundryApi.placeWorldTimeHud(this.element);
        this.element.hidden = worldTimeSetting("hideWorldTime") && !foundryApi.currentUser.isGM;
    }

    refresh(): Promise<void> {
        this.refreshPending = true;
        if (!this.refreshPromise) {
            this.refreshPromise = this.renderPending().finally(() => {
                this.refreshPromise = null;
            });
        }
        this.menu.refreshTime();
        return this.refreshPromise;
    }

    private async renderPending(): Promise<void> {
        while (this.refreshPending) {
            this.refreshPending = false;
            await this.render({ force: true });
        }
    }

    private static async openMenu(this: WorldTimeHud): Promise<void> {
        if (foundryApi.currentUser.isGM) await this.menu.render({ force: true });
    }

    private static async advance(this: WorldTimeHud, _event: Event, target: HTMLElement): Promise<void> {
        if (this.busy) return;
        this.busy = true;
        this.element.querySelectorAll<HTMLButtonElement>('[data-action="advance"]').forEach((button) => {
            button.disabled = true;
        });
        try {
            await advanceWorldTime(Number(target.dataset.seconds));
            this.menu.refreshTime({ updateFields: true });
        } catch (error) {
            console.error("Splittermond | World time change failed", error);
            foundryApi.warnUser("splittermond.worldTime.changeFailed");
        } finally {
            this.busy = false;
            await this.refresh();
        }
    }
}

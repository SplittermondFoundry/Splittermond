import { foundryApi } from "module/api/foundryApi";
import type { ApplicationFormConfiguration } from "module/api/Application";
import {
    SplittermondApplication,
    TEMPLATE_BASE_PATH,
    type ApplicationContextOptions,
} from "module/data/SplittermondApplication";
import { setWorldTime } from "./service";
import { setWorldTimeSetting, worldTimeSetting, worldTimeSettingKeys } from "./settings";
import { joinWorldTime, splitWorldTime, timeSteps, validWorldTime } from "./time";
import { formatWorldTime, timeFieldContexts, timeStepContext } from "./presentation";
import type { WorldTimeMenuContext } from "./templateInterface";

export class WorldTimeMenu extends SplittermondApplication {
    private busy = false;

    static DEFAULT_OPTIONS = {
        id: "splittermond-world-time-menu",
        tag: "form",
        classes: ["splittermond", "world-time-menu"],
        window: { title: "splittermond.worldTime.title", resizable: false },
        position: { width: 440, height: "auto" },
        form: { closeOnSubmit: false, handler: () => undefined },
        actions: {
            adjustTime: WorldTimeMenu.adjustTime,
        },
    };

    static PARTS = { body: { template: `${TEMPLATE_BASE_PATH}/apps/world-time-menu.hbs` } };

    override async _prepareContext(options: ApplicationContextOptions): Promise<WorldTimeMenuContext> {
        if (!foundryApi.currentUser.isGM) throw new Error("Only a GM may configure world time");
        return {
            ...(await super._prepareContext(options)),
            label: formatWorldTime(foundryApi.time.worldTime),
            fields: timeFieldContexts(foundryApi.time.worldTime),
            steps: timeSteps.map(timeStepContext),
            settings: worldTimeSettingKeys.map((key) => ({
                key,
                label: `splittermond.settings.${key}.name`,
                hint: `splittermond.settings.${key}.hint`,
                checked: worldTimeSetting(key),
            })),
        };
    }

    override async _onRender(): Promise<void> {
        for (const key of worldTimeSettingKeys) {
            this.element.querySelector<HTMLInputElement>(`[name="${key}"]`)?.addEventListener("change", (event) => {
                const input = event.currentTarget;
                if (!(input instanceof HTMLInputElement)) return;
                const checked = input.checked;
                void this.perform(() => setWorldTimeSetting(key, checked));
            });
        }
        this.element.querySelectorAll<HTMLInputElement>(".world-time-fields input").forEach((input) => {
            input.addEventListener("input", () => this.refreshTime());
            input.addEventListener("keydown", (event) => {
                if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                event.preventDefault();
                event.stopPropagation();
                this.adjustDraft(Number(input.dataset.seconds) * (event.key === "ArrowUp" ? 1 : -1));
            });
            input.addEventListener(
                "wheel",
                (event) => {
                    if (event.deltaY === 0 || event.ctrlKey || event.metaKey) return;
                    event.preventDefault();
                    event.stopPropagation();
                    this.adjustDraft(Number(input.dataset.seconds) * (event.deltaY < 0 ? 1 : -1));
                },
                { passive: false }
            );
        });
        this.refreshTime();
    }

    refreshTime({ updateFields = false }: { updateFields?: boolean } = {}): void {
        if (!this.rendered) return;
        if (updateFields) this.writeTime(foundryApi.time.worldTime);
        const label = this.element.querySelector(".world-time-current");
        if (label) label.textContent = formatWorldTime(foundryApi.time.worldTime);
        const preview = this.element.querySelector(".world-time-preview");
        const destination = this.readTime();
        if (preview)
            preview.textContent =
                destination === null
                    ? ""
                    : foundryApi.format("splittermond.worldTime.changePreview", {
                          seconds: String(destination - foundryApi.time.worldTime),
                      });
        for (const key of worldTimeSettingKeys) {
            const input = this.element.querySelector<HTMLInputElement>(`[name="${key}"]`);
            if (input) {
                input.checked = worldTimeSetting(key);
                input.disabled = this.busy;
            }
        }
        this.element.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
            button.disabled = this.busy;
        });
    }

    private writeTime(time: number): void {
        for (const [name, value] of Object.entries(splitWorldTime(time))) {
            const input = this.element.querySelector<HTMLInputElement>(`[name="${name}"]`);
            if (input) input.value = String(value);
        }
    }

    private readTime(): number | null {
        const value = (name: string) =>
            this.element.querySelector<HTMLInputElement>(`[name="${name}"]`)?.valueAsNumber ?? NaN;
        return joinWorldTime({
            year: value("year"),
            day: value("day"),
            hour: value("hour"),
            minute: value("minute"),
            second: value("second"),
        });
    }

    override async _onSubmitForm(_config: ApplicationFormConfiguration, event: Event | SubmitEvent): Promise<void> {
        event.preventDefault();
        const time = this.readTime();
        if (time === null) {
            foundryApi.warnUser("splittermond.worldTime.invalidTime");
            return;
        }
        await this.perform(async () => {
            await setWorldTime(time);
            await this.close();
        });
    }

    private static adjustTime(this: WorldTimeMenu, _event: Event, target: HTMLElement): void {
        this.adjustDraft(Number(target.dataset.seconds));
    }

    private adjustDraft(seconds: number): void {
        if (this.busy) return;
        const time = this.readTime();
        const adjusted = time === null ? null : time + seconds;
        if (adjusted === null || !validWorldTime(adjusted)) {
            foundryApi.warnUser("splittermond.worldTime.invalidTime");
            return;
        }
        this.writeTime(adjusted);
        this.refreshTime();
    }

    private async perform(operation: () => Promise<unknown>): Promise<void> {
        if (this.busy) return;
        this.busy = true;
        this.refreshTime();
        try {
            await operation();
        } catch (error) {
            console.error("Splittermond | World time change failed", error);
            foundryApi.warnUser("splittermond.worldTime.changeFailed");
        } finally {
            this.busy = false;
            this.refreshTime();
        }
    }
}

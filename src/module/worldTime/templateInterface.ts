import type { WorldTimeSetting } from "./settings";
import type { timeFieldContexts, timeStepContext } from "./presentation";
import type { ApplicationRenderContext } from "module/data/SplittermondApplication";

export interface WorldTimeHudContext extends ApplicationRenderContext {
    isGM: boolean;
    hidden: boolean;
    paused: boolean;
    busy: boolean;
    label: string;
    secondsLabel: string;
    steps: ReturnType<typeof timeStepContext>[];
}

export interface WorldTimeMenuContext extends ApplicationRenderContext {
    label: string;
    fields: ReturnType<typeof timeFieldContexts>;
    steps: ReturnType<typeof timeStepContext>[];
    settings: { key: WorldTimeSetting; label: string; hint: string; checked: boolean }[];
}

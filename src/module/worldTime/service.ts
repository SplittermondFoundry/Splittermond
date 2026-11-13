import { foundryApi } from "module/api/foundryApi";
import { worldTimeSetting } from "./settings";
import { validWorldTime } from "./time";

let pending: Promise<unknown> = Promise.resolve();

export function queueWorldTimeChange<T>(operation: () => Promise<T>): Promise<T> {
    // Manual clock writes and combat updates must not persist competing snapshots of the same world time.
    const change = pending.catch(() => undefined).then(operation);
    pending = change;
    return change;
}

function changeWorldTime(operation: () => Promise<number>): Promise<number> {
    return queueWorldTimeChange(() => {
        if (!foundryApi.currentUser.isGM) throw new Error("Only a GM may change world time");
        return operation();
    });
}

export function advanceWorldTime(seconds: number): Promise<number> {
    return changeWorldTime(() => {
        if (worldTimeSetting("pauseWorldTime")) throw new Error("World time recording is paused");
        if (!validWorldTime(seconds) || !validWorldTime(foundryApi.time.worldTime + seconds)) {
            throw new RangeError("Invalid world time");
        }
        return foundryApi.time.advance(seconds);
    });
}

export function setWorldTime(seconds: number): Promise<number> {
    return changeWorldTime(() => {
        if (!validWorldTime(seconds)) throw new RangeError("Invalid world time");
        return foundryApi.time.set(seconds);
    });
}

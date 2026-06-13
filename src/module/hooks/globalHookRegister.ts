type Subscriber = (...args: any[]) => { unsubscribe: () => void; id: number };
type Registry = Record<string, Subscriber>;

let preInitQueue: Registry = {};
let globalRegistry: Registry | null = null;

export function setGlobalHookRegister(ref: Registry | null) {
    if (!ref) {
        globalRegistry = ref;
        preInitQueue = {};
        return;
    }
    globalRegistry = ref;
    for (const key in preInitQueue) {
        const successful = addToRegistry(key, preInitQueue[key]);
        if (!successful) {
            console.error(`Splittermond | Failed to set hook ${key}, hook already exists`);
        }
    }
    preInitQueue = {};
}

export function addToRegistry(name: string, subscriber: Subscriber): boolean {
    const target = globalRegistry ?? preInitQueue;
    const isNew = !Object.prototype.hasOwnProperty.call(target, name);
    if (isNew) {
        target[name] = subscriber;
    }
    return isNew;
}

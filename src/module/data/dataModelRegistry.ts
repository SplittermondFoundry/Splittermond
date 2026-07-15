export type Constructor<T = unknown> = new (...args: any[]) => T;

const dataModelRegistry = new Map<string, Constructor>();
const reverseRegistry = new WeakMap<Constructor, string>();

export function addToRegistry(key: string, ctor: Constructor): void {
    dataModelRegistry.set(key, ctor);
    reverseRegistry.set(ctor, key);
}

export function getFromRegistry(key: string): Constructor | undefined {
    return dataModelRegistry.get(key);
}

export function getKeyByConstructor(ctor: Constructor): string | undefined {
    return reverseRegistry.get(ctor);
}

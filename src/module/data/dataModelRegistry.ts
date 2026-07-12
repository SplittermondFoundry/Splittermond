const dataModelRegistry = new Map();

export function addToRegistry(key: string, constructor: new (...args: any[]) => any) {
    dataModelRegistry.set(key, constructor);
}

export function getFromRegistry(key: string): new (...args: any[]) => any {
    return dataModelRegistry.get(key);
}

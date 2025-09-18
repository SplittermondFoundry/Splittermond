const chatMessageRegistry = new Map();

export function addToRegistry(key: string, constructor: new (...args: any[]) => any) {
    chatMessageRegistry.set(key, constructor);
}

export function getFromRegistry(key: string): new (...args: any[]) => any {
    return chatMessageRegistry.get(key);
}

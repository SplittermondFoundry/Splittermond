export function simplePropertyResolver(a: object, property: string) {
    let member: any = a;
    property.split(".").forEach((prop) => (member = prop in member ? member[prop] : undefined));
    return member;
}

export function passesEventually(expectation: () => void, timeout = 500, interval = 50): Promise<void> {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        let lastError: any;
        function attempt() {
            try {
                expectation();
                resolve();
            } catch (err) {
                lastError = err;
                if (Date.now() - start > timeout) {
                    return reject(lastError);
                }
                setTimeout(attempt, interval);
            }
        }
        attempt();
    });
}

export function promiseIdentity<T>(input: T): Promise<T> {
    return Promise.resolve(input);
}

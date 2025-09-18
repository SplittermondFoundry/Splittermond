export function injectParent<T>(obj: T) {
    for (const key in obj) {
        if (key === "parent") continue;
        const value = obj[key];

        if (!(value instanceof Object)) {
            continue;
        }

        if (Array.isArray(value)) {
            value.forEach((element) => {
                if (element instanceof Object) {
                    element.parent = obj;
                    injectParent(element);
                }
            });
        } else {
            Object.defineProperty(value, "parent", { value: obj, writable: true, enumerable: true });
            injectParent(value);
        }
    }
}

/**
 * Utility function that polls a condition until it's met or times out
 * @param conditionFn Function that returns true when the expected condition is met
 * @param timeoutMs Maximum time to wait in milliseconds (default: 1000)
 * @param intervalMs How often to check the condition in milliseconds (default: 10)
 * @returns Promise that resolves when condition is met, rejects on timeout
 */
export async function expectEventually(
    conditionFn: () => boolean,
    timeoutMs: number = 1000,
    intervalMs: number = 10
): Promise<void> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
        const checkCondition = () => {
            if (conditionFn()) {
                resolve();
                return;
            }

            if (Date.now() - startTime > timeoutMs) {
                reject(new Error(`Condition not met within ${timeoutMs}ms`));
                return;
            }

            setTimeout(checkCondition, intervalMs);
        };

        checkCondition();
    });
}

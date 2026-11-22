import type { FoundryApplication } from "module/api/Application";

export async function closeSheets(...sheets: Pick<InstanceType<typeof FoundryApplication>, "close">[]): Promise<void> {
    // Closing animations are unrelated to the tested action and can exhaust its timeout.
    const results = await Promise.allSettled(sheets.map((sheet) => sheet.close({ animate: false })));
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length)
        throw new AggregateError(
            failures.map((result) => result.reason),
            "Test sheet cleanup failed"
        );
}

export function closeSheetsAfterTest(
    ...sheets: Pick<InstanceType<typeof FoundryApplication>, "close">[]
): AsyncDisposable {
    return { [Symbol.asyncDispose]: () => closeSheets(...sheets) };
}

export async function cleanupInOrder(...steps: (() => Promise<unknown>)[]): Promise<void> {
    const errors: unknown[] = [];
    for (const step of steps) {
        try {
            await step();
        } catch (error) {
            errors.push(error);
        }
    }
    if (errors.length) throw new AggregateError(errors, "Test document cleanup failed");
}

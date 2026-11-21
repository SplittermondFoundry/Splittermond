import { passesEventually } from "../util";

/** Layout assertions require animation frames, which browsers suspend in hidden windows. */
export class VisibleLayout implements Disposable {
    private readonly window: Window;
    private readonly timeout: number;
    private hiddenSince: number | undefined;
    private hiddenDuration = 0;
    private visibilityChanges = 0;
    private frame: { id: number; reject: (error: Error) => void } | undefined;

    constructor(
        private readonly runnable: Pick<Mocha.Runnable, "timeout">,
        private readonly document: Document
    ) {
        if (!document.defaultView) throw new Error("Layout tests require a browser window");
        this.window = document.defaultView;
        this.timeout = runnable.timeout();
        document.addEventListener("visibilitychange", this.onVisibilityChange);
        this.onVisibilityChange();
    }

    private readonly onVisibilityChange = () => {
        this.visibilityChanges++;
        if (this.document.hidden) {
            this.hiddenSince ??= Date.now();
            this.runnable.timeout(0);
        } else {
            if (this.hiddenSince !== undefined) {
                this.hiddenDuration += Date.now() - this.hiddenSince;
                this.hiddenSince = undefined;
            }
            // Mocha also compares the total wall-clock duration when the test finishes.
            this.runnable.timeout(this.timeout + this.hiddenDuration);
        }
    };

    async expect(expectation: () => void, timeout = 500): Promise<void> {
        for (;;) {
            await this.nextVisibleFrame();
            const visibilityChanges = this.visibilityChanges;
            try {
                await passesEventually(() => {
                    if (this.visibilityChanges === visibilityChanges && !this.document.hidden) expectation();
                }, timeout);
            } catch (error) {
                if (this.visibilityChanges === visibilityChanges) throw error;
            }
            // A focus change during polling restarts the assertion after visibility returns.
            // It must never turn an assertion that did not run into a successful test.
            if (this.visibilityChanges === visibilityChanges && !this.document.hidden) return;
        }
    }

    nextVisibleFrame(): Promise<void> {
        return new Promise((resolve, reject) => {
            const schedule = () => {
                this.frame = {
                    id: this.window.requestAnimationFrame(() => {
                        this.frame = undefined;
                        if (this.document.hidden) schedule();
                        else resolve();
                    }),
                    reject,
                };
            };
            schedule();
        });
    }

    [Symbol.dispose]() {
        this.document.removeEventListener("visibilitychange", this.onVisibilityChange);
        if (this.hiddenSince !== undefined) this.hiddenDuration += Date.now() - this.hiddenSince;
        this.runnable.timeout(this.timeout + this.hiddenDuration);
        if (this.frame) {
            this.window.cancelAnimationFrame(this.frame.id);
            this.frame.reject(new Error("Layout test ended before a visible animation frame"));
            this.frame = undefined;
        }
    }
}

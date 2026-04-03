import { QuenchBatchContext } from "@ethaks/fvtt-quench";

export function cssVariablesTest(context: QuenchBatchContext) {
    const { describe, it, expect } = context;

    describe("CSS Variables", () => {
        it("has the --font-awesome CSS variable defined", () => {
            const value = getComputedStyle(document.documentElement).getPropertyValue("--font-awesome").trim();
            expect(value, "--font-awesome should be defined").to.not.be.empty;
        });
    });
}

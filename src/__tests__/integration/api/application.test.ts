import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { FoundryApplication } from "module/api/Application";

export function applicationApiTest({ describe, it, expect }: QuenchBatchContext) {
    describe("ApplicationV2", () => {
        for (const method of ["changeTab", "addEventListener", "removeEventListener"] as const) {
            it(`exposes ${method}`, () => {
                expect(FoundryApplication.prototype[method]).to.be.a("function");
            });
        }
    });
}

import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { withActor } from "../fixtures";
import { executeMacroByUuid, isMacro } from "module/api/Macro";

interface MacroDocument {
    readonly uuid: string;
    readonly name: string;
    canExecute: boolean;
    delete(): Promise<unknown>;
    execute(scope?: object): void | Promise<void>;
}

declare const Macro: { create: (data: object) => Promise<MacroDocument> };

const SIGNAL_KEY = "__splittermondMacroTestSignal";

function resetSignal(): void {
    delete (globalThis as Record<string, unknown>)[SIGNAL_KEY];
}

function getSignal(): unknown {
    return (globalThis as Record<string, unknown>)[SIGNAL_KEY];
}

async function captureWarnings<T>(body: () => Promise<T>): Promise<{ warnings: string[]; result: T }> {
    const originalWarn = console.warn;
    const warnings: string[] = [];
    console.warn = (message: string) => {
        warnings.push(message);
    };
    try {
        const result = await body();
        return { warnings, result };
    } finally {
        console.warn = originalWarn;
    }
}

export function macroApiTest(context: QuenchBatchContext) {
    const { describe, it, expect, afterEach } = context;

    describe("executeMacroByUuid", () => {
        let createdMacros: MacroDocument[] = [];

        afterEach(() => {
            for (const macro of createdMacros) {
                macro.delete();
            }
            createdMacros = [];
            resetSignal();
        });

        it(
            "executes a script macro resolved from its uuid",
            withActor(async (actor) => {
                const macro = await Macro.create({
                    name: `Splittermond Test Macro${nextId()}`,
                    type: "script",
                    command: `globalThis.${SIGNAL_KEY} = { actorName: "${actor.name}" };`,
                });
                createdMacros.push(macro);
                expect(isMacro(macro)).to.be.true;

                await executeMacroByUuid(macro.uuid, { actor });

                const signal = getSignal();
                expect(signal).to.deep.equal({ actorName: actor.name });
            })
        );

        it("logs a warning and does not throw when the uuid is unresolvable", async () => {
            const { warnings } = await captureWarnings(() => executeMacroByUuid("Macro.nonExistentId", {}));

            expect(getSignal()).to.be.undefined;
            expect(warnings).to.have.lengthOf(1);
            expect(warnings[0]).to.contain("Splittermond | Macro not found");
        });

        it(
            "logs a warning when the resolved document is not a Macro",
            withActor(async (actor) => {
                const { warnings } = await captureWarnings(() => executeMacroByUuid(actor.uuid, {}));

                expect(warnings).to.have.lengthOf(1);
                expect(warnings[0]).to.contain("Splittermond | Resolved document is not a Macro");
            })
        );
    });
}

const idGenerator = (function* () {
    let id = 0;
    while (true) {
        yield id++;
    }
})();
function nextId() {
    return idGenerator.next().value;
}

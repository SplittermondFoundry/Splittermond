import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import sinon, { type SinonSandbox } from "sinon";
import { foundryApi } from "module/api/foundryApi";
import { withActor } from "../fixtures";
import { passesEventually } from "../../util";

function input(sheet: { element: HTMLElement }, field: string): HTMLInputElement {
    const element = sheet.element.querySelector(`input[name="system.combatEvent.${field}"]`);
    if (!(element instanceof HTMLInputElement)) throw new Error(`${field} input was not found`);
    return element;
}

export function statusEffectWarningsTest({ it, expect, beforeEach, afterEach }: QuenchBatchContext) {
    let sandbox: SinonSandbox;
    beforeEach(() => (sandbox = sinon.createSandbox()));
    afterEach(() => sandbox.restore());

    // Actor/item setup in a fresh headless world has taken 3.3s during initial canvas loading.
    it(
        "warns when an interval-only condition is added outside combat without rejecting it",
        withActor(async (actor) => {
            const warning = sandbox.spy(foundryApi, "warnUser");

            const [condition] = await actor.createEmbeddedDocuments("Item", [
                { type: "statuseffect", name: "Interval only", system: { combatEvent: { interval: 15 } } },
            ]);

            await passesEventually(() => {
                expect(
                    warning.calledOnceWithExactly("splittermond.message.statusEffectMissingRepeats", {
                        name: condition.name,
                    }),
                    "One warning identifies the missing repetition count"
                ).to.be.true;
            });
            expect(actor.items.get(condition.id)).to.equal(condition);
            expect(condition.system.combatEvent.repeats).to.be.null;
        })
    ).timeout(5000);

    it(
        "warns only after closing an edited condition, not on autosave or a second close",
        withActor(async (actor) => {
            const [condition] = await actor.createEmbeddedDocuments("Item", [
                {
                    type: "statuseffect",
                    name: "Edited condition",
                    system: { combatEvent: { interval: 15, repeats: 6 } },
                },
            ]);
            const warning = sandbox.spy(foundryApi, "warnUser");
            const sheet = condition.sheet;
            try {
                await sheet.render(true);
                const interval = input(sheet, "interval");
                interval.value = "";
                interval.dispatchEvent(new Event("change", { bubbles: true }));
                await passesEventually(() => expect(condition.system.combatEvent.interval).to.be.null);
                expect(warning.called, "Editing and autosaving do not warn").to.be.false;

                await sheet.close();

                expect(sheet.rendered).to.be.false;
                expect(
                    warning.calledOnceWithExactly("splittermond.message.statusEffectMissingInterval", {
                        name: condition.name,
                    }),
                    "Closing warns about the missing interval"
                ).to.be.true;
                await sheet.close();
                expect(warning.callCount, "Closing an already closed sheet does not warn again").to.equal(1);
            } finally {
                await sheet.close();
            }
        })
    );

    it(
        "does not warn while completing the pair or when closing before its last autosave finishes",
        withActor(async (actor) => {
            const [condition] = await actor.createEmbeddedDocuments("Item", [
                { type: "statuseffect", name: "New condition" },
            ]);
            const warning = sandbox.spy(foundryApi, "warnUser");
            const sheet = condition.sheet;
            let releaseUpdate: (() => void) | undefined;
            let pendingUpdate: ReturnType<typeof condition.update> | undefined;
            try {
                await sheet.render(true);
                const interval = input(sheet, "interval");
                interval.value = "15";
                interval.dispatchEvent(new Event("change", { bubbles: true }));
                await passesEventually(() => expect(condition.system.combatEvent.interval).to.equal(15));
                expect(warning.called, "Entering the first field does not warn").to.be.false;

                const update = condition.update.bind(condition);
                const gate = new Promise<void>((resolve) => (releaseUpdate = resolve));
                const delayedUpdate = sandbox
                    .stub(condition, "update")
                    .callsFake((...args: Parameters<typeof condition.update>) => {
                        pendingUpdate = gate.then(() => update(...args));
                        return pendingUpdate;
                    });
                const repetitions = input(sheet, "repeats");
                repetitions.value = "6";
                repetitions.dispatchEvent(new Event("change", { bubbles: true }));
                await passesEventually(() => expect(delayedUpdate.called, "The final autosave has started").to.be.true);

                await sheet.close();

                expect(condition.system.combatEvent.repeats, "Persistence is still pending").to.be.null;
                expect(warning.called, "The completed form does not warn despite a pending save").to.be.false;
            } finally {
                releaseUpdate?.();
                await pendingUpdate;
                await sheet.close();
            }
        })
    );
}

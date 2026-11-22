import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import sinon, { type SinonSandbox } from "sinon";
import { foundryApi } from "module/api/foundryApi";
import { withActor } from "../fixtures";
import { passesEventually } from "../../util";
import { StatusEffectDataModel } from "module/item/dataModel/StatusEffectDataModel";

function input(sheet: { element: HTMLElement }, field: string): HTMLInputElement {
    const element = sheet.element.querySelector(`input[name="system.combatEvent.${field}"]`);
    if (!(element instanceof HTMLInputElement)) throw new Error(`${field} input was not found`);
    return element;
}

export function statusEffectWarningsTest({ it, expect, beforeEach, afterEach }: QuenchBatchContext) {
    let sandbox: SinonSandbox;
    beforeEach(() => (sandbox = sinon.createSandbox()));
    afterEach(() => sandbox.restore());

    it(
        "reports an invalid interval without saving it and accepts a corrected positive fraction",
        withActor(async (actor) => {
            const [condition] = await actor.createEmbeddedDocuments("Item", [
                {
                    type: "statuseffect",
                    name: "Invalid interval",
                    system: { combatEvent: { interval: 15, repeats: 6 } },
                },
            ]);
            const error = sandbox.spy(foundryApi, "reportError");
            const update = sandbox.spy(condition, "update");
            const sheet = condition.sheet;
            try {
                await sheet.render(true);
                const interval = input(sheet, "interval");
                interval.value = "0";
                interval.dispatchEvent(new Event("change", { bubbles: true }));

                await passesEventually(() => {
                    expect(
                        error.calledOnceWithExactly("splittermond.message.statusEffectInvalidInterval", {
                            name: condition.name,
                        }),
                        "Autosave reports a readable interval error"
                    ).to.be.true;
                });
                expect(condition.system.combatEvent.interval, "The previous saved interval is retained").to.equal(15);
                expect(update.called, "Invalid input never reaches document persistence").to.be.false;

                const submit = new SubmitEvent("submit", { bubbles: true, cancelable: true });
                sheet.form?.dispatchEvent(submit);

                expect(submit.defaultPrevented, "Invalid input must not trigger native form submission").to.be.true;
                expect(update.called, "Submitting invalid input still does not persist it").to.be.false;

                interval.value = "0.5";
                interval.dispatchEvent(new Event("change", { bubbles: true }));

                await passesEventually(() => expect(condition.system.combatEvent.interval).to.equal(0.5));
                expect(error.callCount, "Only the invalid change and submit produce an error").to.equal(2);
            } finally {
                await sheet.close({ animate: false });
            }
        })
    ).timeout(5000);

    for (const interval of [0, -5]) {
        it(
            `still rejects interval ${interval} in the data model without going through the sheet`,
            withActor(async (actor) => {
                const [condition] = await actor.createEmbeddedDocuments("Item", [
                    {
                        type: "statuseffect",
                        name: "Validated condition",
                        system: { combatEvent: { interval: 15, repeats: 6 } },
                    },
                ]);
                const model = condition.system;
                if (!(model instanceof StatusEffectDataModel)) throw new Error("Unexpected condition data model");

                expect(() => model.updateSource({ combatEvent: { interval } })).to.throw();

                expect(model.combatEvent.interval).to.equal(15);
            })
        ).timeout(5000);
    }

    // Cold-world document/sheet setup took 3.3–3.8s; closing animations are unrelated to these assertions.
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
        "warns once when adding a condition with zero repetitions and keeps the stored zero",
        withActor(async (actor) => {
            const warning = sandbox.spy(foundryApi, "warnUser");

            const [condition] = await actor.createEmbeddedDocuments("Item", [
                {
                    type: "statuseffect",
                    name: "Zero repetitions",
                    system: { combatEvent: { interval: 15, repeats: 0 } },
                },
            ]);

            await passesEventually(() => {
                expect(
                    warning.calledOnceWithExactly("splittermond.message.statusEffectZeroRepeats", {
                        name: condition.name,
                    }),
                    "Creation warns specifically about zero repetitions"
                ).to.be.true;
            });
            expect(actor.items.get(condition.id)).to.equal(condition);
            expect(condition.system.combatEvent.repeats).to.equal(0);
        })
    ).timeout(5000);

    it(
        "warns about zero repetitions only after closing, not on autosave or a second close",
        withActor(async (actor) => {
            const [condition] = await actor.createEmbeddedDocuments("Item", [
                {
                    type: "statuseffect",
                    name: "Edited repetitions",
                    system: { combatEvent: { interval: 15, repeats: 6 } },
                },
            ]);
            const warning = sandbox.spy(foundryApi, "warnUser");
            const sheet = condition.sheet;
            try {
                await sheet.render(true);
                const repetitions = input(sheet, "repeats");
                repetitions.value = "0";
                repetitions.dispatchEvent(new Event("change", { bubbles: true }));
                await passesEventually(() => expect(condition.system.combatEvent.repeats).to.equal(0));
                expect(warning.called, "Entering and autosaving zero do not warn").to.be.false;

                await sheet.close({ animate: false });

                expect(sheet.rendered).to.be.false;
                expect(
                    warning.calledOnceWithExactly("splittermond.message.statusEffectZeroRepeats", {
                        name: condition.name,
                    }),
                    "Closing warns specifically about zero repetitions"
                ).to.be.true;
                expect(condition.system.combatEvent.repeats).to.equal(0);
                await sheet.close({ animate: false });
                expect(warning.callCount, "Closing an already closed sheet does not warn again").to.equal(1);
            } finally {
                await sheet.close({ animate: false });
            }
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

                await sheet.close({ animate: false });

                expect(sheet.rendered).to.be.false;
                expect(
                    warning.calledOnceWithExactly("splittermond.message.statusEffectMissingInterval", {
                        name: condition.name,
                    }),
                    "Closing warns about the missing interval"
                ).to.be.true;
                await sheet.close({ animate: false });
                expect(warning.callCount, "Closing an already closed sheet does not warn again").to.equal(1);
            } finally {
                await sheet.close({ animate: false });
            }
        })
    ).timeout(5000);

    it(
        "does not warn when completing the pair and closing before its autosave finishes",
        withActor(async (actor) => {
            const [condition] = await actor.createEmbeddedDocuments("Item", [
                { type: "statuseffect", name: "New condition", system: { combatEvent: { interval: 15 } } },
            ]);
            const sheet = condition.sheet;
            let releaseUpdate: (() => void) | undefined;
            let pendingUpdate: ReturnType<typeof condition.update> | undefined;
            try {
                await sheet.render(true);
                const warning = sandbox.spy(foundryApi, "warnUser");

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

                await sheet.close({ animate: false });

                expect(condition.system.combatEvent.repeats, "Persistence is still pending").to.be.null;
                expect(warning.called, "The completed form does not warn despite a pending save").to.be.false;
            } finally {
                releaseUpdate?.();
                await pendingUpdate;
                await sheet.close({ animate: false });
            }
        })
    ).timeout(5000);
}

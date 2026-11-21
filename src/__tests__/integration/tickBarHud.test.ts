import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import type SplittermondActor from "module/actor/actor";
import type SplittermondCombat from "module/combat/combat";
import type { FoundryCombatant } from "module/api/foundryTypes";
import { foundryApi } from "module/api/foundryApi";
import TickBarHud from "module/apps/tick-bar-hud/tick-bar-hud";
import { withActor } from "./fixtures";
import { passesEventually } from "../util";
import sinon from "sinon";

declare const ui: { combat: { viewed: unknown } };

function withCombat(
    test: (
        actor: SplittermondActor,
        combat: SplittermondCombat,
        combatant: FoundryCombatant,
        hud: TickBarHud
    ) => Promise<void>
) {
    return withActor(async (actor) => {
        const previousViewed = ui.combat.viewed;
        const combat = (await Combat.create({ active: true })) as SplittermondCombat;
        try {
            const [combatant] = (await combat.createEmbeddedDocuments("Combatant", [
                { type: "base", actorId: actor.id, tokenId: null, defeated: false, group: null },
            ])) as FoundryCombatant[];
            await combat.startCombat();
            const hud = foundryApi.combats.apps.find((app: unknown) => app instanceof TickBarHud);
            if (!(hud instanceof TickBarHud)) throw new Error("Tick bar HUD was not initialized");
            await test(actor, combat, combatant, hud);
        } finally {
            await combat.delete();
            ui.combat.viewed = previousViewed;
        }
    });
}

export function tickBarHudTest({ it, expect }: QuenchBatchContext) {
    it(
        "warns once for a repetitions-only condition in combat and stays silent for an untimed condition",
        withCombat(async (actor) => {
            const warning = sinon.spy(foundryApi, "warnUser");
            try {
                await actor.createEmbeddedDocuments("Item", [{ type: "statuseffect", name: "Untimed" }]);
                expect(warning.called, "A condition without either timer field needs no warning").to.be.false;

                const [condition] = await actor.createEmbeddedDocuments("Item", [
                    { type: "statuseffect", name: "Repeats only", system: { combatEvent: { repeats: 6 } } },
                ]);

                await passesEventually(() => {
                    expect(
                        warning.calledOnceWithExactly("splittermond.message.statusEffectMissingInterval", {
                            name: condition.name,
                        }),
                        "Creation produces one warning, without an additional interval warning"
                    ).to.be.true;
                });
                expect(condition.system.combatEvent.startTick).to.be.null;
                expect(actor.getVirtualStatusTokens()).to.be.empty;
            } finally {
                warning.restore();
            }
        })
    );

    // Rendering the full bounded window and advancing combat took over 3s in the headless runtime.
    it(
        "keeps combatants and condition markers visible after clearing repetitions and advancing ticks",
        withCombat(async (actor, combat, combatant, hud) => {
            await combat.setInitiative(combatant.id, 60);
            const [condition] = await actor.createEmbeddedDocuments("Item", [
                {
                    type: "statuseffect",
                    name: "Burning",
                    system: { level: 1, combatEvent: { interval: 15, repeats: 6 } },
                },
            ]);
            const sheet = condition.sheet;
            try {
                await sheet.render(true);
                const repetitions = sheet.element.querySelector('input[name="system.combatEvent.repeats"]');
                if (!(repetitions instanceof HTMLInputElement)) throw new Error("Repetition input was not found");

                repetitions.value = "";
                repetitions.dispatchEvent(new Event("change", { bubbles: true }));

                await passesEventually(() => {
                    expect(actor.getVirtualStatusTokens()[0].times).to.equal(90);
                    expect(
                        hud.element.querySelector(`[data-tick="60"] [data-combatant-id="${combatant.id}"]`),
                        "Current combatant remains visible after clearing repetitions"
                    ).not.to.be.null;
                    expect(
                        hud.element.querySelector('[data-tick="75"] .tick-bar-hud-status-effect-list-item'),
                        "Next condition marker remains visible"
                    ).not.to.be.null;
                    expect(hud.element.querySelectorAll(".tick-bar-hud-ticks-scroll [data-tick]").length).to.be.at.most(
                        1001
                    );
                });

                await combat.setInitiative(combatant.id, 61);

                await passesEventually(() => {
                    expect(
                        hud.element.querySelector(`[data-tick="61"] [data-combatant-id="${combatant.id}"]`),
                        "Combatant remains visible after advancing ticks"
                    ).not.to.be.null;
                    expect(
                        hud.element.querySelector('[data-tick="75"] .tick-bar-hud-status-effect-list-item'),
                        "Condition marker remains visible after advancing"
                    ).not.to.be.null;
                    expect(hud.element.querySelectorAll(".tick-bar-hud-ticks-scroll [data-tick]").length).to.be.at.most(
                        1001
                    );
                });
            } finally {
                await sheet.close();
            }
        })
    ).timeout(5000);

    it(
        "omits condition markers without limiting the bar to 50 when the interval is cleared",
        withCombat(async (actor, combat, combatant, hud) => {
            await combat.setInitiative(combatant.id, 60);
            const [condition] = await actor.createEmbeddedDocuments("Item", [
                {
                    type: "statuseffect",
                    name: "Burning",
                    system: { level: 1, combatEvent: { interval: 15, repeats: 6 } },
                },
            ]);
            const sheet = condition.sheet;
            try {
                await sheet.render(true);
                const interval = sheet.element.querySelector('input[name="system.combatEvent.interval"]');
                if (!(interval instanceof HTMLInputElement)) throw new Error("Interval input was not found");

                interval.value = "";
                interval.dispatchEvent(new Event("change", { bubbles: true }));

                await passesEventually(() => {
                    expect(actor.getVirtualStatusTokens()).to.be.empty;
                    expect(hud.maxTick).to.equal(85);
                    expect(hud.element.querySelector(`[data-tick="60"] [data-combatant-id="${combatant.id}"]`)).not.to
                        .be.null;
                    expect(hud.element.querySelector('[data-tick="85"]')).not.to.be.null;
                    expect(hud.element.querySelector(".tick-bar-hud-status-effect-list-item")).to.be.null;
                });
            } finally {
                await sheet.close();
            }
        })
    );
}

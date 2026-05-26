import { QuenchBatchContext } from "@ethaks/fvtt-quench";
import sinon from "sinon";
import { Modifier } from "module/activeEffect";
import { foundryApi } from "module/api/foundryApi";
import { SplittermondActiveEffectConfig } from "module/activeEffect/sheets/SplittermondActiveEffectConfig";
import { of } from "module/modifiers/expressions/scalar";
import { withActiveEffect } from "./fixtures";
import { passesEventually } from "../util";

async function enterInSheet(sheet: SplittermondActiveEffectConfig, inputName: string, value: string) {
    await sheet.render(true);
    const input = sheet.element.querySelector(`input[name='${inputName}']`) as HTMLInputElement | null;
    input!.value = value;
    input!.dispatchEvent(new Event("input", { bubbles: true }));
    input!.dispatchEvent(new Event("change", { bubbles: true }));
    const submitButton = sheet.element.querySelector(
        "button[type='submit'], button[data-action='submit']"
    ) as HTMLButtonElement | null;
    if (submitButton) {
        submitButton.dispatchEvent(new PointerEvent("click", { bubbles: true }));
        return;
    }

    const form = sheet.element.querySelector("form") as HTMLFormElement | null;
    form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

export function activeEffectConfigTest(context: QuenchBatchContext) {
    const { describe, it, expect } = context;

    describe("SplittermondActiveEffectConfig", () => {
        it("should update scalar modifier from raw input", withActiveEffect(
            {
                name: "Start",
                type: "modifier",
                system: Modifier.init("skills", of(1), { name: "Test", type: "innate", skill: "acrobatics" }),
            },
            async (effect) => {
            const sheet = effect.sheet as SplittermondActiveEffectConfig;
            await enterInSheet(sheet, "splittermondRawInput", "skills skill=acrobatics +2");

            await passesEventually(() => {
                expect(effect.system.path).to.equal("actor.skills");
                expect(effect.getFlag("splittermond", "rawInput")).to.equal("skills skill=acrobatics +2");
            }, 1500, 100);
        }));

        it("should update cost modifier formula and skill", withActiveEffect(
            {
                name: "Kosten",
                type: "costModifier",
                system: {
                    label: "kosten -1",
                    serializedValue: {
                        type: "amount",
                        amount: {
                            _channeled: 0,
                            _channeledConsumed: 0,
                            _exhausted: 1,
                            _consumed: 0,
                        },
                    },
                    skill: null,
                    attributes: {},
                },
            },
            async (effect) => {
            const sheet = effect.sheet as SplittermondActiveEffectConfig;
            await sheet.render(true);
            const formulaInput = sheet.element.querySelector("input[name='splittermondCostFormula']") as HTMLInputElement;
            const skillInput = sheet.element.querySelector("input[name='splittermondCostSkill']") as HTMLInputElement;

            formulaInput.value = "focus.addition 2";
            skillInput.value = "fireMagic";
            formulaInput.dispatchEvent(new Event("input", { bubbles: true }));
            formulaInput.dispatchEvent(new Event("change", { bubbles: true }));
            skillInput.dispatchEvent(new Event("input", { bubbles: true }));
            skillInput.dispatchEvent(new Event("change", { bubbles: true }));
            const submitButton = sheet.element.querySelector(
                "button[type='submit'], button[data-action='submit']"
            ) as HTMLButtonElement | null;
            if (submitButton) {
                submitButton.dispatchEvent(new PointerEvent("click", { bubbles: true }));
            } else {
                const form = sheet.element.querySelector("form") as HTMLFormElement | null;
                form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
            }

            await passesEventually(() => {
                expect(effect.system.label,"label value").to.equal("focus.reduction");
                expect(effect.system.skill,"skill value").to.equal("fireMagic");
                expect(effect.getFlag("splittermond", "rawInput"),"raw Input").to.equal("focus.addition 2");
            }, 1500, 100);
        }));

        it("should warn and block scalar effect when entering cost formula", withActiveEffect(
            {
                name: "Start",
                type: "modifier",
                system: Modifier.init("skills", of(1), { name: "Test", type: "innate", skill: "acrobatics" }),
            },
            async (effect) => {
            const sandbox = sinon.createSandbox();
            try {
                const warnSpy = sandbox.spy(foundryApi, "warnUser");
                const sheet = effect.sheet as SplittermondActiveEffectConfig;
                await enterInSheet(sheet, "splittermondRawInput", "focus.reduction -K1V1");

                expect(warnSpy.callCount, "UI Warnings emitted").to.equal(1)
                expect(effect.type).to.equal("modifier");
                expect(effect.system.path).to.equal("skills");
            } finally {
                sandbox.restore();
            }
        }));

        it("should warn and block cost effect when entering scalar modifier", withActiveEffect(
            {
                name: "Kosten",
                type: "costModifier",
                system: {
                    label: "kosten -1",
                    serializedValue: {
                        type: "amount",
                        amount: {
                            _channeled: 0,
                            _channeledConsumed: 0,
                            _exhausted: 1,
                            _consumed: 0,
                        },
                    },
                    skill: null,
                    attributes: {},
                },
            },
            async (effect) => {
            const sandbox = sinon.createSandbox();
            try {
                const warnSpy = sandbox.spy(foundryApi, "warnUser");
                const sheet = effect.sheet as SplittermondActiveEffectConfig;
                await sheet.render(true);
                const formulaInput = sheet.element.querySelector("input[name='splittermondCostFormula']") as HTMLInputElement;
                formulaInput.value = "skills skill=acrobatics +2";
                formulaInput.dispatchEvent(new Event("input", { bubbles: true }));
                formulaInput.dispatchEvent(new Event("change", { bubbles: true }));
                const submitButton = sheet.element.querySelector(
                    "button[type='submit'], button[data-action='submit']"
                ) as HTMLButtonElement | null;
                if (submitButton) {
                    submitButton.dispatchEvent(new PointerEvent("click", { bubbles: true }));
                } else {
                    const form = sheet.element.querySelector("form") as HTMLFormElement | null;
                    form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
                }

                expect(warnSpy.callCount, "UI Warnings emitted").to.equal(1)
                expect(effect.type).to.equal("costModifier");
                expect(effect.system.label).to.equal("kosten -1");
            } finally {
                sandbox.restore();
            }
        }));
    });
}

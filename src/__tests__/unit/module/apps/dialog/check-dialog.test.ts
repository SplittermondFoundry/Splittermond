import { expect } from "chai";
import { JSDOM } from "jsdom";
import sinon, { SinonSandbox } from "sinon";
import CheckDialog, { type CheckDialogInput } from "module/apps/dialog/check-dialog";
import { evaluate, of, times } from "module/modifiers/expressions/scalar";
import { foundryApi } from "module/api/foundryApi";
import Skill from "module/actor/skill";

function buildCheckDialogHtml(options: {
    modifier?: number;
    difficulty?: string;
    messageMode?: string;
    emphasis?: { name: string; value: string; index: number; checked?: boolean }[];
}) {
    const emphasisHtml = (options.emphasis ?? [])
        .map(
            (e) =>
                `<input type="checkbox" name="emphasis" data-name="${e.name}" data-index="${e.index}" value="${e.value}" ${e.checked ? "checked" : ""}>`
        )
        .join("\n");

    return `
        <form>
            <input name="modifier" type="number" value="${options.modifier ?? 0}">
            <input name="difficulty" type="text" value="${options.difficulty ?? "15"}">
            <select name="messageMode">
                <option value="${options.messageMode ?? "public"}" selected>${options.messageMode ?? "public"}</option>
            </select>
            ${emphasisHtml}
        </form>
    `;
}

function buildCheckData(emphasis: CheckDialogInput["emphasis"] = []): CheckDialogInput {
    return {
        skill: {} as Skill,
        skillTooltip: "",
        modifier: 0,
        emphasis,
        difficulty: "15",
        messageMode: "public",
        rollModes: {},
    };
}

describe("CheckDialog", () => {
    let sandbox: SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => key);
    });

    afterEach(() => sandbox.restore());

    describe("_prepareFormData", () => {
        it("should read manual modifier from input", () => {
            const dom = new JSDOM(buildCheckDialogHtml({ modifier: 5 }));
            const html = dom.window.document.querySelector("form")!;
            const checkData = buildCheckData();

            const result = CheckDialog._prepareFormData(html, checkData);

            expect(result.modifier).to.equal(5);
            expect(result.modifierElements).to.have.lengthOf(1);
            expect(evaluate(result.modifierElements[0].value)).to.equal(5);
        });

        it("should read checked emphasis modifier by index", () => {
            const emphasis: CheckDialogInput["emphasis"] = [
                { name: "Sichtprobe", label: "Sichtprobe + 2", value: "2", numericValue: of(2), active: false },
            ];
            const dom = new JSDOM(
                buildCheckDialogHtml({
                    emphasis: [{ name: "Sichtprobe", value: "2", index: 0, checked: true }],
                })
            );
            const html = dom.window.document.querySelector("form")!;
            const checkData = buildCheckData(emphasis);

            const result = CheckDialog._prepareFormData(html, checkData);

            expect(result.modifierElements).to.have.lengthOf(1);
            expect(evaluate(result.modifierElements[0].value)).to.equal(2);
            expect(result.modifierElements[0].description).to.equal("Sichtprobe");
            expect(result.modifier).to.equal(2);
        });

        it("should not include unchecked emphasis modifiers", () => {
            const emphasis: CheckDialogInput["emphasis"] = [
                { name: "Sichtprobe", label: "Sichtprobe + 2", value: "2", numericValue: of(2), active: false },
            ];
            const dom = new JSDOM(
                buildCheckDialogHtml({
                    emphasis: [{ name: "Sichtprobe", value: "2", index: 0, checked: false }],
                })
            );
            const html = dom.window.document.querySelector("form")!;
            const checkData = buildCheckData(emphasis);

            const result = CheckDialog._prepareFormData(html, checkData);

            expect(result.modifierElements).to.have.lengthOf(0);
            expect(result.modifier).to.equal(0);
        });

        it("should correctly evaluate multiplied expressions from status effects with levels", () => {
            const multipliedValue = times(of(2), of(-3));
            const emphasis: CheckDialogInput["emphasis"] = [
                { name: "test", label: "test - 6", value: "-6", numericValue: multipliedValue, active: false },
            ];
            const dom = new JSDOM(
                buildCheckDialogHtml({
                    emphasis: [{ name: "test", value: "-6", index: 0, checked: true }],
                })
            );
            const html = dom.window.document.querySelector("form")!;
            const checkData = buildCheckData(emphasis);

            const result = CheckDialog._prepareFormData(html, checkData);

            expect(result.modifierElements).to.have.lengthOf(1);
            expect(evaluate(result.modifierElements[0].value)).to.equal(-6);
            expect(result.modifier).to.equal(-6);
        });

        it("should distinguish duplicate emphasis names by index", () => {
            const emphasis: CheckDialogInput["emphasis"] = [
                { name: "Schwerpunkt", label: "Schwerpunkt + 2", value: "2", numericValue: of(2), active: false },
                { name: "Schwerpunkt", label: "Schwerpunkt + 5", value: "5", numericValue: of(5), active: false },
            ];
            const dom = new JSDOM(
                buildCheckDialogHtml({
                    emphasis: [
                        { name: "Schwerpunkt", value: "2", index: 0, checked: false },
                        { name: "Schwerpunkt", value: "5", index: 1, checked: true },
                    ],
                })
            );
            const html = dom.window.document.querySelector("form")!;
            const checkData = buildCheckData(emphasis);

            const result = CheckDialog._prepareFormData(html, checkData);

            // Only the second (index 1) is checked, so only its value should appear
            expect(result.modifierElements).to.have.lengthOf(1);
            expect(evaluate(result.modifierElements[0].value)).to.equal(5);
            expect(result.modifierElements[0].description).to.equal("Schwerpunkt");
            expect(result.modifier).to.equal(5);
        });

        it("should sum both duplicate emphasis entries when both are checked", () => {
            const emphasis: CheckDialogInput["emphasis"] = [
                { name: "Schwerpunkt", label: "Schwerpunkt + 2", value: "2", numericValue: of(2), active: false },
                { name: "Schwerpunkt", label: "Schwerpunkt + 5", value: "5", numericValue: of(5), active: false },
            ];
            const dom = new JSDOM(
                buildCheckDialogHtml({
                    emphasis: [
                        { name: "Schwerpunkt", value: "2", index: 0, checked: true },
                        { name: "Schwerpunkt", value: "5", index: 1, checked: true },
                    ],
                })
            );
            const html = dom.window.document.querySelector("form")!;
            const checkData = buildCheckData(emphasis);

            const result = CheckDialog._prepareFormData(html, checkData);

            expect(result.modifierElements).to.have.lengthOf(2);
            expect(evaluate(result.modifierElements[0].value)).to.equal(2);
            expect(evaluate(result.modifierElements[1].value)).to.equal(5);
            expect(result.modifier).to.equal(7);
        });

        it("should combine manual modifier with emphasis modifiers", () => {
            const emphasis: CheckDialogInput["emphasis"] = [
                { name: "Sichtprobe", label: "Sichtprobe - 3", value: "-3", numericValue: of(-3), active: false },
            ];
            const dom = new JSDOM(
                buildCheckDialogHtml({
                    modifier: 2,
                    emphasis: [{ name: "Sichtprobe", value: "-3", index: 0, checked: true }],
                })
            );
            const html = dom.window.document.querySelector("form")!;
            const checkData = buildCheckData(emphasis);

            const result = CheckDialog._prepareFormData(html, checkData);

            expect(result.modifierElements).to.have.lengthOf(2);
            expect(result.modifier).to.equal(-1);
        });
    });
});

import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import type { FoundryApplication } from "module/api/Application";
import { ActiveDefenseDialog } from "module/actor/ActiveDefenseDialog";
import CheckDialog from "module/apps/dialog/check-dialog";
import SplittermondItemEffectsSheet from "module/item/sheets/item-effects-sheet";
import SplittermondSpellSheet from "module/item/sheets/spell-sheet";
import { DamageReportDialog } from "module/util/chat/damageChatMessage/userDialogue/DamageReportDialog";
import { CostModifier } from "module/util/costs/Cost";
import { CostBase } from "module/util/costs/costTypes";
import { withActor } from "./fixtures";

export function windowResizingTest({ it, expect }: QuenchBatchContext) {
    function resize(app: InstanceType<typeof FoundryApplication>, width: number, height: number) {
        expect(app.element.querySelector(".window-resize-handle"), "Native resize handle is available").to.exist;
        app.setPosition({ width, height, top: 20, left: 20 });
        const bounds = app.element.getBoundingClientRect();
        expect(bounds.width, "Window adopts the requested width").to.be.closeTo(width, 1);
        expect(bounds.height, "Window adopts the requested height").to.be.closeTo(height, 1);
    }

    function expectReachableButtons(app: InstanceType<typeof FoundryApplication>) {
        const content = app.element.querySelector<HTMLElement>(".window-content")!;
        expect(getComputedStyle(content).overflowY, "Compact dialogs allow scrolling").to.equal("auto");
        const button = app.element.querySelector<HTMLElement>(".form-footer button")!;
        expect(button, "Dialog has an action button").to.exist;
        const buttonBounds = button.getBoundingClientRect();
        const contentBounds = content.getBoundingClientRect();
        expect(buttonBounds.top, "Action button can be scrolled into view").to.be.at.least(contentBounds.top);
        expect(buttonBounds.bottom, "Action button stays inside the content area").to.be.at.most(contentBounds.bottom);
    }

    for (const [type, Sheet] of [
        ["moonsign", SplittermondItemEffectsSheet],
        ["spell", SplittermondSpellSheet],
    ] as const) {
        it(
            `resizes a ${type} sheet and retains its dimensions when changing tabs and rendering again`,
            withActor(async (actor) => {
                const [item] = await actor.createEmbeddedDocuments("Item", [
                    {
                        type,
                        name: `Resizable ${type}`,
                        system: { description: "<p>A long description.</p>".repeat(30) },
                    },
                ]);
                const sheet = new Sheet({ document: item });
                await withApplication(sheet, async () => {
                    await sheet.render({ force: true });
                    resize(sheet, 720, 640);
                    const editor = sheet.element.querySelector<HTMLElement>('section[data-tab="editor"]')!;
                    const expandedHeight = editor.clientHeight;
                    resize(sheet, 520, 380);
                    expect(editor.clientHeight, "Description follows the window height").to.be.lessThan(expandedHeight);
                    expect(editor.scrollHeight, "Long descriptions remain scrollable").to.be.greaterThan(
                        editor.clientHeight
                    );
                    sheet.changeTab("properties", "primary");
                    await sheet.render({ force: true });
                    expect(sheet.element.querySelector('section[data-tab="properties"].active')).to.exist;
                    expect(sheet.element.getBoundingClientRect().width).to.be.closeTo(520, 1);
                    expect(sheet.element.getBoundingClientRect().height).to.be.closeTo(380, 1);
                });
            })
        ).timeout(5000); // The first sheet render also loads templates in a fresh world (about 3 seconds).
    }

    it(
        "keeps check dialog actions reachable after shrinking a long dialog",
        withActor(async (actor) => {
            const dialog = new CheckDialog(
                {
                    skill: actor.skills.acrobatics,
                    skillTooltip: "",
                    modifier: 0,
                    emphasis: [],
                    difficulty: 15,
                    messageMode: "public",
                    rollModes: {},
                },
                {
                    content: "<p>Check modifier</p>".repeat(30),
                    buttons: [{ action: "cancel", label: "Cancel" }],
                }
            );
            await withApplication(dialog, async () => {
                await dialog.render({ force: true });

                resize(dialog, 720, 640);
                resize(dialog, 520, 300);
                const content = dialog.element.querySelector<HTMLElement>(".window-content")!;
                content.scrollTop = content.scrollHeight;

                expectReachableButtons(dialog);
            });
        })
    );

    it(
        "keeps active defense actions reachable after shrinking a long dialog",
        withActor(async (actor) => {
            const dialog = new ActiveDefenseDialog(actor, "<p>Active defense</p>".repeat(30));
            await withApplication(dialog, async () => {
                await dialog.render({ force: true });

                resize(dialog, 720, 640);
                resize(dialog, 520, 300);
                const content = dialog.element.querySelector<HTMLElement>(".window-content")!;
                content.scrollTop = content.scrollHeight;

                expectReachableButtons(dialog);
            });
        })
    );

    it(
        "keeps damage dialog actions reachable after shrinking a long damage report",
        withActor(async (actor) => {
            const dialog = await DamageReportDialog.create({
                target: actor,
                event: { causer: null, grazingHitPenalty: 0, costBase: CostBase.create("E") },
                records: Array.from({ length: 20 }, () => ({
                    implementName: "Damage source",
                    damageType: "physical",
                    baseDamage: CostModifier.zero,
                    modifiedBy: CostModifier.zero,
                    appliedDamage: CostModifier.zero,
                })),
                damageReduction: CostModifier.zero,
                totalDamage: CostModifier.zero,
                overriddenReduction: CostModifier.zero,
                totalFromImplements: CostModifier.zero,
            });
            await withApplication(dialog, async () => {
                await dialog.render({ force: true });

                resize(dialog, 720, 640);
                resize(dialog, 520, 300);
                const content = dialog.element.querySelector<HTMLElement>(".window-content")!;
                content.scrollTop = content.scrollHeight;

                expectReachableButtons(dialog);
            });
        })
    );
}

async function withApplication(application: InstanceType<typeof FoundryApplication>, test: () => Promise<void>) {
    try {
        await test();
    } finally {
        // Close sheets before withActor deletes their documents and initiates its own sheet cleanup.
        await application.close({ animate: false });
    }
}

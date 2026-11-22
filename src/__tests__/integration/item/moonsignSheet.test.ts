import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import SplittermondItemSheet from "module/item/sheets/item-sheet";
import { withActor } from "../fixtures";

export function moonsignSheetTest({ it, expect }: QuenchBatchContext) {
    it(
        "opens a moonsign with room for its description and properties at the default size",
        withActor(async (actor) => {
            const [moonsign] = await actor.createEmbeddedDocuments("Item", [
                {
                    type: "moonsign",
                    name: "Moonsign with description",
                    system: {
                        description: [
                            "This moonsign helps the character in a difficult situation. Its description explains when the gift can be used.",
                            "The player chooses the right moment and spends a splinterpoint. The effect lasts until the action is resolved.",
                            "The enhancement and secret gift provide further options. Their details can be entered on the properties tab.",
                        ]
                            .map((paragraph) => `<p>${paragraph}</p>`)
                            .join(""),
                        enhancement: "Enhanced gift",
                        secretGift: "Secret gift",
                    },
                },
            ]);
            const sheet = new SplittermondItemSheet({ document: moonsign });
            try {
                await sheet.render({ force: true });
                const editor = sheet.element.querySelector<HTMLElement>('section[data-tab="editor"]')!;
                const paragraphs = editor.querySelectorAll("p");
                expect(paragraphs, "The complete description is rendered").to.have.length(3);
                expect(
                    paragraphs[2].getBoundingClientRect().bottom,
                    "The three-paragraph description fits in the initial reading area"
                ).to.be.at.most(editor.getBoundingClientRect().bottom);

                sheet.changeTab("properties", "primary");
                const properties = sheet.element.querySelector<HTMLElement>('section[data-tab="properties"]')!;
                for (const field of ["enhancement", "secretGift"]) {
                    const input = properties.querySelector<HTMLInputElement>(`[name="system.${field}"]`)!;
                    expect(input.getBoundingClientRect().height, `${field} is visible`).to.be.greaterThan(0);
                    expect(input.getBoundingClientRect().bottom, `${field} fits in the properties panel`).to.be.at.most(
                        properties.getBoundingClientRect().bottom
                    );
                }
            } finally {
                await sheet.close();
            }
        })
    );
}

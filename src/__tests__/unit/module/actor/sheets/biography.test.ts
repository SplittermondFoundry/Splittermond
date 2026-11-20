import { expect } from "chai";
import { JSDOM } from "jsdom";
import { createHtml } from "../../../../handlebarHarness";
import type { BiographyTemplateData } from "module/actor/sheets/biographyTemplateInterface";

describe("Biography editor", () => {
    const characterDetails: NonNullable<BiographyTemplateData["characterDetails"]> = [
        { name: "system.hairColor", label: "splittermond.biographyDetails.hairColor", value: 'weißblond "<hell>"' },
        { name: "system.eyeColor", label: "splittermond.biographyDetails.eyeColor", value: "blau" },
        { name: "system.skinColor", label: "splittermond.biographyDetails.skinColor", value: "hell" },
        { name: "system.height", label: "splittermond.biographyDetails.height", value: "1,92 m" },
        { name: "system.weight", label: "splittermond.biographyDetails.weight", value: "70 kg" },
        { name: "system.birthplace", label: "splittermond.biographyDetails.birthplace", value: "Tairion" },
    ];
    const editor = { target: "system.biography", value: "<p>Geschichte</p>", content: "<p>Geschichte</p>" };
    const tabs = { editor: { id: "editor", cssClass: "active" } };

    it("renders editable character details with escaped values alongside the biography", () => {
        const document = new JSDOM(
            createHtml("templates/sheets/editor.hbs", {
                characterDetails,
                editor,
                tabs,
                editable: true,
            })
        ).window.document;

        for (const field of characterDetails) {
            const input = document.querySelector<HTMLInputElement>(`input[name='${field.name}']`);
            expect(input?.value, field.name).to.equal(field.value);
            expect(input?.closest("label")?.textContent).to.include(field.label);
        }
        expect(document.querySelector("prose-mirror")?.getAttribute("name")).to.equal("system.biography");
        expect(document.querySelectorAll("section.tab")).to.have.length(1);
        expect(document.querySelector("hell")).to.be.null;
    });

    it("shows character details without editable controls to a read-only viewer", () => {
        const document = new JSDOM(
            createHtml("templates/sheets/editor.hbs", {
                characterDetails,
                editor: { ...editor, content: "<p>Geschichte</p><p>Ein weiterer Absatz</p>" },
                tabs,
                editable: false,
            })
        ).window.document;

        for (const field of characterDetails) expect(document.body.textContent).to.include(field.value);
        expect(document.querySelector("input, prose-mirror")).to.be.null;
        expect(document.querySelector("p")?.textContent).to.equal("Geschichte");
        expect(document.querySelector("section")?.children).to.have.length(2);
        expect(document.querySelector("section > :last-child")?.children).to.have.length(2);
    });

    it("keeps the shared editor usable without character details", () => {
        const document = new JSDOM(
            createHtml("templates/sheets/editor.hbs", {
                editor,
                tabs,
                editable: true,
            })
        ).window.document;

        expect(document.querySelector("input, .character-details")).to.be.null;
        expect(document.querySelector("prose-mirror")?.textContent).to.include("Geschichte");
    });
});

import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { CharacterDataModel, type CharacterBiography } from "module/actor/dataModel/CharacterDataModel";
import SplittermondCharacterSheet from "module/actor/sheets/character-sheet";
import SplittermondNPCSheet from "module/actor/sheets/npc-sheet";
import SplittermondItemSheet from "module/item/sheets/item-sheet";
import { actorCreator } from "module/data/EntityCreator";
import { withActor } from "../fixtures";
import { passesEventually } from "../../util";
import * as genesisCharacter from "../../resources/importSamples/Hexenkönigin/Cara_Aeternia.json";

class ReadOnlyCharacterSheet extends SplittermondCharacterSheet {
    get isEditable() {
        return false;
    }
}

export function biographyTest({ describe, it, expect }: QuenchBatchContext) {
    // Keep the real Genesis import path without loading unrelated equipment, spells and compendium effects.
    const genesis = {
        ...genesisCharacter,
        skills: [],
        powers: [],
        resources: [],
        spells: [],
        armors: [],
        shields: [],
        meleeWeapons: [],
        longRangeWeapons: [],
        items: [],
    };
    const details: CharacterBiography = {
        hairColor: "weißblond",
        eyeColor: "blau",
        skinColor: "hell",
        height: "1,92 m",
        weight: "70 kg",
        birthplace: "Tairion",
    };

    describe("Character biography", function () {
        // Real imports and repeated sheet writes can exceed two seconds with concurrent Foundry test servers.
        this.timeout(5000);
        it(
            "initializes missing details and retains them through updates and a DataModel roundtrip",
            withActor(async (actor) => {
                for (const field of Object.keys(details)) {
                    expect(actor.system.toObject(), `${field} defaults for older characters`).to.have.property(
                        field,
                        ""
                    );
                }

                await actor.update({ system: details });
                await actor.update({ "system.sex": "weiblich" });

                const restored = new CharacterDataModel((actor.system as CharacterDataModel).toObject());
                expect(restored.toObject()).to.deep.contain(details);
            })
        );

        for (const mode of [
            { name: "replacement", update: false },
            { name: "update", update: true },
        ]) {
            it(
                `imports all six Genesis details in ${mode.name} mode without changing the size class`,
                withActor(async (actor) => {
                    await actor.update({
                        system: {
                            hairColor: "braun",
                            eyeColor: "grün",
                            skinColor: "gebräunt",
                            height: "1,75 m",
                            weight: "80 kg",
                            birthplace: "Arwingen",
                            species: { size: 5 },
                        },
                    });
                    const data = {
                        ...genesis,
                        hairColor: "weißblond",
                        eyeColor: "blau",
                        furColor: "hell",
                        birthplace: "Tairion",
                        size: 192,
                        weight: 70,
                    };

                    await actor.importFromJSON(JSON.stringify(data), mode.update);

                    expect(actor.system.toObject()).to.deep.contain({ ...details, height: "192 cm" });
                    expect((actor.system as CharacterDataModel).species.size).to.equal(5);
                })
            );
        }

        it(
            "preserves manual details and biography when a Genesis update only supplies one detail",
            withActor(async (actor) => {
                await actor.update({ system: { ...details, biography: "<p>Eigene Geschichte</p>" } });
                const data: Record<string, unknown> = { ...genesis, eyeColor: "braun", birthplace: "" };
                delete data.hairColor;

                await actor.importFromJSON(JSON.stringify(data), true);

                expect(actor.system.toObject()).to.deep.contain({
                    ...details,
                    eyeColor: "braun",
                    biography: "<p>Eigene Geschichte</p>",
                });
            })
        );

        it(
            "saves and clears details through the biography form and retains them after reopening",
            withActor(async (actor) => {
                await actor.update({ "system.biography": "<p>Eigene Geschichte</p>" });
                const sheet = new SplittermondCharacterSheet({ document: actor });
                try {
                    await sheet.render({ force: true });
                    sheet.changeTab("editor", "primary");
                    for (const [field, value] of Object.entries(details)) {
                        const selector = `.character-details input[name='system.${field}']`;
                        const input = sheet.element.querySelector<HTMLInputElement>(selector);
                        expect(input, `${field} input is rendered`).to.exist;
                        input!.value = value;
                        input!.dispatchEvent(new Event("change", { bubbles: true }));
                        await passesEventually(() => {
                            expect(actor.system.toObject()).to.have.property(field, value);
                            expect(sheet.element.querySelector<HTMLInputElement>(selector)?.value).to.equal(value);
                        });
                    }
                    await sheet.close();
                    await sheet.render({ force: true });
                    sheet.changeTab("editor", "primary");
                    for (const [field, value] of Object.entries(details)) {
                        expect(
                            sheet.element.querySelector<HTMLInputElement>(`input[name='system.${field}']`)?.value
                        ).to.equal(value);
                    }

                    const birthplace = sheet.element.querySelector<HTMLInputElement>(
                        "input[name='system.birthplace']"
                    )!;
                    birthplace.value = "";
                    birthplace.dispatchEvent(new Event("change", { bubbles: true }));
                    await passesEventually(() => expect(actor.system.toObject()).to.have.property("birthplace", ""));
                    expect(actor.system.biography).to.equal("<p>Eigene Geschichte</p>");
                    expect(sheet.element.querySelector("prose-mirror[name='system.biography']")).to.exist;
                } finally {
                    await sheet.close();
                }
            })
        );

        it(
            "renders read-only details without overflowing their columns",
            withActor(async (actor) => {
                const readOnlyDetails = {
                    ...details,
                    hairColor: "dunkelkastanienbraun",
                    birthplace: "Kristallmondhafen",
                };
                await actor.update({
                    system: { ...readOnlyDetails, biography: "<p>Geschichte</p><p>Zweiter Absatz</p>" },
                });
                const sheet = new ReadOnlyCharacterSheet({ document: actor });
                try {
                    await sheet.render({ force: true });
                    sheet.changeTab("editor", "primary");
                    expect(sheet.element.querySelector(".character-details input")).to.be.null;
                    for (const value of Object.values(readOnlyDetails)) {
                        expect(sheet.element.querySelector(".character-details")?.textContent).to.include(value);
                    }
                    for (const label of sheet.element.querySelectorAll(".character-details label")) {
                        const text = label.ownerDocument.createRange();
                        text.selectNodeContents(label.lastElementChild!);
                        expect(text.getBoundingClientRect().right, label.textContent ?? "detail column").to.be.at.most(
                            label.getBoundingClientRect().right + 1
                        );
                    }
                    const biography = sheet.element.querySelector(".character-biography > :last-child");
                    expect(biography?.querySelectorAll("p")).to.have.length(2);
                } finally {
                    await sheet.close();
                }
            })
        );

        it(
            "keeps NPC and item editors free of character details",
            withActor(
                async (actor) => {
                    const [item] = await actor.createEmbeddedDocuments("Item", [
                        { type: "armor", name: "Biography test armor" },
                    ]);
                    const sheets = [
                        new SplittermondNPCSheet({ document: actor }),
                        new SplittermondItemSheet({ document: item }),
                    ];
                    try {
                        for (const sheet of sheets) {
                            await sheet.render({ force: true });
                            sheet.changeTab("editor", "primary");
                            expect(sheet.element.querySelector(".character-details")).to.be.null;
                            expect(sheet.element.querySelector("prose-mirror")).to.exist;
                        }
                    } finally {
                        await Promise.all(sheets.map((sheet) => sheet.close()));
                    }
                },
                () => actorCreator.createNpc({ type: "npc", name: "Biography test NPC", system: {} })
            )
        );
    });
}

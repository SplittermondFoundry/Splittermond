import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { foundryApi } from "module/api/foundryApi";
import { actorCreator } from "module/data/EntityCreator";
import { ChatMessage } from "../../../module/api/ChatMessage";
import { fields } from "module/data/SplittermondDataModel";
import SplittermondCombat from "module/combat/combat";
import { CharacterDataModel } from "module/actor/dataModel/CharacterDataModel";
import SplittermondCharacterSheet from "../../../module/actor/sheets/character-sheet";
import { withActor, withPlayer, withUnlinkedToken } from "../fixtures";
import { User } from "module/api/foundryTypes";
import { SplittermondBaseActorSheet, SplittermondBaseItemSheet } from "module/data/SplittermondApplication";

declare const game: any;
declare const Combat: any;
declare const Combatant: any;
declare const DocumentSheetConfig: any;

export function foundryTypeDeclarationsTest(context: QuenchBatchContext) {
    const { describe, it, expect, afterEach, before, after } = context;

    describe("ChatMessage", () => {
        it("should be a class", () => {
            expect(typeof ChatMessage).to.equal("function");
        });

        ["img", "name", "type", "uuid"].forEach((property) => {
            it(`should have a string property ${property}`, () => {
                game.items.forEach((item: FoundryDocument) => {
                    expect(item, `Chat message ${item.id} does not have ${property}`).to.have.property(property);
                    expect(
                        typeof item[property as keyof typeof item],
                        `chat message property ${property} is not a string`
                    ).to.equal("string");
                });
            });
        });
        ["system", "folder"].forEach((property) => {
            it(`should have an object property ${property}`, () => {
                game.items.forEach((chatMessage: FoundryDocument) => {
                    expect(chatMessage, `Chat Message ${chatMessage.id} does not have ${property}`).to.have.property(
                        property
                    );
                    expect(
                        typeof chatMessage[property as keyof typeof chatMessage],
                        `chat message property ${property} is not an object`
                    ).to.equal("object");
                });
            });
        });
        ["prepareBaseData", "prepareDerivedData", "toObject", "getFlag", "updateSource"].forEach((property) => {
            it(`should have a method ${property}`, () => {
                expect(ChatMessage.prototype, `Chat message prototype does not have ${property}`).to.have.property(
                    property
                );
                expect(
                    typeof ChatMessage.prototype[property as keyof typeof ChatMessage.prototype],
                    `chat message property ${property} is not a function`
                ).to.equal("function");
            });
        });
        ([["timestamp", fields.NumberField]] as const).forEach(([name, type]) => {
            it("should have a schema property ${name}", () => {
                expect(ChatMessage.defineSchema(), `Item schema contains ${name}`).to.have.property(name);
                expect((ChatMessage.defineSchema() as any)[name], `${name} is of correct type`).to.be.instanceOf(type);
            });
        });
    });
    describe("Item", () => {
        it("should be a class", () => {
            expect(typeof Item).to.equal("function");
        });

        ["img", "name", "type", "uuid"].forEach((property) => {
            it(`should have a string property ${property}`, () => {
                game.items.forEach((item: FoundryDocument) => {
                    expect(item, `Item ${item.id} does not have ${property}`).to.have.property(property);
                    expect(
                        typeof item[property as keyof typeof item],
                        `item property ${property} is not a string`
                    ).to.equal("string");
                });
            });
        });
        ["system", "folder"].forEach((property) => {
            it(`should have an object property ${property}`, () => {
                game.items.forEach((item: FoundryDocument) => {
                    expect(item, `Item ${item.id} does not have ${property}`).to.have.property(property);
                    expect(
                        typeof item[property as keyof typeof item],
                        `item property ${property} is not an object`
                    ).to.equal("object");
                });
            });
        });
        ["prepareBaseData", "prepareDerivedData", "toObject", "getFlag", "setFlag", "updateSource"].forEach(
            (property) => {
                it(`should have a method ${property}`, () => {
                    expect(Item.prototype, `Item prototype does not have ${property}`).to.have.property(property);
                    expect(
                        typeof Item.prototype[property as keyof typeof Item.prototype],
                        `item property ${property} is not a function`
                    ).to.equal("function");
                });
            }
        );

        ([["sort", fields.NumberField]] as const).forEach(([name, type]) => {
            it("should have a schema property ${name}", () => {
                expect(Item.defineSchema(), `Item schema contains ${name}`).to.have.property(name);
                expect((Item.defineSchema() as any)[name], `${name} is of correct type`).to.be.instanceOf(type);
            });
        });

        describe("Item Sheet Registration", () => {
            class TestItemSheet extends SplittermondBaseItemSheet {}
            it("can register a sheet for item", () => {
                foundryApi.sheets.items.register("splittermond", TestItemSheet, { type: ["projectile"] });

                expect(DocumentSheetConfig.getSheetClassesForSubType("Item", "projectile")).to.include(TestItemSheet);
            });

            it("can unregister a sheet for item", () => {
                foundryApi.sheets.items.unregister("splittermond", TestItemSheet);

                expect(DocumentSheetConfig.getSheetClassesForSubType("Item", "projectile")).not.to.include(
                    TestItemSheet
                );
            });
        });
    });

    describe("Actor", () => {
        let actor: Actor;
        before(async () => {
            actor = await actorCreator.createCharacter({
                type: "character",
                name: "Test Character",
                system: {},
            });
        });
        after(() => {
            Actor.deleteDocuments([actor.id]);
        });
        (
            [
                ["img", "string"],
                ["name", "string"],
                ["type", "string"],
                ["uuid", "string"],
                ["folder", "object"],
                ["inCombat", "boolean"],
                ["isToken", "boolean"],
            ] as const
        ).forEach(([property, type]) => {
            it(`should have a property ${property} of type ${type}`, () => {
                expect(actor, `Actor ${actor.id} does not have ${property}`).to.have.property(property);
                expect(typeof actor[property], `Wrong type of actor property ${property}`).to.equal(type);
            });
        });
        (
            [
                ["system", CharacterDataModel],
                ["sheet", SplittermondCharacterSheet],
            ] as const
        ).forEach(([property, type]) => {
            it(`should have property ${property} of complex type`, () => {
                expect(actor, `Actor ${actor.id} does not have ${property}`).to.have.property(property);
                expect(actor[property], `actor property ${property} is not an object`).to.be.instanceof(type);
            });
        });
        [
            "prepareBaseData",
            "prepareDerivedData",
            "toObject",
            "setFlag",
            "getFlag",
            "updateSource",
            "testUserPermission",
        ].forEach((property) => {
            it(`should have a method ${property}`, () => {
                expect(actor, `Actor prototype does not have ${property}`).to.have.property(property);
                expect(typeof actor[property], `actor property ${property} is not a function`).to.equal("function");
            });
        });

        describe("Actor Sheet Registration", () => {
            class TestActorSheet extends SplittermondBaseActorSheet {}
            it("can register a sheet", () => {
                foundryApi.sheets.actors.register("splittermond", TestActorSheet, { type: ["npc"] });

                expect(DocumentSheetConfig.getSheetClassesForSubType("Actor", "npc")).to.include(TestActorSheet);
            });

            it("can unregister a sheet", () => {
                foundryApi.sheets.actors.unregister("splittermond", TestActorSheet);

                expect(DocumentSheetConfig.getSheetClassesForSubType("Actor", "npc")).not.to.include(TestActorSheet);
            });
        });
    });

    describe("Compendium Packs", () => {
        it("should have well formed compendium data", function () {
            const underTest = foundryApi.collections.packs;
            if (underTest.size === 0) {
                this.skip();
            }
            underTest.forEach((pack) => {
                expect(pack.name, `Pack does not have a name`).to.be.a("string");
                expect(pack.metadata, `Pack ${pack.name} does not have metadata`).to.be.a("object");
                expect(pack.index, `Pack ${pack.name} does not have an index`).to.be.a("Map");
                expect(pack.documentName, `Pack ${pack.name}index does not have a documentName`).to.be.a("string");
            });
        });

        it("should have a method called getIndex", () => {
            expect(
                game.packs.find(() => true),
                `compendium collection prototype does not have getIndex`
            ).to.have.property("getIndex");
            expect(game.packs.find(() => true).getIndex).to.be.a("function");
        });
    });

    describe("Token", () => {
        it("should be a class", () => {
            expect(typeof Token).to.equal("function");
        });

        ["document", "controlled"].forEach((property) => {
            it(
                `should have a property called ${property}`,
                withUnlinkedToken(async (sampleToken) => {
                    expect(sampleToken, `Token does not have ${property}`).to.have.property(property);
                    expect(
                        typeof sampleToken[property as keyof typeof sampleToken],
                        `Token property ${property} is a function`
                    ).to.not.equal("function");
                })
            );
        });

        ["_onHoverOut", "_onHoverIn", "control"].forEach((property) => {
            it(`should have a method called ${property}`, () => {
                expect(Token.prototype, `Token prototype does not have ${property}`).to.have.property(property);
                expect(
                    typeof Token.prototype[property as keyof typeof Token.prototype],
                    `Token property ${property} is not a function`
                ).to.equal("function");
            });
        });
    });

    describe("TokenDocument", () => {
        it("should have accessor property object", () => {
            expect(TokenDocument.prototype.object).to.not.be.undefined;
        });

        (
            [
                ["x", fields.NumberField],
                ["y", fields.NumberField],
            ] as const
        ).forEach(([key, type]) => {
            it(`should define a property ${key} in defineSchema`, () => {
                expect(TokenDocument.defineSchema(), `Did not find key ${key} in schema`).to.have.property(key);
                expect((TokenDocument.defineSchema() as any)[key], `${key} is not of type`).to.be.instanceOf(type);
            });
        });
    });

    describe("User", () => {
        ["isGM", "active", "id", "targets", "name"].forEach((property) => {
            it(`should have a property called ${property}`, () => {
                expect(foundryApi.currentUser, `User does not have ${property}`).to.have.property(property);
                expect(
                    typeof foundryApi.currentUser[property as keyof typeof foundryApi.currentUser],
                    `User property ${property} is a function`
                ).to.not.equal("function");
            });
        });

        it("should return null for an unset character", () => {
            const gm = foundryApi.users.find((user) => user.isGM);
            expect(gm?.character).to.be.null;
        });

        it(
            "should return an actor for a set character",
            withPlayer(
                withActor(async (testActor, nonGM: User) => {
                    await (nonGM as unknown as FoundryDocument).update({ character: testActor });
                    expect(nonGM.character).to.be.instanceof(Actor);
                })
            )
        );
    });

    describe("CONFIG", () => {
        it("should have a property called Item", () => {
            expect(CONFIG, "CONFIG does not have a property called Item").to.have.property("Item");
        });

        it("should have a property called Actor", () => {
            expect(CONFIG, "CONFIG does not have a property called Actor").to.have.property("Actor");
        });

        it("should have a property called ChatMessage", () => {
            expect(CONFIG, "CONFIG does not have a property called ChatMessage").to.have.property("ChatMessage");
        });

        it("should have a property called Combat", () => {
            expect(CONFIG, "CONFIG does not have a property called Combat").to.have.property("Combat");
        });

        it("should have a property called Dice", () => {
            expect(CONFIG, "CONFIG does not have a property called Dice").to.have.property("Dice");
        });

        it("should have required Item properties", () => {
            expect(CONFIG.Item.dataModels, "CONFIG.Item is not initialized").to.deep.contain.keys([
                "education",
                "resource",
                "ancestry",
                "culturelore",
            ]);
        });

        it("should have required ChatMessage properties", () => {
            expect(CONFIG.ChatMessage.dataModels, "CONFIG.ChatMessage is not initialized").to.deep.contain.keys([
                "spellRollMessage",
            ]);
        });

        it("should have splittermond properties", () => {
            const underTest = CONFIG.splittermond;
            expect(underTest, "CONFIG does not have a property called splittermond").to.be.an("object");
            expect(
                underTest instanceof Object && "Item" in underTest && underTest.Item,
                "CONFIG.splittermond does not have a property called splittermond"
            ).to.be.an("object");
        });
    });

    describe("Folder", () => {
        let createdFolders = [] as Folder[];

        afterEach(() => {
            Folder.deleteDocuments(createdFolders.map((folder) => folder.id));
            createdFolders = [];
        });

        //the folder property allows setting the parent folder
        async function createFolder(data: Partial<Folder & { folder?: string }>) {
            const folder = (await Folder.create(data)) as Folder;
            createdFolders.push(folder);
            return folder;
        }

        it("should only return Item folders when requested", async () => {
            const itemFolder = await createFolder({ name: "Test Item Folder", type: "Item" });
            const actorFolder = await createFolder({ name: "Test Actor Folder", type: "Actor" });

            const folders = foundryApi.getFolders("Item");

            expect(folders.map((folder) => folder.id)).to.contain(itemFolder.id);
            expect(folders.map((folder) => folder.id)).to.not.contain(actorFolder.id);
        });

        it("should only return Actor folders when requested", async () => {
            const itemFolder = await createFolder({ name: "Test Item Folder", type: "Item" });
            const actorFolder = await createFolder({ name: "Test Actor Folder", type: "Actor" });

            const folders = foundryApi.getFolders("Actor");

            expect(folders.map((folder) => folder.id)).to.not.contain(itemFolder.id);
            expect(folders.map((folder) => folder.id)).to.contain(actorFolder.id);
        });

        it("should return all folders when no type is specified", async () => {
            const itemFolder = await createFolder({ name: "Test Item Folder", type: "Item" });
            const actorFolder = await createFolder({ name: "Test Actor Folder", type: "Actor" });

            const folders = foundryApi.getFolders();

            expect(folders.map((folder) => folder.id)).to.contain(itemFolder.id);
            expect(folders.map((folder) => folder.id)).to.contain(actorFolder.id);
        });

        it("should return parent and child folders flattened", async () => {
            const parent = await createFolder({ name: "Test Item Folder", type: "Item" });
            const child = await createFolder({ name: "Test Actor Folder", type: "Item", folder: parent.id });

            const folders = foundryApi.getFolders("Item");

            expect(
                folders.map((folder) => folder.id),
                "Parent folder not included"
            ).to.contain(parent.id);
            expect(
                folders.map((folder) => folder.id),
                "Child folder not included"
            ).to.contain(child.id);
        });
    });

    describe("Combat", () => {
        ["type", "uuid"].forEach((property) => {
            it(`should have a string property ${property}`, () => {
                game.combats.forEach((combat: FoundryDocument) => {
                    expect(combat, `Combat ${combat.id} does not have ${property}`).to.have.property(property);
                    expect(
                        typeof combat[property as keyof typeof combat],
                        `combat property ${property} is not a string`
                    ).to.equal("string");
                });
            });
        });
        ["system", "turns", "current", "scene"].forEach((property) => {
            it(`should have an object property ${property}`, () => {
                game.combats.forEach((combat: FoundryDocument) => {
                    expect(combat, `Combat ${combat.id} does not have ${property}`).to.have.property(property);
                    expect(
                        typeof combat[property as keyof typeof combat],
                        `combat property ${property} is not an object`
                    ).to.equal("object");
                });
            });
        });
        [
            "prepareBaseData",
            "prepareDerivedData",
            "toObject",
            "setFlag",
            "getFlag",
            "updateSource",
            "startCombat",
        ].forEach((property) => {
            it(`should have a method ${property}`, () => {
                expect(Combat.prototype, `Combat prototype does not have ${property}`).to.have.property(property);
                expect(
                    typeof Combat.prototype[property as keyof typeof Combat.prototype],
                    `combat property ${property} is not a function`
                ).to.equal("function");
            });
        });

        ([["round", fields.NumberField]] as const).forEach(([key, type]) => {
            it(`should have a schema property ${key}`, () => {
                expect(Combat.defineSchema(), `Did not find key ${key} in schema`).to.have.property(key);
                expect((Combat.defineSchema() as any)[key], `${key} is not of type`).to.be.instanceOf(type);
            });
        });

        ["isActive", "started"].forEach((property) => {
            it(`should have a boolean property ${property}`, () => {
                game.combats.forEach((combat: FoundryDocument) => {
                    expect(combat, `Combat ${combat.id} does not have ${property}`).to.have.property(property);
                    expect(
                        typeof combat[property as keyof typeof combat],
                        `combat property ${property} is not a boolean`
                    ).to.equal("boolean");
                });
            });
        });

        (
            [
                ["scene", fields.StringField], //technically ForeignDocument but we don't have that class here
                ["turn", fields.NumberField],
                ["combatants", fields.ArrayField], //technically EmbeddedCollectionField but we don't have that class here,
            ] as const
        ).forEach(([key, type]) => {
            it(`should have a schema property ${key}`, () => {
                expect(SplittermondCombat.defineSchema(), `Did not find key ${key} in schema`).to.have.property(key);
                expect((SplittermondCombat.defineSchema() as any)[key], `${key} is not of type`).to.be.instanceOf(type);
            });
        });
    });

    describe("Combatant", () => {
        const TestCombatant = class extends Combatant {};
        ["type", "uuid"].forEach((property) => {
            it(`should have a string property ${property}`, () => {
                game.combats.forEach((combat: FoundryDocument) => {
                    expect(combat, `Combatant ${combat.id} does not have ${property}`).to.have.property(property);
                    expect(
                        typeof combat[property as keyof typeof combat],
                        `combat property ${property} is not a string`
                    ).to.equal("string");
                });
            });
        });
        ["system"].forEach((property) => {
            it(`should have an object property ${property}`, () => {
                game.combats.forEach((combat: FoundryDocument) => {
                    expect(combat, `Combatant ${combat.id} does not have ${property}`).to.have.property(property);
                    expect(
                        typeof combat[property as keyof typeof combat],
                        `combat property ${property} is not an object`
                    ).to.equal("object");
                });
            });
        });
        ["prepareBaseData", "prepareDerivedData", "toObject", "setFlag", "getFlag", "updateSource"].forEach(
            (property) => {
                it(`should have a method ${property}`, () => {
                    expect(TestCombatant.prototype, `Combatant prototype does not have ${property}`).to.have.property(
                        property
                    );
                    expect(
                        typeof TestCombatant.prototype[property as keyof typeof TestCombatant.prototype],
                        `item property ${property} is not a function`
                    ).to.equal("function");
                });
            }
        );
        ["isDefeated"].forEach((property) => {
            it(`should have a boolean property${property}`, () => {
                expect(TestCombatant.prototype, `Combatant prototype does not have ${property}`).to.have.property(
                    property
                );
                expect(
                    typeof TestCombatant.prototype[property as keyof typeof TestCombatant.prototype],
                    `combatant property ${property} is not a boolean`
                ).to.equal("boolean");
            });
        });
        (
            [
                ["initiative", fields.NumberField],
                ["tokenId", fields.StringField], //ForeignDocumentField but we don't have that class here
                ["sceneId", fields.StringField], //ForeignDocumentField but we don't have that class here
                ["actorId", fields.StringField], //ForeignDocumentField but we don't have that class here
            ] as const
        ).forEach(([key, type]) => {
            it(`should have a schema property ${key}`, () => {
                expect(Combatant.defineSchema(), `Did not find key ${key} in schema`).to.have.property(key);
                expect((Combatant.defineSchema() as any)[key], `${key} is not of type`).to.be.instanceOf(type);
            });
        });
    });
}

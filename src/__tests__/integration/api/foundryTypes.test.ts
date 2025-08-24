import type {QuenchBatchContext} from "@ethaks/fvtt-quench";
import {foundryApi} from "../../../module/api/foundryApi";
import {actorCreator} from "../../../module/data/EntityCreator";
import {ChatMessage} from "../../../module/api/ChatMessage";

declare const game: any
declare const Combat: any
declare const Combatant: any

export function foundryTypeDeclarationsTest(context: QuenchBatchContext) {
    const {describe, it, expect, afterEach} = context;

    describe("ChatMessage", () => {
        it("should be a class", () => {
            expect(typeof ChatMessage).to.equal("function");
        });

        ["img", "name", "type","uuid"].forEach(property => {
            it(`should have a string property ${property}`, () => {
                    game.items.forEach((item: FoundryDocument) => {
                        expect(item, `Chat message ${item.id} does not have ${property}`).to.have.property(property);
                        expect(typeof item[property as keyof typeof item], `chat message property ${property} is not a string`)
                            .to.equal("string");
                    });
                }
            )
        });
        ["system","folder"].forEach(property => {
            it(`should have an object property ${property}`, () => {
                    game.items.forEach((chatMessage: FoundryDocument) => {
                        expect(chatMessage, `Chat Message ${chatMessage.id} does not have ${property}`).to.have.property(property);
                        expect(typeof chatMessage[property as keyof typeof chatMessage], `chat message property ${property} is not an object`)
                            .to.equal("object");
                    });
                }
            )
        });
        ["prepareBaseData", "prepareDerivedData", "toObject", "getFlag", "updateSource"].forEach(property => {
            it(`should have a method ${property}`, () => {
                expect(ChatMessage.prototype, `Chat message prototype does not have ${property}`).to.have.property(property);
                expect(typeof ChatMessage.prototype[property as keyof typeof ChatMessage.prototype], `chat message property ${property} is not a function`)
                    .to.equal("function");

            });
        });
    });
    describe("Item", () => {
        it("should be a class", () => {
            expect(typeof Item).to.equal("function");
        });

        ["img", "name", "type","uuid"].forEach(property => {
            it(`should have a string property ${property}`, () => {
                    game.items.forEach((item: FoundryDocument) => {
                        expect(item, `Item ${item.id} does not have ${property}`).to.have.property(property);
                        expect(typeof item[property as keyof typeof item], `item property ${property} is not a string`)
                            .to.equal("string");
                    });
                }
            )
        });
        ["system","folder"].forEach(property => {
            it(`should have an object property ${property}`, () => {
                    game.items.forEach((item: FoundryDocument) => {
                        expect(item, `Item ${item.id} does not have ${property}`).to.have.property(property);
                        expect(typeof item[property as keyof typeof item], `item property ${property} is not an object`)
                            .to.equal("object");
                    });
                }
            )
        });
        ["prepareBaseData", "prepareDerivedData", "toObject", "getFlag", "setFlag", "updateSource"].forEach(property => {
            it(`should have a method ${property}`, () => {
                expect(Item.prototype, `Item prototype does not have ${property}`).to.have.property(property);
                expect(typeof Item.prototype[property as keyof typeof Item.prototype], `item property ${property} is not a function`)
                    .to.equal("function");

            });
        });
    });

    describe("Actor", () => {
        ["img", "name", "type","uuid"].forEach(property => {
            it(`should have a string property ${property}`, () => {
                    game.actors.forEach((actor: FoundryDocument) => {
                        expect(actor, `Actor ${actor.id} does not have ${property}`).to.have.property(property);
                        expect(typeof actor[property as keyof typeof actor], `actor property ${property} is not a string`)
                            .to.equal("string");
                    });
                }
            )
        });
        ["system","folder"].forEach(property => {
            it(`should have an object property ${property}`, () => {
                    game.actors.forEach((actor: FoundryDocument) => {
                        expect(actor, `Actor ${actor.id} does not have ${property}`).to.have.property(property);
                        expect(typeof actor[property as keyof typeof actor], `actor property ${property} is not an object`)
                            .to.equal("object");
                    });
                }
            )
        });
        ["prepareBaseData", "prepareDerivedData", "toObject", "setFlag", "getFlag", "updateSource"].forEach(property => {
            it(`should have a method ${property}`, () => {
                expect(Actor.prototype, `Actor prototype does not have ${property}`).to.have.property(property);
                expect(typeof Actor.prototype[property as keyof typeof Actor.prototype], `actor property ${property} is not a function`)
                    .to.equal("function");

            });
        });
    });

    describe("Compendium Packs", () => {
        it("should have well formed compendium data", function() {
            const underTest = foundryApi.collections.packs
            if(underTest.size === 0) {
                this.skip();
            }
            underTest.forEach((pack) => {
                expect(pack.name, `Pack does not have a name`).to.be.a("string")
                expect(pack.metadata, `Pack ${pack.name} does not have metadata`).to.be.a("object")
                expect(pack.index, `Pack ${pack.name} does not have an index`).to.be.a("Map")
                expect(pack.documentName, `Pack ${pack.name}index does not have a documentName`).to.be.a("string");
            })
        });

        it("should have a method called getIndex", () => {
            expect(game.packs.find(()=>true), `compendium collection prototype does not have getIndex`).to.have.property("getIndex");
            expect(game.packs.find(()=>true).getIndex).to.be.a("function");
        });
    });

    describe("Token", () => {
        it("should be a class", () => {
            expect(typeof Token).to.equal("function");
        });

        ["document"].forEach(property => {
            const sampleToken = new Token(game.scenes.find(()=>true).tokens.find(()=>true));
            it(`should have a property called ${property}`, () => {
                expect(sampleToken, `Token does not have ${property}`).to.have.property(property);
                expect(typeof sampleToken[property as keyof typeof sampleToken], `Token property ${property} is a function`)
                    .to.not.equal("function");
            });
        });
    });

    describe("User", () => {
        ["isGM", "active", "id", "targets","name"].forEach(property => {
            it(`should have a property called ${property}`, () => {
                expect(foundryApi.currentUser, `User does not have ${property}`).to.have.property(property);
                expect(typeof foundryApi.currentUser[property as keyof typeof foundryApi.currentUser], `User property ${property} is a function`)
                    .to.not.equal("function");
            });
        });

        it("should return null for an unset character", () => {
            const gm = foundryApi.users.find(user => user.isGM);
            expect(gm?.character).to.be.null;
        });

        it("should return an actor for a set character", async () => {
            const testActor = await actorCreator.createCharacter({
                type: "character",
                name: "Test Character",
                system: {}
            });
            const nonGM = foundryApi.users.find(user => !user.isGM);
            expect(nonGM, "No non-GM user found").to.not.be.null;
            nonGM!.character = testActor;
            expect(nonGM!.character).to.be.instanceof(Actor);
            await Actor.deleteDocuments([testActor.id]);
        });
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

        it("should have required Item properties", () => {
            expect(CONFIG.Item.dataModels, "CONFIG.Item is not initialized").to.deep.contain.keys(["education", "resource", "ancestry", "culturelore"]);
        });

        it("should have required ChatMessage properties", () => {
            expect(CONFIG.ChatMessage.dataModels, "CONFIG.ChatMessage is not initialized").to.deep.contain.keys(["spellRollMessage"]);
        })

        it("should have splittermond properties", () => {
            const underTest = CONFIG.splittermond;
            expect(underTest, "CONFIG does not have a property called splittermond").to.be.an("object");
            expect(underTest instanceof Object && "Item" in underTest && underTest.Item,
                "CONFIG.splittermond does not have a property called splittermond").to.be.an("object");
        });
    });

    describe("Folder", () => {
        let createdFolders= [] as Folder[];

        afterEach(() => {
            Folder.deleteDocuments(createdFolders.map(folder => folder.id));
            createdFolders= [];
        });

        //the folder property allows setting the parent folder
        async function createFolder(data: Partial<Folder & {folder?: string}>){
            const folder = await Folder.create(data) as Folder
            createdFolders.push(folder);
            return folder;
        }

        it("should only return Item folders when requested", async () => {
            const itemFolder= await createFolder({name: "Test Item Folder", type: "Item"});
            const actorFolder = await createFolder({name: "Test Actor Folder", type: "Actor"});

            const folders = foundryApi.getFolders("Item");

            expect(folders.map(folder => folder.id)).to.contain(itemFolder.id);
            expect(folders.map(folder => folder.id)).to.not.contain(actorFolder.id);
        });

        it("should only return Actor folders when requested", async () => {
            const itemFolder = await createFolder({name: "Test Item Folder", type: "Item"});
            const actorFolder = await createFolder({name: "Test Actor Folder", type: "Actor"});

            const folders = foundryApi.getFolders("Actor");

            expect(folders.map(folder => folder.id)).to.not.contain(itemFolder.id);
            expect(folders.map(folder => folder.id)).to.contain(actorFolder.id);
        });

        it("should return all folders when no type is specified", async () => {
            const itemFolder = await createFolder({name: "Test Item Folder", type: "Item"});
            const actorFolder = await createFolder({name: "Test Actor Folder", type: "Actor"});

            const folders = foundryApi.getFolders();

            expect(folders.map(folder => folder.id)).to.contain(itemFolder.id);
            expect(folders.map(folder => folder.id)).to.contain(actorFolder.id);
        });

        it("should return parent and child folders flattened", async () => {
            const parent= await createFolder({name: "Test Item Folder", type: "Item"});
            const child= await createFolder({name: "Test Actor Folder", type: "Item", folder:parent.id});

            const folders = foundryApi.getFolders("Item");

            expect(folders.map(folder => folder.id),"Parent folder not included").to.contain(parent.id);
            expect(folders.map(folder => folder.id), "Child folder not included").to.contain(child.id);
        });
    });

    describe("Combat", ()=> {
        ["type","uuid"].forEach(property => {
            it(`should have a string property ${property}`, () => {
                    game.combats.forEach((combat: FoundryDocument) => {
                        expect(combat, `Combat ${combat.id} does not have ${property}`).to.have.property(property);
                        expect(typeof combat[property as keyof typeof combat], `combat property ${property} is not a string`)
                            .to.equal("string");
                    });
                }
            )
        });
        ["system", "turns", "current"].forEach(property => {
            it(`should have an object property ${property}`, () => {
                    game.combats.forEach((combat: FoundryDocument) => {

                        expect(combat, `Combat ${combat.id} does not have ${property}`).to.have.property(property);
                        expect(typeof combat[property as keyof typeof combat], `combat property ${property} is not an object`)
                            .to.equal("object");
                    });
                }
            )
        });
        ["prepareBaseData", "prepareDerivedData", "toObject", "setFlag", "getFlag", "updateSource"].forEach(property => {
            it(`should have a method ${property}`, () => {
                expect(Combat.prototype, `Combat prototype does not have ${property}`).to.have.property(property);
                expect(typeof Combat.prototype[property as keyof typeof Combat.prototype], `combat property ${property} is not a function`)
                    .to.equal("function");

            });
        });
    });

    describe("Combatant", ()=> {
        const TestCombatant = class extends Combatant {};
        ["type","uuid"].forEach(property => {
            it(`should have a string property ${property}`, () => {
                    game.combats.forEach((combat: FoundryDocument) => {
                        expect(combat, `Combatant ${combat.id} does not have ${property}`).to.have.property(property);
                        expect(typeof combat[property as keyof typeof combat], `combat property ${property} is not a string`)
                            .to.equal("string");
                    });
                }
            )
        });
        ["system"].forEach(property => {
            it(`should have an object property ${property}`, () => {
                    game.combats.forEach((combat: FoundryDocument) => {

                        expect(combat, `Combatant ${combat.id} does not have ${property}`).to.have.property(property);
                        expect(typeof combat[property as keyof typeof combat], `combat property ${property} is not an object`)
                            .to.equal("object");
                    });
                }
            )
        });
        ["prepareBaseData", "prepareDerivedData", "toObject", "setFlag", "getFlag", "updateSource"].forEach(property => {
            it(`should have a method ${property}`, () => {
                expect(TestCombatant.prototype, `Combatant prototype does not have ${property}`).to.have.property(property);
                expect(typeof TestCombatant.prototype[property as keyof typeof TestCombatant.prototype], `item property ${property} is not a function`)
                    .to.equal("function");

            });
        });
        ["isDefeated"].forEach(property => {
            it(`should have a boolean property${property}`, () => {
                expect(TestCombatant.prototype, `Combatant prototype does not have ${property}`).to.have.property(property);
                expect(typeof TestCombatant.prototype[property as keyof typeof TestCombatant.prototype], `combatant property ${property} is not a boolean`)
                    .to.equal("boolean");

            });
        });
    });
}

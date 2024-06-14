import {getActor, getSpell, getUnlinkedToken} from "./fixtures.js";
import {AgentReference} from "../../module/data/references/AgentReference.js";
import {api} from "../../module/api/api.js";
import {ItemReference} from "../../module/data/references/ItemReference.js";
import {OnAncestorReference} from "../../module/data/references/OnAncestorReference.js";

export function dataModelTest(context) {
    const {describe, it, expect} = context;
    describe("foundry data model API", () => {
        const TestChild = class extends foundry.abstract.DataModel {
            static defineSchema() {
                return {
                    name: new foundry.data.fields.StringField({required: true, blank: false}),
                }
            }
        };
        const TestParent = class extends foundry.abstract.DataModel {
            static defineSchema() {
                return {
                    child: new foundry.data.fields.EmbeddedDataField(TestChild, {required: true, blank: false}),
                }
            }
        }

        it("injects a parent into embedded data", () => {
            const underTest = new TestParent({child: {name: "test"}});

            expect(underTest.child.parent).to.equal(underTest);
        });

        it("restores embedded data", async () => {
            const underTest = new TestParent({child: {name: "test"}});

            const objectifiedMessage = underTest.toObject();
            const restoredMessage = new TestParent(objectifiedMessage);

            expect(restoredMessage.child).to.be.instanceOf(TestChild);
            expect(restoredMessage.child.name).to.equal("test");
            expect(restoredMessage.child.parent).to.equal(restoredMessage);
        });

        it("validates numbers if validation is demanded", () => {
            const Test = class extends foundry.abstract.DataModel {
                static defineSchema() {
                    return {
                        number: new foundry.data.fields.NumberField({
                            required: true,
                            blank: false,
                            validate: (value) => {
                                if (value <= 0) throw new DataModelValidationError()
                            }
                        })
                    }
                }
            }

            expect(() => new Test({number: 0})).to.throw();
        });

        it("honors required option", () => {
            expect(() => new TestParent({})).to.throw();
        });

        it("honors blank option", () => {
            expect(() => new TestChild({name: " "})).to.throw();
        });

        it("converts serializable members to objects", () => {
            const child = new TestChild({name: "test"});
            const testParent = new TestParent({child});
            const objectified = testParent.toObject();

            expect(objectified).to.deep.equal({child});//don't ask me why an embedded data type is not serializable
        });
    });

    describe("references API", () => {
        it("should get an actor by id", async () => {
            const sampleActor = getActor()
            const fromApi = api.getActor(sampleActor.id)

            expect(fromApi).to.equal(sampleActor);
        });

        it("should return undefined for nonsense id", () => {
            const fromAPI = api.getActor("nonsense");

            expect(fromAPI).to.be.undefined;
        })

        it("should get a token by id and scene", async () => {
            const sampleToken = getUnlinkedToken(this);

            const sceneId = sampleToken.parent.id;
            const fromAPI = api.getToken(sceneId, sampleToken.id);

            expect(sampleToken).to.equal(fromAPI);
        });

        it("should return undefined for nonsense id", () => {
            const fromAPI = api.getToken("nonsense", "bogus");

            expect(fromAPI).to.be.undefined;
        });
    });

    describe("ItemReference", () => {
        it("should find an item in a top level collection", () => {
            const /**@type SplittermondSpellItem */ sampleItem = getSpell(this);

            const underTest = ItemReference.initialize(sampleItem);

            expect(underTest.getItem()).to.equal(sampleItem);
        });

        it("should find an item in an actor's collection", async () => {
            const /**@type SplittermondSpellItem */ sampleItem = getSpell(this);
            const sampleActor = getActor(this);
            const itemOnActor = await sampleActor.createEmbeddedDocuments("Item", [sampleItem]).then(a => a[0]);

            const underTest = ItemReference.initialize(itemOnActor);

            expect(underTest.getItem()).to.equal(itemOnActor);
            await sampleActor.deleteEmbeddedDocuments("Item", [itemOnActor.id])
        });

    });

    describe("AgentReference", () => {
        it("should return an actor from a reference", () => {
            const sampleActor = getActor(this);
            const reference = AgentReference.initialize(sampleActor);

            expect(reference.getAgent()).to.equal(sampleActor);
        });

        it("should return a token from an actor reference", () => {
            const sampleToken = getUnlinkedToken(this);
            const reference = AgentReference.initialize(sampleToken.actor);

            expect(reference.getAgent()).to.equal(sampleToken.actor);
        });

        it("should return a actor from a token input", () => {
            const sampleToken = getUnlinkedToken(this);
            const reference = AgentReference.initialize(sampleToken);

            expect(reference.getAgent()).to.equal(sampleToken.actor);
        })

        it("should be able to read the document type from the document name field", () => {
            expect(getActor().documentName).to.equal("Actor");
            expect(getUnlinkedToken().documentName).to.equal("Token");
        })
    });

    describe("OnAncestorReference", () => {
        const TestChild = class extends foundry.abstract.DataModel {
            static defineSchema() {
                return {
                    name: new foundry.data.fields.StringField({required: true, blank: false}),
                    ref: new foundry.data.fields.EmbeddedDataField(OnAncestorReference, {required: true, nullable: false}),
                }
            }
        };
        const TestParent = class extends foundry.abstract.DataModel {
            static defineSchema() {
                return {
                    child: new foundry.data.fields.EmbeddedDataField(TestChild, {required: true, blank: false}),
                    value: new foundry.data.fields.StringField({required: true, blank: false}),
                    id: new foundry.data.fields.StringField({required: true, blank: false}),
                }
            }
        }

        it("should return the value on the parent", () => {
            const reference = OnAncestorReference.for(TestParent)
                .identifiedBy("id", "1").references("value").toObject();

            const child = new TestChild({name: "test", ref: reference}).toObject();
            const parent = new TestParent({child, value: "I want to read this", id: "1"});

            expect(parent.child.ref.get()).to.equal(parent.value);
        });

        it("should track changes on the references", () => {
            const reference = OnAncestorReference.for(TestParent)
                .identifiedBy("id", "1").references("value");
            const parent = new TestParent({child: {name: "test", ref: reference}, value: "I want to read this", id: "1"});

            parent.value = "I want to read this too";

            expect(parent.child.ref.get()).to.equal(parent.value);
        });
    });
}
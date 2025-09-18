import { DocumentAccessMixin } from "../../../../module/data/AncestorDocumentMixin";
import { IllegalStateException } from "../../../../module/data/exceptions";
import { afterEach, beforeEach, describe, it } from "mocha";
import { expect } from "chai";
import sinon from "sinon";

describe("DocumentAccessMixin", () => {
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    // Mock classes for testing
    class MockDocument {
        constructor(public name: string) {}
    }

    class MockParent {
        constructor(public parent: any = null) {}
    }

    class MockBaseClass {
        constructor(public parent: any = null) {}
    }

    class MockTargetDocument extends MockDocument {
        constructor(name: string = "TargetDocument") {
            super(name);
        }
    }

    class MockOtherDocument extends MockDocument {
        constructor(name: string = "OtherDocument") {
            super(name);
        }
        parent: unknown | null = null;
    }

    describe("constructor", () => {
        it("should create a mixin class that extends the base class", () => {
            const MixedClass = DocumentAccessMixin(MockBaseClass, MockTargetDocument);
            const instance = new MixedClass();

            expect(instance).to.be.instanceOf(MockBaseClass);
        });
    });

    describe("findDocument", () => {
        it("should return null when no parent exists", () => {
            const MixedClass = DocumentAccessMixin(MockBaseClass, MockTargetDocument);
            const instance = new MixedClass();

            const result = instance.findDocument();

            expect(result).to.be.null;
            expect((instance as any).triedToFindDocument).to.be.true;
        });

        it("should return null when parent chain doesn't contain target document", () => {
            const MixedClass = DocumentAccessMixin(MockBaseClass, MockTargetDocument);
            const otherDoc = new MockOtherDocument();
            const instance = new MixedClass(otherDoc);

            const result = instance.findDocument();

            expect(result).to.be.null;
            expect((instance as any).triedToFindDocument).to.be.true;
        });

        it("should find target document in immediate parent", () => {
            const MixedClass = DocumentAccessMixin(MockBaseClass, MockTargetDocument);
            const targetDoc = new MockTargetDocument();
            const instance = new MixedClass(targetDoc);

            const result = instance.findDocument();

            expect(result).to.equal(targetDoc);
            expect((instance as any)._document).to.equal(targetDoc);
            expect((instance as any).triedToFindDocument).to.be.true;
        });

        it("should find target document in parent chain", () => {
            const MixedClass = DocumentAccessMixin(MockBaseClass, MockTargetDocument);
            const targetDoc = new MockTargetDocument();
            const intermediateParent = new MockParent(targetDoc);
            const instance = new MixedClass(intermediateParent);

            const result = instance.findDocument();

            expect(result).to.equal(targetDoc);
            expect((instance as any)._document).to.equal(targetDoc);
        });

        it("should find target document in deep parent chain", () => {
            const MixedClass = DocumentAccessMixin(MockBaseClass, MockTargetDocument);
            const targetDoc = new MockTargetDocument();
            const grandParent = new MockParent(targetDoc);
            const parent = new MockParent(grandParent);
            const instance = new MixedClass(parent);

            const result = instance.findDocument();

            expect(result).to.equal(targetDoc);
        });

        it("should return cached document on subsequent calls", () => {
            const MixedClass = DocumentAccessMixin(MockBaseClass, MockTargetDocument);
            const targetDoc = new MockTargetDocument();
            const instance = new MixedClass(targetDoc);

            const firstResult = instance.findDocument();
            const secondResult = instance.findDocument();

            expect(firstResult).to.equal(targetDoc);
            expect(secondResult).to.equal(targetDoc);
            expect(firstResult).to.equal(secondResult);
        });

        const testCases = [
            {
                description: "should stop traversal when parent is null",
                setup: () => {
                    const nullParent = new MockParent(null);
                    return { parent: nullParent, expectedResult: null };
                },
            },
            {
                description: "should stop traversal when parent is not an object",
                setup: () => {
                    const primitiveParent = { parent: "string" };
                    return { parent: primitiveParent, expectedResult: null };
                },
            },
            {
                description: "should stop traversal when parent has no parent property",
                setup: () => {
                    const noParentProperty = { someOtherProperty: "value" };
                    const parentWithoutParent = { parent: noParentProperty };
                    return { parent: parentWithoutParent, expectedResult: null };
                },
            },
        ];

        testCases.forEach(({ description, setup }) => {
            it(description, () => {
                const MixedClass = DocumentAccessMixin(MockBaseClass, MockTargetDocument);
                const { parent, expectedResult } = setup();
                const instance = new MixedClass(parent);

                const result = instance.findDocument();

                expect(result).to.equal(expectedResult);
            });
        });
    });

    describe("document getter", () => {
        it("should return document when found", () => {
            const MixedClass = DocumentAccessMixin(MockBaseClass, MockTargetDocument);
            const targetDoc = new MockTargetDocument();
            const instance = new MixedClass(targetDoc);

            const result = instance.document;

            expect(result).to.equal(targetDoc);
        });

        it("should throw IllegalStateException when document not found", () => {
            const MixedClass = DocumentAccessMixin(MockBaseClass, MockTargetDocument);
            const instance = new MixedClass();

            expect(() => instance.document).to.throw(
                IllegalStateException,
                "Could not find ancestor document of type MockTargetDocument"
            );
        });

        it("should throw IllegalStateException with correct document class name", () => {
            class CustomDocument extends MockDocument {
                constructor() {
                    super("CustomDocument");
                }
            }

            const MixedClass = DocumentAccessMixin(MockBaseClass, CustomDocument);
            const instance = new MixedClass();

            expect(() => instance.document).to.throw(
                IllegalStateException,
                "Could not find ancestor document of type CustomDocument"
            );
        });

        it("should call findDocument and cache result", () => {
            const MixedClass = DocumentAccessMixin(MockBaseClass, MockTargetDocument);
            const targetDoc = new MockTargetDocument();
            const instance = new MixedClass(targetDoc);

            const findDocumentSpy = sandbox.spy(instance, "findDocument");

            const firstAccess = instance.document;
            const secondAccess = instance.document;

            expect(firstAccess).to.equal(targetDoc);
            expect(secondAccess).to.equal(targetDoc);
            expect(findDocumentSpy.callCount).to.equal(1);
        });
    });

    describe("edge cases", () => {
        it("should handle circular parent references without infinite loop", () => {
            const MixedClass = DocumentAccessMixin(MockBaseClass, MockTargetDocument);
            const parent1 = new MockParent();
            const parent2 = new MockParent(parent1);
            parent1.parent = parent2; // Create circular reference

            const instance = new MixedClass(parent1);

            // Should not throw or hang
            const result = instance.findDocument();
            expect(result).to.be.null;
        });

        it("should work with multiple different document types in chain", () => {
            class AnotherDocument extends MockDocument {
                constructor() {
                    super("AnotherDocument");
                }
                parent: unknown | null = null;
            }

            const MixedClass = DocumentAccessMixin(MockBaseClass, MockTargetDocument);
            const targetDoc = new MockTargetDocument();
            const anotherDoc = new AnotherDocument();
            const otherDoc = new MockOtherDocument();

            // Chain: instance -> otherDoc -> anotherDoc -> targetDoc
            anotherDoc.parent = targetDoc;
            otherDoc.parent = anotherDoc;
            const instance = new MixedClass(otherDoc);

            const result = instance.findDocument();
            expect(result).to.equal(targetDoc);
        });

        it("should handle when base class has its own parent property", () => {
            class BaseWithParent {
                constructor(
                    public parent: any = null,
                    public baseProperty: string = "base"
                ) {}
            }

            const MixedClass = DocumentAccessMixin(BaseWithParent, MockTargetDocument);
            const targetDoc = new MockTargetDocument();
            const instance = new MixedClass(targetDoc, "testBase");

            expect(instance.baseProperty).to.equal("testBase");
            expect(instance.findDocument()).to.equal(targetDoc);
        });
    });
});

import "../../../foundryMocks.js";
import { SplittermondDataModel } from "module/data/SplittermondDataModel";
import { OnAncestorReference } from "module/data/references/OnAncestorReference";
import { describe, it } from "mocha";
import { expect } from "chai";
import sinon from "sinon";

describe("OnParentReference", () => {
    it("should return the value on the parent", () => {
        const model = createModel();
        model.updateSource({ identifier: "1" });
        model.updateSource({ target: "I want to read this" });
        const reference = OnAncestorReference.for(Parent).identifiedBy("identifier", "1").references("target");
        reference.parent = model;
        expect(reference.get()).to.equal("I want to read this");
    });

    it("should return the value on the parent", () => {
        const model = createModel();
        model.updateSource({ identifier: "1" });
        model.updateSource({ target: "I want to read this" });
        const reference = OnAncestorReference.for(Parent).identifiedBy("identifier", "1").references("target");
        reference.parent = model.firstChild.child;
        const grandchild = Object.defineProperty(model.firstChild.child, "reference", { value: reference });
        reference.parent = grandchild;
        model.firstChild.updateSource({ child: grandchild });

        const result = reference.get();

        expect(result).to.equal("I want to read this");
    });

    it("should throw an error if the parent does not exist", () => {
        const model = createModel();
        model.updateSource({ identifier: "1" });
        model.updateSource({ target: "I want to read this" });
        const reference = OnAncestorReference.for(Parent)
            .identifiedBy("identifier", model.identifier)
            .references("target");
        const grandchild = Object.defineProperty(model.firstChild.child, "reference", {
            value: reference,
        }) as Grandchild & { reference: OnAncestorReference<string> };
        model.firstChild.updateSource({ child: grandchild });
        model.firstChild.child.parent = null;

        expect(() => grandchild.reference.get()).to.throw("No ancestor with id 1 found");
    });

    it("should throw an error if id is not defined during setup", () => {
        const model = createModel();
        model.updateSource({ target: "I want to read this" });
        //@ts-expect-error we try to fail on purpose here.
        expect(() => OnAncestorReference.for(Parent).identifiedBy("id").references("target")).to.throw(Error);
    });

    it("should throw an error if reference is not defined during setup", () => {
        expect(() =>
            OnAncestorReference.for(Parent)
                .identifiedBy("identifier", "target")
                //@ts-expect-error we try to fail on purpose
                .references("target2")
        ).to.throw(Error);
    });

    it("should handle Ids other than 'identifier'", () => {
        class TestModel extends SplittermondDataModel<{ value?: string; target?: string }> {
            static defineSchema = sinon.stub().returns({ value: "", target: "" });
        }
        const model = new TestModel({ value: "Val", target: "Look at me, I'm the ID now" });

        const ref = OnAncestorReference.for(TestModel)
            .identifiedBy("target", model.target as string)
            .references("value");
        ref.parent = model;

        expect(ref.get()).to.equal(model.value);
    });
});

function createModel(): Parent {
    const grandchild = new Grandchild({ value: "grandchild" });
    const firstChild = new Child({ value: "firstChild", child: grandchild });
    const parent = new Parent({ firstChild, identifier: "", target: "" });
    Object.defineProperty(grandchild, "parent", { value: firstChild, writable: true });
    Object.defineProperty(firstChild, "parent", { value: parent, writable: true });
    return parent;
}

class Parent extends SplittermondDataModel<{ firstChild: Child; identifier: string; target: string }> {
    static defineSchema = sinon.stub().returns({ value: "", child: "", identifier: "", target: "" });
}

class Child extends SplittermondDataModel<{ value: string; child: Grandchild }> {
    static defineSchema = sinon.stub().returns({ value: "", child: "" });
}

class Grandchild extends SplittermondDataModel<{ value: string }, any> {
    static defineSchema = sinon.stub().returns({ value: "" });
}

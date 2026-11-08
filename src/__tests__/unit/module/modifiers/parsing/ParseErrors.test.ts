import { afterEach, describe, it } from "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { ParseErrors } from "module/modifiers/parsing/ParseErrors";
import { foundryApi } from "module/api/foundryApi";

describe("Modifier diagnostics", () => {
    const sandbox = sinon.createSandbox();
    afterEach(() => sandbox.restore());

    it("distinguishes a whole-modifier error from an error in a specific attribute", () => {
        const errors = new ParseErrors("item.damage +1", "Test item");

        errors.consumer.global("Invalid modifier");
        errors.consumer.forAttribute("skill", "Invalid skill");

        expect(errors.diagnostics).to.deep.equal([
            { scope: "modifier", message: "Invalid modifier" },
            { scope: "attribute", attribute: "skill", message: "Invalid skill" },
        ]);
        expect(errors.hasErrors).to.equal(true);
    });

    it("prints attribute context as well as whole-modifier errors", () => {
        const report = sandbox.stub(foundryApi, "reportError");
        sandbox
            .stub(foundryApi, "format")
            .callsFake((key, args) =>
                key.endsWith("attributeErrorMessage")
                    ? `${args.attribute}: ${args.message}`
                    : "Invalid modifier on Test item"
            );
        const errors = new ParseErrors("item.damage +1", "Test item");
        errors.push("Invalid modifier");
        errors.withAttribute("value").push("Not a number");

        errors.printAll();

        expect(report.callCount).to.equal(1);
        expect(report.firstCall.firstArg).to.equal(
            "Invalid modifier on Test item\nInvalid modifier\nvalue: Not a number"
        );
    });

    it("keeps an empty diagnostic collection silent", () => {
        const report = sandbox.stub(foundryApi, "reportError");
        const errors = new ParseErrors("", "Test item");

        errors.printAll();

        expect(errors.diagnostics).to.deep.equal([]);
        expect(errors.hasErrors).to.equal(false);
        expect(report.callCount).to.equal(0);
    });
});

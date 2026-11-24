import { describe, it } from "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { DisposableJSDOM } from "./DisposableJSDOM";

describe("Scoped DOM cleanup", () => {
    it("closes the window when a test leaves its DOM scope", () => {
        const dom = new DisposableJSDOM("<p>Test</p>");
        const listener = sinon.spy();
        dom.window.addEventListener("probe", listener);

        {
            using scopedDom = dom;
            expect(scopedDom.window.document.querySelector("p")?.textContent).to.equal("Test");
            scopedDom.window.dispatchEvent(new scopedDom.window.Event("probe"));
        }

        dom.window.dispatchEvent(new dom.window.Event("probe"));
        expect(listener.callCount).to.equal(1);
    });

    it("closes the window when an assertion aborts the DOM scope", () => {
        const dom = new DisposableJSDOM("<p>Test</p>");
        const listener = sinon.spy();
        dom.window.addEventListener("probe", listener);

        expect(() => {
            using scopedDom = dom;
            expect(scopedDom.window.document.querySelector("p")?.textContent).to.equal("Different");
        }).to.throw();

        dom.window.dispatchEvent(new dom.window.Event("probe"));
        expect(listener.callCount).to.equal(0);
    });
});

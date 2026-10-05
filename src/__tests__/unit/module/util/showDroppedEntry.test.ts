import { expect } from "chai";
import sinon from "sinon";
import { JSDOM } from "jsdom";
import { FoundryApplication } from "module/api/Application";
import { showDroppedEntry } from "module/util/showDroppedEntry";

describe("showDroppedEntry", () => {
    const sandbox = sinon.createSandbox();
    let sheet: InstanceType<typeof FoundryApplication>;
    let events: EventTarget;
    let rendered: boolean;
    let addEventListener: sinon.SinonStub;
    let removeEventListener: sinon.SinonStub;

    beforeEach(() => {
        rendered = true;
        sheet = new FoundryApplication({});
        Object.defineProperty(sheet, "element", { value: new JSDOM().window.document.body });
        Object.defineProperty(sheet, "rendered", { get: () => rendered });
        events = new EventTarget();
        addEventListener = sandbox.stub(sheet, "addEventListener").callsFake(events.addEventListener.bind(events));
        removeEventListener = sandbox
            .stub(sheet, "removeEventListener")
            .callsFake(events.removeEventListener.bind(events));
    });
    afterEach(() => sandbox.restore());

    function addRow() {
        sheet.element.innerHTML =
            '<section data-tab="effects"><li class="effect-card" data-effect-id="new"></li></section>';
        const row = sheet.element.querySelector("li")!;
        const scroll = sandbox.stub();
        const animate = sandbox.stub();
        sandbox.define(row, "scrollIntoView", scroll);
        sandbox.define(row, "animate", animate);
        return { scroll, animate };
    }

    it("reveals an existing row and forces the tab DOM to match the selected tab without rendering", () => {
        const { scroll, animate } = addRow();
        const changeTab = sandbox.stub(sheet, "changeTab");
        const render = sandbox.spy(sheet, "render");
        showDroppedEntry(sheet, "effects", '[data-effect-id="new"]');
        expect(changeTab.firstCall.args).to.deep.equal(["effects", "primary", { force: true }]);
        sinon.assert.callOrder(changeTab, scroll, animate);
        expect(render.called).to.be.false;
        expect(addEventListener.called).to.be.false;
    });

    for (const alreadyRendered of [true, false]) {
        it(`waits for the row when rendered is ${alreadyRendered} and removes its listeners after highlighting`, () => {
            rendered = alreadyRendered;
            const changeTab = sandbox.stub(sheet, "changeTab");
            const render = sandbox.spy(sheet, "render");
            showDroppedEntry(sheet, "effects", '[data-effect-id="new"]');
            if (!alreadyRendered) expect(changeTab.called).to.be.false;

            // A queued render can still precede the document update that adds the row.
            events.dispatchEvent(new Event("render"));
            const { animate } = addRow();
            rendered = true;
            events.dispatchEvent(new Event("render"));
            const changes = changeTab.callCount;
            events.dispatchEvent(new Event("render"));
            expect(changeTab.callCount).to.equal(changes);
            expect(animate.calledOnce).to.be.true;
            expect(render.called).to.be.false;
            expect(removeEventListener.args.map(([type]) => type)).to.deep.equal(["render", "close"]);
        });
    }

    it("cancels a pending reveal when the sheet closes", () => {
        rendered = false;
        const changeTab = sandbox.stub(sheet, "changeTab");
        showDroppedEntry(sheet, "effects", '[data-effect-id="new"]');
        events.dispatchEvent(new Event("close"));
        const { animate } = addRow();
        rendered = true;
        events.dispatchEvent(new Event("render"));
        expect(changeTab.called).to.be.false;
        expect(animate.called).to.be.false;
    });
});

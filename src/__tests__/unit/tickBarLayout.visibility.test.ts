import { expect } from "chai";
import { JSDOM } from "jsdom";
import { Runnable } from "mocha";
import sinon from "sinon";
import { VisibleLayout } from "../integration/tickBarLayout.visibility";

describe("Visible layout assertions", () => {
    let dom: JSDOM;
    let clock: sinon.SinonFakeTimers;
    let frames: Map<number, FrameRequestCallback>;
    let nextFrame: number;
    let runnable: Runnable;

    beforeEach(() => {
        dom = new JSDOM("", { pretendToBeVisual: true });
        clock = sinon.useFakeTimers();
        frames = new Map();
        nextFrame = 0;
        sinon.stub(dom.window, "requestAnimationFrame").callsFake((callback) => {
            frames.set(++nextFrame, callback);
            return nextFrame;
        });
        sinon.stub(dom.window, "cancelAnimationFrame").callsFake((id) => frames.delete(id));
        runnable = new Runnable("layout", () => {});
        runnable.timeout(10000);
    });

    afterEach(() => {
        clock.restore();
        sinon.restore();
        dom.window.close();
    });

    function setHidden(hidden: boolean) {
        Object.defineProperty(dom.window.document, "hidden", { configurable: true, value: hidden });
        dom.window.document.dispatchEvent(new dom.window.Event("visibilitychange"));
    }

    async function renderFrame() {
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach((callback) => callback(Date.now()));
        await clock.tickAsync(0);
    }

    it("waits for visibility without consuming the test timeout or skipping assertions", async () => {
        setHidden(true);
        using layout = new VisibleLayout(runnable, dom.window.document);
        const assertion = sinon.spy();
        let completed = false;
        const result = layout.expect(assertion).then(() => (completed = true));

        await clock.tickAsync(20000);
        expect(runnable.timeout()).to.equal(0);
        expect(assertion.called).to.be.false;
        expect(completed).to.be.false;

        setHidden(false);
        await renderFrame();
        await result;
        expect(assertion.calledOnce).to.be.true;
        expect(runnable.timeout()).to.equal(30000);
    });

    it("resumes the same assertion when the window becomes hidden during polling", async () => {
        using layout = new VisibleLayout(runnable, dom.window.document);
        let ready = false;
        let completed = false;
        const assertion = sinon.spy(() => expect(ready).to.be.true);
        const result = layout.expect(assertion).then(() => (completed = true));
        await renderFrame();

        setHidden(true);
        await clock.tickAsync(20000);
        expect(completed).to.be.false;
        expect(assertion.calledOnce).to.be.true;

        ready = true;
        setHidden(false);
        await renderFrame();
        await result;
        expect(assertion.calledTwice).to.be.true;
    });

    it("still rejects an incorrect layout in a visible window and removes its listener", async () => {
        const remove = sinon.spy(dom.window.document, "removeEventListener");
        const failure = new Error("the bar still overlaps");
        const result = (async () => {
            using layout = new VisibleLayout(runnable, dom.window.document);
            await layout.expect(() => {
                throw failure;
            });
        })().then(
            () => undefined,
            (error: unknown) => error
        );

        await renderFrame();
        await clock.tickAsync(550);
        expect(await result).to.equal(failure);
        expect(remove.calledWith("visibilitychange")).to.be.true;
        setHidden(true);
        expect(runnable.timeout()).to.equal(10000);
    });

    it("cancels a pending frame when disposed", async () => {
        const layout = new VisibleLayout(runnable, dom.window.document);
        const assertion = sinon.spy();
        const result = layout.expect(assertion).then(
            () => undefined,
            (error: unknown) => error
        );

        layout[Symbol.dispose]();

        expect(await result).to.be.instanceOf(Error);
        expect(frames.size).to.equal(0);
        expect(assertion.called).to.be.false;
    });
});

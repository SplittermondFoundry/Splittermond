import { FoundryDialog } from "module/api/Application";
import sinon, { type SinonStub } from "sinon";
import { foundryApi } from "module/api/foundryApi";
import { expect } from "chai";
import { askUserForTickAddition } from "module/actor/TickAdditionDialog";
import { JSDOM } from "jsdom";
import { splittermond } from "module/config";

describe("TickAdditonDialog", () => {
    const sandbox = sinon.createSandbox();
    let promptMock: SinonStub;
    beforeEach(() => {
        promptMock = sandbox.stub(FoundryDialog, "prompt");
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => key);
    });
    afterEach(() => {
        sandbox.restore();
    });

    it("should return 0 when dialog is cancelled", async () => {
        promptMock.rejects();
        expect(await askUserForTickAddition(30, "")).to.equal(0);
    });

    [
        [121, 1.008],
        [324, 2.7],
        [1440, 12],
    ].forEach(([ticks, minutes]) => {
        it(`should convert ticks into minutes for ${ticks} ticks`, async () => {
            promptMock.resolves(ticks);
            await askUserForTickAddition(ticks, "");
            expect(promptMock.calledOnce).to.be.true;
            const doc = new JSDOM(promptMock.lastCall.firstArg.content).window.document;
            expect(doc.querySelector("label")?.textContent).to.equal("min");
            expect((doc.querySelector("input") as HTMLInputElement).valueAsNumber).to.equal(minutes);
        });
    });
    it("should convert ticks into hours for large tick values", async () => {
        sandbox
            .stub(splittermond, "time")
            .value({ timeUnits: ["T", "min", "h"], relativeDurations: { T: 1, min: 12, h: 720 } });
        promptMock.rejects(725);

        await askUserForTickAddition(725, "");

        const dom = new JSDOM(promptMock.lastCall.firstArg.content);
        expect(dom.window.document.querySelector("label")?.textContent).to.contain("h");
    });

    it("should convert ticks into days for very large tick values", async () => {
        sandbox
            .stub(splittermond, "time")
            .value({ timeUnits: ["T", "min", "d"], relativeDurations: { T: 1, min: 12, d: 17280 } });
        promptMock.resolves(1); // Simulate user entering 1 day

        await askUserForTickAddition(2 * 17280, ""); // 17280 ticks = 1 day

        const dom = new JSDOM(promptMock.lastCall.firstArg.content);
        expect(dom.window.document.querySelector("label")?.textContent).to.contain("d");
    });

    [1, 2, 3, 15, 63, 119, 120, 240, 480, 1440].forEach((ticks) => {
        it(`should display integer interval of ${ticks} without decimals`, async () => {
            promptMock.resolves(ticks);

            await askUserForTickAddition(ticks, "");

            expect(promptMock.calledOnce).to.be.true;
            const doc = new JSDOM(promptMock.lastCall.firstArg.content).window.document;
            expect((doc.querySelector("input") as HTMLInputElement).value).to.match(/^\d+$/);
        });
    });

    it("should handle zero ticks gracefully", async () => {
        promptMock.resolves(0);
        expect(await askUserForTickAddition(0, "Zero test")).to.equal(0);
    });

    it("should handle negative ticks gracefully", async () => {
        const mockApi = sandbox.stub(foundryApi, "warnUser");
        promptMock.resolves(-60);
        expect(await askUserForTickAddition(25, "Negative test")).to.equal(25);
        expect(mockApi.calledOnce).to.be.true;
    });

    it("should return correct ticks when user enters a value", async () => {
        promptMock.resolves(5);
        expect(await askUserForTickAddition(300, "Enter value")).to.equal(600);
    });

    it("should handle non-numeric input by returning original ticks", async () => {
        const mockApi = sandbox.stub(foundryApi, "reportError");
        promptMock.resolves("not-a-number");
        expect(await askUserForTickAddition(60, "Non-numeric")).to.equal(60);
        expect(mockApi.calledOnce).to.be.true;
    });

    it("should render input and label inside a div", async () => {
        promptMock.resolves(5);
        await askUserForTickAddition(60, "Structure test");
        const dom = new JSDOM(promptMock.lastCall.firstArg.content);
        const div = dom.window.document.querySelector("div");
        expect(div?.querySelector("input")).to.not.be.null;
        expect(div?.querySelector("label")).to.not.be.null;
    });

    it("should handle extremely large tick values", async () => {
        promptMock.resolves(1000000);
        await askUserForTickAddition(1000000, "Large value test");
        const dom = new JSDOM(promptMock.lastCall.firstArg.content);
        expect(dom.window.document.querySelector("label")?.textContent).to.not.be.empty;
    });
});

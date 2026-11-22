import { expect } from "chai";
import sinon from "sinon";
import { cleanupInOrder, closeSheets, closeSheetsAfterTest } from "../integration/cleanup";

describe("Integration resource cleanup", () => {
    it("reports both sheet close failures after attempting every sheet", async () => {
        const sourceFailure = new Error("Source sheet could not close");
        const targetFailure = new Error("Target sheet could not close");
        const source = { close: sinon.stub().rejects(sourceFailure) };
        const target = { close: sinon.stub().rejects(targetFailure) };

        const failure = await closeSheets(source, target).catch((error: unknown) => error);

        expect(failure).to.be.instanceOf(AggregateError);
        expect((failure as AggregateError).errors).to.deep.equal([sourceFailure, targetFailure]);
        expect(source.close.firstCall.args).to.deep.equal([{ animate: false }]);
        expect(target.close.firstCall.args).to.deep.equal([{ animate: false }]);
    });

    it("awaits a pending sheet close even when another close fails", async () => {
        const failure = new Error("Source sheet could not close");
        let finishTargetClose!: () => void;
        const targetClose = new Promise<void>((resolve) => (finishTargetClose = resolve));
        const source = { close: sinon.stub().rejects(failure) };
        const target = { close: sinon.stub().returns(targetClose) };
        let settled = false;

        const cleanup = closeSheets(source, target)
            .catch((error: unknown) => error)
            .finally(() => (settled = true));
        try {
            await Promise.resolve();
            expect(settled, "Cleanup still waits for the target sheet").to.be.false;
        } finally {
            finishTargetClose();
        }
        const result = await cleanup;

        expect(result).to.be.instanceOf(AggregateError);
        expect((result as AggregateError).errors).to.deep.equal([failure]);
    });

    it("disposes sheets before leaving the resource scope when the test fails", async () => {
        const failure = new Error("Assertion failure");
        const sheet = { close: sinon.stub().resolves() };
        async function scenario() {
            await using _sheets = closeSheetsAfterTest(sheet);
            throw failure;
        }

        const result = await scenario().catch((error: unknown) => error);

        expect(result).to.equal(failure);
        expect(sheet.close.calledOnceWithExactly({ animate: false })).to.be.true;
    });

    it("finishes closing sheets before deleting tokens and then actors", async () => {
        let finishClose!: () => void;
        const close = new Promise<void>((resolve) => (finishClose = resolve));
        const tokens = sinon.stub().resolves();
        const actors = sinon.stub().resolves();

        const cleanup = cleanupInOrder(() => close, tokens, actors);
        try {
            await Promise.resolve();
            expect(tokens.called, "Tokens survive until sheet closing finishes").to.be.false;
        } finally {
            finishClose();
        }
        await cleanup;

        expect(tokens.calledBefore(actors)).to.be.true;
        expect(actors.calledOnce).to.be.true;
    });

    it("still deletes tokens and actors and reports all failed cleanup stages", async () => {
        const sheetFailure = new Error("Sheet close failure");
        const tokenFailure = new Error("Token deletion failure");
        const sheets = sinon.stub().rejects(sheetFailure);
        const tokens = sinon.stub().rejects(tokenFailure);
        const actors = sinon.stub().resolves();

        const result = await cleanupInOrder(sheets, tokens, actors).catch((error: unknown) => error);

        expect(actors.calledOnce, "Actor cleanup is still attempted").to.be.true;
        expect(tokens.calledBefore(actors)).to.be.true;
        expect(result).to.be.instanceOf(AggregateError);
        expect((result as AggregateError).errors).to.deep.equal([sheetFailure, tokenFailure]);
    });
});

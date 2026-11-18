import { expect } from "chai";
import sinon from "sinon";
import { afterEach, beforeEach, describe, it } from "mocha";
import { foundryApi } from "module/api/foundryApi";
import { advanceWorldTime, setWorldTime } from "module/worldTime/service";

describe("World time controls", () => {
    let seconds: number;
    let paused: boolean;
    let isGM: boolean;
    const advance = sinon.stub<[number], Promise<number>>();
    const set = sinon.stub<[number], Promise<number>>();

    beforeEach(() => {
        seconds = 0;
        paused = false;
        isGM = true;
        advance.reset();
        set.reset();
        advance.callsFake(async (delta) => {
            await Promise.resolve();
            seconds += delta;
            return seconds;
        });
        set.callsFake(async (time) => {
            seconds = time;
            return time;
        });
        sinon.stub(foundryApi, "time").get(() => ({
            get worldTime() {
                return seconds;
            },
            advance,
            set,
        }));
        sinon.stub(foundryApi, "currentUser").get(() => ({ isGM }));
        sinon.stub(foundryApi, "settings").get(() => ({ get: () => paused }));
    });
    afterEach(() => sinon.restore());

    it("serializes rapid relative changes against the latest time", async () => {
        const results = await Promise.all([advanceWorldTime(60), advanceWorldTime(300), advanceWorldTime(-60)]);

        expect(results).to.deep.equal([60, 360, 300]);
        expect(seconds).to.equal(300);
    });

    it("rejects a player's attempt without writing to Foundry", async () => {
        isGM = false;

        const result = await advanceWorldTime(60).catch((error: unknown) => error);

        expect(result).to.be.instanceOf(Error);
        expect(advance.called).to.equal(false);
    });

    it("pauses relative steps but allows explicitly setting the clock", async () => {
        paused = true;

        const result = await advanceWorldTime(60).catch((error: unknown) => error);
        await setWorldTime(120.5);

        expect(result).to.be.instanceOf(Error);
        expect(advance.called).to.equal(false);
        expect(seconds).to.equal(120.5);
    });

    it("can change time again after a failed request", async () => {
        advance.onFirstCall().rejects(new Error("Connection lost"));

        await advanceWorldTime(60).catch(() => undefined);
        await advanceWorldTime(300);

        expect(seconds).to.equal(300);
    });

    for (const invalid of [NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER]) {
        it(`rejects the invalid time ${invalid}`, async () => {
            const result = await setWorldTime(invalid).catch((error: unknown) => error);

            expect(result).to.be.instanceOf(RangeError);
            expect(set.called).to.equal(false);
        });
    }
});

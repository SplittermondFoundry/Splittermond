import { expect } from "chai";
import { describe, it } from "mocha";
import { elapsedCombatSeconds, joinWorldTime, SECONDS_PER_YEAR, splitWorldTime } from "module/worldTime/time";

describe("World time arithmetic", () => {
    it("keeps half seconds while crossing the year boundary in both directions", () => {
        const before = SECONDS_PER_YEAR - 0.5;

        const next = splitWorldTime(before + 0.5);
        const previous = splitWorldTime(joinWorldTime(next)! - 0.5);

        expect(next).to.deep.equal({ year: 1, day: 0, hour: 0, minute: 0, second: 0 });
        expect(previous).to.deep.equal({ year: 0, day: 364, hour: 23, minute: 59, second: 59.5 });
        expect(joinWorldTime(previous)).to.equal(before);
    });

    it("preserves a rewind before the initial epoch", () => {
        const time = splitWorldTime(-0.5);

        expect(time).to.deep.equal({ year: -1, day: 364, hour: 23, minute: 59, second: 59.5 });
        expect(joinWorldTime(time)).to.equal(-0.5);
    });

    it("represents the fourth day after one complete 365-day year", () => {
        const seconds = joinWorldTime({ year: 1, day: 4, hour: 14, minute: 50, second: 0 });

        expect(seconds).to.equal(369 * 86400 + 14 * 3600 + 50 * 60);
    });

    for (const invalid of [
        { day: 365 },
        { day: -1 },
        { year: 0.5 },
        { hour: 24 },
        { minute: 60 },
        { second: 60 },
        { second: NaN },
        { year: Number.MAX_SAFE_INTEGER },
    ]) {
        it(`rejects invalid clock fields ${JSON.stringify(invalid)}`, () => {
            const time = { year: 0, day: 0, hour: 0, minute: 0, second: 0, ...invalid };

            expect(joinWorldTime(time)).to.equal(null);
        });
    }

    for (const [from, to, seconds] of [
        [10, 130, 60],
        [20, 10, -5],
        [-2, 1, 1.5],
        [0, -1, -0.5],
        [10.01, 10.02, 0],
    ]) {
        it(`counts actual tick movement from ${from} to ${to}`, () => {
            const elapsed = elapsedCombatSeconds(from, to, 10000);

            expect(elapsed).to.equal(seconds);
        });
    }

    for (const [from, to] of [
        [10, 10000],
        [20000, 10],
        [null, 10],
        [10, null],
        [NaN, 20],
    ]) {
        it(`does not turn missing or paused positions into time (${from} → ${to})`, () => {
            expect(elapsedCombatSeconds(from, to, 10000)).to.equal(0);
        });
    }
});

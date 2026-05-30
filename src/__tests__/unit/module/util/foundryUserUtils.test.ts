import { expect } from "chai";
import { describe, it } from "mocha";
import { isFirstActiveGM } from "module/util/foundryUserUtils";
import type { User } from "module/api/foundryTypes";

function createUser(id: string, isGM: boolean, active: boolean): User {
    return { id, isGM, active } as User;
}

describe("foundry user utils", () => {
    it("returns false for non-gm users", () => {
        const result = isFirstActiveGM(
            createUser("u2", false, true),
            [
                createUser("u1", true, true),
                createUser("u2", false, true),
            ]
        );

        expect(result).to.be.false;
    });

    it("returns false for inactive gms", () => {
        const result = isFirstActiveGM(
            createUser("u2", true, false),
            [
                createUser("u1", true, true),
                createUser("u2", true, false),
            ]
        );

        expect(result).to.be.false;
    });

    it("returns true for lexicographically first active gm", () => {
        const result = isFirstActiveGM(
            createUser("u1", true, true),
            [
                createUser("u2", true, true),
                createUser("u1", true, true),
                createUser("u3", false, true),
            ]
        );

        expect(result).to.be.true;
    });

    it("returns false for non-first active gm", () => {
        const result = isFirstActiveGM(
            createUser("u2", true, true),
            [
                createUser("u1", true, true),
                createUser("u2", true, true),
            ]
        );

        expect(result).to.be.false;
    });
});

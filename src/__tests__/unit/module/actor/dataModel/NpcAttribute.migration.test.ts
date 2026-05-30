import { expect } from "chai";
import { NpcAttribute } from "../../../../../module/actor/dataModel/NpcAttribute";

describe("NpcAttribute migrations", () => {
    it("does not inject value for partial sources with no legacy keys", () => {
        const source = { advances: 2 };

        const result = NpcAttribute.migrateFrom0_12_6({ ...source });

        expect(result).to.deep.equal(source);
    });
});

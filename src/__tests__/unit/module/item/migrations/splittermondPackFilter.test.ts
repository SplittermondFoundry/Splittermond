import { describe, it } from "mocha";
import { expect } from "chai";
import { isSplittermondPack } from "module/item/migrations/splittermondPackFilter";

type Pack = Parameters<typeof isSplittermondPack>[0];

function packWithMetadata(system?: string): Pack {
    return { metadata: { system } } as unknown as Pack;
}

describe("isSplittermondPack", () => {
    it("accepts packs declared for the splittermond system", () => {
        expect(isSplittermondPack(packWithMetadata("splittermond"))).to.be.true;
    });

    it("rejects packs without a system declaration (e.g. a system-agnostic sound library)", () => {
        expect(isSplittermondPack(packWithMetadata())).to.be.false;
    });

    it("rejects packs declared for another game system", () => {
        expect(isSplittermondPack(packWithMetadata("dnd5e"))).to.be.false;
    });
});

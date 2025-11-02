import { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { foundryApi } from "module/api/foundryApi";

export function apiConstantsTest(context: QuenchBatchContext) {
    const { describe, it, expect } = context;

    describe("API Constants", () => {
        it("delivers the correct chat message types", () => {
            const types = foundryApi.chatMessageTypes;
            expect(types, "chatMessageTypes is an object").to.be.an("object");
            expect(Object.keys(types).length).to.equal(4);
            expect(types.EMOTE, "chatMessageTypes has an emote").to.be.a("number");
            expect(types.IC, "chatMessageTypes has an in character").to.be.a("number");
            expect(types.OOC, "chatMessageTypes has an out of character").to.be.a("number");
            expect(types.OTHER, "chatMessageTypes has an other").to.be.a("number");
        });

        it("has the correct roll modes", () => {
            const rollModes = foundryApi.rollModes;
            expect(rollModes, "rollModes is an object").to.be.an("object");
            expect(Object.keys(rollModes).length).to.equal(4);
            expect(rollModes.blindroll, "rollModes has a blindroll mode").to.be.an("object");
            expect(rollModes.blindroll.icon, "rollMode blindroll has an icon").to.be.a("string");
            expect(rollModes.blindroll.label, "rollMode blindroll has a label").to.be.a("string");
            expect(rollModes.gmroll, "rollModes has a gmroll mode").to.be.an("object");
            expect(rollModes.gmroll.icon, "rollMode gmroll has an icon").to.be.a("string");
            expect(rollModes.gmroll.label, "rollMode gmroll has a label").to.be.a("string");
            expect(rollModes.publicroll, "rollModes has a publicroll mode").to.be.an("object");
            expect(rollModes.publicroll.icon, "rollMode publicroll has an icon").to.be.a("string");
            expect(rollModes.publicroll.label, "rollMode publicroll has a label").to.be.a("string");
            expect(rollModes.selfroll, "rollModes has a selfroll mode").to.be.an("object");
            expect(rollModes.selfroll.icon, "rollMode selfroll has an icon").to.be.a("string");
            expect(rollModes.selfroll.label, "rollMode selfroll has a label").to.be.a("string");
        });
    });
}

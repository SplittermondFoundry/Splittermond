import { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { foundryApi } from "module/api/foundryApi";

export function apiConstantsTest(context: QuenchBatchContext) {
    const { describe, it, expect } = context;

    describe("API Constants", () => {
        it("delivers the correct chat message types", () => {
            const types = foundryApi.chatMessageStyles;
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
            expect(Object.keys(rollModes).length).to.equal(5);
            expect(rollModes.blind, "rollModes has a blind mode").to.be.an("object");
            expect(rollModes.blind.icon, "messageMode blind has an icon").to.be.a("string");
            expect(rollModes.blind.label, "messageMode blind has a label").to.be.a("string");
            expect(rollModes.gm, "rollModes has a gm mode").to.be.an("object");
            expect(rollModes.gm.icon, "messageMode gm has an icon").to.be.a("string");
            expect(rollModes.gm.label, "messageMode gm has a label").to.be.a("string");
            expect(rollModes.public, "rollModes has a public mode").to.be.an("object");
            expect(rollModes.public.icon, "messageMode public has an icon").to.be.a("string");
            expect(rollModes.public.label, "messageMode public has a label").to.be.a("string");
            expect(rollModes.self, "rollModes has a self mode").to.be.an("object");
            expect(rollModes.self.icon, "messageMode self has an icon").to.be.a("string");
            expect(rollModes.self.label, "messageMode self has a label").to.be.a("string");
            expect(rollModes.ic, "rollModes has a ic mode").to.be.an("object");
            expect(rollModes.ic.icon, "messageMode ic has an icon").to.be.a("string");
            expect(rollModes.ic.label, "messageMode ic has a label").to.be.a("string");
        });
    });
}

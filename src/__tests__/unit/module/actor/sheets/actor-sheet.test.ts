import "../../../foundryMocks";
import { expect } from "chai";
import { afterEach, beforeEach, describe, it } from "mocha";
import sinon from "sinon";
import SplittermondActorSheet from "module/actor/sheets/actor-sheet.js";
import { splittermond } from "module/config";
import { foundryApi } from "module/api/foundryApi";
import { FoundryDialog } from "module/api/Application";
import { SplittermondBaseActorSheet } from "module/data/SplittermondApplication";
import { SpellDataModel } from "module/item/dataModel/SpellDataModel";
import { MasteryDataModel } from "module/item/dataModel/MasteryDataModel";
import SplittermondActor from "module/actor/actor";

declare const foundry: any;
declare const global: any;

describe("SplittermondActorSheet", () => {
    let sandbox: sinon.SinonSandbox;
    let sheet: SplittermondActorSheet;
    let superFunctionStub: sinon.SinonStub;
    const mockEvent = null as unknown as DragEvent; //DragEvent is not used in the tests

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        superFunctionStub = sandbox.mock();
        sandbox.stub(foundryApi.utils, "mergeObject").callsFake((a, b) => ({ ...a, ...b }));
        Object.defineProperty(SplittermondBaseActorSheet.prototype, "_onDropDocument", {
            value: superFunctionStub,
            configurable: true,
            writable: true,
        });

        global.CONFIG = { splittermond: splittermond };
    });
    afterEach(() => {
        sandbox.restore();
    });

    describe("Addition of a spell to actor", () => {
        let actorMock: any;

        beforeEach(() => {
            // Mock actor and foundryApi
            actorMock = { name: "Test Actor", spells: [], items: [], id: "actor1" };
            sheet = new SplittermondActorSheet({ document: actorMock });

            sandbox.stub(foundryApi, "localize").callsFake((s: string) => s);

            // Mock game.i18n
            (global as any).game = {
                i18n: {
                    localize: (s: string) => s,
                    format: (s: string) => s,
                },
                scenes: { current: null },
                combats: [],
            };
        });

        it("should set skill and skillLevel for valid single availableIn", async () => {
            const itemData: any = {
                type: "spell",
                system: new SpellDataModel({ availableIn: "illusionmagic 2" } as any),
            };
            await sheet._onDropDocument(mockEvent, itemData);

            expect(superFunctionStub.called).to.be.true;
            expect(superFunctionStub.lastCall.lastArg.system.skill).to.equal("illusionmagic");
            expect(superFunctionStub.lastCall.lastArg.system.skillLevel).to.equal(2);
        });

        it("should select only valid skill and skillLevel ", async () => {
            const itemData: any = {
                type: "spell",
                system: new SpellDataModel({ availableIn: "crazy antics, illusionmagic 2, illumanic 1" } as any),
            };
            await sheet._onDropDocument(mockEvent, itemData);

            expect(superFunctionStub.called).to.be.true;
            expect(superFunctionStub.lastCall.lastArg.system.skill).to.equal("illusionmagic");
            expect(superFunctionStub.lastCall.lastArg.system.skillLevel).to.equal(2);
        });

        it("should prompt for skill selection if availableIn has multiple skills", async () => {
            foundry.applications.api.DialogV2.prototype.render = function () {
                return this.options.buttons
                    .find((b: { action: string; callback: Function }) => b.action === "deathmagic")
                    .callback();
            };

            const itemData: any = {
                type: "spell",
                system: new SpellDataModel({ availableIn: "illusionmagic 2, deathmagic 1" } as any),
            };

            await sheet._onDropDocument(mockEvent, itemData);

            expect(superFunctionStub.called).to.be.true;
            expect(superFunctionStub.lastCall.lastArg.system.skill).to.equal("deathmagic");
            expect(superFunctionStub.lastCall.lastArg.system.skillLevel).to.equal(1);
        });

        it("should not prompt for skill selection if valid skill exists at empty available in", async () => {
            let invocationCount = 0;
            foundry.applications.api.DialogV2.prototype.render = function () {
                invocationCount += 1;
                return this.options.buttons
                    .find((b: { action: string; callback: Function }) => b.action === "deathmagic")
                    .callback();
            };

            const itemData: any = {
                type: "spell",
                system: new SpellDataModel({ availableIn: "", skill: "deathmagic", skillLevel: 1 } as any),
            };

            await sheet._onDropDocument(mockEvent, itemData);

            expect(invocationCount).to.equal(0);
            expect(superFunctionStub.called).to.be.true;
            expect(superFunctionStub.lastCall.lastArg.system.skill).to.equal("deathmagic");
            expect(superFunctionStub.lastCall.lastArg.system.skillLevel).to.equal(1);
        });

        it("should not prompt for skill selection source is a spell on an actor", async () => {
            let invocationCount = 0;
            foundry.applications.api.DialogV2.prototype.render = function () {
                invocationCount += 1;
                return this.options.buttons
                    .find((b: { action: string; callback: Function }) => b.action === "deathmagic")
                    .callback();
            };

            const itemData: any = {
                type: "spell",
                actor: sandbox.createStubInstance(SplittermondActor),
                //The skill validation indeed accepts any skill. This is to highlight we assume the item is configured when it comes from an actor
                system: new SpellDataModel({ availableIn: "", skill: "endurance", skillLevel: 0 } as any),
            };

            await sheet._onDropDocument(mockEvent, itemData);

            expect(invocationCount).to.equal(0);
            expect(superFunctionStub.called).to.be.true;
            expect(superFunctionStub.lastCall.lastArg.system.skill).to.equal("endurance");
            expect(superFunctionStub.lastCall.lastArg.system.skillLevel).to.equal(0);
        });

        [
            { title: "For no Item", availableIn: null },
            { title: "For single Item", availableIn: "invaliskill" },
            { title: "For multiple items", availableIn: "invalidskill1, invalidskill2" },
        ].forEach((testInput) => {
            splittermond.skillGroups.magic
                .flatMap((skill) => ({ skill, skillLevel: 0, name: `${skill} 0` }))
                .forEach(({ skill, skillLevel, name }) => {
                    it(`${testInput.title}: should allow selection of ${name} if availableIn is not valid`, async () => {
                        sandbox.stub(FoundryDialog, "prompt").resolves({ skill, level: skillLevel });

                        const itemData: any = {
                            type: "spell",
                            system: new SpellDataModel({ availableIn: testInput.availableIn } as any),
                        };

                        await sheet._onDropDocument(mockEvent, itemData);

                        expect(superFunctionStub.called).to.be.true;
                        expect(superFunctionStub.lastCall.lastArg.system.skill).to.equal(skill);
                        expect(superFunctionStub.lastCall.lastArg.system.skillLevel).to.equal(skillLevel);
                    });
                });
        });

        it("should return early if dialog is cancelled", async () => {
            foundry.applications.api.DialogV2.prototype.render = function () {
                return this.options.buttons
                    .find((b: { action: string; callback: Function }) => b.action === "_cancel")
                    .callback();
            };

            const itemData: any = {
                type: "spell",
                system: new SpellDataModel({ availableIn: "illusionmagic 2, deathmagic 1" } as any),
            };

            await sheet._onDropDocument(mockEvent, itemData);

            expect(superFunctionStub.called).to.be.false;
            expect(itemData.system.skill).to.be.undefined;
        });
    });

    describe("Addition of a mastery to actor", () => {
        let actorMock: any;

        beforeEach(() => {
            actorMock = { name: "Test Actor", spells: [], items: [], id: "actor1" };
            sheet = new SplittermondActorSheet({ document: actorMock });

            sandbox.stub(foundryApi, "localize").callsFake((s: string) => s);

            // Mock game.i18n
            (global as any).game = {
                i18n: {
                    localize: (s: string) => s,
                    format: (s: string) => s,
                },
                scenes: { current: null },
                combats: [],
            };
        });

        it("should set skill and level for valid single availableIn", async () => {
            const itemData: any = {
                type: "mastery",
                system: new MasteryDataModel({ availableIn: "athletics", level: 3 } as any),
            };
            await sheet._onDropDocument(mockEvent, itemData);

            expect(superFunctionStub.called).to.be.true;
            expect(superFunctionStub.lastCall.lastArg.system.skill).to.equal("athletics");
            expect(superFunctionStub.lastCall.lastArg.system.level).to.equal(3);
        });

        it("should prompt for skill selection if availableIn has multiple skills", async () => {
            foundry.applications.api.DialogV2.prototype.render = function () {
                return this.options.buttons
                    .find((b: { action: string; callback: Function }) => b.action === "acrobatics")
                    .callback();
            };

            const itemData: any = {
                type: "mastery",
                system: new MasteryDataModel({ availableIn: "athletics, acrobatics", level: 1 } as any),
            };

            await sheet._onDropDocument(mockEvent, itemData);

            expect(superFunctionStub.called).to.be.true;
            expect(superFunctionStub.lastCall.lastArg.system.skill).to.equal("acrobatics");
            expect(superFunctionStub.lastCall.lastArg.system.level).to.equal(1);
        });

        it("should return early if dialog is cancelled", async () => {
            foundry.applications.api.DialogV2.prototype.render = function () {
                return this.options.buttons
                    .find((b: { action: string; callback: Function }) => b.action === "_cancel")
                    .callback();
            };
            const itemData: any = {
                type: "mastery",
                system: new MasteryDataModel({ availableIn: "athletics 2, acrobatics 1" } as any),
            };

            await sheet._onDropDocument(mockEvent, itemData);

            expect(superFunctionStub.called).to.be.false;
            expect(itemData.system.skill).to.be.undefined;
        });
        it("should not prompt for skill selection if valid skill exists at empty available in", async () => {
            let invocationCount = 0;
            foundry.applications.api.DialogV2.prototype.render = function () {
                invocationCount += 1;
                return this.options.buttons
                    .find((b: { action: string; callback: Function }) => b.action === "melee")
                    .callback();
            };

            const itemData: any = {
                type: "mastery",
                system: new MasteryDataModel({ availableIn: "", skill: "melee", skillLevel: 2 } as any),
            };

            await sheet._onDropDocument(mockEvent, itemData);

            expect(invocationCount).to.equal(0);
            expect(superFunctionStub.called).to.be.true;
            expect(superFunctionStub.lastCall.lastArg.system.skill).to.equal("melee");
            expect(superFunctionStub.lastCall.lastArg.system.skillLevel).to.equal(2);
        });
        [
            { title: "For no Item", availableIn: null },
            { title: "For single Item", availableIn: "invaliskill" },
            { title: "For multiple items", availableIn: "invalidskill1, invalidskill2" },
        ].forEach((testInput) => {
            splittermond.skillGroups.all
                .flatMap((skill) => ({ skill, skillLevel: 1, name: `${skill} 0` }))
                .forEach(({ skill, skillLevel, name }) => {
                    it(`${testInput.title}: should allow selection of ${name} if availableIn is not valid`, async () => {
                        sandbox.stub(FoundryDialog, "prompt").resolves({ skill, level: skillLevel });

                        const itemData: any = {
                            type: "mastery",
                            system: new MasteryDataModel({ availableIn: "invalidskill" } as any),
                        };

                        await sheet._onDropDocument(mockEvent, itemData);

                        expect(superFunctionStub.called).to.be.true;
                        expect(superFunctionStub.lastCall.lastArg.system.skill).to.equal(skill);
                        expect(superFunctionStub.lastCall.lastArg.system.level).to.equal(skillLevel);
                    });
                });
        });
    });
});

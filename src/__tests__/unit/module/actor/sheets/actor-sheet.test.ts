import "../../../foundryMocks";
import { expect } from "chai";
import { afterEach, beforeEach, describe, it } from "mocha";
import sinon from "sinon";
import SplittermondActorSheet from "module/actor/sheets/actor-sheet.js";
import { splittermond } from "module/config";
import { foundryApi } from "module/api/foundryApi";
import { FoundryDialog } from "module/api/Application";

declare const foundry: any;
declare const global: any;

describe("SplittermondActorSheet", () => {
    let sandbox: sinon.SinonSandbox;
    let sheet: SplittermondActorSheet;
    let superFunctionStub: sinon.SinonStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sheet = new SplittermondActorSheet({}, {});
        superFunctionStub = sandbox.mock();
        Object.defineProperty(foundry.appv1.sheets.ActorSheet.prototype, "_onDropItemCreate", {
            value: superFunctionStub,
            configurable: true,
            writable: true,
        });

        global.CONFIG = { splittermond: splittermond };
    });
    afterEach(() => {
        sandbox.restore();

        delete foundry.appv1.sheets.ActorSheet.prototype._onDropItemCreate;
    });

    describe("Addition of a spell to actor", () => {
        let actorMock: any;

        beforeEach(() => {
            // Mock actor and foundryApi
            actorMock = { name: "Test Actor", spells: [], items: [], id: "actor1" };
            (sheet as any).actor = actorMock;

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
                system: { availableIn: "illusionmagic 2" },
            };
            await sheet._onDropItemCreate(itemData);

            expect(superFunctionStub.called).to.be.true;
            expect(superFunctionStub.lastCall.lastArg.system.skill).to.equal("illusionmagic");
            expect(superFunctionStub.lastCall.lastArg.system.skillLevel).to.equal(2);
        });

        it("should select only valid skill and skillLevel ", async () => {
            const itemData: any = {
                type: "spell",
                system: { availableIn: "crazy antics, illusionmagic 2, illumanic 1" },
            };
            await sheet._onDropItemCreate(itemData);

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
                system: { availableIn: "illusionmagic 2, deathmagic 1" },
            };

            await sheet._onDropItemCreate(itemData);

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
                system: { availableIn: "", skill: "deathmagic", skillLevel: 1 },
            };

            await sheet._onDropItemCreate(itemData);

            expect(invocationCount).to.equal(0);
            expect(superFunctionStub.called).to.be.true;
            expect(superFunctionStub.lastCall.lastArg.system.skill).to.equal("deathmagic");
            expect(superFunctionStub.lastCall.lastArg.system.skillLevel).to.equal(1);
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
                            system: { availableIn: testInput.availableIn },
                        };

                        await sheet._onDropItemCreate(itemData);

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
                system: { availableIn: "illusionmagic 2, deathmagic 1" },
            };

            await sheet._onDropItemCreate(itemData);

            expect(superFunctionStub.called).to.be.false;
            expect(itemData.system.skill).to.be.undefined;
        });
    });

    describe("Addition of a mastery to actor", () => {
        let actorMock: any;

        beforeEach(() => {
            actorMock = { name: "Test Actor", spells: [], items: [], id: "actor1" };
            (sheet as any).actor = actorMock;

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
                system: { availableIn: "athletics", level: 3 },
            };
            await sheet._onDropItemCreate(itemData);

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
                system: { availableIn: "athletics, acrobatics", level: 1 },
            };

            await sheet._onDropItemCreate(itemData);

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
                system: { availableIn: "athletics 2, acrobatics 1" },
            };

            await sheet._onDropItemCreate(itemData);

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
                system: { availableIn: "", skill: "melee", skillLevel: 2 },
            };

            await sheet._onDropItemCreate(itemData);

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
                            system: { availableIn: "invalidskill" },
                        };

                        await sheet._onDropItemCreate(itemData);

                        expect(superFunctionStub.called).to.be.true;
                        expect(superFunctionStub.lastCall.lastArg.system.skill).to.equal(skill);
                        expect(superFunctionStub.lastCall.lastArg.system.level).to.equal(skillLevel);
                    });
                });
        });
    });
});

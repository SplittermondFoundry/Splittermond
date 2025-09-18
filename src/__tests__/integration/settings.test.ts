import { settings } from "../../module/settings";
import { QuenchBatchContext } from "@ethaks/fvtt-quench";

declare const game: any;
export function settingsTest(context: QuenchBatchContext) {
    const { describe, it, expect, afterEach } = context;

    describe("SettingsConfig", () => {
        function createSetting(config: any) {
            expect(game.settings.settings.has("bogus.test")).to.equal(false);
            game.settings.register("bogus", "test", config);
        }

        function getSetting() {
            return game.settings.settings.get("bogus.test");
        }

        afterEach(() => {
            delete game.settings.storage.get("client")["bogus.test"];
            game.settings.settings.delete("bogus.test");
        });

        ["client", "world"].forEach((scope) => {
            it(`should create a setting with scope ${scope}`, () => {
                createSetting({
                    name: "Testitest",
                    scope: scope,
                    config: false,
                    type: String,
                    default: "",
                });
                expect(getSetting().scope).to.equal(scope);
            });
        });
        it("should not create a setting with an invalid scope", () => {
            createSetting({
                name: "Testitest",
                scope: "wuurg",
                config: false,
                type: String,
                default: "",
            });
            expect(getSetting().scope).to.equal("client");
        });

        (
            [
                [Number, 1],
                [Boolean, true],
                [String, ""],
            ] as const
        ).forEach(([type, defaultValue]) => {
            it(`should create setting with type ${type.name}`, () => {
                createSetting({
                    scope: "client",
                    config: true,
                    type: type,
                    default: defaultValue,
                });
                expect(getSetting().default).to.equal(defaultValue);
                expect(getSetting().type).to.equal(type);
            });
        });

        it("should be able to set a setting", () => {
            createSetting({
                scope: "client",
                config: true,
                type: Number,
                default: 1,
            });
            game.settings.set("bogus", "test", 2);
            expect(game.settings.get("bogus", "test")).to.equal(2);
        });
    });

    describe("Settings", () => {
        const settingKey = "baguncea";
        afterEach(() => {
            delete game.settings.storage.get("client")[`splittermond.${settingKey}`];
            game.settings.settings.delete(`splittermond.${settingKey}`);
        });
        it("should register a setting", async () => {
            await settings.registerNumber(settingKey, { config: true, default: 3 });

            expect(game.settings.settings.has(`splittermond.${settingKey}`)).to.be.true;
        });

        it("get actually gets a value", async () => {
            const accessors = await settings.registerNumber(settingKey, { config: true, default: 3 });
            expect(game.settings.get("splittermond", settingKey)).to.equal(3);
            expect(accessors.get()).to.equal(3);
        });

        it("set actually sets a value", async () => {
            const accessors = await settings.registerNumber(settingKey, { config: true, default: 3 });

            accessors.set(4);

            expect(game.settings.get("splittermond", settingKey)).to.equal(4);
            expect(accessors.get()).to.equal(4);
        });
    });
}

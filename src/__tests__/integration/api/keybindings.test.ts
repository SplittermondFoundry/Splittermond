import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { foundryApi } from "../../../module/api/foundryApi";

//see https://foundryvtt.com/api/classes/foundry.helpers.interaction.KeyboardManager.html#modifier_keys
declare const KeyboardManager: {
    emulateKeypress: (up: boolean, code: string, options?: Record<string, boolean>) => void;
};

let actualExecutor: () => void = () => {};
/* Keybinding registration may not happen after the init hook. We can afford a permanent test keybinding, because
 * because we  don't deliver the integration tests with productions builds.
 */
foundryApi.keybindings.register("splittermond", "test-keybinding", {
    name: "Test Keybinding",
    hint: "This is a test keybinding",
    //The actual value for "9" would be "Digit9", but having an inaccessible key actually suits us.
    editable: [{ key: "Key9", modifiers: ["Shift"] }],
    onDown: () => {
        return actualExecutor();
    },
});

export function foundryKeybindingsTest(context: QuenchBatchContext) {
    const { it, expect, afterEach } = context;

    afterEach(() => {
        actualExecutor = () => {};
        foundryApi.keybindings.set("splittermond", "test-keybinding", [
            {
                key: "Key9",
                modifiers: ["Shift"],
            },
        ]);
    });

    it("should register keybindings", () => {
        expect(foundryApi.keybindings.get("splittermond", "test-keybinding")).to.exist;
    });

    it("should trigger keybinding action", () => {
        let flag = false;
        actualExecutor = () => {
            flag = true;
            return false;
        };
        KeyboardManager.emulateKeypress(false, "Key9", { shiftKey: true });

        expect(flag).to.be.true;
    });

    it("should allow editing of keybindings", () => {
        let flag = false;
        actualExecutor = () => {
            flag = true;
        };

        const keyActions = foundryApi.keybindings.get("splittermond", "test-keybinding");
        keyActions[0].key = "Key3";
        foundryApi.keybindings.set("splittermond", "test-keybinding", keyActions);
        KeyboardManager.emulateKeypress(false, "Key3", { shiftKey: true });

        expect(flag).to.be.true;
    });
}

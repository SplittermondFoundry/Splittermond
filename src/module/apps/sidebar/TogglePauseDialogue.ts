import { CombatPauseType } from "module/combat";
import { FoundryDialog } from "module/api/Application";
import { foundryApi } from "module/api/foundryApi";

export async function askUserAboutPauseType(): Promise<CombatPauseType> {
    return new Promise((resolve, reject) => renderDialogue(resolve, reject));
}

function renderDialogue(resolve: (value: CombatPauseType) => void, reject: (reason?: any) => void) {
    let dialog = new FoundryDialog({
        window: { title: "Abwarten / Bereithalten" },
        content: "",
        buttons: [
            {
                action: "cancel",
                label: foundryApi.localize("splittermond.cancel"),
            },
            {
                action: "keepReady",
                label: foundryApi.localize("splittermond.keepReady"),
            },
            {
                action: "wait",
                label: foundryApi.localize("splittermond.wait"),
                default: true,
            },
        ],
        submit: async (result) => {
            if (result === "wait") resolve(CombatPauseType.wait);
            if (result === "keepReady") resolve(CombatPauseType.keepReady);
            reject("User cancelled the action");
        },
    });
    return dialog.render({ force: true });
}

import { FoundryDialog } from "module/api/Application";
import { foundryApi } from "module/api/foundryApi";

export async function userConfirmsItemDeletion(itemName: string): Promise<boolean> {
    const deletionQuestion = foundryApi.format("splittermond.deleteItemQuestion", { itemName });
    return new Promise<boolean>((resolve) => {
        const dialog = createDialog(deletionQuestion, resolve);
        dialog.render({ force: true });
    }).catch(() => false);
}

function createDialog(deletionQuestion: string, resolve: (result: boolean) => void) {
    return new FoundryDialog({
        window: { title: foundryApi.localize("splittermond.deleteItem") },
        content: `<p>${deletionQuestion}</p>`,
        buttons: [
            {
                action: "delete",
                label: foundryApi.localize("splittermond.delete"),
            },
            {
                action: "cancel",
                label: foundryApi.localize("splittermond.cancel"),
                default: true,
            },
        ],
        submit: async (result) => {
            resolve(result === "delete"); // Foundry promises that the result is one of the action names
        },
    });
}

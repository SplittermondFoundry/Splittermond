import { FoundryDialog } from "module/api/Application";
import { foundryApi } from "module/api/foundryApi";
import type SplittermondActor from "module/actor/actor";
import type ActiveDefense from "module/actor/active-defense";
import { IllegalStateException } from "module/data/exceptions";

export async function showActiveDefenseDialog(actor: SplittermondActor) {
    let content = await foundryApi.renderer("systems/splittermond/templates/apps/dialog/active-defense.hbs", {
        activeDefense: actor.activeDefense.defense,
    });
    const dialog = new ActiveDefenseDialog(actor, content);
    return dialog.render({ force: true });
}
export class ActiveDefenseDialog extends FoundryDialog {
    static DEFAULT_OPTIONS = {
        window: { title: "splittermond.activeDefense" }, //foundry is nice enough to localize this
        position: {
            width: 500,
        },
        classes: ["splittermond", "dialog"],
    };

    constructor(
        private readonly actor: SplittermondActor,
        content: string
    ) {
        super({
            content,
            buttons: [
                {
                    label: "splittermond.cancel",
                    action: "close",
                },
            ],
            actions: {
                rollDefense: async (_, t) => this.rollDefense(t),
            },
        });
    }

    rollDefense(target: HTMLElement): void {
        const itemId = target.dataset.defenseId;
        const defenseType = target.parentElement?.dataset.defenseType;
        if (!itemId || !defenseType) {
            throw new IllegalStateException("Missing expected data attributes.");
        }
        this.actor.rollActiveDefense(
            defenseType,
            this.actor.activeDefense.defense.find((el: ActiveDefense) => el.id === itemId)
        );
        this.close();
    }
}

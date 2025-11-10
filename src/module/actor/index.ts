import SplittermondActor from "module/actor/actor";
import { CharacterDataModel } from "module/actor/dataModel/CharacterDataModel";
import { NpcDataModel } from "module/actor/dataModel/NpcDataModel";
import { actualAddModifierFunction, type IAddModifier } from "module/actor/addModifierAdapter";
import { registerSheets } from "module/actor/sheets/registration";

const trackableResources = {
    bar: ["healthBar", "focusBar"],
    value: ["health.available.value", "focus.available.value"],
};

export function initializeActor(actorConfig: (typeof CONFIG)["Actor"], addModifier: IAddModifier) {
    console.log("Splittermond | Initializing Actor feature");
    actorConfig.documentClass = SplittermondActor;
    actorConfig.dataModels.character = CharacterDataModel;
    actorConfig.dataModels.npc = NpcDataModel;
    actorConfig.trackableAttributes = {
        character: {
            bar: [...trackableResources.bar, "splinterpoints"],
            value: [...trackableResources.value, "splinterpoints.value"],
        },
        npc: trackableResources,
    };

    actualAddModifierFunction.self = addModifier;
    registerSheets();
}

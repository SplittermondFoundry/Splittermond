import SplittermondActor from "module/actor/actor";
import { CharacterDataModel } from "module/actor/dataModel/CharacterDataModel";
import { NpcDataModel } from "module/actor/dataModel/NpcDataModel";
import { actualAddModifierFunction, type IAddModifier } from "module/actor/addModifierAdapter";
import { registerSheets } from "module/actor/sheets/registration";
import { ModifierRegistry } from "module/modifiers";
import type { ScalarModifier } from "module/modifiers/parsing";
import { registerActorModifiers } from "module/actor/modifiers/actorModifierRegistration";

const trackableResources = {
    bar: ["healthBar", "focusBar"],
    value: ["health.available.value", "focus.available.value"],
};

type ModifierModule = {
    modifierRegistry: ModifierRegistry<ScalarModifier>;
    addModifier: IAddModifier;
};

export function initializeActor(actorConfig: (typeof CONFIG)["Actor"], modifierModule: ModifierModule) {
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

    actualAddModifierFunction.self = modifierModule.addModifier;
    registerActorModifiers(modifierModule.modifierRegistry);
    registerSheets();
}

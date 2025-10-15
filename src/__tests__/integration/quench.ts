import { applicationTests } from "./application.tests";
import { itemTest } from "./item.test";
import { chatActionFeatureTest } from "./chatActionFeature.test";
import { dataModelTest } from "./api/dataModel.test";
import { DamageProcessingTest } from "./DamageProcessingTest";
import { foundryTypeDeclarationsTest } from "./api/foundryTypes.test";
import { apiUtilsTest } from "./api/apiUtils.test";
import { actorTest } from "./actor.test";
import type { Quench } from "@ethaks/fvtt-quench";
import { settingsTest } from "./settings.test";
import { foundryRollTest } from "./api/Roll.test";
import { modifierTest } from "./modifier.test";
import { foundryKeybindingsTest } from "./api/keybindings.test";
import { combatTest } from "./combat.test";

declare const Hooks: any;
declare class Scene extends FoundryDocument {}

function registerQuenchTests(quench: Quench) {
    console.log("Splittermond | Initializing quench tests");

    quench.registerBatch("splittermond.roll", foundryRollTest);
    quench.registerBatch("splittermond.applications", applicationTests);
    quench.registerBatch("splittermond.item", itemTest);
    quench.registerBatch("splittermond.actor", actorTest);
    quench.registerBatch("splittermond.combat", combatTest);
    quench.registerBatch("splittermond.chatSystem", chatActionFeatureTest);
    quench.registerBatch("splittermond.dataModel", dataModelTest);
    quench.registerBatch("splittermond.damageProcessing", DamageProcessingTest);
    quench.registerBatch("splittermond.foundryTypes", foundryTypeDeclarationsTest);
    quench.registerBatch("splittermond.apiUtils", apiUtilsTest);
    quench.registerBatch("splittermond.SettingsModule", settingsTest);
    quench.registerBatch("splittermond.modifier", modifierTest);
    quench.registerBatch("splittermond.keybindings", foundryKeybindingsTest);
}

export function init() {
    // Use Quench's ready hook to add our tests. This hook will never be triggered if Quench isn't loaded.
    Hooks.on("quenchReady", registerQuenchTests);
}

import {compendiumBrowserTest} from "./compendium-browser.test";
import {itemTest} from "./item.test";
import {chatActionFeatureTest} from "./chatActionFeature.test";
import {dataModelTest} from "./dataModel.test";
import {DamageRollTest} from "./DamageRoll.test";
import {foundryTypeDeclarationsTest} from "./foundryTypes.test";
import {mergeObjectTest} from "./mergeObject.test";
import {actorTest} from "./actor.test";
import type {Quench} from "@ethaks/fvtt-quench";

declare const Hooks: any;

function registerQuenchTests(quench: Quench) {
    quench.registerBatch("splittermond.compendium-browser", compendiumBrowserTest);
    quench.registerBatch("splittermond.item", itemTest);
    quench.registerBatch("splittermond.actor", actorTest)
    quench.registerBatch("splittermond.chatSystem", chatActionFeatureTest);
    quench.registerBatch("splittermond.dataModel", dataModelTest);
    quench.registerBatch("splittermond.damageRoll", DamageRollTest);
    quench.registerBatch("splittermond.foundry types", foundryTypeDeclarationsTest);
    quench.registerBatch("splittermond.mergeObjects", mergeObjectTest);
}

export function init() {
    // Use Quench's ready hook to add our tests. This hook will never be triggered if Quench isn't loaded.
    Hooks.on("quenchReady", registerQuenchTests);
}
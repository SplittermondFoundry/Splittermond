import {compendiumBrowserTest} from "./compendium-browser.test.js";
import {itemTest} from "./item.test";
import {chatActionFeatureTest} from "./chatActionFeature.test.ts";
import {dataModelTest} from "./dataModel.test.ts.js";
import {DamageRollTest} from "./DamageRoll.test.js";
import {foundryTypeDeclarationsTest} from "./foundryTypes.test";
import {mergeObjectTest} from "./mergeObject.test.ts";
import {settingsTest} from "./settings.test";


function registerQuenchTests(quench) {
    quench.registerBatch("compendium-browser", compendiumBrowserTest);
    quench.registerBatch("item", itemTest);
    quench.registerBatch("chatSystem", chatActionFeatureTest);
    quench.registerBatch("dataModel", dataModelTest);
    quench.registerBatch("damageRoll", DamageRollTest);
    quench.registerBatch("foundry types", foundryTypeDeclarationsTest);
    quench.registerBatch("merge Objects", mergeObjectTest);
    quench.registerBatch("Splittermond Settings Module", settingsTest)
}

export function init() {
    // Use Quench's ready hook to add our tests. This hook will never be triggered if Quench isn't loaded.
    Hooks.on("quenchReady", registerQuenchTests);
}
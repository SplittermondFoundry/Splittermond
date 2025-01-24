import {compendiumBrowserTest} from "./compendium-browser.test";
import {itemTest} from "./item.test";
import {chatActionFeatureTest} from "./chatActionFeature.test";
import {dataModelTest} from "./dataModel.test.ts.js";
import {DamageRollTest} from "./DamageRoll.test";
import {foundryTypeDeclarationsTest} from "./foundryTypes.test";
import {mergeObjectTest} from "./mergeObject.test";
import {actorTest} from "./actor.test";


function registerQuenchTests(quench) {
    quench.registerBatch("compendium-browser", compendiumBrowserTest);
    quench.registerBatch("item", itemTest);
    quench.registerBatch("actor", actorTest)
    quench.registerBatch("chatSystem", chatActionFeatureTest);
    quench.registerBatch("dataModel", dataModelTest);
    quench.registerBatch("damageRoll", DamageRollTest);
    quench.registerBatch("foundry types", foundryTypeDeclarationsTest);
    quench.registerBatch("merge Objects", mergeObjectTest);
}

export function init() {
    // Use Quench's ready hook to add our tests. This hook will never be triggered if Quench isn't loaded.
    Hooks.on("quenchReady", registerQuenchTests);
}
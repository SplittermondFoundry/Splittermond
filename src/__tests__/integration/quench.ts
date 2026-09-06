import { applicationTests } from "./application.tests";
import { itemTest } from "./item.test";
import { chatActionFeatureTest } from "./chatActionFeature.test";
import { DamageProcessingTest } from "./DamageProcessingTest";
import type { Quench, QuenchRegisterBatchFunction } from "@ethaks/fvtt-quench";
import { combatTest } from "./combat.test";
import { activeEffectTest } from "./activeEffectConfig.test";
import { compendiumEffectAssignmentTest } from "./compendiumEffectAssignment.test";
import { itemCompendiumAssignmentTest } from "./itemCompendiumAssignment.test";
import { registerApiBatches } from "./api";
import { registerMigrationBatches } from "./migrations";
import { registerInfrastructureBatches } from "./infrastructure";
import { registerActorBatches } from "./actor";

declare const Hooks: any;
declare class Scene extends FoundryDocument {}

function createRegistrar(quench: Quench, infix: string) {
    return (name: string, func: QuenchRegisterBatchFunction) =>
        quench.registerBatch(`splittermond.${infix}.${name}`, func);
}

function registerQuenchTests(quench: Quench) {
    console.group("Quench");
    console.log("Splittermond | Initializing quench tests");
    registerApiBatches(createRegistrar(quench, "api"));
    registerMigrationBatches(createRegistrar(quench, "migration"));
    registerInfrastructureBatches(createRegistrar(quench, "infrastructure"));
    registerActorBatches(createRegistrar(quench, "actor"));

    quench.registerBatch("splittermond.applications", applicationTests);
    quench.registerBatch("splittermond.item", itemTest);
    quench.registerBatch("splittermond.combat", combatTest);
    quench.registerBatch("splittermond.chatSystem", chatActionFeatureTest);
    quench.registerBatch("splittermond.damageProcessing", DamageProcessingTest);
    quench.registerBatch("splittermond.activeEffectConfig", activeEffectTest);
    quench.registerBatch("splittermond.compendiumEffectAssignment", compendiumEffectAssignmentTest);
    quench.registerBatch("splittermond.itemCompendiumAssignment", itemCompendiumAssignmentTest);
    console.groupEnd();
}

export function init() {
    // Use Quench's ready hook to add our tests. This hook will never be triggered if Quench isn't loaded.
    Hooks.on("quenchReady", registerQuenchTests);
}

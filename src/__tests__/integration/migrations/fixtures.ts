import sinon from "sinon";
import type SplittermondActor from "module/actor/actor";
import { SplittermondActiveEffect } from "module/activeEffect/SplittermondActiveEffect";
import { ActionEffectDataModel } from "module/activeEffect/dataModel/ActionEffectDataModel";
import { SplittermondBaseActiveEffect } from "module/data/SplittermondBaseActiveEffect";
import { SplittermondActiveEffectDataModel } from "module/data/SplittermondActiveEffectDataModel";

declare const Actor: {
    implementation: typeof SplittermondActor;
    database: {
        get(
            documentClass: typeof SplittermondActor,
            operation: { action: "get"; documentName: "Actor"; query: { _id: string } }
        ): Promise<SplittermondActor[]>;
    };
};

export async function readStoredActor(id: string): Promise<SplittermondActor> {
    // Actor.get uses the world collection; the public backend reads persisted data instead.
    // https://foundryvtt.com/api/v14/classes/foundry.abstract.DatabaseBackend.html#get
    const actors = await Actor.database.get(Actor.implementation, {
        action: "get",
        documentName: "Actor",
        query: { _id: id },
    });
    if (actors.length !== 1) throw new Error(`Expected one stored test actor, received ${actors.length}`);
    return actors[0];
}

export async function withoutCompendiumEffectMigrations<T>(fixtureName: string, setup: () => Promise<T>): Promise<T> {
    const sandbox = sinon.createSandbox();
    try {
        // Only this fixture's effects retain their old data. Restore production migrations before the reload.
        sandbox
            .stub(SplittermondActiveEffect, "migrateData")
            .callThrough()
            .withArgs(sinon.match.hasNested("system.modifiers.0.attributes.name", fixtureName))
            .callsFake((source) => SplittermondBaseActiveEffect.migrateData.call(SplittermondActiveEffect, source));
        sandbox
            .stub(ActionEffectDataModel, "migrateData")
            .callThrough()
            .withArgs(sinon.match.hasNested("modifiers.0.attributes.name", fixtureName))
            .callsFake((source) => SplittermondActiveEffectDataModel.migrateData.call(ActionEffectDataModel, source));
        return await setup();
    } finally {
        sandbox.restore();
    }
}

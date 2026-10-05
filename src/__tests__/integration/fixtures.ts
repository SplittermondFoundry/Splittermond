import type SplittermondActor from "module/actor/actor";
import type { FoundryActiveEffect } from "module/api/ActiveEffect";
import type { FoundryScene, User } from "module/api/foundryTypes";
import { foundryApi } from "module/api/foundryApi";
import type { QuenchBatchContext, QuenchRegisterBatchFunction } from "@ethaks/fvtt-quench";

declare const game: any;
declare const Scene: FoundryScene;
declare const User: User & FoundryDocument;

export type BatchRegistrar = (name: string, batch: QuenchRegisterBatchFunction) => void;

export async function createActor() {
    const actor = await Actor.create({ type: "character", name: `Test Actor${nextId()}` });
    return actor as SplittermondActor;
}

export async function createScene() {
    const scene = await Scene.create({ type: "character", name: `Test Scene${nextId()}` });
    return scene as FoundryScene;
}

export async function createPlayer() {
    const user = await User.create({ name: `Test Player${nextId()}`, permissions: {} });
    return user as User;
}

async function createToken(actor: SplittermondActor, scene: FoundryScene) {
    return (
        await scene.createEmbeddedDocuments("Token", [
            {
                type: "base",
                actorLink: false,
                actorId: actor.id,
                x: scene._viewPosition.x,
                y: scene._viewPosition.y,
            },
        ])
    )[0] as TokenDocument;
}

export function withActor<P extends Array<any>, R>(fn: (actor: SplittermondActor, ...args: P) => Promise<R>) {
    return async (...args: P) => {
        const actor = await createActor();
        try {
            return await fn(actor as SplittermondActor, ...args);
        } finally {
            await Actor.deleteDocuments([actor.id]);
        }
    };
}

export function withActiveEffect<P extends Array<any>, R>(
    effectData: object,
    fn: (effect: FoundryActiveEffect, actor: SplittermondActor, ...args: P) => Promise<R>
) {
    return withActor(async (actor, ...args: P) => {
        const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
        return await fn(effect as FoundryActiveEffect, actor, ...args);
    });
}

async function createSceneFixture() {
    const originalScene = foundryApi.currentScene;
    const scene = await createScene();
    return {
        scene,
        async cleanup() {
            try {
                if (foundryApi.currentScene?.id === scene.id) {
                    await originalScene?.activate();
                    await originalScene?.view();
                }
            } finally {
                await Scene.deleteDocuments([scene.id]);
            }
        },
    };
}

export function withScene<P extends unknown[], R>(fn: (scene: FoundryScene, ...args: P) => Promise<R>) {
    return async (...args: P) => {
        const fixture = await createSceneFixture();
        try {
            return await fn(fixture.scene, ...args);
        } finally {
            await fixture.cleanup();
        }
    };
}

export function useScene(
    { before, after }: Pick<QuenchBatchContext, "before" | "after">,
    setup: (scene: FoundryScene) => void
): void {
    let fixture: Awaited<ReturnType<typeof createSceneFixture>> | undefined;
    before(async () => {
        fixture = await createSceneFixture();
        setup(fixture.scene);
        await fixture.scene.view();
        // Keep the existing combat fixtures' grace period for canvas/token initialization.
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await fixture.scene.activate();
    });
    after(async () => {
        await fixture?.cleanup();
    });
}

export function withPlayer<P extends Array<any>, R>(fn: (player: User, ...args: P) => Promise<R>) {
    return async (...args: P) => {
        const player = await createPlayer();
        try {
            return await fn(player, ...args);
        } finally {
            await User.deleteDocuments([player.id]);
        }
    };
}

export function withUnlinkedToken<P extends Array<U>, R, U>(fn: (token: TokenDocument, ...args: P) => Promise<R>) {
    return async (...args: P) =>
        withScene(
            withActor(async (actor, scene) => {
                const token = await createToken(actor, scene);
                try {
                    return await fn(token, ...args);
                } finally {
                    await foundryApi.currentScene!.deleteEmbeddedDocuments("Token", [token.id]);
                }
            })
        );
}

const idGenerator = (function* () {
    let id = 0;
    while (true) {
        yield id++;
    }
})();
function nextId() {
    return idGenerator.next().value;
}

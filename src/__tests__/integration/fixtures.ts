import type SplittermondActor from "module/actor/actor";
import type { FoundryActiveEffect } from "module/api/ActiveEffect";
import type { FoundryScene, Socket, User } from "module/api/foundryTypes";
import { foundryApi } from "module/api/foundryApi";
import { ChatMessage, type FoundryChatMessage } from "module/api/ChatMessage";
import { passesEventually } from "../util";
import type { QuenchBatchContext, QuenchRegisterBatchFunction } from "@ethaks/fvtt-quench";

declare const ui: { combat: { viewed: foundry.documents.Combat | null } };
declare const game: { messages: Collection<FoundryChatMessage> };
declare const canvas: { ready: boolean };
declare const foundry: { Game: { connect(): Promise<Socket & { disconnect(): void }> } };
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

export async function deleteTestMessages(ids: string[]): Promise<void> {
    const existingIds = ids.filter((id) => foundryApi.messages.get(id));
    if (!existingIds.length) return;
    for (const id of existingIds) {
        // Creation resolves before Foundry finishes revealing the chat notification.
        await passesEventually(() => {
            const elements = document.querySelectorAll<HTMLElement>(`.chat-message[data-message-id="${id}"]`);
            if (!elements.length || Array.from(elements).some((element) => element.hidden)) {
                throw new Error(`Chat message ${id} is still rendering`);
            }
        }, 1500);
    }
    await ChatMessage.deleteDocuments(existingIds);
}

export async function deleteActorMessages(actorIds: string[]): Promise<void> {
    await deleteTestMessages(
        game.messages.filter((message) => actorIds.includes(message.speaker.actor ?? "")).map((message) => message.id)
    );
}

export async function deleteTestCombats(ids: string[]): Promise<void> {
    if (ui.combat.viewed && ids.includes(ui.combat.viewed.id)) ui.combat.viewed = null;
    await Combat.deleteDocuments(ids);
}

export async function withSocket<R>(fn: (socket: Socket) => Promise<R>): Promise<R> {
    const socket = await foundry.Game.connect();
    try {
        return await fn(socket);
    } finally {
        socket.disconnect();
    }
}

async function createToken(actor: SplittermondActor, scene: FoundryScene) {
    return (
        await scene.createEmbeddedDocuments("Token", [
            {
                type: "base",
                actorLink: false,
                actorId: actor.id,
                x: 0,
                y: 0,
            },
        ])
    )[0] as TokenDocument;
}

export function withActor<P extends Array<any>, R>(
    fn: (actor: SplittermondActor, ...args: P) => Promise<R>,
    actorFactory: () => Promise<SplittermondActor> = createActor
) {
    return async (...args: P) => {
        const actor = await actorFactory();
        try {
            return await fn(actor, ...args);
        } finally {
            try {
                await deleteActorMessages([actor.id]);
            } finally {
                await Actor.deleteDocuments([actor.id]);
            }
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
    const originalActiveScene = foundryApi.scenes.find((scene) => scene.active);
    const originalCombat = ui.combat.viewed;
    const originalActiveCombats = foundryApi.combats.filter((combat) => combat.active);
    const scene = await createScene();
    return {
        scene,
        async cleanup() {
            try {
                const restoreView = scene.active || foundryApi.currentScene?.id === scene.id;
                if (scene.active) await originalActiveScene?.activate();
                if (restoreView && originalScene) {
                    // Activation can still be drawing; Foundry ignores a scene switch during that draw.
                    await passesEventually(() => {
                        if (!canvas.ready) throw new Error("Canvas is still drawing");
                    }, 1500);
                    await originalScene.view();
                }
            } finally {
                await Scene.deleteDocuments([scene.id]);
                // Restore combat state without queuing a tracker render during scene cleanup.
                await Promise.all(
                    originalActiveCombats
                        .filter((combat) => !combat.active)
                        .map((combat) => combat.update({ active: true }, { render: false }))
                );
                ui.combat.viewed = originalCombat;
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

export function withUnlinkedToken<P extends unknown[], R>(fn: (token: TokenDocument, ...args: P) => Promise<R>) {
    return async (...args: P) =>
        withScene(
            withActor(async (actor, scene) => {
                const token = await createToken(actor, scene);
                return await fn(token, ...args);
            })
        )();
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

import { type TestFunction } from "mocha";
import type SplittermondActor from "module/actor/actor";

declare const game: any;
async function createActor() {
    const actor = await Actor.create({ type: "character", name: `Test Actor${nextId()}` });
    return actor as SplittermondActor;
}

export function withActor(fn: (actor: SplittermondActor) => Promise<unknown>) {
    return async () => {
        const actor = await createActor();
        try {
            return await fn(actor as SplittermondActor);
        } finally {
            await Actor.deleteDocuments([actor.id]);
        }
    };
}

export function getUnlinkedToken(test: TestFunction) {
    const anyToken = game.scenes
        .map((scene: any) => scene.tokens)
        .flatMap((c: any) => [...c.values()])
        .find((token: any) => !token.actorLink);
    if (!anyToken) {
        console.log(test);
        test.skip("No unlinked token found");
    }
    return anyToken;
}

function nextId() {
    return idGenerator.next().value;
}
const idGenerator = (function* () {
    let id = 0;
    while (true) {
        yield id++;
    }
})();

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

function nextId() {
    return idGenerator.next().value;
}
const idGenerator = (function* () {
    let id = 0;
    while (true) {
        yield id++;
    }
})();

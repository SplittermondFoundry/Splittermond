import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { foundryApi } from "module/api/foundryApi";
import { withActor, withScene } from "../fixtures";

export function speakerApiTest(context: QuenchBatchContext) {
    const { describe, it, expect } = context;

    describe("foundryApi.getSpeakerActor", function () {
        this.timeout(10000);

        it(
            "resolves an actor-only speaker",
            withActor(async (actor) => {
                const speaker = { scene: "", token: null, actor: actor.id, alias: actor.name };

                expect(foundryApi.getSpeakerActor(speaker)).to.equal(actor);
            })
        );

        for (const actorLink of [true, false]) {
            it(
                `prefers the ${actorLink ? "linked" : "unlinked"} token actor over the explicit actor`,
                withScene(
                    withActor(
                        withActor(async (fallbackActor, actor, scene) => {
                            const [token] = await scene.createEmbeddedDocuments("Token", [
                                { type: "base", actorLink, actorId: actor.id, x: 0, y: 0 },
                            ]);
                            const speaker = {
                                scene: scene.id,
                                token: token.id,
                                actor: fallbackActor.id,
                                alias: actor.name,
                            };

                            expect(token.actor).not.to.be.null;
                            expect(foundryApi.getSpeakerActor(speaker)).to.equal(token.actor);
                            if (!actorLink) {
                                expect(token.actor, "unlinked tokens use a synthetic actor").not.to.equal(actor);
                            }
                        })
                    )
                )
            );
        }

        it(
            "falls back to the explicit actor when the token no longer exists",
            withScene(
                withActor(async (actor, scene) => {
                    const [token] = await scene.createEmbeddedDocuments("Token", [
                        { type: "base", actorLink: false, actorId: actor.id, x: 0, y: 0 },
                    ]);
                    const speaker = { scene: scene.id, token: token.id, actor: actor.id, alias: actor.name };
                    await scene.deleteEmbeddedDocuments("Token", [token.id]);

                    expect(foundryApi.getSpeakerActor(speaker)).to.equal(actor);
                })
            )
        );

        it("returns null when the speaker has no actor", () => {
            const speaker = { scene: "", token: null, actor: null, alias: "Unknown" };

            expect(foundryApi.getSpeakerActor(speaker)).to.be.null;
        });

        it("returns null when the speaker's actor no longer exists", async () => {
            const speaker = await withActor(async (actor) => ({
                scene: "",
                token: null,
                actor: actor.id,
                alias: actor.name,
            }))();

            expect(foundryApi.getSpeakerActor(speaker)).to.be.null;
        });
    });
}

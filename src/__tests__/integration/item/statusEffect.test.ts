import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { foundryApi } from "module/api/foundryApi";
import { StatusEffectDataModel } from "module/item/dataModel/StatusEffectDataModel";
import SplittermondItem from "module/item/item";
import { withActor } from "../fixtures";

export function statusEffectTest(context: QuenchBatchContext) {
    const { describe, it, expect } = context;

    describe("Status effect level", function () {
        this.timeout(10000);

        it(
            "defaults an omitted level to 1 and disallows null in the schema",
            withActor(async (actor) => {
                const [item] = await actor.createEmbeddedDocuments("Item", [
                    { type: "statuseffect", name: "Default level", system: {} },
                ]);

                expect(item.system).to.be.instanceOf(StatusEffectDataModel);
                expect(item.system).to.have.property("level", 1);
                expect(StatusEffectDataModel.defineSchema().level.validate(null)).to.exist;
            })
        );

        it("normalizes a legacy null level when constructing an item from source", () => {
            const item = new SplittermondItem({
                type: "statuseffect",
                name: "Legacy null level",
                system: { level: null },
            });

            expect(item.system).to.be.instanceOf(StatusEffectDataModel);
            expect(item.system).to.have.property("level", 1);
            expect(foundryApi.getDocumentSource(item).system).to.have.property("level", 1);
        });

        it(
            "normalizes null level updates while preserving zero on unrelated updates",
            withActor(async (actor) => {
                const [item] = await actor.createEmbeddedDocuments("Item", [
                    { type: "statuseffect", name: "Updated level", system: { level: 2 } },
                ]);

                await item.update({ "system.level": null });
                expect(item.system).to.have.property("level", 1);
                expect(foundryApi.getDocumentSource(item).system).to.have.property("level", 1);

                await item.update({ "system.level": 0 });
                await item.update({ "system.description": "Updated description" });
                expect(item.system).to.have.property("level", 0);
                expect(foundryApi.getDocumentSource(item).system).to.have.property("level", 0);
            })
        );
    });
}

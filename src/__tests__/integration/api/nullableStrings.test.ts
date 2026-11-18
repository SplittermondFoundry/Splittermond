import type { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { DataModelSchemaType, SplittermondDataModel } from "module/data/SplittermondDataModel";
import { NullableStringField } from "module/api/NullableStringField";

function nullableTextSchema() {
    return {
        inherited: new NullableStringField(),
        empty: new NullableStringField(),
        text: new NullableStringField(),
    };
}

class NullableTextModel extends SplittermondDataModel<DataModelSchemaType<typeof nullableTextSchema>> {
    static defineSchema = nullableTextSchema;
}

export function nullableStringsTest({ describe, it, expect }: QuenchBatchContext) {
    describe("Nullable text fields", () => {
        it("preserves null, empty text and an explicit value through serialization", () => {
            const source = { inherited: null, empty: "", text: "10m" };
            const model = new NullableTextModel(source);

            const restored = new NullableTextModel(model.toObject());

            expect(restored.toObject()).to.deep.equal(source);
            expect(restored.inherited).to.equal(null);
            expect(restored.empty).to.equal("");
        });

        it("initializes missing text as null and restores it after an update", () => {
            // @ts-expect-error Deliberately omit required fields to exercise Foundry's schema defaults.
            const model = new NullableTextModel({});
            expect(model.text, "a missing text field defaults to inheritance").to.equal(null);
            model.updateSource({ text: "20m" });

            model.updateSource({ text: null });

            expect(model.text, "an explicit null update restores inheritance").to.equal(null);
            expect(new NullableTextModel(model.toObject()).text).to.equal(null);
        });
    });
}

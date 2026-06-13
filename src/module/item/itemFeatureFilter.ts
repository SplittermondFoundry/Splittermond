import { ItemFeatureDataModel, ItemFeaturesModel } from "module/item/dataModel/propertyModels/ItemFeaturesModel";
import { registerHook } from "module/hooks/registration";
import { fields } from "module/data/SplittermondDataModel";
import { settings } from "module/settings";
import { documentValidator } from "module/hooks";

const present = { required: true, nullable: false } as const;

const itemFeaturePropagation = registerHook("splittermond.damage.onItemFeatureTransfer", () => [
    documentValidator(Object),
    new fields.EmbeddedDataField(ItemFeatureDataModel, present),
    new fields.SchemaField({ shouldPass: new fields.BooleanField(present) }, present),
]);
export function filterFeatures(carrier: object, itemFeaturesModel: ItemFeaturesModel): ItemFeaturesModel {
    const featureList = itemFeaturesModel.featureList.filter((a) => filter(carrier, a));

    return ItemFeaturesModel.from(featureList);
}

function filter(carrier: object, feature: ItemFeatureDataModel): boolean {
    const adjudicator = { shouldPass: true };
    itemFeaturePropagation.call(carrier, feature, adjudicator);
    return adjudicator.shouldPass;
}

settings
    .registerBoolean("noDamageReductionOverrideFromItem", {
        choices: undefined,
        config: true,
        default: true,
        onChange: (newState) => damageReductionOverrideToggleManager.toggle(newState),
        position: undefined,
        scope: "world",
    })
    .then((accessors) => damageReductionOverrideToggleManager.toggle(accessors.get()));

const damageReductionOverrideToggleManager = new (class DamageReductionOverrideToggleManager {
    private unsubscribe: () => void = () => {};

    toggle(target: boolean) {
        if (!target) {
            this.unsubscribe();
        }
        if (target) {
            this.unsubscribe = itemFeaturePropagation.subscribe((_, f, a) => this.filter(_, f, a)).unsubscribe;
        }
    }

    private filter(_: unknown, feature: ItemFeatureDataModel, adjudicator: { shouldPass: boolean }) {
        if (feature.name === "Durchdringung") {
            adjudicator.shouldPass = false;
        }
        return true;
    }
})();

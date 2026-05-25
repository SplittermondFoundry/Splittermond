import type { ItemIndexEntity } from "module/apps/compendiumBrowser/compendium-browser";
import { ItemFeaturesModel } from "module/item/dataModel/propertyModels/ItemFeaturesModel";
import { foundryApi } from "module/api/foundryApi";

let reportedOutdatedFeatureModel = false;
export function initializeTagGenerator(item: ItemIndexEntity) {
    const property = "featuresList";
    reportedOutdatedFeatureModel = false;
    if (!(property in item)) {
        Object.defineProperty(item, property, {
            get: function () {
                if (!this.system.features) return [];
                //Compatibility for old system features -- Remove once a migration script exists
                if (typeof this.system.features === "string") return handleOutdatedStringFeatures(this);
                return new ItemFeaturesModel(this.system.features).featuresAsStringList();
            },
        });
    }
}

function handleOutdatedStringFeatures(item: ItemIndexEntity) {
    if (!reportedOutdatedFeatureModel) {
        reportedOutdatedFeatureModel = true;
        foundryApi.warnUser(`splittermond.message.outdatedFeaturesModel`, { item: item.name });
    } else {
        console.warn(`Splittermond | Outdated features model on '${item.name}'.`);
    }
    return ItemFeaturesModel.from(item.system.features).featuresAsStringList();
}

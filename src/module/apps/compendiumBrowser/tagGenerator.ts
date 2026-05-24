import type {ItemIndexEntity} from "module/apps/compendiumBrowser/compendium-browser";
import {ItemFeaturesModel} from "module/item/dataModel/propertyModels/ItemFeaturesModel";

export function initializeTagGenerator(item:ItemIndexEntity) {
    const property = "featuresList";
    if (!(property in item)) {
        Object.defineProperty(item, property, {
            get: function () {
                if(!this.system.features) return []
                return new ItemFeaturesModel(this.system.features).featuresAsStringList()
            },
        });
    }
}

import {DataModelSchemaType, fieldExtensions, fields, SplittermondDataModel} from "module/data/SplittermondDataModel";
import SplittermondItem from "module/item/item";
import {ItemFeature, itemFeatures} from "../../../config/itemFeatures";
import {splittermond} from "../../../config";
import {DataModelConstructorInput} from "../../../api/DataModel";
import {foundryApi} from "../../../api/foundryApi";
import {SplittermondItemDataModel} from "../../index";
import ModifierManager from "../../../actor/modifier-manager";
import {evaluate} from "../../../actor/modifiers/expressions/scalar";


function FeaturesSchema() {
    return {
        internalFeatureList: new fields.ArrayField(
            new fields.EmbeddedDataField(ItemFeatureDataModel, {required: true, nullable: false}),
            {required: true, nullable: false, initial: []}
        )
    };
}

export type ItemFeaturesType = DataModelSchemaType<typeof FeaturesSchema>;

export class ItemFeaturesModel extends SplittermondDataModel<ItemFeaturesType, SplittermondItemDataModel> {

    static emptyFeatures() {
        return new ItemFeaturesModel({internalFeatureList: []});
    }

    static from(features: string | ItemFeatureDataModel[]) {
        return typeof features === "string" ?
            ItemFeaturesModel.fromString(features) :
            ItemFeaturesModel.fromFeatures(features);
    }

    private static fromFeatures(features: ItemFeatureDataModel[]) {
        return new ItemFeaturesModel({internalFeatureList: features});
    }

    private static fromString(features: string) {
        const parsed = parseFeatures(features);
        const itemFeatures = parsed.map(f => new ItemFeatureDataModel(f))
        return new ItemFeaturesModel({internalFeatureList: itemFeatures});
    }

    static defineSchema = FeaturesSchema;


    hasFeature(feature: ItemFeature) {
        return this.featureList.some(f => f.name === feature);
    }

    valueOf(feature: ItemFeature) {
        return this.findFeature(feature)?.value ?? 0;
    }

    private findFeature(feature: ItemFeature) {
        return this.featureList.find(f => f.name === feature);
    }

    get featureList() {
        const featuresFromModifier = this.getModifierManager()
            .getForId("item.addfeature").withAttributeValuesOrAbsent("item", this.getName() ?? "").getModifiers()
            .flatMap(m => {
                const value = `${evaluate(m.value)}` || "";
                return parseFeatures(`${m.attributes.feature} ${value}`)
            }).map(f => new ItemFeatureDataModel(f));
        return mergeDataModels(this.internalFeatureList, featuresFromModifier);
    }

    featuresAsStringList() {
        return this.featureList.map(f => f.toString())
    }

    /**
     * Returns a string representation for the item sheet so that the user can edit the contents
     */
    get innateFeatures() {
        return this.internalFeatureList.map(f => f.toString()).join(", ");
    }

    /**
     * Returns a string representation of the features suitable for display.
     */
    get features() {
        return this.featureList.map(f => f.toString()).join(", ");
    }

    private getModifierManager(): ModifierManager {
        const modifierManager = this.parent?.parent?.actor?.modifier;
        return modifierManager ?? new ModifierManager();
    }

    private getName(): string | null {
        return this.parent?.parent?.name ?? null;
    }

}

export function mergeFeatures(one: ItemFeaturesModel, other: ItemFeaturesModel) {
    return ItemFeaturesModel.from(mergeDataModels(one.featureList, other.featureList));
}


function FeatureSchema() {
    return {
        name: new fieldExtensions.StringEnumField({
            required: true,
            nullable: false,
            validate: (x: ItemFeature) => itemFeatures.includes(x)
        }),
        value: new fields.NumberField({
            required: true,
            nullable: false,
            validate: (x: number) => x > 0
        }),
    }
}

export type ItemFeatureType = DataModelSchemaType<typeof FeatureSchema>;

export class ItemFeatureDataModel extends SplittermondDataModel<ItemFeatureType, SplittermondItem> {
    static defineSchema = FeatureSchema;

    toString() {
        if (this.value === 1) {
            return this.name;
        } else {
            return `${this.name} ${this.value}`;
        }
    }
}

export function parseFeatures(features: string): DataModelConstructorInput<ItemFeatureType>[] {
    if (!features) {
        return [];
    }
    const featureList = features.split(",").map((f) => f.trim());
    const parsedFeatures: DataModelConstructorInput<ItemFeatureType>[] = [];
    for (const feature of featureList) {
        const name = parseName(feature);
        const value = parseValue(feature);
        if (!name || !value) {
            continue;
        }
        parsedFeatures.push({name, value});
    }
    return mergeConstructorData(parsedFeatures, parsedFeatures); //remove duplicates
}

function parseName(feature: string) {
    const name = /^.+?(?=\s+\d+|$)/.exec(feature)?.[0] ?? feature; //we should never actually hit the right hand side, but TS cannot know that.
    const matched = normalizeName(name);
    if (!splittermond.itemFeatures.includes(matched as ItemFeature)) {
        foundryApi.warnUser("splittermond.message.featureParsingFailure", {feature})
        return null;
    }
    return matched as ItemFeature;
}

function parseValue(feature: string) {
    const valueString = /(?<=\s+)\d+$/.exec(feature)?.[0] ?? "1"; //A feature that does not need a scale gets a scale of one.
    return parseInt(valueString);
}


function normalizeName(name: string) {
    return splittermond.itemFeatures.find(f => f.toLowerCase() == name.trim().toLowerCase()) ?? name;
}

function mergeDataModels(one: ItemFeatureDataModel[], other: ItemFeatureDataModel[]) {
    return merge(one, other, (x) => new ItemFeatureDataModel(x as DataModelConstructorInput<ItemFeatureType>));
}

function mergeConstructorData(one: DataModelConstructorInput<ItemFeatureType>[], other: DataModelConstructorInput<ItemFeatureType>[]) {
    return merge(one, other, (x) => x as DataModelConstructorInput<ItemFeatureType>)
}

type Mergeable = { name: string, value: number };

function merge<T extends Mergeable>(one: T[], other: T[], constructor: (x: Mergeable) => T) {
    const merged = new Map<string, T>();
    [...one, ...other].forEach(feature => {
        if (merged.has(feature.name)) {
            const old = merged.get(feature.name)!/*we just tested for presence*/;
            merged.set(feature.name, constructor({name: feature.name, value: Math.max(old.value, feature.value)}))
        } else {
            merged.set(feature.name, feature);
        }
    });
    return Array.from(merged.values());
}
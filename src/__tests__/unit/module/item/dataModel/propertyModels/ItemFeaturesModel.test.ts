import {
    ItemFeatureDataModel,
    ItemFeaturesModel,
    mergeFeatures,
    parseFeatures
} from "module/item/dataModel/propertyModels/ItemFeaturesModel";
import {afterEach, beforeEach, describe, it} from "mocha";
import {expect} from "chai";
import {foundryApi} from "../../../../../../module/api/foundryApi";
import sinon from "sinon";
import {WeaponDataModel} from "../../../../../../module/item/dataModel/WeaponDataModel";
import SplittermondWeaponItem from "../../../../../../module/item/weapon";
import SplittermondActor from "../../../../../../module/actor/actor";
import ModifierManager from "../../../../../../module/actor/modifier-manager";
import {of} from "../../../../../../module/actor/modifiers/expressions/scalar";

describe("ItemFeaturesModel", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => sandbox = sinon.createSandbox());
    afterEach(() => sandbox.restore());

    it("should provide comma separated values", () => {
        const feature1 = new ItemFeatureDataModel({name: "Scharf", value: 5});
        const feature2 = new ItemFeatureDataModel({name: "Ablenkend", value: 1});
        const features = new ItemFeaturesModel({internalFeatureList: [feature1, feature2]});

        expect(features.features).to.deep.equal("Scharf 5, Ablenkend");
    });

    it("should provide a string list ", () => {
        const feature1 = new ItemFeatureDataModel({name: "Scharf", value: 5});
        const feature2 = new ItemFeatureDataModel({name: "Ablenkend", value: 1});
        const features = new ItemFeaturesModel({internalFeatureList: [feature1, feature2]});

        expect(features.featuresAsStringList()).to.deep.equal(["Scharf 5", "Ablenkend"]);
    });

    it("should account for specific modifiers", () => {
        const internal = new ItemFeatureDataModel({name: "Ablenkend", value: 1});
        const parent = setupParent();
        parent.parent!.actor.modifier.add("item.mergeFeature", {name:"Test", feature: "Scharf", item: "Test", type:"magic"}, of(5),null, false)
        const features = new ItemFeaturesModel({internalFeatureList: [internal]},{parent});

        expect(features.featuresAsStringList()).to.deep.equal(["Ablenkend", "Scharf 5"]);
    });
    it("should account for global modifiers", () => {
        const internal = new ItemFeatureDataModel({name: "Ablenkend", value: 1});
        const parent = setupParent();
        parent.parent!.actor.modifier.add("item.mergeFeature", {name:"Test", feature: "Scharf", type:"magic"}, of(5),null, false)
        const features = new ItemFeaturesModel({internalFeatureList: [internal]},{parent});

        expect(features.featuresAsStringList()).to.deep.equal(["Ablenkend", "Scharf 5"]);

    });

    it("should deduplicate modifiers", () => {
        const internal1 = new ItemFeatureDataModel({name: "Ablenkend", value: 1});
        const internal2 = new ItemFeatureDataModel({name: "Scharf", value: 2});
        const parent = setupParent();
        parent.parent!.actor.modifier.add("item.mergeFeature", {name:"Test", feature: "Scharf", item: "Test", type:"magic"}, of(5),null, false)
        const features = new ItemFeaturesModel({internalFeatureList: [internal1,internal2]},{parent});

        expect(features.featuresAsStringList()).to.deep.equal(["Ablenkend", "Scharf 5"]);
    })

    it("should filter by item name", () => {
        const internal1 = new ItemFeatureDataModel({name: "Ablenkend", value: 1});
        const internal2 = new ItemFeatureDataModel({name: "Scharf", value: 2});
        const parent = setupParent();
        parent.parent!.actor.modifier.add("item.mergeFeature", {name:"Test", feature: "Scharf", item: "Test2", type:"magic"}, of(5),null, false)
        parent.parent!.actor.modifier.add("item.mergeFeature", {name:"Test", feature: "Scharf", item: "Test3", type:"magic"}, of(5),null, false)
        const features = new ItemFeaturesModel({internalFeatureList: [internal1,internal2]},{parent});

        expect(features.featuresAsStringList()).to.deep.equal(["Ablenkend", "Scharf 2"]);
    });

    it("should filter by item type", () => {
        const internal1 = new ItemFeatureDataModel({name: "Ablenkend", value: 1});
        const internal2 = new ItemFeatureDataModel({name: "Scharf", value: 2});
        const parent = setupParent();
        parent.parent!.type="spell"
        parent.parent!.actor.modifier.add("item.mergeFeature", {name:"Test", feature: "Scharf", itemType: "spell", type:"magic"}, of(5),null, false)
        parent.parent!.actor.modifier.add("item.mergeFeature", {name:"Test", feature: "Scharf", itemType: "weapon", type:"magic"}, of(5),null, false)
        const features = new ItemFeaturesModel({internalFeatureList: [internal1,internal2]},{parent});

        expect(features.featuresAsStringList()).to.deep.equal(["Ablenkend", "Scharf 2"]);
    });

    it("should merge features", () => {
       const one = ItemFeaturesModel.from("Ablenkend 1, Scharf 2, Durchdringung 3");
        const other= ItemFeaturesModel.from("Wuchtig, Scharf 5, Durchdringung 1");
        const merged = mergeFeatures(one, other);

        expect(merged.featuresAsStringList()).to.have.members(["Ablenkend", "Scharf 5", "Durchdringung 3", "Wuchtig"]);

    });


    function setupParent(){
        const parent = sandbox.createStubInstance(WeaponDataModel);
        const actor = sandbox.createStubInstance(SplittermondActor);
        Object.defineProperty(actor,"modifier", {value: new ModifierManager(), enumerable: true, writable: false});
        parent.parent = sandbox.createStubInstance(SplittermondWeaponItem)
        parent.parent.name = "Test";
        Object.defineProperty(parent.parent,"actor", {value: actor, enumerable: true, writable: false});
        return parent;
    }
});

describe("ItemFeatureDataModel", () => {
    it("should produce a nice string representation", () => {
        const feature = new ItemFeatureDataModel({name: "Scharf", value: 5});
        expect(feature.toString()).to.equal("Scharf 5");
    });

    it("should omit values if equal to 1", () => {
        const feature = new ItemFeatureDataModel({name: "Ablenkend", value: 1});
        expect(feature.toString()).to.equal("Ablenkend");
    });
});

describe("feature parser", () => {
    let sandbox: sinon.SinonSandbox;
    let warnStub: sinon.SinonStub;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        warnStub = sandbox.stub(foundryApi, "warnUser");
    });
    afterEach(() => sandbox.restore());

    ["", 0, undefined, null].forEach(feature => {
        it(`should return an empty array for invalid feature: ${feature}`, () => {
            const result = parseFeatures(feature as string);
            expect(result).to.deep.equal([]);
        });
    })
    it("should parse a feature string with a value", () => {
        const featureString = "Exakt 5";
        const result = parseFeatures(featureString);

        expect(result[0].name).to.equal("Exakt");
        expect(result[0].value).to.equal(5);
    });

    it("should parse a feature string without a value", () => {
        const featureString = "Vielseitig";
        const result = parseFeatures(featureString);

        expect(result[0].name).to.equal("Vielseitig");
        expect(result[0].value).to.equal(1);
    });

    it("should ignore nonnumeric values", () => {
        const featureString = "Ablenkend abc";
        const result = parseFeatures(featureString);

        expect(result).to.have.lengthOf(0);
        expect(warnStub.calledOnce).to.equal(true);
    });

    it("should handle Lange Waffe", () => {
        const featureString = "Lange Waffe";
        const result = parseFeatures(featureString);

        expect(result[0]).to.deep.equal({name: "Lange Waffe", value: 1});
    })

    it("should ignore nonfeature names", () => {
        const featureString = "testFeature";
        const result = parseFeatures(featureString);

        expect(result).to.have.lengthOf(0);
        expect(warnStub.calledOnce).to.equal(true);
    });

    it("should parse multiple features", () => {
        const featureString = "Scharf 5, Wuchtig";
        const result = parseFeatures(featureString);

        expect(result[0]).to.deep.equal({name: "Scharf", value: 5});
        expect(result[1]).to.deep.equal({name: "Wuchtig", value: 1});
    });

    it("should normalize known features", () => {
        const featureString = "sChArF 5,    imPRoVISIERt";
        const result = parseFeatures(featureString);

        expect(result[0].name).to.equal("Scharf");
        expect(result[1].name).to.equal("Improvisiert");
    });

    it("should deduplicate features", () => {
        const featureString = "Scharf 3, Improvisiert, Scharf 5";
        const result = parseFeatures(featureString);

        expect(result).to.have.lengthOf(2);
        expect(result[0]).to.deep.equal({name: "Scharf", value: 5});
        expect(result[1].name).to.equal("Improvisiert");
    });
});
import {SplittermondDataModel} from "./SplittermondDataModel";


class EmbeddedDataModel extends SplittermondDataModel<{ aString: string, aNumber: number }> {

}

class MainDataClass extends SplittermondDataModel<{
    embeddedModel: EmbeddedDataModel,
    anObject: Record<string, string>
}> {
}

export namespace AllTopLevelItemsAreReadonly {
    const embeddedModel = new EmbeddedDataModel({aString: "str", aNumber: 3});
    type IsReadonly<T> = T extends Readonly<T> ? true : false;

    export const verifyIsReadonly: IsReadonly<typeof embeddedModel.aNumber> = true;
    //@ts-expect-error aNumber is not assignable
    embeddedModel.aNumber = 3;
}

export namespace ToObjectProducesInput {
    const embeddedModel = new EmbeddedDataModel({aString: "str", aNumber: 3});
    type EmbeddedModelObject = ReturnType<typeof embeddedModel.toObject>

    export const verifyProducesInput: EmbeddedModelObject = {aString: "str", aNumber: 3};

}

export namespace InputAcceptsObjectOfEmbeddedDataClasses {
    export const mainClass = new MainDataClass({
        embeddedModel: new EmbeddedDataModel({aString: "str", aNumber: 3}).toObject(),
        anObject: {
            what: "a",
            is: "3"
        }
    });
}

export namespace SplittermondDataModelSupportsGenericChildren {
    class GenericParent<T extends object> extends SplittermondDataModel<T> {
    }
    class Child extends GenericParent<{a: string}> {
    }

    const aChild:Child = new Child({a: "a"});
    aChild.a;
}
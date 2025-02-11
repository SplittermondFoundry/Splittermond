import {DataModelSchemaType, fields, SplittermondDataModel} from "../SplittermondDataModel";
import {IllegalStateException} from "../exceptions";

type DataModelConstructor<SCHEMA extends object> = typeof SplittermondDataModel<SCHEMA,any> & {defineSchema():object}
type SchemaOf<DM> = DM extends DataModelConstructor<infer SCHEMA> ? SCHEMA : never;

export class OnAncestorReference<T> extends SplittermondDataModel<DataModelSchemaType<typeof OnAncestorReference.defineSchema>, any> {
    static defineSchema() {
        return {
            ancestorId: new fields.StringField({required: true, blank: false, nullable: false}),
            ancestorIdKey: new fields.StringField({required: true, blank: false, nullable: false}),
            referenceKey: new fields.StringField({required: true, blank: false, nullable: false}),
        }
    }

    static for = createReferenceFor;


    get(): T {
        let ancestor = this.parent
        while (ancestor) {
            if (ancestor[this.ancestorIdKey] === this.ancestorId) {
                return ancestor[this.referenceKey]
            }
            ancestor = ancestor.parent
        }
        throw new Error(`No ancestor with id ${this.ancestorId} found`);
    }

}

function createReferenceFor<A extends DataModelConstructor<any>>(type: A) {
    let ancestorId: string | null = null;
    let ancestorIdKey: string | null = null;
    let referenceKey: string | null = null;
    return {identifiedBy};

    /**
     * @param {keyof T} key
     * @param {string} value
     */
    function identifiedBy(key: keyof SchemaOf<A> & string, value: string) {
        ancestorIdKey = key ;
        ancestorId = value;

        return {references: reference}
    }

    function reference<KEY extends keyof SchemaOf<A> & string>(key: KEY) {
        referenceKey = key;
        return createReference<SchemaOf<A>[KEY]>()
    }

    function createReference<VAL>(): OnAncestorReference<VAL> {
        if (!ancestorIdKey || !referenceKey) {
            throw new IllegalStateException("create reference called without");
        }
        if (!(ancestorIdKey in type.defineSchema())) {
            throw new Error("No parent id key defined");
        }
        if (!(referenceKey in type.defineSchema())) {
            throw new Error("No reference key defined");
        }
        if (!ancestorId) {
            throw new Error("No parent id defined")
        }
        return new OnAncestorReference({ancestorId, ancestorIdKey, referenceKey})
    }
}
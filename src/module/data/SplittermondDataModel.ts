/**
 * All known and relevant members for the foundry.abstract.DataModel base class.
 *
 * @param T the {@link DataModelSchemaType} that this {@link DataModel} uses
 * @param PARENT The encompassing {@link DataModel} of this data model. Useful for Embedded data fields
 */
type DataModel<T, PARENT> = {
    parent: PARENT extends never ? never : PARENT | null;
    toObject(source?: boolean): T
    getFlag(scope: string, key: string): unknown,
    updateSource(data: Partial<T>): void,
}
export type DataModelConstructorInput<T> = { [K in keyof T]: T[K] extends DataModel<infer U, any> ? DataModelConstructorInput<U> : T[K] };
type DataModelConstructor = new <T, PARENT extends DataModel<any, any> | never>(data: DataModelConstructorInput<T>, ...args: any[]) => DataModel<T, PARENT>;
/**technically Readonly<T> is already part of the {@link DataModel} type, but because of all the generics, we cannot add it there*/
type SplittermondDataModelConstructor = new<T, PARENT extends DataModel<any, any> | never = never>(data: DataModelConstructorInput<T>, ...args: any[]) => DataModel<T, PARENT> & Readonly<T>;

//@ts-ignore
const FoundryDataModelConstructor = foundry.abstract.DataModel as DataModelConstructor;
/**
 * Base class for all {@link DataModel}s that are used in this system. Ensures that {@link DataModelSchemaType} used
 * by the data model are members of the data model.
 *
 * @param T the {@link DataModelSchemaType} that this {@link DataModel} uses
 * @param PARENT The encompassing {@link DataModel} of this data model. Useful for Embedded data fields
 */
const SplittermondDataModel =
    class<T, PARENT extends DataModel<any, any> | never = never> extends FoundryDataModelConstructor<T, PARENT> {
    } as SplittermondDataModelConstructor;


/**
 * The generics in these definitions seem superfluous, but we need convert the value choices for DataFieldOptions in the defineSchema
 * method into type information in order to correctly
 */
type DataFieldOption<T, REQ extends boolean, NULL extends boolean> = {
    required?: REQ;
    trim?: boolean;
    blank?: boolean;
    nullable?: NULL;
    initial?: NULL extends false ? T : T | null;
    validate?: (x: T) => boolean;
}

/*
 * All known Types whose constructors the foundry.abstract.fields namespace can contain. These are not the actual
 * types (They don't interest us) but generic placeholders to trick Typescript's type system type narrow a "defineSchema"
 * instruction that is not only distinguishable by Field Type, but also by Required and Nullable options.
 *
 * The __brand key that these objects carry facilitates this, because it ensures that the individual types do not extend
 * one another.
 */
// @ts-ignore: unused-parameters
type ObjectField<REQ, NULL> = { __brand: "ObjectField" };
// @ts-ignore: unused-parameters
type BooleanField<REQ, NULL> = { __brand: "BooleanField" };
// @ts-ignore: unused-parameters
type StringField<REQ, NULL> = { __brand: "StringField" };
// @ts-ignore: unused-parameters
type HTMLField<REQ, NULL> = { __brand: "HtmlField" };
// @ts-ignore: unused-parameters
type NumberField<REQ, NULL> = { __brand: "NumberField" };
// @ts-ignore: unused-parameters
type ArrayField<A, REQ, NULL> = { __brand: "ArrayField" };
// @ts-ignore: unused-parameters
type EmbeddedDataField<E, REQ, NULL> = { __brand: "EmbeddedDataField" };
// @ts-ignore: unused-parameters
type SchemaField<S, REQ, NULL> = { __brand: "SchemaField" };
type DataField<T = unknown, REQ extends boolean = true, NULL extends boolean = false> =
    ObjectField<REQ, NULL>
    | BooleanField<REQ, NULL>
    | StringField<REQ, NULL>
    | HTMLField<REQ, NULL>
    | NumberField<REQ, NULL>
    | ArrayField<T, REQ, NULL>
    | EmbeddedDataField<T, REQ, NULL>
    | SchemaField<T, REQ, NULL>;

interface DataFields {
    ObjectField: new<REQ extends boolean, NULL extends boolean>(x: DataFieldOption<unknown, REQ, NULL>) => ObjectField<REQ, NULL>;
    BooleanField: new <REQ extends boolean, NULL extends boolean> (x: DataFieldOption<boolean, REQ, NULL>) => BooleanField<REQ, NULL>;
    StringField: new <REQ extends boolean, NULL extends boolean>(x: DataFieldOption<string, REQ, NULL>) => StringField<REQ, NULL>;
    NumberField: new <REQ extends boolean, NULL extends boolean>(x: DataFieldOption<number, REQ, NULL>) => NumberField<REQ, NULL>;
    ArrayField: new <A, REQ extends boolean, NULL extends boolean>(x: A, y: DataFieldOption<unknown, REQ, NULL>) => ArrayField<A, REQ, NULL>;
    EmbeddedDataField: new <E extends DataModel<any, unknown>, REQ extends boolean, NULL extends boolean>(x: new (...args: any) => E, y: DataFieldOption<unknown, REQ, NULL>) => EmbeddedDataField<E, REQ, NULL>;
    SchemaField: new <S extends Record<string, DataField>, REQ extends boolean, NULL extends boolean>(x: S, y: DataFieldOption<unknown, REQ, NULL>) => SchemaField<S, REQ, NULL>;
    HTMLField: new <REQ extends boolean, NULL extends boolean>(x: DataFieldOption<string, REQ, NULL>) => HTMLField<REQ, NULL>;
}

//@ts-ignore
const fields: DataFields = foundry.data.fields;//Here we promise that this framework field will have the types that we have so meticulously crafted.


/**
 * This only works if your defineSchema methods only use compile-time resolvable properties. That is,
 * you must type in literals, not variables.
 * Algorithm overview: see commit
 */
type DefineSchemaType = () => any;
type DataModelSchemaType<T extends DefineSchemaType> = MemberDefinitionContainerMapper<ReturnType<T>>;
type MemberDefinitionContainerMapper<T> = MakeUndefinedOptional<{ [KEY in keyof T]: DataFieldMapper<T[KEY]> }>
type DataFieldMapper<T> =
    T extends ObjectField<infer REQ, infer NULL> ? ObjectFieldMap<REQ, NULL> :
        T extends BooleanField<infer REQ, infer NULL> ? BooleanFieldMap<REQ, NULL> :
            T extends StringField<infer REQ, infer NULL> ? StringFieldMap<REQ, NULL> :
                T extends HTMLField<infer REQ, infer NULL> ? StringFieldMap<REQ, NULL> : //yes, HTML fields are just strings
                    T extends NumberField<infer REQ, infer NULL> ? NumberFieldMap<REQ, NULL> :
                        T extends ArrayField<infer A, infer REQ, infer NULL> ? ArrayFieldMap<A, REQ, NULL> :
                            T extends EmbeddedDataField<infer E, infer REQ, infer NULL> ? EmbeddedDataFieldMap<E, REQ, NULL> :
                                T extends SchemaField<infer S, infer REQ, infer NULL> ? SchemaFieldMap<S, REQ, NULL> :
                                    never;
type ObjectFieldMap<REQ, NULL> = object | WithReq<REQ> | WithNull<NULL>;
type BooleanFieldMap<REQ, NULL> = boolean | WithReq<REQ> | WithNull<NULL>;
type StringFieldMap<REQ, NULL> = string | WithReq<REQ> | WithNull<NULL>;
type NumberFieldMap<REQ, NULL> = number | WithReq<REQ> | WithNull<NULL>;
type ArrayFieldMap<A, REQ, NULL> = DataFieldMapper<A>[] | WithReq<REQ> | WithNull<NULL>
type EmbeddedDataFieldMap<E, REQ, NULL> = E | WithReq<REQ> | WithNull<NULL>
type SchemaFieldMap<S, REQ, NULL> = MemberDefinitionContainerMapper<S> | WithReq<REQ> | WithNull<NULL>;

type WithReq<REQ> = REQ extends true ? never : undefined;
type WithNull<NULL> = NULL extends true ? null : never;

type HasUndefined<T> = T extends undefined ? true : false
type FilterOptional<CONDITION, RETURN> = HasUndefined<CONDITION> extends false ? never : RETURN
type FilterRequired<CONDITON, RETURN> = HasUndefined<CONDITON> extends false ? RETURN : never
type MakeUndefinedOptional<T> =
    { [OPTIONAL in keyof T as FilterOptional<T[OPTIONAL], OPTIONAL>]+?: Exclude<T[OPTIONAL], undefined> } &
    { [REQUIRED in keyof T as FilterRequired<T[REQUIRED], REQUIRED>]: T[REQUIRED] };

export {SplittermondDataModel, fields};
export type {DataModelSchemaType}


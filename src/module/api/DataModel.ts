declare const DynamicClass: new <_Computed extends object>(arg0: never, ...args: never[]) => _Computed;

// @ts-expect-error - This is a workaround to allow for dynamic top level properties in a class.
declare class _InternalDataModel<
    out Schema extends object,
    // Do not inline. Being a type parameter is an important part of the circumvention of TypeScript's detection of dynamic classes.
    out _Computed extends object = Schema,
> extends DynamicClass<_Computed> {
}

/**
 * All known and relevant members for the foundry.abstract.DataModel base class.
 *
 * @param T the {@link DataModelSchemaType} that this {@link DataModel} uses
 * @param PARENT The encompassing {@link DataModel} of this data model. Useful for Embedded data fields
 */
export declare class DataModel<T extends object, PARENT> extends _InternalDataModel<Readonly<T>> {
    parent: PARENT extends never ? never : PARENT | null;

    toObject(source?: boolean): T

    getFlag(scope: string, key: string): unknown;

    updateSource(data: Partial<T>): void;

    constructor(data: DataModelConstructorInput<T>, options?: any);

    static migrateData(source: unknown): unknown;
}

export type DataModelConstructorInput<T> = { [K in keyof T]: T[K] extends DataModel<infer U, any> ? DataModelConstructorInput<U> : T[K] };
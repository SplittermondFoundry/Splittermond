// noinspection JSUnusedLocalSymbols,JSUnusedGlobalSymbols

/*
 * This file contains test cases that verify that the types that are supposed to facilitate getting the of any
 * DataModel object from Its "defineSchema" method works as intended.
 */
import { DataModelSchemaType, fields, SplittermondDataModel } from "./SplittermondDataModel";

type Not<T> = T extends true ? false : true;
type IsNever<T> = [T] extends [never] ? true : false;
type ContainsUndefined<T> = (T extends undefined ? true : false) extends false ? false : true;

export namespace TestTestTypes {
    export const verifyIsNever: IsNever<never> = true;
    export const verifyIsAlsoNever: IsNever<string & never> = true;
    export const verifyIsNotNever: IsNever<string> = false;
    export const verifyIsAlsoNotNever: IsNever<string | never> = false;
    export const verifyIsUndefined: ContainsUndefined<undefined> = true;
    export const verifyIsNotUndefined: ContainsUndefined<string> = false;
    export const verifyIsAlsoNotUndefined: ContainsUndefined<string | undefined> = true;

    // @ts-expect-error
    export const falsifyIsNever: IsNever<never> = false;
    // @ts-expect-error
    export const falsifyIsAlsoNever: IsNever<string & never> = false;
    // @ts-expect-error
    export const falsifyIsNotNever: IsNever<string> = true;
    // @ts-expect-error
    export const falsifyIsAlsoNotNever: IsNever<string | never> = true;
    // @ts-expect-error
    export const falsifyIsUndefined: ContainsUndefined<undefined> = false;
    // @ts-expect-error
    export const falsifyIsNotUndefined: ContainsUndefined<string> = true;
    // @ts-expect-error
    export const falsifyIsAlsoNotUndefined: ContainsUndefined<string | undefined> = false;
}

export namespace ObjectFieldTest {
    export namespace StrictlyRequired {
        function testObjectField() {
            return { key: new fields.ObjectField({ required: true, nullable: false }) };
        }

        type TestObjectSchema = DataModelSchemaType<typeof testObjectField>;

        type IsNotNullable = TestObjectSchema["key"] & null extends never ? true : false;
        type IsRequired = Not<ContainsUndefined<TestObjectSchema["key"]>>;
        export const verifyDataIsObject: TestObjectSchema = { key: { something: 3 } };
        export const verifyIsNotNullable: IsNotNullable = true;
        export const verifyRequired: IsRequired = true;
    }

    export namespace Nullable {
        function testObjectField() {
            return { key: new fields.ObjectField({ required: true, nullable: true }) };
        }

        type TestObjectSchema = DataModelSchemaType<typeof testObjectField>;

        type IsNullable = TestObjectSchema["key"] & null extends never ? false : true;
        type IsRequired = Not<ContainsUndefined<TestObjectSchema["key"]>>;

        export const verifyDataIsObject: TestObjectSchema = { key: {} };
        export const verifyDataIsNull: TestObjectSchema = { key: null };
        export const verifyIsNullable: IsNullable = true;
        export const verifyRequired: IsRequired = true;
    }

    export namespace NotRequired {
        function testObjectField() {
            return { key: new fields.ObjectField({ required: false, nullable: false }) };
        }

        type TestObjectSchema = DataModelSchemaType<typeof testObjectField>;

        type IsNotNullable = TestObjectSchema["key"] & null extends never ? true : false;
        type IsRequired = Not<ContainsUndefined<TestObjectSchema["key"]>>;

        export const verifyDataIsObject: TestObjectSchema = { key: { exciting: [] } };
        export const verifyDataIsUndefined: TestObjectSchema = { key: undefined };
        export const verifyDataAbsent: TestObjectSchema = {};
        export const verifyIsNullable: IsNotNullable = true;
        export const verifyRequired: IsRequired = false;
    }
}

export namespace BooleanFieldTest {
    export namespace StrictlyRequired {
        function testBooleanField() {
            return { key: new fields.BooleanField({ required: true, nullable: false }) };
        }

        type TestBooleanSchema = DataModelSchemaType<typeof testBooleanField>;

        type IsNotNullable = TestBooleanSchema["key"] & null extends never ? true : false;
        type IsRequired = Not<ContainsUndefined<TestBooleanSchema["key"]>>;

        export const verifyDataIsBoolean: TestBooleanSchema = { key: true };
        export const verifyIsNotNullable: IsNotNullable = true;
        export const verifyRequired: IsRequired = true;
    }

    export namespace Nullable {
        function testBooleanField() {
            return { key: new fields.BooleanField({ required: true, nullable: true }) };
        }

        type TestBooleanSchema = DataModelSchemaType<typeof testBooleanField>;

        type IsNullable = TestBooleanSchema["key"] & null extends never ? false : true;
        type IsRequired = Not<ContainsUndefined<TestBooleanSchema["key"]>>;

        export const verifyDataIsBoolean: TestBooleanSchema = { key: false };
        export const verifyDataIsNull: TestBooleanSchema = { key: null };
        export const verifyIsNullable: IsNullable = true;
        export const verifyRequired: IsRequired = true;
    }

    export namespace NotRequired {
        function testBooleanField() {
            return { key: new fields.BooleanField({ required: false, nullable: false }) };
        }

        type TestBooleanSchema = DataModelSchemaType<typeof testBooleanField>;

        type IsNotNullable = TestBooleanSchema["key"] & null extends never ? true : false;
        type IsRequired = Not<ContainsUndefined<TestBooleanSchema["key"]>>;

        export const verifyDataIsBoolean: TestBooleanSchema = { key: true };
        export const verifyDataIsUndefined: TestBooleanSchema = { key: undefined };
        export const verifyDataIsAbsent: TestBooleanSchema = {};
        export const verifyIsNullable: IsNotNullable = true;
        export const verifyRequired: IsRequired = false;
    }
}

export namespace StringFieldTest {
    export namespace StrictlyRequired {
        function testStringField() {
            return { key: new fields.StringField({ required: true, nullable: false }) };
        }

        type TestStringSchema = DataModelSchemaType<typeof testStringField>;

        type IsNotNullable = TestStringSchema["key"] & null extends never ? true : false;
        type IsRequired = Not<ContainsUndefined<TestStringSchema["key"]>>;

        export const verifyDataIsString: TestStringSchema = { key: "testString" };
        export const verifyIsNotNullable: IsNotNullable = true;
        export const verifyRequired: IsRequired = true;
    }

    export namespace Nullable {
        function testStringField() {
            return { key: new fields.StringField({ required: true, nullable: true }) };
        }

        type TestStringSchema = DataModelSchemaType<typeof testStringField>;

        type IsNullable = TestStringSchema["key"] & null extends never ? false : true;
        type IsRequired = Not<ContainsUndefined<TestStringSchema["key"]>>;

        export const verifyDataIsString: TestStringSchema = { key: "testString" };
        export const verifyDataIsNull: TestStringSchema = { key: null };
        export const verifyIsNullable: IsNullable = true;
        export const verifyRequired: IsRequired = true;
    }

    export namespace NotRequired {
        function testStringField() {
            return { key: new fields.StringField({ required: false, nullable: false }) };
        }

        type TestStringSchema = DataModelSchemaType<typeof testStringField>;

        type IsNotNullable = TestStringSchema["key"] & null extends never ? true : false;
        type IsRequired = Not<ContainsUndefined<TestStringSchema["key"]>>;

        export const verifyDataIsString: TestStringSchema = { key: "testString" };
        export const verifyDataIsUndefined: TestStringSchema = { key: undefined };
        export const verifyDataIsAbsent: TestStringSchema = {};
        export const verifyIsNullable: IsNotNullable = true;
        export const verifyRequired: IsRequired = false;
    }
}

export namespace NumberFieldTest {
    export namespace StrictlyRequired {
        function testNumberField() {
            return { key: new fields.NumberField({ required: true, nullable: false }) };
        }

        type TestNumberSchema = DataModelSchemaType<typeof testNumberField>;

        type IsNotNullable = TestNumberSchema["key"] & null extends never ? true : false;
        type IsRequired = Not<ContainsUndefined<TestNumberSchema["key"]>>;

        export const verifyDataIsNumber: TestNumberSchema = { key: 333 };
        export const verifyIsNotNullable: IsNotNullable = true;
        export const verifyRequired: IsRequired = true;
    }

    export namespace Nullable {
        function testNumberField() {
            return { key: new fields.NumberField({ required: true, nullable: true }) };
        }

        type TestNumberSchema = DataModelSchemaType<typeof testNumberField>;

        type IsNullable = TestNumberSchema["key"] & null extends never ? false : true;
        type IsRequired = Not<ContainsUndefined<TestNumberSchema["key"]>>;

        export const verifyDataIsNumber: TestNumberSchema = { key: -1 };
        export const verifyDataIsNull: TestNumberSchema = { key: null };
        export const verifyIsNullable: IsNullable = true;
        export const verifyRequired: IsRequired = true;
    }

    export namespace NotRequired {
        function testNumberField() {
            return { key: new fields.NumberField({ required: false, nullable: false }) };
        }

        type TestNumberSchema = DataModelSchemaType<typeof testNumberField>;

        type IsNotNullable = TestNumberSchema["key"] & null extends never ? true : false;
        type IsRequired = Not<ContainsUndefined<TestNumberSchema["key"]>>;

        export const verifyDataIsNumber: TestNumberSchema = { key: 1.3 };
        export const verifyDataIsUndefined: TestNumberSchema = { key: undefined };
        export const verifyDataAbsent: TestNumberSchema = {};
        export const verifyIsNullable: IsNotNullable = true;
        export const verifyRequired: IsRequired = false;
    }
}

export namespace ArrayFieldTest {
    export namespace StrictlyRequired {
        function testArrayField() {
            return { key: new fields.ArrayField(new fields.StringField({}), { required: true, nullable: false }) };
        }

        type TestArraySchema = DataModelSchemaType<typeof testArrayField>;

        type IsNotNullable = TestArraySchema["key"] & null extends never ? true : false;
        type IsRequired = Not<ContainsUndefined<TestArraySchema["key"]>>;

        export const verifyDataIsArray: TestArraySchema = { key: ["Three", "Moons"] };
        export const verifyIsNotNullable: IsNotNullable = true;
        export const verifyRequired: IsRequired = true;
    }

    export namespace Nullable {
        function testArrayField() {
            return { key: new fields.ArrayField(new fields.StringField({}), { required: true, nullable: true }) };
        }

        type TestArraySchema = DataModelSchemaType<typeof testArrayField>;

        type IsNullable = TestArraySchema["key"] & null extends never ? false : true;
        type IsRequired = Not<ContainsUndefined<TestArraySchema["key"]>>;

        export const verifyDataIsArray: TestArraySchema = { key: ["In", "the"] };
        export const verifyDataIsNull: TestArraySchema = { key: null };
        export const verifyIsNullable: IsNullable = true;
        export const verifyRequired: IsRequired = true;
    }

    export namespace NotRequired {
        function testArrayField() {
            return { key: new fields.ArrayField(new fields.StringField({}), { required: false, nullable: false }) };
        }

        type TestArraySchema = DataModelSchemaType<typeof testArrayField>;

        type IsNotNullable = TestArraySchema["key"] & null extends never ? true : false;
        type IsRequired = Not<ContainsUndefined<TestArraySchema["key"]>>;

        export const verifyDataIsArray: TestArraySchema = { key: ["sky"] };
        export const verifyDataIsUndefined: TestArraySchema = { key: undefined };
        export const verifyDataIsAbsent: TestArraySchema = {};
        export const verifyIsNullable: IsNotNullable = true;
        export const verifyRequired: IsRequired = false;
    }
}

export namespace EmbeddedDataFieldTest {
    function TestDataDefinition() {
        return { test: new fields.StringField({ required: false, nullable: false }) };
    }

    class TestDataModel extends SplittermondDataModel<DataModelSchemaType<typeof TestDataDefinition>> {
        defineSchema() {
            return TestDataDefinition();
        }
    }

    export namespace StrictlyRequired {
        function testEmbeddedDataField() {
            return { key: new fields.EmbeddedDataField(TestDataModel, { required: true, nullable: false }) };
        }

        type TestEmbeddedDataSchema = DataModelSchemaType<typeof testEmbeddedDataField>;

        type IsNotNullable = TestEmbeddedDataSchema["key"] & null extends never ? true : false;
        type IsRequired = Not<ContainsUndefined<TestEmbeddedDataSchema["key"]>>;

        export const verifyDataIsEmbeddedData: TestEmbeddedDataSchema = { key: new TestDataModel({ test: "string" }) };
        export const verifyIsNotNullable: IsNotNullable = true;
        export const verifyRequired: IsRequired = true;
    }

    export namespace Nullable {
        function testEmbeddedDataField() {
            return { key: new fields.EmbeddedDataField(TestDataModel, { required: true, nullable: true }) };
        }

        type TestEmbeddedDataSchema = DataModelSchemaType<typeof testEmbeddedDataField>;

        type IsNullable = TestEmbeddedDataSchema["key"] & null extends never ? false : true;
        type IsRequired = Not<ContainsUndefined<TestEmbeddedDataSchema["key"]>>;

        export const verifyDataIsEmbeddedData: TestEmbeddedDataSchema = { key: new TestDataModel({ test: "string" }) };
        export const verifyDataIsNull: TestEmbeddedDataSchema = { key: null };
        export const verifyIsNullable: IsNullable = true;
        export const verifyRequired: IsRequired = true;
    }

    export namespace NotRequired {
        function testEmbeddedDataField() {
            return { key: new fields.EmbeddedDataField(TestDataModel, { required: false, nullable: false }) };
        }

        type TestEmbeddedDataSchema = DataModelSchemaType<typeof testEmbeddedDataField>;

        type IsNotNullable = TestEmbeddedDataSchema["key"] & null extends never ? true : false;
        type IsRequired = Not<ContainsUndefined<TestEmbeddedDataSchema["key"]>>;

        export const verifyDataIsEmbeddedData: TestEmbeddedDataSchema = { key: new TestDataModel({ test: "string" }) };
        export const verifyDataIsUndefined: TestEmbeddedDataSchema = { key: undefined };
        export const verifyDataIsAbsent: TestEmbeddedDataSchema = {};
        export const verifyIsNullable: IsNotNullable = true;
        export const verifyRequired: IsRequired = false;
    }
}

export namespace SchemaFieldTest {
    const schema = {
        strict: new fields.NumberField({ required: true, nullable: false }),
        nullable: new fields.BooleanField({ required: true, nullable: true }),
        optional: new fields.StringField({ required: false, nullable: false }),
    };
    export namespace StrictlyRequired {
        function testSchemaField() {
            return { key: new fields.SchemaField(schema, { required: true, nullable: false }) };
        }

        type TestSchemaSchema = DataModelSchemaType<typeof testSchemaField>;

        type IsNotNullable = TestSchemaSchema["key"] & null extends never ? true : false;
        type IsRequired = Not<ContainsUndefined<TestSchemaSchema["key"]>>;

        export const verifyDataIsSchema: TestSchemaSchema = { key: { strict: 3, nullable: null, optional: undefined } };
        export const verifyIsNotNullable: IsNotNullable = true;
        export const verifyRequired: IsRequired = true;
    }

    export namespace Nullable {
        function testSchemaField() {
            return { key: new fields.SchemaField(schema, { required: true, nullable: true }) };
        }

        type TestSchemaSchema = DataModelSchemaType<typeof testSchemaField>;

        type IsNullable = TestSchemaSchema["key"] & null extends never ? false : true;
        type IsRequired = Not<ContainsUndefined<TestSchemaSchema["key"]>>;

        export const verifyDataIsSchema: TestSchemaSchema = { key: { strict: 3, nullable: true, optional: "yes" } };
        export const verifyDataIsNull: TestSchemaSchema = { key: null };
        export const verifyIsNullable: IsNullable = true;
        export const verifyRequired: IsRequired = true;
    }

    export namespace NotRequired {
        function testSchemaField() {
            return { key: new fields.SchemaField(schema, { required: false, nullable: false }) };
        }

        type TestSchemaSchema = DataModelSchemaType<typeof testSchemaField>;

        type IsNotNullable = TestSchemaSchema["key"] & null extends never ? true : false;
        type IsRequired = Not<ContainsUndefined<TestSchemaSchema["key"]>>;

        export const verifyDataIsSchema: TestSchemaSchema = { key: { strict: 3, nullable: true, optional: "yes" } };
        export const verifyDataIsUndefined: TestSchemaSchema = { key: undefined };
        export const verifyDataIsAbsent: TestSchemaSchema = {};
        export const verifyIsNullable: IsNotNullable = true;
        export const verifyRequired: IsRequired = false;
    }
}

export namespace SchemaRecursionTest {
    const schema = {
        strict: new fields.NumberField({ required: true, nullable: false }),
        nullable: new fields.BooleanField({ required: true, nullable: true }),
        optional: new fields.StringField({ required: false, nullable: false }),
    };
    export namespace StrictlyRequired {
        function testSchemaField() {
            return { key: new fields.SchemaField(schema, { required: true, nullable: false }) };
        }

        type TestSchemaSchema = DataModelSchemaType<typeof testSchemaField>;

        type IsNotNullable = TestSchemaSchema["key"]["strict"] & null extends never ? true : false;
        type IsRequired = Not<ContainsUndefined<TestSchemaSchema["key"]["strict"]>>;

        export const verifyDataIsNumber: TestSchemaSchema["key"]["strict"] = 3;
        export const verifyIsNotNullable: IsNotNullable = true;
        export const verifyRequired: IsRequired = true;
    }

    export namespace Nullable {
        function testSchemaField() {
            return { key: new fields.SchemaField(schema, { required: true, nullable: false }) };
        }

        type TestSchemaSchema = DataModelSchemaType<typeof testSchemaField>;

        type IsNullable = TestSchemaSchema["key"]["nullable"] & null extends never ? false : true;
        type IsRequired = Not<ContainsUndefined<TestSchemaSchema["key"]["nullable"]>>;

        export const verifyDataIsBoolean: TestSchemaSchema["key"]["nullable"] = true;
        export const verifyDataIsNull: TestSchemaSchema["key"]["nullable"] = null;
        export const verifyIsNullable: IsNullable = true;
        export const verifyRequired: IsRequired = true;
    }

    export namespace NotRequired {
        function testSchemaField() {
            return { key: new fields.SchemaField(schema, { required: true, nullable: false }) };
        }

        type TestSchemaSchema = DataModelSchemaType<typeof testSchemaField>;

        type IsNotNullable = TestSchemaSchema["key"]["optional"] & null extends never ? true : false;
        type IsRequired = Not<ContainsUndefined<TestSchemaSchema["key"]["optional"]>>;

        export const verifyDataIsString: TestSchemaSchema["key"]["optional"] = "yes";
        export const verifyDataIsNotRequired: TestSchemaSchema["key"]["optional"] = undefined;
        export const verifyDataIsAbsent: TestSchemaSchema["key"] = { strict: 1, nullable: false };
        export const verifyIsNullable: IsNotNullable = true;
        export const verifyRequired: IsRequired = false;
    }
}

export namespace ComplexScenarioTest {
    export namespace SchemaInArray {
        function testField() {
            const innerSchema = {
                num: new fields.NumberField({ required: true, nullable: true }),
                bool: new fields.BooleanField({ required: false, nullable: false }),
            } as const;
            return {
                key: new fields.ArrayField(new fields.SchemaField(innerSchema, { required: false, nullable: true }), {
                    required: true,
                    nullable: false,
                }),
            };
        }

        type TestSchema = DataModelSchemaType<typeof testField>;

        export const verifyInnerSchema: TestSchema["key"][number] = { num: 3, bool: false };
        export const verifyNull: TestSchema["key"] = [null];
        export const verifyInnerOptional: TestSchema["key"][number] = { num: 3, bool: undefined };
    }

    export namespace EmbeddedInSchema {
        function TestDataDefinition() {
            return { test: new fields.StringField({ required: false, nullable: false }) };
        }

        class TestDataModel extends SplittermondDataModel<DataModelSchemaType<typeof TestDataDefinition>> {
            defineSchema() {
                return TestDataDefinition();
            }
        }

        function testField() {
            return {
                key: new fields.SchemaField(
                    { data: new fields.EmbeddedDataField(TestDataModel, { required: false, nullable: true }) },
                    { required: true, nullable: false }
                ),
            };
        }

        type TestSchema = DataModelSchemaType<typeof testField>;

        export const verifyEmbedded: TestSchema["key"]["data"] = new TestDataModel({ test: "works" });
    }
}

import type { SplittermondItemDataModelType } from "../../item";
import { DataModelConstructorInput } from "../../api/DataModel";

export type PartialItemData<T extends SplittermondItemDataModelType> = {
    type: string;
    name: string;
    system: Partial<DataModelConstructorInput<T>>;
};

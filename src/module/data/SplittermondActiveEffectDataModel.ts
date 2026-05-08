import { DataModel } from "../api/DataModel";
import { FoundryActiveEffectTypeDataModel } from "../api/ActiveEffect";

const SplittermondActiveEffectDataModel = class<
    T extends object,
    PARENT extends DataModel<any, any> | never = never,
> extends FoundryActiveEffectTypeDataModel<T, PARENT> {};

export { SplittermondActiveEffectDataModel };

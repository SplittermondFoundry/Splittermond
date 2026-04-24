import { SplittermondDataModel } from "./SplittermondDataModel";
import type { FoundryActiveEffect } from "../api/ActiveEffect";

/**
 * Base class for all ActiveEffect DataModels in the Splittermond system.
 * Analogous to {@link SplittermondDataModel} but typed with {@link FoundryActiveEffect} as parent.
 */
const SplittermondBaseActiveEffect = class<T extends object> extends SplittermondDataModel<T, FoundryActiveEffect> {};

export { SplittermondBaseActiveEffect };

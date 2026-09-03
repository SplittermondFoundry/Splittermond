import { FoundryActiveEffect } from "../api/ActiveEffect";

/**
 * Base class for the Splittermond system's ActiveEffect document subclass.
 * Extends {@link FoundryActiveEffect} so that concrete subclasses like
 * {@link SplittermondActiveEffect} can share common behaviour here.
 */
const SplittermondBaseActiveEffect = class extends FoundryActiveEffect {};

export { SplittermondBaseActiveEffect };

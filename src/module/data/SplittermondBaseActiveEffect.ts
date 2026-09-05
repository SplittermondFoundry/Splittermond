import { FoundryActiveEffect } from "../api/ActiveEffect";
import type SplittermondActor from "module/actor/actor";

/**
 * Base class for the Splittermond system's ActiveEffect document subclass.
 * Extends {@link FoundryActiveEffect} so that concrete subclasses like
 * {@link SplittermondActiveEffect} can share common behaviour here.
 */
export class SplittermondBaseActiveEffect extends FoundryActiveEffect {
    get actor(): SplittermondActor | null {
        return super.actor as SplittermondActor | null;
    }
}

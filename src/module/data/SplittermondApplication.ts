import { FoundryActorSheet, FoundryApplication, FoundryHandlebarsMixin, FoundryItemSheet } from "../api/Application";
import { ClosestDataMixin } from "./ClosestDataMixin";
import type SplittermondItem from "module/item/item";
import type SplittermondActor from "module/actor/actor";

export type ApplicationOptions = ConstructorParameters<typeof SplittermondApplication>[0];
export type ApplicationContextOptions = Parameters<SplittermondApplication["_prepareContext"]>[0];
export type RenderOptions = Parameters<SplittermondApplication["render"]>[0];
export type ApplicationRenderContext = Parameters<SplittermondApplication["_onRender"]>[0];

export class SplittermondApplication extends ClosestDataMixin(FoundryHandlebarsMixin(FoundryApplication)) {}

export class SplittermondBaseActorSheet extends FoundryHandlebarsMixin(FoundryActorSheet) {}
export class SplittermondBaseItemSheet extends FoundryHandlebarsMixin(FoundryItemSheet) {
    get item(): SplittermondItem {
        return super.item as SplittermondItem;
    }

    get actor(): SplittermondActor | null {
        return super.actor as SplittermondActor | null;
    }
}

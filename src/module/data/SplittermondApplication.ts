import { FoundryApplication, FoundryHandlebarsMixin } from "../api/Application";
import { ClosestDataMixin } from "./ClosestDataMixin";

export type ApplicationOptions = ConstructorParameters<typeof SplittermondApplication>[0];
export type ApplicationContextOptions = Parameters<SplittermondApplication["_prepareContext"]>[0];
export type RenderOptions = Parameters<SplittermondApplication["render"]>[0];
export type ApplicationRenderContext = Parameters<SplittermondApplication["_onRender"]>[0];

export class SplittermondApplication extends ClosestDataMixin(FoundryHandlebarsMixin(FoundryApplication)) {}

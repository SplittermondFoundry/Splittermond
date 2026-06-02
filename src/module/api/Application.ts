

export interface DialogV2RenderOptions {
    force: boolean;
}

export interface DialogV2ConstructorInput
    extends foundry.applications.types.ApplicationConfiguration,
        foundry.DialogV2Configuration {}

export type ApplicationFormConfiguration = foundry.applications.types.ApplicationFormConfiguration;
export type HandlebarsRenderOptions = HandlebarsApplicationMixinNS.RenderOptions

export type FoundryDialogType = foundry.applications.api.DialogV2;
export const FoundryDialog = foundry.applications.api.DialogV2;
export const FoundryApplication = foundry.applications.api.ApplicationV2;
export const FoundryItemSheet = foundry.applications.sheets.ItemSheetV2;
export const FoundryActorSheet = foundry.applications.sheets.ActorSheetV2;
export const FoundryActiveEffectConfig = foundry.applications.sheets.ActiveEffectConfig;
export const FoundryHandlebarsMixin = foundry.applications.api.HandlebarsApplicationMixin;

export class FoundryDragDrop extends foundry.applications.ux.DragDrop {}

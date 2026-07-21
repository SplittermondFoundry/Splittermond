import { SplittermondActiveEffect } from "./SplittermondActiveEffect";
import { BaseActiveEffectConfig, SplittermondActiveEffectConfig } from "./sheets/SplittermondActiveEffectConfig";
import { SplittermondActiveEffectCreationDialog } from "./sheets/SplittermondActiveEffectCreationDialog";
import { ActionEffectDataModel } from "./dataModel/ActionEffectDataModel";
import { foundryApi } from "module/api/foundryApi";
import { regenerateBakedMultiplierEffects } from "./migrations/regenerateBakedMultiplierEffects";

type ActiveEffectDocumentClass = typeof SplittermondActiveEffect & {
    createDialog?: (
        data?: Record<string, unknown>,
        createOptions?: Record<string, unknown>,
        dialogOptions?: Record<string, unknown>,
        renderOptions?: Record<string, unknown>
    ) => Promise<unknown>;
};

export { SplittermondActiveEffect };
export { Modifier } from "module/modifiers/impl/modifier";
export { InverseModifier } from "module/modifiers/impl/InverseModifier";
export { MultiplicativeModifier } from "module/modifiers/impl/MultiplicativeModifier";
export { ActionEffectDataModel, type ActionEffectSchemaType } from "./dataModel/ActionEffectDataModel";

/**
 * Register the custom ActiveEffect subclass with Foundry.
 * Call this during system init, before any documents are created.
 */
export function initializeActiveEffects(config: typeof CONFIG) {
    console.log("Splittermond | Initializing Active Effects feature");
    config.ActiveEffect.documentClass = SplittermondActiveEffect;
    config.ActiveEffect.dataModels = {
        ...(config.ActiveEffect.dataModels ?? {}),
        modifier: ActionEffectDataModel,
        spellEffect: ActionEffectDataModel,
        spellEnhancedEffect: ActionEffectDataModel,
        attackEffect: ActionEffectDataModel,
    };

    foundryApi.sheets.activeEffects.register("splittermond", BaseActiveEffectConfig, {
        types: ["base", ""],
        makeDefault: true,
    });

    foundryApi.sheets.activeEffects.register("splittermond", SplittermondActiveEffectConfig, {
        types: ["modifier", "spellEffect", "spellEnhancedEffect", "attackEffect"],
        makeDefault: true,
        label: "splittermond.activeEffects",
    });

    (SplittermondActiveEffect as ActiveEffectDocumentClass).createDialog = function (
        data: Record<string, unknown> = {},
        createOptions: Record<string, unknown> = {},
        dialogOptions: Record<string, unknown> = {},
        renderOptions: Record<string, unknown> = {}
    ) {
        return SplittermondActiveEffectCreationDialog.show(
            this as unknown as {
                create: (data: object, options: object) => Promise<FoundryDocument>;
                defaultName?: (data: object) => string;
            },
            data,
            createOptions,
            dialogOptions,
            renderOptions
        );
    };

    foundryApi.settings.register("splittermond", "bakedMultiplierV1MigrationDone", {
        scope: "world",
        config: false,
        type: Boolean,
        default: false,
    });

    foundryApi.hooks.once("ready", () => {
        void regenerateBakedMultiplierEffects();
    });
}

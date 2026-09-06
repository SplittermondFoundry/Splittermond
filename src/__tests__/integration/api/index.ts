import { apiUtilsTest } from "./apiUtils.test";
import { apiConstantsTest } from "./apiConstants.test";
import { foundryKeybindingsTest } from "./keybindings.test";
import { cssVariablesTest } from "./cssVariables.test";
import { dataModelTest } from "./dataModel.test";
import { foundryRollTest } from "./Roll.test";
import { foundryTypeDeclarationsTest } from "./foundryTypes.test";
import { macroApiTest } from "./Macro.test";
import type { BatchRegistrar } from "../fixtures";

export function registerApiBatches(register: BatchRegistrar) {
    register("apiConstants", apiConstantsTest);
    register("apiUtils", apiUtilsTest);
    register("cssVariables", cssVariablesTest);
    register("dataModel", dataModelTest);
    register("foundryTypes", foundryTypeDeclarationsTest);
    register("keybindings", foundryKeybindingsTest);
    register("macro", macroApiTest);
    register("roll", foundryRollTest);
    console.log("Splittermond | Initialized quench API tests");
}

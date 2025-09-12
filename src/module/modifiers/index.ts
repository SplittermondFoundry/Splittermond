import {ModifierRegistry} from "module/modifiers/ModifierRegistry";
import {initAddModifier} from "module/modifiers/modifierAddition";

export type {ModifierRegistry} from "./ModifierRegistry";

export function initializeModifiers(){
    const modifierRegistry = new ModifierRegistry();
    return {
        modifierRegistry,
        addModifier: initAddModifier(modifierRegistry),
    }
}
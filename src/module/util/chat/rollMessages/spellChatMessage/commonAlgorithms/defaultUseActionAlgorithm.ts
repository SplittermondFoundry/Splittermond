import { configureUseAction as genericConfigureUseAction } from "../../defaultUseActionAlgorithm";
import { AvailableActions } from "../SpellRollTemplateInterfaces";

export function configureUseAction() {
    return genericConfigureUseAction<AvailableActions>();
}

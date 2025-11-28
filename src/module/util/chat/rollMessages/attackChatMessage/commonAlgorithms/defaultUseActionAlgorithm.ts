import { configureUseAction as genericConfigureUseAction } from "../../defaultUseActionAlgorithm";
import { AvailableActions } from "../AttackRollTemplateInterfaces";

export function configureUseAction() {
    return genericConfigureUseAction<AvailableActions>();
}

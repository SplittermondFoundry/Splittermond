import type SplittermondItem from "module/item/item";
import { foundryApi } from "module/api/foundryApi";
import type SplittermondCombat from "module/combat/combat";
import { StatusEffectDataModel } from "module/item/dataModel/StatusEffectDataModel";

type StatusEffect = SplittermondItem & { system: StatusEffectDataModel };

export function setPreCreateItemHook() {
    foundryApi.hooks.on("preCreateItem", setInitialTick);
}

function setInitialTick(item: SplittermondItem) {
    console.debug("Splittermond | Attempting to set initial tick on item", item.name);
    if (!item.actor) return;
    if (!itemIsStatusEffect(item)) return;
    const activeCombat = foundryApi.combat as SplittermondCombat | null;
    if (!activeCombat || activeCombat.currentTick === null) return;
    if (!activeCombat.combatants.some((c) => c.actor?.id === item.actor?.id)) return;
    if (!item.system.interval) {
        foundryApi.warnUser("splittermond.message.statusEffectNoInterval", { name: item.name });
        return;
    }

    console.log("Splittermond | Adapting status effect to account for current combat.");
    const systemDataToUpdate = {
        system: {
            startTick: activeCombat.currentTick + item.system.interval,
        },
    };
    //The function is used in a preCreate hook, updateSource will modify the data used for creation
    item.updateSource(systemDataToUpdate);
}

function itemIsStatusEffect(item: SplittermondItem): item is StatusEffect {
    return item.type === "statuseffect";
}

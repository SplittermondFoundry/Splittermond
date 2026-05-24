import { initializeMetadata } from "./metadataInitializer.js";
import { type CompendiumMetadata, type ItemIndexEntity } from "./compendium-browser";
import { initializeTagGenerator } from "module/apps/compendiumBrowser/tagGenerator";

export function prepareArmorItemIndex(
    compendiumMetadata: CompendiumMetadata,
    itemIndexEntity: ItemIndexEntity
): ItemIndexEntity {
    if (!isDisplayableArmor(itemIndexEntity)) {
        throw new Error(`Item '${itemIndexEntity.name}' is not an armor`);
    }
    initializeTagGenerator(itemIndexEntity);
    return initializeMetadata(compendiumMetadata, itemIndexEntity);
}

function isDisplayableArmor(itemIndexEntity: ItemIndexEntity): boolean {
    return (
        itemIndexEntity.type === "armor" &&
        typeof itemIndexEntity.system === "object" &&
        itemIndexEntity.system.features !== undefined
    );
}

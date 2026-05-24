import { initializeMetadata } from "./metadataInitializer.js";
import { type CompendiumMetadata, type ItemIndexEntity } from "./compendium-browser";
import { initializeTagGenerator } from "module/apps/compendiumBrowser/tagGenerator";

export function prepareShieldItemIndex(
    compendiumMetadata: CompendiumMetadata,
    itemIndexEntity: ItemIndexEntity
): ItemIndexEntity {
    if (!isDisplayableShield(itemIndexEntity)) {
        throw new Error(`Item '${itemIndexEntity.name}' is not a shield`);
    }
    initializeTagGenerator(itemIndexEntity);
    return initializeMetadata(compendiumMetadata, itemIndexEntity);
}

function isDisplayableShield(itemIndexEntity: ItemIndexEntity): boolean {
    return (
        itemIndexEntity.type === "shield" &&
        typeof itemIndexEntity.system === "object" &&
        itemIndexEntity.system.features !== undefined
    );
}

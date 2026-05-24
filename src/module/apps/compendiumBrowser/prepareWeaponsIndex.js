import { initializeMetadata } from "./metadataInitializer.js";
import { initializeTagGenerator } from "module/apps/compendiumBrowser/tagGenerator";

/**
 * @param {CompendiumMetadata} compendiumMetadata
 * @param {ItemIndexEntity} itemIndexEntity
 * @returns {ItemIndexEntity}
 */
export function prepareWeaponItemIndex(compendiumMetadata, itemIndexEntity) {
    if (!isDisplayableWeapon(itemIndexEntity)) {
        throw new Error(`Item '${itemIndexEntity.name}' is not a weapon`);
    }
    initializeTagGenerator(itemIndexEntity);
    initializeSecondaryAttack(itemIndexEntity);
    return initializeMetadata(compendiumMetadata, itemIndexEntity);
}

/**
 * @param {ItemIndexEntity} itemIndexEntity
 * @returns {boolean}
 */
function isDisplayableWeapon(itemIndexEntity) {
    return (
        itemIndexEntity.type === "weapon" &&
        typeof itemIndexEntity.system === "object" &&
        itemIndexEntity.system.skill !== undefined &&
        itemIndexEntity.system.features !== undefined &&
        itemIndexEntity.system.damage !== undefined &&
        itemIndexEntity.system.secondaryAttack !== undefined &&
        itemIndexEntity.system.secondaryAttack.skill !== undefined
    );
}

function initializeSecondaryAttack(item) {
    const property = "hasSecondaryAttack";
    if (!(property in item)) {
        item[property] = !["none", ""].includes(item.system.secondaryAttack.skill);
    }
}

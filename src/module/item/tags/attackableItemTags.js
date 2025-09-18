/**
 * Renders the propertyModel of an attackable item as tags.
 * @param {{propertyModel?:string|null}} system
 * @returns {string[]}
 */
export function produceAttackableItemTags(system) {
    if (!system.features || typeof system.features !== "string") return [];
    if (system.features.trim() === "" || system.features.trim() === "-") return [];
    return system.features?.split(",").map((str) => str.trim());
}

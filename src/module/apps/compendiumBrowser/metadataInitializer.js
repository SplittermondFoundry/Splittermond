/**
 * @template T
 * @param  {CompendiumMetadata} metadata
 * @param {T} item
 * @return {T & {compendium:{metadata:CompendiumMetadata}}}
 */
export function initializeMetadata(metadata, item) {
    const property = "compendium";
    if (!(property in item)) {
        item[property] = { metadata: { id: metadata.id, label: metadata.label } };
    }
    return item;
}

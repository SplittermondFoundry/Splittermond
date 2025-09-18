/**
 * Transforms the comma-separated list of spell schools in which this spell is available into a presentable,
 * localized list
 * @typedef{{label:string}} SpellAvailabilityTag
 * @param {{availableIn:string, skillLevel:number, skill:string}}system
 * @param {SpellAvailabilityParser} availabilityParser
 * @returns {SpellAvailabilityTag[]}
 */
export function produceSpellAvailabilityTags(system, availabilityParser) {
    const availablityFromField = sourceAvailabilityFromField(system.availableIn, availabilityParser);
    const availabilityFromSpellData = availabilityParser.toDisplayRepresentation(
        `${system.skill} ${system.skillLevel}`
    );
    const protoAvailability = availablityFromField.length > 0 ? availablityFromField : [availabilityFromSpellData];

    return protoAvailability.map((item) => ({ label: item }));
}

/**
 * @param {string}availableIn
 * @param {SpellAvailabilityParser} availabilityParser
 * @returns {string[]}
 */
function sourceAvailabilityFromField(availableIn, availabilityParser) {
    if (typeof availableIn !== "string") {
        return [];
    }

    const availability = availabilityParser.toDisplayRepresentation(availableIn);
    const availabilityExists = !!availability && availability.trim() !== "";
    if (availabilityExists) {
        return availability
            .split(",")
            .map((item) => item.trim())
            .filter(availabilityParser.isWellFormattedAvailability);
    }
    return [];
}

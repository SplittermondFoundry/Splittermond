/**
 * @typedef {{label:string}} MasteryAvailabilityTag
 * Converts the backend representation of the availability to a list of mastery tags.
 * @param {{availableIn:string, skill:string}}system
 * @param {MasteryAvailabilityParser}availabilityParser
 * @returns {MasteryAvailabilityTag[]}
 */
export function produceMasteryTags(system, availabilityParser) {
    const availableInIsUsable = system.availableIn && typeof system.availableIn === "string";
    const transformedAvailabilities = availabilityParser.toDisplayRepresentation(
        availableInIsUsable ? system.availableIn : null
    );
    const transformedSkill = availabilityParser.toDisplayRepresentation(system.skill);

    let list = [];
    if (transformedAvailabilities) {
        transformedAvailabilities.split(",").forEach((item) => list.push(item.trim()));
    }
    if (transformedSkill && !list.includes(transformedSkill)) {
        list.push(transformedSkill);
    }
    return list.map((item) => ({ label: item }));
}

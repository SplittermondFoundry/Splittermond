const fs = require("fs");

/**
 * @param {string} filePath
 * @param {(oldJson:object)=>object}variableReplacer
 */
function run(filePath, variableReplacer) {
    const oldJsonString = fs.readFileSync(filePath, "utf-8");
    console.debug(`Old JSON:\n${oldJsonString}`);
    const oldJson = JSON.parse(oldJsonString);
    const newJson = variableReplacer(oldJson);
    const newJsonString = JSON.stringify(newJson, null, 2); //stringify with pretty print
    console.debug(`Rewritten JSON:\n${newJsonString}`);
    fs.writeFileSync(filePath, newJsonString, { encoding: "utf-8", flag: "w" });
}

module.exports = { updateJsons: run };

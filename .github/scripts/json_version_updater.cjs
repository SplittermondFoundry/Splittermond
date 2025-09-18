const fs = require("fs");
const { updateJsons } = require("./updateJsons.cjs");

function run() {
    const pathToSystemJson = process.env.fileToUpdate;
    const newVersion = process.env.version;
    console.info(`Inputs: pathToSystemJson: ${pathToSystemJson}, newVersion: ${newVersion}`);
    updateJsons(pathToSystemJson, (oldJson) => {
        oldJson.version = newVersion;
        return oldJson;
    });
    console.info(`Updatd version ins ${pathToSystemJson}`);
}

module.exports = { run };

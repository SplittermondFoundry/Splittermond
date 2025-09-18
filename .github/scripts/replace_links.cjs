const { updateJsons } = require("./updateJsons.cjs");

const pathToSystemJson = process.env.fileToUpdate;
const newManifest = process.env.newManifest;
const newDownload = process.env.newDownload;
console.info(`Inputs: pathToSystemJson: ${pathToSystemJson}, manifest: ${newManifest}, download: ${newDownload}`);
updateJsons(pathToSystemJson, (oldJson) => {
    oldJson.download = newDownload;
    return oldJson;
});
console.info(`Updated JSON in ${pathToSystemJson}`);

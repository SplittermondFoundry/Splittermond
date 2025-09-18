import fs from "fs";

const authToken = process.env.AUTH_TOKEN;
const pathToSystemJson = process.env.SYSTEM_JSON_PATH;
const isDryRun = process.env.DRY_RUN === "true";

//DO NOT BLEED THE TOKEN INTO THE LOGS
console.log(
    `Inputs: pathToSystemJson: ${pathToSystemJson}, isDryRun: ${isDryRun}, authToken: ${authToken.length > 0 ? "******" : ""}`
);
const systemJson = JSON.parse(fs.readFileSync(pathToSystemJson, "utf-8"));

const body = {
    id: "splittermond",
    "dry-run": isDryRun,
    release: {
        version: systemJson.version,
        manifest: systemJson.manifest,
        notes: `https://github.com/SplittermondFoundry/splittermond/releases/tag/v${systemJson.version}`,
        compatibility: systemJson.compatibility,
    },
};
console.debug("Request body", body);

const response = await fetch("https://foundryvtt.com/_api/packages/release_version/", {
    headers: {
        "Content-Type": "application/json",
        Authorization: authToken,
    },
    method: "POST",
    body: JSON.stringify(body),
});
const isSuccessful = await processResponse(response);
if (response.status !== 200 || !isSuccessful) {
    console.error(`Error while publishing to FoundryVTT: ${response.statusText}`);
    process.exit(1);
} else {
    console.log(`Successfully published to FoundryVTT`);
    process.exit(0);
}

/**
 * @param {Response} response
 * @return {Promise<boolean>} whether the response was successful
 */
async function processResponse(response) {
    console.debug("Response", response);
    console.debug(`Received response with status ${response.status} and statusText ${response.statusText}`);
    return response
        .json()
        .then((data) => {
            console.debug(data);
            return data;
        })
        .then((data) => {
            console.debug(`Foundry responds with status '${data.status} and message ${data.message}`);
            return data;
        })
        .then((data) => data.status === "success");
}

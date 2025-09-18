import Handlebars from "handlebars";
import fs from "fs";

export function createHtml(templateFilePath: string, context: unknown): string {
    const templateContent = fs.readFileSync(`public/${templateFilePath}`).toString("utf-8");
    //We want Handlebars to process the html options as actual HTML but cannot replace the triple braces in the template.
    const adjustedContent = templateContent.replace(/(\{\{selectOptions.*?}})/, "{$1}");
    const template = Handlebars.compile(adjustedContent);
    Handlebars.registerHelper("localize", localizeMock);
    Handlebars.registerHelper("numberFormat", localizeMock); //functionally equivalent
    Handlebars.registerHelper("selectOptions", selectOptionsMock);
    Handlebars.registerHelper("eq", equals);
    Handlebars.registerHelper("editor", () => "");
    Handlebars.registerHelper("concat", concat);
    return template(context);
}

function localizeMock(key: string): string {
    return key.toString();
}

/**
 * returns an escaped string that gets inserted into the document
 */
function selectOptionsMock(choices: Record<string, string> = {}, options: Record<string, unknown> = {}) {
    //options.hash was derived by debugging this function.
    const selectedKey = (options as { hash: { selected: string } }).hash.selected;
    return Object.keys(choices)
        .map(
            (key) =>
                `<option value="${key}" ${selectedKey === key ? "selected" : ""}>${localizeMock(choices[key])}</option>`
        )
        .join("");
}

function equals(one: unknown, other: unknown) {
    return one === other;
}

function concat(...args: unknown[]): string {
    return args.map((arg) => `${arg}`).join("");
}

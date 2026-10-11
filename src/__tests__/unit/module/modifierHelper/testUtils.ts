import sinon from "sinon";
import { readFileSync } from "node:fs";
import { initializeModifiers } from "module/modifiers";
import { registerActorModifiers } from "module/actor/modifiers/actorModifierRegistration";
import { ItemModifierHandler } from "module/item/ItemModifierHandler";
import { CheckModifierHandler } from "module/check/CheckModifierHandler";
import { CheckRequireModifierHandler } from "module/check/CheckRequireModifierHandler";
import { CostModifierHandler } from "module/util/costs/CostModifierHandler";
import { modifierCatalogue } from "module/modifierHelper/catalogue";
import { foundryApi } from "module/api/foundryApi";
import { clearMappers } from "module/modifiers/parsing/normalizer";
import { stubRollApi } from "../../RollMock";

export const source = { name: "Helper test", uuid: "Item.helper", actor: null, isOwner: false };
export const module = initializeModifiers();
registerActorModifiers(module.modifierRegistry);
module.modifierRegistry.addHandler("item", ItemModifierHandler);
module.modifierRegistry.addHandler("check", CheckModifierHandler);
module.modifierRegistry.addHandler("check.require", CheckRequireModifierHandler);
module.costModifierRegistry.addHandler("focus", CostModifierHandler);

export const catalogue = () =>
    modifierCatalogue(
        module.modifierRegistry.getConfigurations(() => {}, source, "innate"),
        module.costModifierRegistry.getConfigurations(() => {}, source, "innate")
    );
export const definitions = catalogue();
const translations: unknown = JSON.parse(readFileSync("public/lang/de.json", "utf8"));

export function localize(key: string): string {
    let value = translations;
    for (const segment of key.split(".")) {
        if (typeof value !== "object" || value === null || !(segment in value)) return key;
        value = Reflect.get(value, segment);
    }
    return typeof value === "string" ? value : key;
}

export function definition(path: string) {
    const result = definitions.find((entry) => entry.path === path);
    if (!result) throw new Error(`Missing modifier ${path}`);
    return result;
}

export function sampleValue(entry: (typeof definitions)[number]): string {
    return entry.valueChoices?.[0]?.value ?? (entry.cost ? "K1V1" : "2");
}

export function setupModifierHelperTests() {
    const sandbox = sinon.createSandbox();
    beforeEach(() => {
        clearMappers();
        stubRollApi(sandbox);
        sandbox.stub(foundryApi, "localize").callsFake(localize);
        sandbox.stub(foundryApi, "format").callsFake((key, data) => {
            return Object.entries(data ?? {}).reduce(
                (text, [name, value]) => text.replace(`{${name}}`, String(value)),
                localize(key)
            );
        });
    });
    afterEach(() => sandbox.restore());
    return sandbox;
}

import { expect } from "chai";
import sinon from "sinon";
import { readFileSync, readdirSync } from "node:fs";
import { load } from "js-yaml";
import { foundryApi } from "module/api/foundryApi";
import { initAddModifier } from "module/modifiers/modifierAddition";
import { ModifierRegistry } from "module/modifiers/ModifierRegistry";
import type { FocusModifier, ScalarModifier } from "module/modifiers/parsing";
import { registerActorModifiers } from "module/actor/modifiers/actorModifierRegistration";
import { ItemModifierHandler } from "module/item/ItemModifierHandler";
import { CostModifierHandler } from "module/util/costs/CostModifierHandler";
import { clearMappers } from "module/modifiers/parsing/normalizer";
import { buildScalarEffectData } from "module/activeEffect/effectBuilder";
import { substituteSkill } from "module/activeEffect/sentinelSubstitution";
import type { EffectDataObject, ModifierEntry } from "module/activeEffect/types";
import { initLocalizer } from "../util/item-importer/poorMansLocalizer";

const packDirectory = "src/packs/active-effects";

describe("Bundled modifier effects", () => {
    const sandbox = sinon.createSandbox();
    const registry = new ModifierRegistry<ScalarModifier>();
    const costRegistry = new ModifierRegistry<FocusModifier>();
    registerActorModifiers(registry);
    registry.addHandler(ItemModifierHandler.config.topLevelPath, ItemModifierHandler);
    costRegistry.addHandler(CostModifierHandler.config.topLevelPath, CostModifierHandler);
    const addModifier = initAddModifier(registry, costRegistry);

    beforeEach(() => {
        sandbox.stub(foundryApi, "localize").callsFake(initLocalizer());
        sandbox.stub(foundryApi, "format").callsFake((key: string) => key);
        clearMappers();
    });
    afterEach(() => {
        sandbox.restore();
        clearMappers();
    });

    for (const file of readdirSync(packDirectory).filter((name) => name.endsWith(".yml"))) {
        it(`preserves the meaning of ${file} when its input is saved again`, () => {
            const template = load(readFileSync(`${packDirectory}/${file}`, "utf8")) as EffectDataObject;
            const effect = substituteSkill("blades")(template);
            const rawInput = effect.flags?.splittermond?.rawInput;
            expect(rawInput).to.be.a("string").and.not.empty;
            const source = { name: rawInput!, uuid: "Item.test", actor: null, isOwner: false };

            const parsed = addModifier(source, rawInput!, "innate");

            expect(parsed.hasErrors, rawInput).to.be.false;
            expect(parsed.costModifiers).to.be.empty;
            const rebuilt = buildScalarEffectData(parsed.modifiers, source.uuid, rawInput!, "modifier");
            const rebuiltSystem = rebuilt.system as { modifiers: ModifierEntry[] };
            const comparable = (entries: ModifierEntry[]) =>
                entries.map((entry) => ({ ...entry, path: entry.path.toLowerCase() }));
            expect(comparable(effect.system?.modifiers ?? [])).to.deep.equal(comparable(rebuiltSystem.modifiers));
        });
    }
});

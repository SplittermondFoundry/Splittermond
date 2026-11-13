import { afterEach, beforeEach, describe, it } from "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { SpellDataModel } from "module/item/dataModel/SpellDataModel";
import { DamageModel } from "module/item/dataModel/propertyModels/DamageModel";
import { ItemFeaturesModel } from "module/item/dataModel/propertyModels/ItemFeaturesModel";
import { resolveSpellValues } from "module/item/spellValues";
import SplittermondSpellItem from "module/item/spell";
import { getSpellAvailabilityParser } from "module/item/availabilityParser";
import ModifierManager from "module/actor/modifiers/modifier-manager";
import { of } from "module/modifiers/expressions/scalar";
import { stubRollApi } from "../../RollMock";

describe("Enhanced spell values", () => {
    const sandbox = sinon.createSandbox();
    beforeEach(() => stubRollApi(sandbox));
    afterEach(() => sandbox.restore());

    function spellData() {
        const system = sandbox.createStubInstance(SpellDataModel);
        Object.assign(system, {
            skill: "windmagic",
            spellType: "Schaden",
            damage: { base: DamageModel.from("1W6"), enhanced: null },
            features: { base: ItemFeaturesModel.emptyFeatures(), enhanced: null },
            damageType: { base: "wind", enhanced: null },
            costType: { base: "V", enhanced: null },
            range: { base: "10m", enhanced: null },
            effectArea: { base: "2m", enhanced: null },
            effectDuration: { base: "5 T", enhanced: null },
        });
        return system;
    }

    it("follows subsequent normal changes until the property has its own value", () => {
        const system = spellData();
        system.range.base = "20m";
        system.damage.base = DamageModel.from("2W6");

        const values = resolveSpellValues(system, true);

        expect(values.range).to.equal("20m");
        expect(values.damage.displayValue).to.equal("2W6");
        expect(system.range.enhanced).to.equal(null);
    });

    it("keeps an explicit override independent even when both values were equal", () => {
        const system = spellData();
        system.range.enhanced = "10m";

        system.range.base = "20m";

        expect(resolveSpellValues(system, true).range).to.equal("10m");
        expect(resolveSpellValues(system).range).to.equal("20m");
    });

    it("resumes inheritance after resetting an override", () => {
        const system = spellData();
        system.range.enhanced = "30m";
        system.range.base = "20m";

        system.range.enhanced = null;

        expect(resolveSpellValues(system, true).range).to.equal("20m");
    });

    it("preserves zero damage, empty features and explicit absent types", () => {
        const system = spellData();
        system.features.base = ItemFeaturesModel.from("Kritisch 3");
        system.damage.enhanced = DamageModel.from("0");
        system.features.enhanced = ItemFeaturesModel.emptyFeatures();
        system.damageType.enhanced = "none";
        system.costType.enhanced = "none";
        system.range.enhanced = "";
        system.effectArea.enhanced = "";
        system.effectDuration.enhanced = "";

        const values = resolveSpellValues(system, true);

        expect(values.damage.calculationValue).to.equal("0");
        expect(values.features.innateFeatures).to.equal("");
        expect([values.damageType, values.costType]).to.deep.equal([null, null]);
        expect([values.range, values.effectArea, values.effectDuration]).to.deep.equal(["", "", ""]);
    });

    it("resolves absent base types consistently for normal and inherited enhanced values", () => {
        const system = spellData();
        system.damageType.base = "none";
        system.costType.base = "none";

        expect(resolveSpellValues(system)).to.include({ damageType: null, costType: null });
        expect(resolveSpellValues(system, true)).to.include({ damageType: null, costType: null });
    });

    for (const example of [
        { name: "Scharfer Wind", damage: "2W6", features: "Kritisch 3", critical: 3 },
        { name: "Betäubungsschlag", damage: "1W6+1", features: "", critical: 0 },
    ]) {
        it(`uses the enhanced base damage and features for ${example.name}`, () => {
            const spell = new SplittermondSpellItem(
                {},
                { splittermond: { ready: true } },
                getSpellAvailabilityParser({ localize: (key) => key }, ["windmagic"])
            );
            spell.name = example.name;
            spell.system = spellData();
            spell.system.damage.enhanced = DamageModel.from(example.damage);
            spell.system.features.enhanced = ItemFeaturesModel.from(example.features);
            const modifier = new ModifierManager();
            modifier.add("item.damage", { name: "Bonus", type: "magic" }, of(2), false);
            Object.defineProperty(spell, "actor", { value: { modifier } });

            const normal = spell.getForDamageRoll();
            const enhanced = spell.getForDamageRoll({ enhanced: true });

            expect(normal.principalComponent.damageRoll.getDamageFormula()).to.equal("1W6");
            expect(enhanced.principalComponent.damageRoll.getDamageFormula().replace(/ /g, "")).to.equal(
                example.damage
            );
            expect(resolveSpellValues(spell.system, true).features.featureValue("Kritisch")).to.equal(example.critical);
            expect(enhanced.otherComponents).to.have.length(1);
            expect(enhanced.otherComponents[0].damageRoll.getDamageFormula()).to.equal("2");
        });
    }
});

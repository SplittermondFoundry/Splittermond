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
            damage: DamageModel.from("1W6"),
            features: ItemFeaturesModel.emptyFeatures(),
            damageType: "wind",
            costType: "V",
            range: "10m",
            effectArea: "2m",
            effectDuration: "5 T",
            enhanced: {
                damage: null,
                features: null,
                damageType: null,
                costType: null,
                range: null,
                effectArea: null,
                effectDuration: null,
            },
        });
        return system;
    }

    it("follows subsequent normal changes until the property has its own value", () => {
        const system = spellData();
        Object.assign(system, { range: "20m", damage: DamageModel.from("2W6") });

        const values = resolveSpellValues(system, true);

        expect(values.range).to.equal("20m");
        expect(values.damage.displayValue).to.equal("2W6");
        expect(system.enhanced.range).to.equal(null);
    });

    it("keeps an explicit override independent even when both values were equal", () => {
        const system = spellData();
        system.enhanced.range = { value: "10m" };

        Object.assign(system, { range: "20m" });

        expect(resolveSpellValues(system, true).range).to.equal("10m");
        expect(resolveSpellValues(system).range).to.equal("20m");
    });

    it("resumes inheritance after resetting an override", () => {
        const system = spellData();
        system.enhanced.range = { value: "30m" };
        Object.assign(system, { range: "20m" });

        system.enhanced.range = null;

        expect(resolveSpellValues(system, true).range).to.equal("20m");
    });

    it("preserves zero damage, empty features and explicit absent types", () => {
        const system = spellData();
        Object.assign(system, { features: ItemFeaturesModel.from("Kritisch 3") });
        Object.assign(system.enhanced, {
            damage: DamageModel.from("0"),
            features: ItemFeaturesModel.emptyFeatures(),
            damageType: { value: null },
            costType: { value: null },
            range: { value: "" },
            effectArea: { value: "" },
            effectDuration: { value: "" },
        });

        const values = resolveSpellValues(system, true);

        expect(values.damage.calculationValue).to.equal("0");
        expect(values.features.innateFeatures).to.equal("");
        expect([values.damageType, values.costType]).to.deep.equal([null, null]);
        expect([values.range, values.effectArea, values.effectDuration]).to.deep.equal(["", "", ""]);
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
            spell.system.enhanced.damage = DamageModel.from(example.damage);
            spell.system.enhanced.features = ItemFeaturesModel.from(example.features);
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

import { expect } from "chai";
import { makeConfig } from "module/modifiers/ModifierConfig";
import { modifierCatalogue } from "module/modifierHelper/catalogue";
import { attributeField } from "module/modifierHelper/attributeField";
import sinon from "sinon";
import { foundryApi } from "module/api/foundryApi";

describe("Modifier attribute configuration", () => {
    const sandbox = sinon.createSandbox();
    beforeEach(() => {
        sandbox.stub(foundryApi, "localize").callsFake((key) => `translated:${key}`);
    });
    afterEach(() => sandbox.restore());
    it("defaults an effective modifier to a required unrestricted value", () => {
        const config = makeConfig({ topLevelPath: "defense" });

        expect(config.requiredAttributes).to.deep.equal({ value: null });
        expect(config.optionalAttributes).to.deep.equal({});
        expect(config).to.have.property("hasEffect", true);
    });

    it("keeps an explicit value-less child independent of its parent's default value", () => {
        const config = makeConfig({
            topLevelPath: "check",
            subSegments: { require: { requiredAttributes: { rollType: null } } },
        });

        expect(config.subSegments.require.requiredAttributes).to.deep.equal({ rollType: null });
        expect(config.subSegments.require.requiredAttributes).not.to.have.property("value");
    });

    it("builds a required field from its attribute's choices and presentation", () => {
        const config = makeConfig({
            topLevelPath: "check.require",
            requiredAttributes: {
                rollType: {
                    values: [{ value: "standard", label: "Standard" }],
                    label: "Wurfart",
                    hint: "Wähle die vorgeschriebene Wurfart.",
                },
            },
        });
        const [definition] = modifierCatalogue([config], []);

        const field = attributeField(definition, "rollType", "standard", "roll-type");

        expect(field).to.include({
            required: true,
            select: true,
            label: "translated:Wurfart",
            hint: "translated:Wähle die vorgeschriebene Wurfart.",
        });
        expect(field.choices).to.deep.equal([{ value: "standard", label: "translated:Standard", selected: true }]);
    });

    it("offers effective children without offering their ineffective parent", () => {
        const config = makeConfig({
            topLevelPath: "item",
            hasEffect: false,
            subSegments: { damage: {} },
        });

        const catalogue = modifierCatalogue([config], []);

        expect(catalogue.map(({ path }) => path)).to.deep.equal(["item.damage"]);
    });
});

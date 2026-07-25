import { expect } from "chai";
import sinon, { SinonSandbox, SinonStubbedInstance } from "sinon";
import SplittermondItem from "module/item/item";
import { foundryApi } from "module/api/foundryApi";
import { initAddModifier } from "module/modifiers/modifierAddition";
import { ModifierRegistry } from "module/modifiers/ModifierRegistry";
import { CheckRequireModifierHandler } from "module/check/CheckRequireModifierHandler";
import { of } from "module/modifiers/expressions/scalar";
import { clearMappers } from "module/modifiers/parsing/normalizer";

describe("addModifier check.require bypass (S1 M1 carry-forward)", () => {
    let sandbox: SinonSandbox;
    let item: SinonStubbedInstance<SplittermondItem>;

    function setupAddModifier() {
        const modifierRegistry = new ModifierRegistry();
        const costModifierRegistry = new ModifierRegistry();
        modifierRegistry.addHandler(
            CheckRequireModifierHandler.config.topLevelPath,
            CheckRequireModifierHandler
        );
        return initAddModifier(modifierRegistry, costModifierRegistry);
    }

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        clearMappers();
        sandbox.stub(foundryApi, "format").callsFake((key: string) => key);
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => {
            switch (key) {
                case "splittermond.rollType.standard":
                    return "Standardwurf";
                case "splittermond.rollType.risk":
                    return "Risikowurf";
                case "splittermond.rollType.safety":
                    return "Sicherheitswurf";
                case "splittermond.rollType.standardGrandmaster":
                    return "Standardwurf (Großmeister)";
                case "splittermond.rollType.riskGrandmaster":
                    return "Risikowurf (Großmeister)";
                case "splittermond.rollType.safetyGrandmaster":
                    return "Sicherheitswurf (Großmeister)";
                default:
                    return key;
            }
        });
        sandbox.stub(foundryApi, "reportError");
        item = {
            id: "item1",
            uuid: "Item.item1",
            name: "Test Item",
            type: "strength",
            actor: null,
            system: {},
            isOwner: true,
        } as unknown as SinonStubbedInstance<SplittermondItem>;
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should bypass value processing and produce a check.require modifier with zero placeholder", () => {
        const addModifier = setupAddModifier();
        const result = addModifier(item, 'check.require rollType="standard"', "innate");

        expect(result.modifiers).to.have.length(1);
        const modifier = result.modifiers[0].modifier;
        expect(modifier.groupId).to.equal("check.require");
        expect(modifier.value).to.deep.equal(of(0));
        expect(modifier.attributes.rollType).to.equal("standard");
        expect(modifier.selectable).to.equal(false);
        expect(result.costModifiers).to.have.length(0);
    });

    it("should resolve German rollType translations through the modifier pipeline", () => {
        const addModifier = setupAddModifier();
        const result = addModifier(item, 'check.require rollType="Sicherheitswurf"', "innate");

        expect(result.modifiers).to.have.length(1);
        expect(result.modifiers[0].modifier.attributes.rollType).to.equal("safety");
    });
});

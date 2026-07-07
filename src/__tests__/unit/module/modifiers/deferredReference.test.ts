import { describe, it } from "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { initAddModifier } from "module/modifiers/modifierAddition";
import { ModifierRegistry } from "module/modifiers/ModifierRegistry";
import { ItemModifierHandler } from "module/item/ItemModifierHandler";
import { CostModifierHandler } from "module/util/costs/CostModifierHandler";
import { registerActorModifiers } from "module/actor/modifiers/actorModifierRegistration";
import { evaluate, ref, ReferenceExpression } from "module/modifiers/expressions/scalar";
import { deserialize, serialize } from "module/modifiers/expressions/scalar/serialization";
import { bindReferenceProviders } from "module/modifiers/expressions/scalar/binder";
import { resolveHostActor } from "module/activeEffect/dataModel/hostActor";
import { foundryApi } from "module/api/foundryApi";
import { clearMappers } from "module/modifiers/parsing/normalizer";
import { stubRollApi } from "../../RollMock";

function setupAddModifierFunction() {
    const modifierRegistry = new ModifierRegistry();
    const costModifierRegistry = new ModifierRegistry();
    costModifierRegistry.addHandler(CostModifierHandler.config.topLevelPath, CostModifierHandler);
    modifierRegistry.addHandler(ItemModifierHandler.config.topLevelPath, ItemModifierHandler);
    registerActorModifiers(modifierRegistry);
    return initAddModifier(modifierRegistry, costModifierRegistry);
}

describe("Deferred actor reference resolution", () => {
    const addModifier = setupAddModifierFunction();
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        stubRollApi(sandbox);
        sandbox.stub(foundryApi, "format").callsFake((key: string) => key);
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => key);
        clearMappers();
    });
    afterEach(() => sandbox.restore());

    describe("addModifier with null actor", () => {
        it("should produce a modifier when actor is null and modifier contains a ${...} reference", () => {
            const source = { name: "TestItem", actor: null, uuid: "Item.test", isOwner: true };
            const result = addModifier(source, 'skills skill="eloquence" +${AUS}', null as any, 1);
            expect(result.modifiers.length).to.equal(1);
        });

        it("should produce zero modifiers when actor is null and no ${...} reference (numeric)", () => {
            const source = { name: "TestItem", actor: null, uuid: "Item.test", isOwner: true };
            const result = addModifier(source, "skills +3", null as any, 1);
            expect(result.modifiers.length).to.equal(1);
        });
    });

    describe("ReferenceExpression serialization (no uuid)", () => {
        it("should serialize without a uuid field", () => {
            const expr = ref("AUS", () => null, "AUS");
            const serialized = serialize(expr);
            expect(serialized).to.deep.equal({
                type: "reference",
                propertyPath: "AUS",
                stringRep: "AUS",
                isStable: false,
            });
            expect(serialized).not.to.have.property("uuid");
        });

        it("should deserialize a legacy document with a uuid field without error", () => {
            const data = { type: "reference", propertyPath: "AUS", stringRep: "AUS", uuid: "Actor.legacy123" };
            const expr = deserialize(data) as ReferenceExpression;
            expect(expr).to.be.instanceOf(ReferenceExpression);
            expect(expr.propertyPath).to.equal("AUS");
        });

        it("should roundtrip: serialize then deserialize preserves propertyPath and stringRep", () => {
            const original = ref("AUS", () => null, "AUS");
            const roundtripped = deserialize(serialize(original)) as ReferenceExpression;
            expect(roundtripped.propertyPath).to.equal("AUS");
            expect(roundtripped.stringRep).to.equal("AUS");
        });
    });

    describe("bindReferenceProviders", () => {
        it("should bind provider so evaluate returns actor property value", async () => {
            const expr = deserialize({
                type: "reference",
                propertyPath: "AUS",
                stringRep: "AUS",
            }) as ReferenceExpression;
            const stubActor = { AUS: 3 } as any;
            bindReferenceProviders(expr, () => stubActor);
            expect(await evaluate(expr)).to.equal(3);
        });

        it("should return 0 when provider returns null (unbound)", async () => {
            const expr = deserialize({
                type: "reference",
                propertyPath: "AUS",
                stringRep: "AUS",
            }) as ReferenceExpression;
            bindReferenceProviders(expr, () => null);
            expect(await evaluate(expr)).to.equal(0);
        });

        it("should call onUnbound exactly once across multiple evaluations when provider returns null", () => {
            const expr = ref("AUS", () => null, "AUS");
            const onUnbound = sinon.stub();
            bindReferenceProviders(expr, () => null, onUnbound);
            evaluate(expr);
            evaluate(expr);
            evaluate(expr);
            expect(onUnbound.callCount).to.equal(3);
        });

        it("should not call onUnbound when provider returns an actor", () => {
            const stubActor = { AUS: 5 } as any;
            const expr = ref("AUS", () => stubActor, "AUS");
            const onUnbound = sinon.stub();
            bindReferenceProviders(expr, () => stubActor, onUnbound);
            evaluate(expr);
            expect(onUnbound.callCount).to.equal(0);
        });

        it("should walk into compound expressions and bind all ReferenceExpressions", async () => {
            const inner1 = ref("AUS", () => null, "AUS");
            const inner2 = ref("MYS", () => null, "MYS");
            const compound = new (require("module/modifiers/expressions/scalar/definitions").AddExpression)(
                inner1,
                inner2
            );
            const actor = { AUS: 2, MYS: 4 } as any;
            bindReferenceProviders(compound, () => actor);
            expect(await evaluate(compound)).to.equal(6);
        });
    });

    describe("resolveHostActor", () => {
        it("should return null when effectDoc is null", () => {
            expect(resolveHostActor(null)).to.be.null;
        });

        it("should return null when effectDoc has no actor property", () => {
            expect(resolveHostActor({})).to.be.null;
        });

        it("should return actor when effectDoc has actor property", () => {
            const mockActor = { id: "actor1" } as any;
            expect(resolveHostActor({ actor: mockActor })).to.equal(mockActor);
        });

        it("should return null when effectDoc.actor is null", () => {
            expect(resolveHostActor({ actor: null })).to.be.null;
        });
    });
});

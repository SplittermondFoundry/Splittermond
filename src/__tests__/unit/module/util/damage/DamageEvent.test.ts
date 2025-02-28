import {describe} from "mocha";
import sinon, {SinonSandbox} from "sinon";
import {expect} from "chai";
import {createDamageEvent, createDamageImplement} from "./damageEventTestHelper";
import {Cost} from "../../../../../module/util/costs/Cost";
import {CostBase} from "../../../../../module/util/costs/costTypes";


describe("DamageEvent", ()=> {
    let sandbox: SinonSandbox;
    beforeEach(() => sandbox= sinon.createSandbox());
    afterEach(() => sandbox.restore());

    it("should calculate the total damage", () => {
        const damages= [5,3,2,1];
        const damageImplements = damages.map(damage => createDamageImplement(damage, 0));
        const damageEvent = createDamageEvent(sandbox, {implements:damageImplements});

        expect(damageEvent.totalDamage()).to.equal(damages.reduce((acc, damage) => acc+damage, 0));
    });

    it("should return half damage on grazing hit", () => {
        const damages= [5,3,2,10];
        const damageImplements = damages.map(damage => createDamageImplement(damage, 0));
        const damageEvent = createDamageEvent(sandbox, {implements:damageImplements});
        damageEvent.updateSource({isGrazingHit: true});

        expect(damageEvent.totalDamage()).to.equal(damages.reduce((acc, damage) => (acc+damage), 0)/2);
    });


    it("should cap damage reduction override to damage", () => {
        expect(createDamageImplement(4, 5).ignoredReduction).to.equal(4);
    });

    describe("base cost", () => {
        it("should return a zero cost base of type channeled",() => {
            const damageEvent = createDamageEvent(sandbox, {_costBase: CostBase.create("K")});
            const damage = damageEvent.costBase.add(new Cost(1,0,true,true).asModifier())
            expect(damage.render()).to.equal("K1");
        });

        it("should return a zero cost base of type exhausted",() => {
            const damageEvent = createDamageEvent(sandbox, {_costBase: CostBase.create("")});
            const damage = damageEvent.costBase.add(new Cost(1,0,false,true).asModifier())
            expect(damage.render()).to.equal("1");
        });

        it("should return a zero cost base of type consumed",() => {
            const damageEvent = createDamageEvent(sandbox, {_costBase: CostBase.create("V")});
            const damage = damageEvent.costBase.add(new Cost(0,1,false,true).asModifier())
            expect(damage.render()).to.equal("1V1");
        });

        it("should even work with mixed costs", () => {
            const damageEvent = createDamageEvent(sandbox, {_costBase: CostBase.create("")});
            const damage = damageEvent.costBase.add(new Cost(1,1,false,true).asModifier())
            expect(damage.render()).to.equal("2V1");
        });
    });

});


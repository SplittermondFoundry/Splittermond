import { describe } from "mocha";
import sinon from "sinon";
import { createTestRoll, MockRoll, stubRollApi } from "__tests__/unit/RollMock";
import { DamageInitializer } from "module/util/chat/damageChatMessage/initDamage";
import { expect } from "chai";
import { DamageMessage } from "module/util/chat/damageChatMessage/DamageMessage";
import { foundryApi } from "module/api/foundryApi";
import { DamageRoll } from "module/util/damage/DamageRoll";
import { ItemFeaturesModel } from "module/item/dataModel/propertyModels/ItemFeaturesModel";
import { CostBase } from "module/util/costs/costTypes";

describe("Damage Event initialization", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "chatMessageTypes").value({ OTHER: 0 });
        sandbox
            .stub(foundryApi, "getSpeaker")
            .returns({ actor: null, scene: "askf4903", token: null, alias: "Gamemaster" });
        stubRollApi(sandbox);
        //@ts-expect-error we haven't defined the global namespace
        global.Roll = MockRoll;
    });
    afterEach(() => {
        sandbox.restore();
        //@ts-expect-error we haven't defined the global namespace
        global.Roll = undefined;
    });
    const firstImplement = {
        damageRoll: new DamageRoll(createTestRoll("1d6", [5], 0), ItemFeaturesModel.from("Scharf 1")),
        damageSource: "Schwert",
        damageType: "physical" as const,
    };
    const secondImplement = {
        damageRoll: new DamageRoll(createTestRoll("1d10", [3], 0), ItemFeaturesModel.from("Durchdringung 1")),
        damageSource: "Brennende Klinge",
        damageType: "fire" as const,
    };
    const thirdImplement = {
        damageRoll: new DamageRoll(
            createTestRoll("2d10", [3], 0),
            ItemFeaturesModel.from("Kritisch 1, Scharf 5, Exakt 3, Durchdringung 5, Lange Waffe, Wuchtig")
        ),
        damageSource: "Lanze der Gerechtigkeit",
        damageType: "physical" as const,
    };
    it("should output the sum of two rolls", async () => {
        const damageRollOptions = {
            costBase: CostBase.create("V"),
            isGrazingHit: false,
        };
        const damageMessage = await DamageInitializer.rollFromDamageRoll(
            [firstImplement, secondImplement],
            damageRollOptions,
            null
        )
            .then((chatMessage) => chatMessage.system)
            .then((message) => message as DamageMessage);

        expect(damageMessage.damageEvent.implements).to.have.length(2);
        expect(damageMessage.damageEvent.totalDamage()).to.equal(8);
    });

    it("should record damage reduction override", async () => {
        const damageRollOptions = {
            costBase: CostBase.create("V"),
            isGrazingHit: false,
        };
        const damageMessage = await DamageInitializer.rollFromDamageRoll([thirdImplement], damageRollOptions, null)
            .then((chatMessage) => chatMessage.system)
            .then((message) => message as DamageMessage);

        expect(damageMessage.damageEvent.implements[0].ignoredReduction).to.equal(5);
    });
});

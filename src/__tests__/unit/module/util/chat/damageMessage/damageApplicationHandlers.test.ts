import {damageHandlers} from "../../../../../../module/util/chat/damageChatMessage/damageApplicationHandlers";
import {createDamageEvent, createDamageImplement} from "../../damage/damageEventTestHelper";
import {describe, beforeEach, it} from "mocha";
import sinon from "sinon";
import {asMock} from "../../../../settingsMock";
import {settings} from "../../../../../../module/settings";

describe("damageApplicationHandlers", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });
    afterEach(() => sandbox.restore());

    it("should apply damage to the target", () => {
        asMock(settings.registerString).returnsSetting("once");

        damageHandlers.applyDamageToTargets(createDamageEvent(sandbox, createDamageImplement(10,1)))
    });
});
import {expect} from "chai";
import {asMock} from "../../../../../settingsMock";
import {settings} from "../../../../../../../module/settings";
import {
    UserModificationDialogue
} from "../../../../../../../module/util/chat/damageChatMessage/userDialogue/UserModificationDialogue";
import sinon, {SinonSandbox} from "sinon";
import {
    DamageReportDialog,
    UserAdjustments
} from "../../../../../../../module/util/chat/damageChatMessage/userDialogue/DamageReportDialog";
import {UserReport} from "../../../../../../../module/util/chat/damageChatMessage/userDialogue/UserReporterImpl";
import {Cost, CostModifier} from "../../../../../../../module/util/costs/Cost";
import SplittermondActor from "../../../../../../../module/actor/actor";
import {AgentReference} from "../../../../../../../module/data/references/AgentReference";
import {PrimaryCost} from "../../../../../../../module/util/costs/PrimaryCost";
import {CostBase} from "../../../../../../../module/util/costs/costTypes";

describe("UserModificationDialog", () => {
    let sandbox: SinonSandbox;
    beforeEach(() => sandbox = sinon.createSandbox());
    afterEach(() => sandbox.restore());

    describe("Reaction to settings", () => {
        it("should not display on first invocation if setting set to never", async () => {
            asMock(settings.registerString).returnsSetting("never");
            const dialog = sandbox.stub(DamageReportDialog, "create").resolves(sandbox.createStubInstance(DamageReportDialog))
            const underTest = UserModificationDialogue.create();
            const damage = new Cost(0, 10, false, true);

            const userAdjustedDamage = await underTest.getUserAdjustedDamage(createUserReport(sandbox, {totalDamage: damage.asModifier()}));

            expect(userAdjustedDamage).is.instanceof(PrimaryCost);
            expect(userAdjustedDamage).to.deep.equal(damage.asPrimaryCost());
            expect(dialog.called).to.be.false;
        })

        it("should display on first invocation if setting set to once", async () => {
            asMock(settings.registerString).returnsSetting("once");
            sandbox.createStubInstance(DamageReportDialog)
            const dialog = createMockDialog(sandbox, {wasAdjusted: true, damageAdjustment: -5})
            const underTest = UserModificationDialogue.create();
            const damage = new Cost(0, 10, false, true);

            const firstAdjustment = await underTest.getUserAdjustedDamage(createUserReport(sandbox, {totalDamage: damage.asModifier()}));
            const secondAdjustment = await underTest.getUserAdjustedDamage(createUserReport(sandbox, {totalDamage: damage.asModifier()}));

            expect(firstAdjustment).to.deep.equal(new Cost(0, 5, false).asPrimaryCost());
            expect(secondAdjustment).to.deep.equal(new Cost(0, 5, false).asPrimaryCost());
            expect(dialog.render.calledOnce).to.be.true;
        })

        it("should always display if setting set to always", async () => {
            asMock(settings.registerString).returnsSetting("always");
            sandbox.createStubInstance(DamageReportDialog)
            const dialog = createMockDialog(sandbox, {wasAdjusted: true, damageAdjustment: -5})
            const underTest = UserModificationDialogue.create();
            const damage = new Cost(0, 10, false, true);

            const firstAdjustment = await underTest.getUserAdjustedDamage(createUserReport(sandbox, {totalDamage: damage.asModifier()}));
            const secondAdjustment = await underTest.getUserAdjustedDamage(createUserReport(sandbox, {totalDamage: damage.asModifier()}));

            expect(firstAdjustment).to.deep.equal(new Cost(0, 5, false).asPrimaryCost());
            expect(secondAdjustment).to.deep.equal(new Cost(0, 5, false).asPrimaryCost());
            expect(dialog.render.calledTwice).to.be.true;
        })

        it("should cancel all invocations on cancellation", async () => {
            asMock(settings.registerString).returnsSetting("always");
            sandbox.createStubInstance(DamageReportDialog)
            const dialog = createMockDialog(sandbox, {
                wasAdjusted: true,
                damageAdjustment: -5,
                selectedAction: "cancel"
            })
            const underTest = UserModificationDialogue.create();
            const damage = new Cost(0, 10, false, true);

            const firstAdjustment = await underTest.getUserAdjustedDamage(createUserReport(sandbox, {totalDamage: damage.asModifier()}));
            const secondAdjustment = await underTest.getUserAdjustedDamage(createUserReport(sandbox, {totalDamage: damage.asModifier()}));

            expect(firstAdjustment).to.deep.equal("Aborted");
            expect(secondAdjustment).to.deep.equal("Aborted");
            expect(dialog.render.calledOnce).to.be.true;
        });
    });

    describe("User alteration calculation", () => {
        it("should apply user adjustments to damage", async () => {
            asMock(settings.registerString).returnsSetting("once");
            sandbox.createStubInstance(DamageReportDialog)
            createMockDialog(sandbox, {wasAdjusted: true, damageAdjustment: 10})
            const underTest = UserModificationDialogue.create();
            const damage = new Cost(0, 10, false, true);

            const firstAdjustment = await underTest.getUserAdjustedDamage(createUserReport(sandbox, {totalDamage: damage.asModifier()}));

            expect(firstAdjustment).to.deep.equal(new Cost(0, 20, false, true).asPrimaryCost());
        });

        it("should apply user adjustments to cost base", async () => {
            asMock(settings.registerString).returnsSetting("once");
            sandbox.createStubInstance(DamageReportDialog)
            createMockDialog(sandbox, {costBaseChanged: true, costBase: ""})
            const underTest = UserModificationDialogue.create();
            const damage = new Cost(0, 10, false, true);

            const adjustment = await underTest.getUserAdjustedDamage(createUserReport(sandbox, {totalDamage: damage.asModifier()}));

            expect(adjustment).to.deep.equal(new Cost(10, 0, false, true).asPrimaryCost());
        })

        it("should apply reductions from splinterpoint usage only once", async () => {
            sandbox.createStubInstance(DamageReportDialog)
            createMockDialog(sandbox, {
                wasAdjusted: true,
                damageAdjustment: -5,
                splinterpointBonus: -5,
                usedSplinterpointBonus: true
            })
            const underTest = UserModificationDialogue.create();
            const damage = new Cost(0, 10, false, true);

            const firstAdjustment = await underTest.getUserAdjustedDamage(createUserReport(sandbox, {totalDamage: damage.asModifier()}));
            const secondAdjustment = await underTest.getUserAdjustedDamage(createUserReport(sandbox, {totalDamage: damage.asModifier()}));

            expect(firstAdjustment).to.deep.equal(new Cost(0, 5, false, true).asPrimaryCost());
            expect(secondAdjustment).to.deep.equal(new Cost(0, 10, false, true).asPrimaryCost());
        })
    });
});

type ReportProps = Partial<Omit<UserReport, "event">> & { event?: Partial<UserReport["event"]> }

function createUserReport(sandbox: SinonSandbox, props: ReportProps = {}): UserReport {
    return {
        damageReduction: props.damageReduction ?? CostModifier.zero,
        event: {
            causer: props.event?.causer ?? sandbox.createStubInstance(AgentReference),
            isGrazingHit: props.event?.isGrazingHit ?? false,
            costBase: props.event?.costBase ?? CostBase.create("V"),
        },
        overriddenReduction: props.overriddenReduction ?? CostModifier.zero,
        records: props.records ?? [],
        target: props.target ?? sandbox.createStubInstance(SplittermondActor),
        totalDamage: new Cost(0, 10, false, true).asModifier(),
        totalFromImplements: new Cost(0, 10, false, true).asModifier()

    }
}

type UserAdjustmentProps = Partial<UserAdjustments>

function createMockDialog(sandbox: SinonSandbox, props: UserAdjustmentProps = {}) {
    const dialog = sandbox.createStubInstance(DamageReportDialog)
    dialog.addEventListener.callsFake((__, listener) => {
        dialog.render.callsFake(() => {
            return new Promise((resolve) => {
                resolve(dialog);
                listener(null as any/*Creating an actual event fails without notice. */);
            })
        })
    });
    dialog.getUserAdjustments.returns({
        costBase: props.costBase ?? "V",
        costBaseChanged: props.costBaseChanged ?? false,
        damageAdjustment: props.damageAdjustment ?? 0,
        wasAdjusted: props.wasAdjusted ?? false,
        selectedAction: props.selectedAction ?? "apply",
        splinterpointBonus: props.splinterpointBonus ?? 0,
        usedSplinterpointBonus: props.usedSplinterpointBonus ?? false,
    })
    sandbox.stub(DamageReportDialog, "create").resolves(dialog);
    return dialog
}

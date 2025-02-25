import {
    DamageReportDialog
} from "../../../../../../../module/util/chat/damageChatMessage/userDialogue/DamageReportDialog";
import {UserReport} from "../../../../../../../module/util/chat/damageChatMessage/userDialogue/UserReporterImpl";
import sinon, {SinonSandbox} from "sinon";
import {AgentReference} from "../../../../../../../module/data/references/AgentReference";
import {Cost} from "../../../../../../../module/util/costs/Cost";
import SplittermondActor from "../../../../../../../module/actor/actor";
import {foundryApi} from "../../../../../../../module/api/foundryApi";
import {createHtml} from "../../../../../../handlebarHarness";
import {expect} from "chai";
import {DOMWindow, JSDOM} from "jsdom";
import {FoundryDialog} from "../../../../../../../module/api/Dialog";
import {CostBase} from "../../../../../../../module/util/costs/costTypes";

declare const foundry:any;

describe("DamageReportDialog", () => {
    let sandbox: SinonSandbox;
    const windows: DOMWindow[]=[];
    beforeEach(() => {
        sandbox = sinon.createSandbox()
        sandbox.stub(foundryApi, "format").callsFake((key) => key)
        sandbox.stub(foundryApi, "localize").callsFake((key) => key)
        /**
         * We need to have a  working DOM in the tests (for the listeners) and we need to have access to it
         * Therefore, we're faking the renderer that will side channel the rendered HTML to us, so that we can
         * then create a dom around it and serve it to the render function of the dialog. (and also access it in the tests)
         */
        const fakeRenderer = sandbox.mock()
        let html = "";
        fakeRenderer.callsFake(
            () => async (template: string, data: unknown) => {
                const templatePath = template.replace("systems/splittermond/", "");
                html = createHtml(templatePath, data);
                return html;
            }
        )
        sandbox.stub(foundryApi, "renderer").get(fakeRenderer);
        FoundryDialog.prototype.render = async function () {
                const dom = new JSDOM(html);
                //@ts-expect-error Window does not exist on FoundryDialog, we're injecting it here for testing purposes.
                this.window = dom.window;
                //@ts-expect-error see above
                windows.push(this.window)
                this.element = dom.window.document.documentElement
                return this;
            };
    })
    afterEach(() => {
        sandbox.restore()
    });
    after(() => {
        windows.forEach(window => window.close())
    });


    it("should record increments", async () => {
        const {dialogStub, dom} = await getDomUnderTest(sandbox);
        dom.querySelector("button.button-inline[data-action='inc-value']")?.dispatchEvent(newClickEvent(dialogStub.window))

        expect(dialogStub.getUserAdjustments().damageAdjustment).to.equal(1);
        expect(dialogStub.getUserAdjustments().wasAdjusted).to.be.true;
    });

    it("should record decrements", async () => {
        const {dialogStub, dom} = await getDomUnderTest(sandbox);

        dom.querySelector("button.button-inline[data-action='dec-value']")?.dispatchEvent(newClickEvent(dialogStub.window))

        expect(dialogStub.getUserAdjustments().damageAdjustment).to.equal(-1);
        expect(dialogStub.getUserAdjustments().wasAdjusted).to.be.true;
    });

    it("should record half-value", async () => {
        const {
            dialogStub,
            dom
        } = await getDomUnderTest(sandbox, {totalDamage: new Cost(7, 0, false, true).asModifier()})

        dom.querySelector("button.button-inline[data-action='half-value']")?.dispatchEvent(newClickEvent(dialogStub.window));

        expect(dialogStub.getUserAdjustments().damageAdjustment).to.equal(-3);
        expect(dialogStub.getUserAdjustments().wasAdjusted).to.be.true;
    });

    it("should record splinterpoint usage", async () => {
        const {dialogStub, dom} = await getDomUnderTest(sandbox);

        dom.querySelector("button.dialog-buttons[data-action='useSplinterpoint']")?.dispatchEvent(newClickEvent(dialogStub.window));

        expect(dialogStub.getUserAdjustments().damageAdjustment).to.equal(-5);
        expect(dialogStub.getUserAdjustments().wasAdjusted).to.be.true;
        expect(dialogStub.getUserAdjustments().splinterpointBonus).to.equal(5);
        expect(dialogStub.getUserAdjustments().usedSplinterpointBonus).to.be.true;
    });

    it("should record base changes", async () => {
        const {dialogStub, dom} = await getDomUnderTest(sandbox);
        const domEvent = new (dom.ownerDocument.defaultView!.Event)("change", {bubbles: true, cancelable: true});
        global.HTMLSelectElement = dialogStub.window.HTMLSelectElement; //why do I have to do this?


        (dom.querySelector("select[name='costTypeSelect'] option[value='K']")! as HTMLOptionElement).selected = true;
        (dom.querySelector("select[name='costTypeSelect'] option[value='V']")! as HTMLOptionElement).selected = false;
        dom.querySelector("select[name='costTypeSelect']")?.dispatchEvent(domEvent);

        expect(dialogStub.getUserAdjustments().costBase).to.equal("K");
        expect(dialogStub.getUserAdjustments().costBaseChanged).to.be.true;
    });
});

function createUserReport(sandbox: SinonSandbox, props: Partial<UserReport> = {}): UserReport {
    return {
        damageReduction: props.damageReduction ?? new Cost(1, 0, false, true).asModifier(),
        event: {
            causer: props.event?.causer ?? createAttacker(sandbox, {name: "Attacker"}),
            isGrazingHit: props.event?.isGrazingHit ?? false,
            costBase: props.event?.costBase ?? CostBase.create(""),
        },
        overriddenReduction: props.overriddenReduction ?? new Cost(1, 0, false, true).asModifier(),
        records: props.records ?? [{
            implementName: "Schwert",
            damageType: "physical",
            baseDamage: new Cost(4, 0, false, true).asModifier(),
            modifiedBy: new Cost(1, 0, false, true).asModifier(),
            appliedDamage: new Cost(5, 0, false, true).asModifier()
        }],
        target: props.target ?? createActor(sandbox, {name: "Target"}),
        totalDamage: props.totalDamage ?? new Cost(4, 0, false, true).asModifier(),
        totalFromImplements: props.totalFromImplements ?? new Cost(5, 0, false, true).asModifier()
    }
}

function createAttacker(sandbox: SinonSandbox, props: { name?: string } = {}): AgentReference {
    const attacker = sandbox.createStubInstance(AgentReference);
    attacker.getAgent.returns(createActor(sandbox, props));
    return attacker;
}

function createActor(sandbox: SinonSandbox, props: { name?: string } = {}): SplittermondActor {
    const actor = sandbox.createStubInstance(SplittermondActor);
    actor.name = props.name ?? "TestActor";
    actor.spendSplinterpoint.callsFake(() => ({pointSpent:true, getBonus:()=>5}))
    sandbox.stub(actor, "splinterpoints").get(() => ({current: 1, max: 3}));
    return actor;
}

async function getDomUnderTest(sandbox: SinonSandbox, props: Partial<UserReport> = {}) {
    const dialogStub = await DamageReportDialog.create(createUserReport(sandbox, props));
    await dialogStub.render({force: true})
    //@ts-expect-error element is protected, but we need to access it in order to produce behavior.
    const dom = dialogStub.element;
    return {dialogStub: asMock(dialogStub), dom};
}

function asMock<T extends DamageReportDialog>(stub: T): T & { window: DOMWindow } {
   if("window" in stub && stub.window){
       return stub as T & { window: DOMWindow };
   }else{
       throw new Error("Expected dialog to have a window property")
   }
}
function newClickEvent(window: DOMWindow) {
    return new window.MouseEvent("click", {bubbles: true, cancelable: true});
}

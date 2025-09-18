import "../../../foundryMocks.js";
import sinon, { SinonSandbox } from "sinon";
import { expect } from "chai";
import { JSDOM } from "jsdom";
import SplittermondSpeciesWizard from "../../../../../module/apps/wizards/species";
import { createHtml } from "../../../../handlebarHarness";
import { foundryApi } from "../../../../../module/api/foundryApi";
import { FoundryApplication } from "../../../../../module/api/Application";
import { SpeciesDataModel } from "../../../../../module/item/dataModel/SpeciesDataModel";
import SplittermondItem from "../../../../../module/item/item";

describe("SplittermondSpeciesWizard", () => {
    let sandbox: SinonSandbox;
    let actorStub: any;
    let speciesStub: any;
    let dom: JSDOM;
    let wizard: SplittermondSpeciesWizard;

    beforeEach(async () => {
        sandbox = sinon.createSandbox();

        // Mock foundryApi
        sandbox.stub(foundryApi, "localize").callsFake((key: string) => {
            switch (key) {
                case "splittermond.attribute.strength.short":
                    return "STÄ";
                case "splittermond.attribute.charisma.short":
                    return "AUS";
                case "splittermond.attribute.agility.short":
                    return "BEW";
                case "splittermond.attribute.constitution.short":
                    return "KON";
                default:
                    return key;
            }
        });
        sandbox.stub(foundryApi, "format").callsFake((key: string, data: any) => key.replace("{points}", data.points));
        //@ts-expect-error: _prepareContext is a protected method
        sandbox.stub(FoundryApplication.prototype, "_prepareContext").callsFake((input) => input);

        // Minimal SpeciesDataModel stub

        speciesStub = sandbox.createStubInstance(SplittermondItem);
        speciesStub.name = "Elf";
        speciesStub.system = new SpeciesDataModel({
            size: 5,
            attributeMod: "AUS +1,BEW +1, KON -1",
            strengths: "Attraktivität, Dämmersicht, Scharfes Gehör",
            description: "",
            source: "",
        });

        // Minimal actor stub
        actorStub = {
            update: sandbox.stub().resolves(),
        };

        wizard = new SplittermondSpeciesWizard(actorStub, speciesStub);
        const html = createHtml("templates/apps/wizards/species.hbs", await wizard._prepareContext({ parts: [] }));
        dom = new JSDOM(html);
        // @ts-expect-error: element needs to be set for test
        wizard.element = dom.window.document.documentElement;
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should render attribute controls and allow increment/decrement", async () => {
        // Initial values
        await wizard._onRender({}, { parts: [] });
        expect(wizard.attributeModifiers.strength.value).to.equal(0);
        expect(wizard.attributeModifiers.charisma.value).to.equal(1);
        expect(wizard.attributeModifiers.agility.value).to.equal(1);
        expect(wizard.attributeModifiers.constitution.value).to.equal(-1);

        // Find increment and decrement buttons for strength
        const strengthInc = wizard.element.querySelector('button[name="strength"][value="+1"]') as HTMLButtonElement;
        const strengthDec = wizard.element.querySelector('button[name="strength"][value="-1"]') as HTMLButtonElement;

        // Simulate click on decrement (should not go below min)
        strengthDec.click();
        expect(wizard.attributeModifiers["strength"].value).to.equal(0);

        // Simulate click on increment
        strengthInc.click();
        expect(wizard.attributeModifiers["strength"].value).to.equal(1);
    });

    it("should disable increment when max or sum reached", async () => {
        // Set both attributes to max sum (2)
        wizard.attributeModifiers["strength"].value = 1;
        wizard.attributeModifiers["agility"].value = 1;

        const context = await wizard._prepareContext({ parts: [] });

        expect((context.attributeModifiers as any)?.["strength"].incDisabled).to.be.true;
        expect((context.attributeModifiers as any)?.["agility"].incDisabled).to.be.true;
    });

    it("should call actor.update with correct data on save", async () => {
        // Change attribute values
        wizard.attributeModifiers["strength"].value = 1;
        wizard.attributeModifiers["agility"].value = 1;

        wizard._onSave(null as any /*we don't need the event*/);

        expect(actorStub.update.calledOnce).to.be.true;
        const updateArg = actorStub.update.firstCall.args[0];
        expect(updateArg.system.species.value).to.equal("Elf");
        expect(updateArg.system.species.size).to.equal(5);
        expect(updateArg.system.attributes.strength.species).to.equal(1);
        expect(updateArg.system.attributes.agility.species).to.equal(1);
    });

    it("should not throw on cancel", () => {
        expect(() => wizard._onCancel(null as any /*we don't use event*/)).to.not.throw();
    });

    it("should update values and re-render on button click", async () => {
        // Spy on render
        const renderSpy = sandbox.spy(wizard, "render");

        // Attach listeners
        await wizard._onRender({}, { parts: [] });

        // Simulate click on increment for agility
        const agilityInc = wizard.element.querySelector('button[name="willpower"][value="+1"]') as HTMLButtonElement;
        agilityInc.click();

        expect(wizard.attributeModifiers["willpower"].value).to.equal(1);
        expect(renderSpy.called).to.be.true;
    });
});

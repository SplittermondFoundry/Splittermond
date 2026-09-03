import { describe, it, beforeEach, afterEach } from "mocha";
import { expect } from "chai";
import sinon, { type SinonSandbox, type SinonStub } from "sinon";
import {
    migrateModifierToEffects,
    runModifierToEffectMigration,
    migrationDoneFlag,
    MODIFIER_TO_EFFECT_MIGRATION_VERSION,
} from "module/item/migrations/modifierToEffectMigration";
import { foundryApi } from "module/api/foundryApi";
import { setAddModifier } from "module/item/item";
import type { AddModifierResult, TaggedModifier } from "module/modifiers/modifierAddition";
import type { IModifier } from "module/modifiers";
import { of } from "module/modifiers/expressions/scalar";

interface StubItem {
    type: string;
    uuid: string;
    name: string;
    actor: unknown;
    isOwner: boolean;
    system: { modifier: string | null };
    update: SinonStub;
    setFlag: SinonStub;
    getFlag: SinonStub;
    createEmbeddedDocuments: SinonStub;
}

function makeItem(modifier: string | null, type = "weapon"): StubItem {
    return {
        type,
        uuid: "Item.test-uuid",
        name: "Test Item",
        actor: null,
        isOwner: true,
        system: { modifier },
        update: sinon.stub().resolves(),
        setFlag: sinon.stub().resolves(),
        getFlag: sinon.stub().returns(undefined),
        createEmbeddedDocuments: sinon.stub().resolves([]),
    };
}

function makeScalarModifier(groupId: string): IModifier {
    const mock: IModifier = {
        value: of(2),
        isBonus: true,
        isMalus: false,
        groupId,
        selectable: false,
        attributes: { name: "Test Item", type: "innate" },
        addTooltipFormulaElements() {},
        applyMultiplier: () => mock,
    };
    return mock;
}

function makeTagged(modifier: IModifier, rawFragment: string): TaggedModifier {
    return { modifier, rawFragment, implementation: "additive" };
}

function makeAddModifier(result: AddModifierResult): SinonStub {
    return sinon.stub().returns(result);
}

function scalarResult(...tagged: TaggedModifier[]): AddModifierResult {
    return { modifiers: tagged, costModifiers: [] };
}

function emptyResult(): AddModifierResult {
    return { modifiers: [], costModifiers: [] };
}

function gmUser(id = "gm1") {
    return { id, isGM: true, active: true };
}

describe("migrateModifierToEffects", () => {
    let sandbox: SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => sandbox.restore());

    it("is a no-op when system.modifier is empty (idempotent on already-migrated item)", async () => {
        const item = makeItem("");
        const addModifier = makeAddModifier(emptyResult());

        const result = await migrateModifierToEffects(item as unknown as Item, addModifier);

        expect(result).to.be.false;
        expect(item.update.called, "field is not cleared when there is nothing to transport").to.be.false;
        expect(item.createEmbeddedDocuments.called, "no effects are created").to.be.false;
        expect(addModifier.called, "parser is not invoked").to.be.false;
    });

    it("is a no-op when system.modifier is null", async () => {
        const item = makeItem(null);
        const addModifier = makeAddModifier(emptyResult());

        const result = await migrateModifierToEffects(item as unknown as Item, addModifier);

        expect(result).to.be.false;
        expect(item.update.called).to.be.false;
    });

    it("is a no-op when addModifier is null (parser unavailable)", async () => {
        const item = makeItem("skills.acrobatics +2");

        const result = await migrateModifierToEffects(item as unknown as Item, null);

        expect(result).to.be.false;
        expect(item.update.called, "field is not cleared when the parser is unavailable").to.be.false;
        expect(item.createEmbeddedDocuments.called).to.be.false;
    });

    it("clears system.modifier, then creates modifier-type effects with the version flag", async () => {
        const item = makeItem("skills.acrobatics +2", "weapon");
        const addModifier = makeAddModifier(
            scalarResult(makeTagged(makeScalarModifier("skills.acrobatics"), "skills.acrobatics +2"))
        );

        const result = await migrateModifierToEffects(item as unknown as Item, addModifier);

        expect(result).to.be.true;
        expect(
            item.update.calledOnceWith({ "system.modifier": "" }),
            "system.modifier is cleared before effects are created"
        ).to.be.true;
        expect(addModifier.calledOnceWith(item, "skills.acrobatics +2", "equipment")).to.be.true;
        expect(item.createEmbeddedDocuments.calledOnce).to.be.true;

        const [docType, effectDataArray] = item.createEmbeddedDocuments.firstCall.args as [
            string,
            Array<Record<string, unknown>>,
        ];
        expect(docType).to.equal("ActiveEffect");
        expect(effectDataArray).to.have.lengthOf(1);
        expect(effectDataArray[0].type, "created effect is modifier-type (not autoGenerated)").to.equal("modifier");
    });

    it("passes the migration version flag into each created effect's splittermond flags", async () => {
        const item = makeItem("skills.acrobatics +2, defense +1", "armor");
        const addModifier = makeAddModifier(
            scalarResult(
                makeTagged(makeScalarModifier("skills.acrobatics"), "skills.acrobatics +2"),
                makeTagged(makeScalarModifier("defense"), "defense +1")
            )
        );

        await migrateModifierToEffects(item as unknown as Item, addModifier);

        expect(item.createEmbeddedDocuments.calledOnce).to.be.true;
        const [, effectDataArray] = item.createEmbeddedDocuments.firstCall.args as [
            string,
            Array<{ type: string; flags?: { splittermond?: Record<string, unknown> } }>,
        ];
        expect(effectDataArray, "one effect per raw fragment").to.have.lengthOf(2);
        for (const effectData of effectDataArray) {
            expect(effectData.type).to.equal("modifier");
            expect(effectData.flags?.splittermond?.modifierMigrationVersion).to.equal(
                MODIFIER_TO_EFFECT_MIGRATION_VERSION
            );
        }
    });

    it("is idempotent: a second run on the cleared item is a no-op", async () => {
        const item = makeItem("skills.acrobatics +2");
        const addModifier = makeAddModifier(
            scalarResult(makeTagged(makeScalarModifier("skills.acrobatics"), "skills.acrobatics +2"))
        );

        await migrateModifierToEffects(item as unknown as Item, addModifier);
        item.system.modifier = "";

        const second = await migrateModifierToEffects(item as unknown as Item, addModifier);

        expect(second).to.be.false;
        expect(item.update.calledOnce, "update only fires on the first run").to.be.true;
        expect(item.createEmbeddedDocuments.calledOnce, "effects only created on the first run").to.be.true;
    });
});

describe("runModifierToEffectMigration", () => {
    let sandbox: SinonSandbox;
    let flagGet: SinonStub;
    let flagSet: SinonStub;
    let addModifierStub: SinonStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        flagGet = sandbox.stub(migrationDoneFlag, "get").returns(false);
        flagSet = sandbox.stub(migrationDoneFlag, "set");
        sandbox.stub(foundryApi, "currentUser").value(gmUser());
        sandbox.stub(foundryApi, "users").value([gmUser()]);
        sandbox.stub(foundryApi, "informUser");
        addModifierStub = sinon
            .stub()
            .returns(scalarResult(makeTagged(makeScalarModifier("skills.acrobatics"), "skills.acrobatics +2")));
        setAddModifier(addModifierStub as any);
    });

    afterEach(() => {
        setAddModifier(null as any);
        sandbox.restore();
    });

    it("is a no-op when this user is not the first active GM", async () => {
        sandbox.stub(foundryApi, "currentUser").value({ id: "gm2", isGM: true, active: true });
        sandbox.stub(foundryApi, "users").value([
            { id: "gm1", isGM: true, active: true },
            { id: "gm2", isGM: true, active: true },
        ]);
        const item = makeItem("skills.acrobatics +2");
        sandbox.stub(foundryApi, "collections").value({
            items: [item],
            actors: [],
            packs: [],
        });

        const result = await runModifierToEffectMigration();

        expect(item.update.called).to.be.false;
        expect(flagSet.called).to.be.false;
        expect(result).to.deep.equal({ worldDocumentsMigrated: 0, packsMigrated: 0, skippedPacks: [] });
    });

    it("is a no-op when the migration-done flag is already true", async () => {
        flagGet.returns(true);
        const item = makeItem("skills.acrobatics +2");
        sandbox.stub(foundryApi, "collections").value({
            items: [item],
            actors: [],
            packs: [],
        });

        const result = await runModifierToEffectMigration();

        expect(item.update.called).to.be.false;
        expect(flagSet.called).to.be.false;
        expect(result).to.deep.equal({ worldDocumentsMigrated: 0, packsMigrated: 0, skippedPacks: [] });
    });

    it("skips items with an empty system.modifier and counts only migrated ones", async () => {
        const withModifiers = makeItem("skills.acrobatics +2");
        const withoutModifiers = makeItem("");
        sandbox.stub(foundryApi, "collections").value({
            items: [withModifiers, withoutModifiers],
            actors: [],
            packs: [],
        });
        sandbox.stub(foundryApi, "getDocumentSource").returns({ system: {} });

        const result = await runModifierToEffectMigration();

        expect(withModifiers.update.calledOnce, "item with modifiers is cleared").to.be.true;
        expect(withoutModifiers.update.called, "item without modifiers is untouched").to.be.false;
        expect(result.worldDocumentsMigrated).to.equal(1);
        expect(flagSet.calledOnceWith(true)).to.be.true;
    });

    it("force option bypasses the idempotency guard", async () => {
        flagGet.returns(true);
        const item = makeItem("");
        sandbox.stub(foundryApi, "collections").value({
            items: [item],
            actors: [],
            packs: [],
        });
        sandbox.stub(foundryApi, "getDocumentSource").returns({ system: {} });

        const result = await runModifierToEffectMigration({ force: true });

        expect(item.update.called, "force still respects the per-item empty-string guard").to.be.false;
        expect(result.worldDocumentsMigrated).to.equal(0);
        expect(flagSet.calledOnceWith(true)).to.be.true;
    });

    it("continues migrating remaining items when one item rejects", async () => {
        const failing = makeItem("skills.acrobatics +2");
        failing.update.rejects(new Error("boom"));
        const ok = makeItem("defense +1");
        sandbox.stub(foundryApi, "collections").value({
            items: [failing, ok],
            actors: [],
            packs: [],
        });
        sandbox.stub(foundryApi, "getDocumentSource").returns({ system: {} });

        const result = await runModifierToEffectMigration();

        expect(failing.update.calledOnce).to.be.true;
        expect(ok.update.calledOnce).to.be.true;
        expect(flagSet.calledOnceWith(true)).to.be.true;
        expect(result.worldDocumentsMigrated).to.equal(1);
    });
});

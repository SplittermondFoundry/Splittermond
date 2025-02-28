import "__tests__/unit/foundryMocks.js";
import SplittermondSpellItem from "module/item/spell.js";
import sinon, {SinonSandbox, SinonStubbedInstance} from "sinon";
import {foundryApi} from "module/api/foundryApi";
import SplittermondActor from "module/actor/actor.js";
import {SplittermondDataModel} from "module/data/SplittermondDataModel";
import {ItemReference} from "module/data/references/ItemReference";
import {CheckReport} from "module/actor/CheckReport";
import {OnAncestorReference} from "module/data/references/OnAncestorReference";
import {AgentReference} from "../../../../../../module/data/references/AgentReference";
import SplittermondItem from "../../../../../../module/item/item";
import {SpellDataModel} from "../../../../../../module/item/dataModel/SpellDataModel";

export function setUpMockActor(sandbox: SinonSandbox): SinonStubbedInstance<SplittermondActor> {
    const actorMock = sandbox.createStubInstance(SplittermondActor);
    sandbox.stub(foundryApi, "getActor").returns(actorMock);
    actorMock.system = {}
    Object.defineProperty(actorMock, "documentName", {value: "Actor", enumerable: true});
    Object.defineProperty(actorMock, "id", {value: "1", enumerable: true});
    return actorMock;
}

export function setUpMockSpellSelfReference(sandbox: SinonSandbox): SinonStubbedInstance<SplittermondSpellItem> & ItemReference<SinonStubbedInstance<SplittermondSpellItem>> {
    const spellMock = sandbox.createStubInstance(SplittermondSpellItem);
    spellMock.system = sandbox.createStubInstance(SpellDataModel) ;
    sandbox.stub(foundryApi, "getItem").returns(spellMock);
    Object.defineProperty(spellMock, "getItem", {
        value: function () {
            return this;
        }
    })
    Object.defineProperty(spellMock, "toObject", {
        value: function () {
            return this;
        }
    });
    return spellMock as SinonStubbedInstance<SplittermondSpellItem> & ItemReference<SinonStubbedInstance<SplittermondSpellItem>>;
}

export function linkSpellAndActor(spellMock: SinonStubbedInstance<SplittermondSpellItem>, actorMock: SinonStubbedInstance<SplittermondActor>): void {
    actorMock.items = {get: () => spellMock} as unknown as Collection<SplittermondItem> //Our pseudo collection is supposed to return the spellMock regrardless of id entered.
    Object.defineProperty(spellMock, "actor", {value: actorMock, enumerable: true});
}

export function setUpCheckReportSelfReference():CheckReport & OnAncestorReference<CheckReport> {
    const checkReportReference = {}
    Object.defineProperty(checkReportReference, "get", {
        value: function () {
            return this;
        }
    });
    Object.defineProperty(checkReportReference, "toObject", {
        value: function () {
            return this;
        }
    });
    return checkReportReference as CheckReport & OnAncestorReference<CheckReport>;
}

export function withToObjectReturnsSelf<T>(wrappedFunction:()=>T):T {
    const toObjectMock = sinon.stub(SplittermondDataModel.prototype, "toObject").callsFake(function () {
        //@ts-expect-error we accept an "any" this here, because we cannot know the actual type for this mock
        return this;
    });
    const returnValue = wrappedFunction();
    toObjectMock.restore();
    return returnValue;
}

export type WithMockedRefs<T> = {
    [K in keyof T]: T[K] extends AgentReference | ItemReference<any>
        ? MockRefs<T[K]>
        : T[K] extends Function // Check if T[K] is a function
            ? T[K]                  // If so, leave it unchanged. Because, if treated as objects, they will lose the call signature.
            : T[K] extends object
                ? WithMockedRefs<T[K]>
                : T[K];
};
type MockRefs<T> = T extends AgentReference ? MockActorRef<T> : T extends ItemReference<any> ? MockItemRef<T> : never;
type MockActorRef<T extends AgentReference> = Omit<T, "getAgent"> & {
    getAgent(): SinonStubbedInstance<SplittermondActor>
};
type MockItemRef<T extends ItemReference<any>> = T extends ItemReference<infer I> ? ItemReference<SinonStubbedInstance<I>> : never;

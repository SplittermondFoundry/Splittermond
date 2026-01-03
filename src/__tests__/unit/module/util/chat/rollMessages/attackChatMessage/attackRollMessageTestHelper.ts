import "__tests__/unit/foundryMocks.js";
import { foundryApi } from "module/api/foundryApi";
import SplittermondActor from "module/actor/actor.js";
import { OnAncestorReference } from "module/data/references/OnAncestorReference";
import { AgentReference } from "module/data/references/AgentReference";
import { CharacterDataModel } from "module/actor/dataModel/CharacterDataModel";
import Attack from "module/actor/attack";
import type { AttackCheckReport } from "module/util/chat/rollMessages/attackChatMessage/interfaces";
import type { SinonSandbox, SinonStubbedInstance } from "sinon";
import type { SplittermondSkill } from "module/config/skillGroups";
import type { AttackReference } from "module/util/chat/rollMessages/attackChatMessage/AttackReference";

export function setUpMockActor(sandbox: SinonSandbox): SinonStubbedInstance<SplittermondActor> {
    const actorMock = sandbox.createStubInstance(SplittermondActor);
    sandbox.stub(foundryApi, "getActor").returns(actorMock);
    actorMock.system = sandbox.createStubInstance(CharacterDataModel);
    Object.defineProperty(actorMock, "documentName", { value: "Actor", enumerable: true });
    Object.defineProperty(actorMock, "id", { value: "1", enumerable: true });
    Object.defineProperty(actorMock, "attacks", { value: [], enumerable: true });
    return actorMock;
}

export function setUpMockAttackSelfReference(
    sandbox: SinonSandbox,
    actorMock: SinonStubbedInstance<SplittermondActor>,
    skill: SplittermondSkill = "melee"
) {
    const attackMock = sandbox.createStubInstance(Attack);
    Object.defineProperty(attackMock, "actor", { value: actorMock, enumerable: true });
    Object.defineProperty(attackMock, "get", {
        value: function () {
            return this;
        },
    });
    Object.defineProperty(attackMock, "toObject", {
        value: function () {
            return this;
        },
    });
    Object.defineProperty(attackMock, "skill", {
        value: { id: skill, attributes: {}, points: 5 },
        enumerable: true,
        writable: true,
    });
    Object.defineProperty(attackMock, "id", { value: "attack1", enumerable: true });
    Object.defineProperty(attackMock, "name", { value: "Test Attack", enumerable: true });
    Object.defineProperty(attackMock, "img", { value: "test.png", enumerable: true });
    sandbox.stub(attackMock, "weaponSpeed").get(() => 6);
    return attackMock as SinonStubbedInstance<Attack> & MockAttackReference;
}

export function setUpCheckReportSelfReference(): AttackCheckReport & OnAncestorReference<AttackCheckReport> {
    const checkReportReference = {
        grazingHitPenalty: 0,
    };
    Object.defineProperty(checkReportReference, "get", {
        value: function () {
            return this;
        },
    });
    Object.defineProperty(checkReportReference, "toObject", {
        value: function () {
            return this;
        },
    });
    return checkReportReference as AttackCheckReport & OnAncestorReference<AttackCheckReport>;
}

export type WithMockedRefs<T> = {
    [K in keyof T]: T[K] extends AgentReference
        ? MockActorRef<T[K]>
        : T[K] extends OnAncestorReference<infer U>
          ? MockOnAncestorRef<T[K], U>
          : T[K] extends AttackReference
            ? MockAttackReference
            : T[K] extends Function // Check if T[K] is a function
              ? T[K] // If so, leave it unchanged. Because, if treated as objects, they will lose the call signature.
              : T[K] extends object
                ? WithMockedRefs<T[K]>
                : T[K];
};
type MockActorRef<T extends AgentReference> = Omit<T, "getAgent"> & {
    getAgent(): SinonStubbedInstance<SplittermondActor>;
};
type MockOnAncestorRef<T extends OnAncestorReference<U>, U> = Omit<T, "get"> & {
    get(): U extends Attack ? SinonStubbedInstance<Attack> : U;
};

type MockAttackReference = Omit<AttackReference, "get"> & { get(): SinonStubbedInstance<Attack> };

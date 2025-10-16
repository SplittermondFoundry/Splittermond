import type { SinonSandbox, SinonStub, SinonStubbedInstance } from "sinon";
import SplittermondCombat from "../../../../../module/combat/combat";
import type { FoundryCombatant } from "../../../../../module/api/foundryTypes";
import SplittermondActor from "../../../../../module/actor/actor";
import SplittermondActorSheet from "../../../../../module/actor/sheets/actor-sheet";

const nextId = (function* () {
    let id = 1;
    while (true) yield id++;
})();

export function createCombat(sandbox: SinonSandbox, props: Partial<SplittermondCombat> = {}) {
    const combat = sandbox.createStubInstance(SplittermondCombat);
    combat.update.callThrough();
    const combatants = [] as FoundryCombatant[];
    const combatId = `CombatId${nextId.next().value}`;

    sandbox.stub(combat, "isActive").get(() => props.isActive ?? false);
    sandbox.stub(combat, "started").get(() => props.started ?? false);

    Object.defineProperty(combat, "id", { value: combatId, enumerable: true, writable: false });
    Object.defineProperty(combat, "scene", {
        value: props.currentScene ?? null,
        writable: false,
        enumerable: true,
    });
    Object.defineProperty(combat, "turns", { value: [], writable: false, enumerable: true });
    Object.defineProperty(combat, "turn", { value: props.turn ?? 0, writable: false, enumerable: true });
    Object.defineProperty(combatants, "contents", { value: [], writable: false, enumerable: true });
    Object.defineProperty(combatants, "get", { value: sandbox.stub(), writable: false, enumerable: false });
    Object.defineProperty(combat, "combatants", { value: combatants, writable: false, enumerable: true });

    return combat;
}

export type MockedCombatant = ReturnType<typeof addNewCombatant>;

export function addNewCombatant(
    sandbox: SinonSandbox,
    combat: SplittermondCombat,
    props: Partial<FoundryCombatant> = {}
) {
    const actor = sandbox.createStubInstance(SplittermondActor);
    Object.defineProperty(actor, "sheet", {
        value: sandbox.createStubInstance(SplittermondActorSheet),
        writable: false,
        enumerable: true,
    });
    Object.defineProperty(actor, "id", {
        value: `CombatantActorId${nextId.next().value}`,
        enumerable: true,
        writable: false,
    });
    actor.name = "Combatant";

    const combatant = {
        id: `${nextId.next().value}`,
        initiative: nextId.next().value * 0.1,
        parent: combat,
        combat,
        actor,
        token: { id: `TokenId${nextId.next().value}` },
        isDefeated: props.isDefeated ?? false,
        visible: props.visible ?? true,
        ...props,
    };

    if (combat.combatants && "get" in combat.combatants && combat.combatants.get) {
        const getStub = combat.combatants.get as SinonStub;
        getStub.withArgs(combatant.id).returns(combatant as FoundryCombatant);
    }
    if (combat.comcombatants && Array.isArray(combat.combatants)) {
        (combat.combatants as unknown as Array<FoundryCombatant>).push(combatant as FoundryCombatant);
    }
    if (combat.combatants && combat.combatants.contents) {
        combat.combatants.contents.push(combatant as FoundryCombatant);
    }

    return combatant as unknown as Omit<FoundryCombatant, "token"> & {
        actor: SinonStubbedInstance<SplittermondActor>;
        token: TokenDocument;
    };
}

import {DamageType} from "../../../../../module/config/damageTypes";
import {DamageEvent, DamageImplement} from "../../../../../module/util/damage/DamageEvent";
import {SinonSandbox} from "sinon";
import {AgentReference} from "../../../../../module/data/references/AgentReference";
import SplittermondActor from "../../../../../module/actor/actor";
import {injectParent} from "../../../testUtils";
import {CostBase} from "../../../../../module/util/costs/costTypes";

export function createDamageImplement(damage: number, baseReductionOverride: number, damageType: DamageType = "physical") {
    return new DamageImplement({
        damage,
        formula: "1d6",
        implementName: "Schwert",
        damageExplanation: "",
        damageType,
        _baseReductionOverride: baseReductionOverride,
    });
}

type EventProps = Partial<ConstructorParameters<typeof DamageEvent>[0]>;
export function createDamageEvent(sandbox: SinonSandbox, eventProps:EventProps={}){
    const agent = eventProps.causer ??createStubActor(sandbox);
    const damageImplements = eventProps.implements ?? [createDamageImplement(1, 0)];
    const event = new DamageEvent({
        causer: agent,
        _costBase: eventProps._costBase ??  new CostBase({costType: ""}),
        formula: eventProps.formula ?? damageImplements.map(imp => imp.formula).join(" + "),
        tooltip: eventProps.tooltip ?? "",
        isGrazingHit: eventProps.isGrazingHit ?? false,
        implements: damageImplements,
    });
    injectParent(event);
    return event;
}

function createStubActor(sandbox: SinonSandbox){
    const actor = sandbox.createStubInstance(SplittermondActor);
    actor.name = "TestActor";
    const agent = sandbox.createStubInstance(AgentReference);
    agent.getAgent.returns(actor);
    return agent;
}
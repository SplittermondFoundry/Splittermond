import { DamageRoll } from "../../module/util/damage/DamageRoll";
import { QuenchBatchContext } from "@ethaks/fvtt-quench";
import { DamageMessage } from "../../module/util/chat/damageChatMessage/DamageMessage";
import { DamageInitializer } from "../../module/util/chat/damageChatMessage/initDamage";
import { foundryApi } from "../../module/api/foundryApi";
import {
    evaluateEventImmunities,
    evaluateImplementImmunities,
    eventImmunityHook,
    implementImmunityHook,
} from "../../module/util/damage/immunities";
import { getActor } from "./fixtures";
import { DamageEvent, DamageImplement } from "../../module/util/damage/DamageEvent";
import { CostBase } from "../../module/util/costs/costTypes";

declare class Die {
    results: any;
}

export function DamageProcessingTest(context: QuenchBatchContext) {
    const { describe, it, expect } = context;

    describe("Damage Roll evaluation", () => {
        it("Exact should modify roll in a way that the highest dice is kept", async () => {
            const roll = (await DamageRoll.parse("2d6", "Exakt 1").evaluate()).roll;

            expect(roll.terms[0]).to.be.instanceOf(Die);
            expect((roll.terms[0] as Die).results).to.have.length(3);

            const sortedResults = (roll.terms[0] as Die).results
                .filter((r: unknown) => r && r instanceof Object && "result" in r)
                .sort((a: { result: number }, b: { result: number }) => a.result - b.result);
            expect(sortedResults[0].active).to.be.false;
        });

        it("Scharf should modify roll in a way that the lowest dice are increased", async () => {
            //with that roll formula, we are almost guaranteed to roll a 1.
            const evaluatedDamage = await DamageRoll.parse("999d6kl1", "Scharf 6").evaluate();
            const roll = evaluatedDamage.roll;

            expect(roll.total).to.be.greaterThanOrEqual(3);
            expect(roll.terms[0]).to.be.instanceOf(Die);
            const activeTerm = (roll.terms[0] as Die).results.filter((r: any) => r?.active);
            expect(activeTerm).to.have.length(1);
            expect(activeTerm[0].result < 3).to.be.equal(
                evaluatedDamage.getActiveFeatures().some((f) => f.name === "Scharf" && f.active)
            );
        });

        it("Kritisch should modify roll in a way that the highest dice are increased", async () => {
            const roll = (await DamageRoll.parse("999d6", "Kritisch 1").evaluate()).roll;

            expect(roll.terms[0]).to.be.instanceOf(Die);
            expect(roll.total).not.to.equal(
                roll.terms
                    .filter((t) => t instanceof Die)
                    .flatMap((t) => t.results)
                    .reduce((former, latter) => (former += latter.result), 0)
            );
        });
    });

    describe("Damage Message initialization", () => {
        it("should account for multiple damage types", async () => {
            const firstImplement = {
                damageRoll: DamageRoll.parse("1d6", "Scharf 1"),
                damageSource: "Schwert",
                damageType: "physical" as const,
            };
            const secondImplement = {
                damageRoll: DamageRoll.parse("1d10", "Durchdringung 1"),
                damageSource: "Brennende Klinge",
                damageType: "fire" as const,
            };
            const chatMessage = await DamageInitializer.rollFromDamageRoll(
                [firstImplement, secondImplement],
                CostBase.create("V"),
                null
            );
            const damageMessage = chatMessage.system as DamageMessage;

            expect(damageMessage).to.be.instanceOf(DamageMessage);
            expect(damageMessage.getData().total).to.equal(damageMessage.damageEvent.totalDamage());
            expect(damageMessage.getData().actions.map((a) => a.data.localAction)).to.contain("applyDamageToTargets");
            expect(damageMessage.getData().formulaToDisplay).to.equal("1W6 + 1W10");

            expect(damageMessage.damageEvent.implements).to.have.length(2);
            expect(damageMessage.damageEvent.implements.map((i) => i.damageType)).to.contain.members([
                "physical",
                "fire",
            ]);
        });
    });

    describe("Immunities", () => {
        const implement = new DamageImplement({
            damage: 1,
            formula: "1d6",
            implementName: "Impl",
            damageType: "physical",
            damageExplanation: "",
            _baseReductionOverride: 0,
        });
        const implementIds: number[] = [];
        const eventIds: number[] = [];

        afterEach(() => {
            implementIds.forEach((id) => foundryApi.hooks.off(implementImmunityHook, id));
            eventIds.forEach((id) => foundryApi.hooks.off(eventImmunityHook, id));
        });
        it("should call the immunity handler for individual immunities", async () => {
            const target = getActor(it);
            const id = foundryApi.hooks.on(implementImmunityHook, (_, __, imms) => {
                imms.push({ name: "Test" });
            });
            implementIds.push(id);

            const immunity = evaluateImplementImmunities(implement, target);

            expect(immunity).to.deep.equal({ name: "Test" });
        });

        it("should return the first immunity", async () => {
            const target = getActor(it);
            const id1 = foundryApi.hooks.on(implementImmunityHook, (_, __, imms) => {
                imms.push({ name: "Test" });
            });
            const id2 = foundryApi.hooks.on(implementImmunityHook, (_, __, imms) => {
                imms.push({ name: "Test2" });
            });
            implementIds.push(id1, id2);

            const immunity = evaluateImplementImmunities(implement, target);

            expect(immunity).to.deep.equal({ name: "Test" });
        });

        it("should call the immunity handler for event immunities", () => {
            const target = getActor(it);
            const event = new DamageEvent({
                causer: null,
                _costBase: CostBase.create("K"),
                formulaToDisplay: "1W6",
                tooltip: "",
                isGrazingHit: false,
                implements: [implement],
            });
            const id = foundryApi.hooks.on(eventImmunityHook, (_, __, imms) => {
                imms.push({ name: "Test" });
            });
            eventIds.push(id);

            const immunity = evaluateEventImmunities(event, target);

            expect(immunity).to.deep.equal({ name: "Test" });
        });

        it("should return undefined for no handler", async () => {
            const target = getActor(it);
            const id = foundryApi.hooks.on(eventImmunityHook, (_, __, imms) => {
                imms.push({ name: "Test" });
            });
            eventIds.push(id);

            const immunity = evaluateImplementImmunities(implement, target);

            expect(immunity).to.be.undefined;
        });
    });
}

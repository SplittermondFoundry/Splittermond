import type SplittermondActor from "module/actor/actor";
import { foundryApi } from "module/api/foundryApi";

type PreparedActionType = keyof SplittermondActor["system"]["preparedAction"];

export class PreparedAction {
    constructor(
        private readonly actor: SplittermondActor,
        private readonly type: PreparedActionType
    ) {}

    get preparedId(): string | null {
        return this.actor.system.preparedAction[this.type];
    }

    isPrepared(id: string): boolean {
        return this.preparedId === id;
    }

    async set(id: string): Promise<void> {
        const ticks = await this.getTicks(id);
        if (ticks === null) {
            console.debug(`Splittermond | ${this.type} of id ${id} not found on actor`);
            return;
        }
        await this.actor.addTicks(ticks.value, ticks.label);
        await this.save(id);
    }

    async release(): Promise<void> {
        await this.save(null);
    }

    private async getTicks(id: string): Promise<{ value: number; label: string } | null> {
        if (this.type === "attack") {
            const attack = this.actor.attacks.find((candidate) => candidate.id === id);
            if (!attack) return null;
            return {
                value: await attack.weaponSpeedAsync(),
                label: `${foundryApi.localize("splittermond.attack")}: ${attack.name}`,
            };
        }
        const spell = this.actor.spells.find((candidate) => candidate.id === id);
        if (!spell) return null;
        return {
            value: await spell.castDuration.inTicks(),
            label: `${foundryApi.localize("splittermond.castDuration")}: ${spell.name}`,
        };
    }

    private async save(id: string | null): Promise<void> {
        await this.actor.update({ [`system.preparedAction.${this.type}`]: id });
    }
}

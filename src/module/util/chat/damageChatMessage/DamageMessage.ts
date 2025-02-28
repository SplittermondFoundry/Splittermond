import {DataModelSchemaType, fields, SplittermondDataModel} from "../../../data/SplittermondDataModel";
import {SplittermondChatMessage} from "../../../data/SplittermondChatCardModel";
import {DamageMessageData} from "./interfaces";
import {addToRegistry} from "../chatMessageRegistry";
import {DamageEvent} from "../../damage/DamageEvent";
import {foundryApi} from "../../../api/foundryApi";
import {DamageFeature, DamageFeatureSchema} from "../../damage/DamageFeature";
import {damageHandlers} from "./damageApplicationHandlers";

const constructorRegistryKey = "DamageMessage";

function DamageMessageSchema() {
    return {
        constructorKey: new fields.StringField({required: true, nullable: false, initial: constructorRegistryKey}),
        featuresToDisplay: new fields.ArrayField(
            new fields.SchemaField(DamageFeatureSchema(), {required: true, nullable: false}),
            {required: true, nullable: false}),
        damageEvent: new fields.EmbeddedDataField(DamageEvent, {required: true, nullable: false}),
    };
}

type DamageMessageType = DataModelSchemaType<typeof DamageMessageSchema>


export class DamageMessage extends SplittermondDataModel<DamageMessageType> implements SplittermondChatMessage {

    static defineSchema = DamageMessageSchema;

    static initialize(damageEvent: DamageEvent, featuresToDisplay: DamageFeature[] = []): DamageMessage {
        return new DamageMessage({
            damageEvent,
            featuresToDisplay,
            constructorKey: constructorRegistryKey,
        });
    }


    get template() {
        return "systems/splittermond/templates/chat/damage-roll.hbs";
    }

    getData(): DamageMessageData {
        const actions = [
            this.renderApplyDamageToTargetAction(),
            this.renderApplyDamageToUserTargetAction(),
            this.renderApplyDamageToSelfAction(),
        ].filter(action => action !== null);
        return {
            features: this.renderFeaturesToDisplay(),
            formula: this.damageEvent.formula,
            total: this.damageEvent.totalDamage(),
            source: this.getPrincipalDamageComponent().implementName,
            tooltip: this.damageEvent.tooltip,
            actions: actions,
        }
    }

    private getPrincipalDamageComponent() {
        return this.damageEvent.implements.sort((a, b) => b.damage - a.damage)[0];
    }

    private renderFeaturesToDisplay() {
        return this.featuresToDisplay
            .sort((a, b) => b.value - a.value)
            .slice(0, 4);
    }

    private renderApplyDamageToTargetAction() {
        return {
            classes: "splittermond-chat-action gm-only",
            data: {
                localAction: "applyDamageToTargets",
            },
            icon: "fa-heart-broken",
            name: foundryApi.localize("splittermond.chatCard.damageMessage.applyToTargets")
        }
    }

    private renderApplyDamageToUserTargetAction() {
        const causingActor = this.damageEvent.causer?.getAgent();
        if (!causingActor) {
            return null;
        }
        return {
            classes: "splittermond-chat-action gm-only",
            data: {
                localAction: "applyDamageToUserTargets",
            },
            icon: "fa-heart-broken",
            name: foundryApi.format("splittermond.chatCard.damageMessage.applyToUserTargets", {user: causingActor.name})
        }
    }

    private renderApplyDamageToSelfAction() {
        return {
            classes: "splittermond-chat-action ",
            data: {
                localAction: "applyDamageToSelf",
            },
            icon: "fa-heart-broken",
            name: foundryApi.localize("splittermond.chatCard.damageMessage.applyToSelf")
        }
    }

    handleGenericAction(data: { action: string }): Promise<void> {
        if (data.action === "applyDamageToTargets") {
            return damageHandlers.applyDamageToTargets(this.damageEvent).catch(reportError)
        } else if (data.action === "applyDamageToSelf") {
            return damageHandlers.applyDamageToSelf(this.damageEvent).catch(reportError);
        } else if (data.action === "applyDamageToUserTargets") {
            return damageHandlers.applyDamageToUserTargets(this.damageEvent).catch(reportError);
        }
        return Promise.reject();
    }
}

function reportError(e: Error) {
    console.error(e);
    foundryApi.reportError("Unknown error occurred");
}

addToRegistry(constructorRegistryKey, DamageMessage);


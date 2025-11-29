import { DataModelSchemaType, fieldExtensions, fields } from "module/data/SplittermondDataModel";
import { OnAncestorReference } from "module/data/references/OnAncestorReference";
import { AgentReference } from "module/data/references/AgentReference";
import { type AttackCheckReport, type UnvaluedAction, type ValuedAction } from "./interfaces";
import { foundryApi } from "module/api/foundryApi";
import { DamageActionHandler } from "./DamageActionHandler";
import { NoActionOptionsHandler } from "./NoActionOptionsHandler";
import {
    AttackRollMessageRenderedData,
    type AvailableActions,
    isAvailableAction,
} from "./AttackRollTemplateInterfaces";
import { NoOptionsActionHandler } from "./NoOptionsActionHandler";
import { RollResultRenderer } from "../RollResultRenderer";
import { DataModelConstructorInput } from "module/api/DataModel";
import { TEMPLATE_BASE_PATH } from "module/data/SplittermondApplication";
import { renderDegreesOfSuccess } from "module/util/chat/renderDegreesOfSuccess";
import { addSplinterpointBonus } from "module/check/addSplinterpoint";
import Attack from "module/actor/attack";
import { getRollResultClass } from "../ChatMessageUtils";
import { RollMessage } from "module/util/chat/rollMessages/RollMessage";
import type { ActionHandler } from "module/util/chat/rollMessages/ChatCardCommonInterfaces";

const constructorRegistryKey = "attackRollMessage";

function AttackRollMessageSchema() {
    return {
        checkReport: new fieldExtensions.TypedObjectField({
            required: true,
            nullable: false,
            validate: (x: AttackCheckReport) => x != null && typeof x === "object", //Apparently foundry only sends diffs :(
        }),
        actorReference: new fields.EmbeddedDataField(AgentReference, { required: true, nullable: false }),
        attack: new fields.EmbeddedDataField(Attack, {
            required: true,
            nullable: false,
        }),
        splinterPointUsed: new fields.BooleanField({ required: true, nullable: false }),
        openDegreesOfSuccess: new fields.NumberField({ required: true, nullable: false }),
        constructorKey: new fields.StringField({ required: true, trim: true, blank: false, nullable: false }),
        damageHandler: new fields.EmbeddedDataField(DamageActionHandler, { required: true, nullable: false }),
        noActionOptionsHandler: new fields.EmbeddedDataField(NoActionOptionsHandler, {
            required: true,
            nullable: false,
        }),
        noOptionsActionHandler: new fields.EmbeddedDataField(NoOptionsActionHandler, {
            required: true,
            nullable: false,
        }),
    };
}

type AttackRollMessageType = DataModelSchemaType<typeof AttackRollMessageSchema>;

export class AttackRollMessage extends RollMessage<
    AttackRollMessageType,
    ValuedAction | UnvaluedAction,
    AvailableActions
> {
    static defineSchema = AttackRollMessageSchema;

    static initialize(attack: Attack, checkReport: AttackCheckReport) {
        const reportReference = OnAncestorReference.for(AttackRollMessage)
            .identifiedBy("constructorKey", constructorRegistryKey)
            .references("checkReport");
        const attackReference = OnAncestorReference.for(AttackRollMessage)
            .identifiedBy("constructorKey", constructorRegistryKey)
            .references("attack") as OnAncestorReference<Attack>;

        const actorReference = AgentReference.initialize(attack.actor);
        return new AttackRollMessage({
            checkReport: checkReport,
            actorReference,
            attack,
            constructorKey: constructorRegistryKey,
            splinterPointUsed: false,
            damageHandler: DamageActionHandler.initialize(actorReference, attackReference, reportReference).toObject(),
            noActionOptionsHandler: NoActionOptionsHandler.initialize(attack).toObject(),
            noOptionsActionHandler: NoOptionsActionHandler.initialize(
                reportReference,
                attackReference,
                actorReference
            ).toObject(),
            openDegreesOfSuccess: Math.max(
                0,
                checkReport.degreeOfSuccess.fromRoll +
                    checkReport.degreeOfSuccess.modification -
                    checkReport.maneuvers.length
            ),
        });
    }

    constructor(data: DataModelConstructorInput<AttackRollMessageType>, ...args: any[]) {
        super(data, ...args);
        const handlers: ActionHandler<ValuedAction | UnvaluedAction, AvailableActions>[] = [];
        handlers.push(this.damageHandler);
        handlers.push(this.noActionOptionsHandler);
        handlers.push(this.noOptionsActionHandler);
        handlers.forEach((handler) => this.registerHandler(handler));
        //we handle splinterpoint usage in this class, because we house the check report.
        this.registerHandler({
            handlesActions: ["useSplinterpoint"],
            handlesDegreeOfSuccessOptions: [],
            renderActions: () =>
                this.checkReport.isFumble
                    ? []
                    : [
                          {
                              type: "useSplinterpoint",
                              disabled: this.splinterPointUsed,
                              isLocal: false,
                          },
                      ],
            renderDegreeOfSuccessOptions: () => [],
            useAction: () => (this.splinterPointUsed ? Promise.resolve() : this.useSplinterpoint()),
            useDegreeOfSuccessOption: () => ({ usedDegreesOfSuccess: 0, action() {} }),
        });
    }

    getData(): AttackRollMessageRenderedData {
        const renderedActions: AttackRollMessageRenderedData["actions"] = {};
        this.renderActions().forEach((action) => (renderedActions[action.type] = action));
        return {
            header: {
                img: this.attack.img,
                difficulty: `${this.checkReport.difficulty}`,
                hideDifficulty: this.checkReport.hideDifficulty,
                rollTypeMessage: foundryApi.localize(`splittermond.rollType.${this.checkReport.rollType}`),
                title: this.attack.name,
            },
            degreeOfSuccessDisplay: renderDegreesOfSuccess(this.checkReport, this.openDegreesOfSuccess),
            rollResult: new RollResultRenderer(null, this.checkReport).render(),
            rollResultClass: getRollResultClass(this.checkReport),
            degreeOfSuccessOptions: this.renderOptions()
                .filter((option) => option.cost <= this.openDegreesOfSuccess)
                .map((option) => option.render)
                .map((option) => ({
                    ...option,
                    id: `${option.action}-${option.multiplicity}-${new Date().getTime()}`,
                })),
            actions: renderedActions,
            maneuvers: this.checkReport.maneuvers,
        };
    }

    private async useSplinterpoint() {
        const splinterPointBonus = this.actorReference
            .getAgent()
            .spendSplinterpoint()
            .getBonus(this.checkReport.skill.id);
        const checkReport = this.checkReport;
        const newCheckReport = await addSplinterpointBonus(checkReport, splinterPointBonus);
        const readaptedCheckReport = this.attack.adaptForGrazingHit(newCheckReport);
        this.updateSource({ checkReport: readaptedCheckReport, splinterPointUsed: true });
    }

    get template() {
        return `${TEMPLATE_BASE_PATH}/chat/attack-chat-card.hbs`;
    }

    protected isAvailableAction = isAvailableAction;
}

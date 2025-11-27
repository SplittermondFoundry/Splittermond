import { DataModelSchemaType, fieldExtensions, fields, SplittermondDataModel } from "module/data/SplittermondDataModel";
import { CheckReport } from "module/check";
import { OnAncestorReference } from "module/data/references/OnAncestorReference";
import { AgentReference } from "module/data/references/AgentReference";
import { ActionHandler } from "./interfaces";
import { foundryApi } from "module/api/foundryApi";
import { DamageActionHandler } from "./DamageActionHandler";
import { NoActionOptionsHandler } from "./NoActionOptionsHandler";
import { AttackRollMessageRenderedData, isAvailableAction } from "./AttackRollTemplateInterfaces";
import { NoOptionsActionHandler } from "./NoOptionsActionHandler";
import { RollResultRenderer } from "../RollResultRenderer";
import { DataModelConstructorInput } from "module/api/DataModel";
import { ChatMessageModel } from "module/data/SplittermondChatMessage";
import { TEMPLATE_BASE_PATH } from "module/data/SplittermondApplication";
import { renderDegreesOfSuccess } from "module/util/chat/renderDegreesOfSuccess";
import { addSplinterpointBonus } from "module/check/addSplinterpoint";
import Attack from "module/actor/attack";

const constructorRegistryKey = "attackRollMessage";

function AttackRollMessageSchema() {
    return {
        checkReport: new fieldExtensions.TypedObjectField({
            required: true,
            nullable: false,
            validate: (x: CheckReport) => x != null && typeof x === "object" && "hideDifficulty" in x,
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

export class AttackRollMessage extends SplittermondDataModel<AttackRollMessageType> implements ChatMessageModel {
    static defineSchema = AttackRollMessageSchema;

    static initialize(attack: Attack, checkReport: CheckReport) {
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
            openDegreesOfSuccess:
                checkReport.degreeOfSuccess.fromRoll +
                checkReport.degreeOfSuccess.modification -
                checkReport.maneuvers.length,
        });
    }

    private readonly optionsHandlerMap = new Map<string, ActionHandler>();
    private readonly actionsHandlerMap = new Map<string, ActionHandler>();
    private readonly handlers: ActionHandler[] = [];

    constructor(data: DataModelConstructorInput<AttackRollMessageType>, ...args: any[]) {
        super(data, ...args);
        this.handlers.push(this.damageHandler);
        this.handlers.push(this.noActionOptionsHandler);
        this.handlers.push(this.noOptionsActionHandler);
        this.handlers.forEach((handler) => this.registerHandler(handler));
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

    private registerHandler(handler: ActionHandler) {
        handler.handlesDegreeOfSuccessOptions.forEach((value) => this.optionsHandlerMap.set(value, handler));
        handler.handlesActions.forEach((value) => this.actionsHandlerMap.set(value, handler));
    }

    getData(): AttackRollMessageRenderedData {
        const renderedActions: AttackRollMessageRenderedData["actions"] = {};
        Array.from(this.actionsHandlerMap.values())
            .flatMap((handler) => handler.renderActions())
            .forEach((action) => (renderedActions[action.type] = action));
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
            degreeOfSuccessOptions: this.handlers
                .flatMap((handler) => handler.renderDegreeOfSuccessOptions())
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

    async handleGenericAction(optionData: Record<string, unknown> & { action: string }) {
        const degreeOfSuccessOption = this.optionsHandlerMap.get(optionData.action);
        const action = this.actionsHandlerMap.get(optionData.action);
        if (!action && !degreeOfSuccessOption) {
            foundryApi.warnUser("splittermond.chatCard.spellMessage.noHandler", { action: optionData.action });
        } else if (!!action && !!degreeOfSuccessOption) {
            foundryApi.warnUser("splittermond.chatCard.spellMessage.tooManyHandlers", { action: optionData.action });
        } else if (action) {
            return this.handleActions(action, optionData);
        } else if (degreeOfSuccessOption) {
            const preparedOption = degreeOfSuccessOption.useDegreeOfSuccessOption(optionData);
            if (preparedOption.usedDegreesOfSuccess <= this.openDegreesOfSuccess) {
                try {
                    preparedOption.action();
                    this.updateSource({
                        openDegreesOfSuccess: this.openDegreesOfSuccess - preparedOption.usedDegreesOfSuccess,
                    });
                } catch (e) {
                    return Promise.reject(e);
                }
            }
        }
    }

    private async useSplinterpoint() {
        const splinterPointBonus = this.actorReference
            .getAgent()
            .spendSplinterpoint()
            .getBonus(this.checkReport.skill.id);
        const checkReport = this.checkReport;
        const newCheckReport = await addSplinterpointBonus(checkReport, splinterPointBonus);
        this.updateSource({ checkReport: newCheckReport, splinterPointUsed: true });
    }

    private async handleActions(action: ActionHandler, actionData: Record<string, unknown> & { action: string }) {
        const actionKeyword = actionData.action;
        if (isAvailableAction(actionKeyword)) {
            return action.useAction({ ...actionData, action: actionKeyword });
        } else {
            throw new Error("Somehow action is not a keyword that is in AvailableActions. This should never happen.");
        }
    }

    get template() {
        return `${TEMPLATE_BASE_PATH}/chat/attack-chat-card.hbs`;
    }
}

function getRollResultClass(checkReport: CheckReport): string {
    const resultClasses = [];
    if (checkReport.isCrit) {
        resultClasses.push("critical");
    }
    if (checkReport.isFumble) {
        resultClasses.push("fumble");
    }
    if (checkReport.succeeded) {
        resultClasses.push("success");
    }
    return resultClasses.join(" ");
}

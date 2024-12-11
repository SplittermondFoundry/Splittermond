import {
    DataModelConstructorInput,
    DataModelSchemaType,
    fields,
    SplittermondDataModel
} from "../../../data/SplittermondDataModel";
import {CheckReport} from "../../../actor/CheckReport";
import {SplittermondChatMessage} from "../../../data/SplittermondChatCardModel";
import {FocusCostHandler} from "./FocusCostHandler";
import SplittermondSpellItem from "../../../item/spell";
import {OnAncestorReference} from "../../../data/references/OnAncestorReference";
import {ItemReference} from "../../../data/references/ItemReference";
import {AgentReference} from "../../../data/references/AgentReference";
import {addToRegistry} from "../chatMessageRegistry";
import {
    ActionHandler,

} from "./interfaces";
import {foundryApi} from "../../../api/foundryApi";
import {TickCostActionHandler} from "./TickCostActionHandler";
import {DamageActionHandler} from "./DamageActionHandler";
import {evaluateCheck} from "../../dice";
import {NoActionOptionsHandler} from "./NoActionOptionsHandler";
import {isAvailableAction, SpellRollMessageRenderedData} from "./SpellRollTemplateInterfaces";
import {NoOptionsActionHandler} from "./NoOptionsActionHandler";
import {RollResultRenderer} from "../RollResultRenderer";

const constructorRegistryKey = "SpellRollMessage";

function SpellRollMessageSchema() {
    return {
        checkReport: new fields.ObjectField({required: true, nullable: false}),
        actorReference: new fields.EmbeddedDataField(AgentReference,{required:true, nullable:false}),
        spellReference: new fields.EmbeddedDataField(ItemReference<SplittermondSpellItem>, {
            required: true,
            nullable: false
        }),
        splinterPointUsed: new fields.BooleanField({required:true, nullable:false}),
        openDegreesOfSuccess: new fields.NumberField({required: true, nullable: false}),
        constructorKey: new fields.StringField({required: true, trim: true, blank: false, nullable: false}),
        focusCostHandler: new fields.EmbeddedDataField(FocusCostHandler, {required: true, nullable: false}),
        tickCostHandler: new fields.EmbeddedDataField(TickCostActionHandler, {required: true, nullable: false}),
        damageHandler:new fields.EmbeddedDataField(DamageActionHandler, {required:true, nullable:false}),
        noActionOptionsHandler: new fields.EmbeddedDataField(NoActionOptionsHandler, {required:true, nullable:false}),
        noOptionsActionHandler: new fields.EmbeddedDataField(NoOptionsActionHandler, {required:true, nullable:false}),
    };
}

type SpellRollMessageType = Omit<DataModelSchemaType<typeof SpellRollMessageSchema>, "checkReport"> & {
    checkReport: CheckReport
}

export class SpellRollMessage extends SplittermondDataModel<SpellRollMessageType> implements SplittermondChatMessage {

    static defineSchema = SpellRollMessageSchema;

    static initialize(spell: SplittermondSpellItem, checkReport: CheckReport) {
        const reportReference = OnAncestorReference
            .for(SpellRollMessage).identifiedBy("constructorKey", constructorRegistryKey)
            .references("checkReport");
        const spellReference = ItemReference.initialize(spell)
        const actorReference = AgentReference.initialize(spell.actor);
        return new SpellRollMessage({
            checkReport: checkReport,
            actorReference,
            spellReference: spellReference,
            constructorKey: constructorRegistryKey,
            splinterPointUsed:false,
            focusCostHandler: FocusCostHandler.initialize(actorReference, reportReference, spellReference).toObject(),
            tickCostHandler: TickCostActionHandler.initialize(actorReference, spellReference, 3).toObject(),
            damageHandler: DamageActionHandler.initialize(actorReference,spellReference,reportReference).toObject(),
            noActionOptionsHandler: NoActionOptionsHandler.initialize(spellReference).toObject(),
            noOptionsActionHandler: NoOptionsActionHandler.initialize(reportReference, spellReference, actorReference).toObject(),
            openDegreesOfSuccess: checkReport.degreeOfSuccess,
        });
    }

    private readonly optionsHandlerMap = new Map<string, ActionHandler>();
    private readonly actionsHandlerMap = new Map<string, ActionHandler>();
    private readonly handlers: ActionHandler[] = [];

    constructor(data: DataModelConstructorInput<SpellRollMessageType>, ...args: any[]) {
        super(data, ...args);
        this.handlers.push(this.focusCostHandler);
        this.handlers.push(this.tickCostHandler);
        this.handlers.push(this.damageHandler)
        this.handlers.push(this.noActionOptionsHandler);
        this.handlers.push(this.noOptionsActionHandler);
        this.handlers.forEach(handler => this.registerHandler(handler));
        //we handle splinterpoint usage in this class, because we house the check report.
        this.registerHandler({
            handlesActions: ["useSplinterpoint"],
            handlesDegreeOfSuccessOptions: [],
            renderActions: ()=> this.checkReport.isFumble? []:[
                    {
                       type: "useSplinterpoint",
                       disabled: this.splinterPointUsed,
                       isLocal:false,
                    }
                ],
            renderDegreeOfSuccessOptions:()=>[],
            useAction: ()=> this.splinterPointUsed ? Promise.resolve() : this.useSplinterpoint(),
            useDegreeOfSuccessOption:()=>({usedDegreesOfSuccess:0, action(){}})
        });
    }

    private registerHandler(handler: ActionHandler) {
        handler.handlesDegreeOfSuccessOptions.forEach(value => this.optionsHandlerMap.set(value, handler));
        handler.handlesActions.forEach(value => this.actionsHandlerMap.set(value, handler));
    }

    getData(): SpellRollMessageRenderedData {
        const renderedActions: SpellRollMessageRenderedData["actions"] = {}
        Array.from(this.actionsHandlerMap.values())
            .flatMap(handler => handler.renderActions())
            .forEach(action => renderedActions[action.type]= action);
        return {
            header: {
                difficulty: `${this.checkReport.difficulty}`,
                hideDifficulty: this.checkReport.hideDifficulty,
                rollTypeMessage: foundryApi.localize(`splittermond.rollType.${this.checkReport.rollType}`),
                title: this.spellReference.getItem().name,
            },
            degreeOfSuccessDisplay: {
                degreeOfSuccessMessage: this.checkReport.degreeOfSuccessMessage,
                openDegreesOfSuccess: this.openDegreesOfSuccess,
                totalDegreesOfSuccess: this.checkReport.degreeOfSuccess,
                usedDegreesOfSuccess: this.checkReport.degreeOfSuccess - this.openDegreesOfSuccess
            },
            rollResult: new RollResultRenderer(this.spellReference.getItem().description, this.checkReport).render(),
            rollResultClass: getRollResultClass(this.checkReport),
            degreeOfSuccessOptions: this.handlers
                .flatMap(handler => handler.renderDegreeOfSuccessOptions())
                .filter(option => option.cost <= this.openDegreesOfSuccess)
                .map(option => option.render)
                .map(option => ({...option, id: `${option.action}-${option.multiplicity}-${new Date().getTime()}`})),
            actions: renderedActions
        }
    }

    async handleGenericAction(optionData: Record<string,unknown> & { action: string }) {
        const degreeOfSuccessOption = this.optionsHandlerMap.get(optionData.action);
        const action = this.actionsHandlerMap.get(optionData.action);
        if(!action && !degreeOfSuccessOption ) {
            foundryApi.warnUser("splittermond.chatCard.spellMessage.noHandler", {action: optionData.action});
        } else if(!!action && !!degreeOfSuccessOption){
            foundryApi.warnUser("splittermond.chatCard.spellMessage.tooManyHandlers", {action: optionData.action});
        } else if (action) {
            return this.handleActions(action, optionData);
        } else if (degreeOfSuccessOption){
            const preparedOption = degreeOfSuccessOption.useDegreeOfSuccessOption(optionData);
            if(preparedOption.usedDegreesOfSuccess <= this.openDegreesOfSuccess){
                try {
                    preparedOption.action();
                    this.updateSource({openDegreesOfSuccess: this.openDegreesOfSuccess - preparedOption.usedDegreesOfSuccess});
                } catch (e){
                   return Promise.reject(e)
                }
            }
        }
    }

    private async useSplinterpoint(){
        const splinterPointBonus = this.actorReference.getAgent().spendSplinterpoint().getBonus(this.checkReport.skill.id);
        const checkReport = this.checkReport;
        checkReport.roll.total += splinterPointBonus;
        const updatedReport = await evaluateCheck(Promise.resolve(checkReport.roll), checkReport.skill.points, checkReport.difficulty, checkReport.rollType);
        const newCheckReport: CheckReport = {
            ...checkReport, ...updatedReport,
            roll: {...updatedReport.roll, tooltip: checkReport.roll.tooltip}
        };
        this.updateSource({checkReport: newCheckReport, splinterPointUsed:true});
    }

    private async handleActions(action: ActionHandler, actionData:Record<string, unknown> & {action:string}){
        const actionKeyword = actionData.action;
        if(isAvailableAction(actionKeyword)){
            return action.useAction({...actionData, action:actionKeyword})
        } else{
            throw new Error("Somehow action is not a keyword that is in AvailableActions. This should never happen.")
        }
    }

    get template() {
        return "systems/splittermond/templates/chat/spell-chat-card.hbs";
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
    return resultClasses.join(" ")
}

addToRegistry("SpellRollMessage", SpellRollMessage);
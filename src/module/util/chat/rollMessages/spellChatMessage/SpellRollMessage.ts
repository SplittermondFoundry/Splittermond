import { DataModelSchemaType, fields } from "module/data/SplittermondDataModel";
import { CheckReport } from "module/check";
import { FocusCostHandler } from "./FocusCostHandler";
import SplittermondSpellItem from "../../../../item/spell";
import { OnAncestorReference } from "module/data/references/OnAncestorReference";
import { ItemReference } from "module/data/references/ItemReference";
import { AgentReference } from "module/data/references/AgentReference";
import { ActionHandler, type UnvaluedAction, type ValuedAction } from "./interfaces";
import { foundryApi } from "module/api/foundryApi";
import { TickCostActionHandler } from "./TickCostActionHandler";
import { DamageActionHandler } from "./DamageActionHandler";
import { NoActionOptionsHandler } from "./NoActionOptionsHandler";
import { type AvailableActions, isAvailableAction, SpellRollMessageRenderedData } from "./SpellRollTemplateInterfaces";
import { NoOptionsActionHandler } from "./NoOptionsActionHandler";
import { RollResultRenderer } from "../RollResultRenderer";
import { DataModelConstructorInput } from "module/api/DataModel";
import { TEMPLATE_BASE_PATH } from "module/data/SplittermondApplication";
import { renderDegreesOfSuccess } from "module/util/chat/renderDegreesOfSuccess";
import { addSplinterpointBonus } from "module/check/addSplinterpoint";
import { getRollResultClass } from "../ChatMessageUtils";
import { RollMessage } from "module/util/chat/rollMessages/RollMessage";

const constructorRegistryKey = "SpellRollMessage";

function SpellRollMessageSchema() {
    return {
        checkReport: new fields.ObjectField({ required: true, nullable: false }),
        actorReference: new fields.EmbeddedDataField(AgentReference, { required: true, nullable: false }),
        spellReference: new fields.EmbeddedDataField(ItemReference<SplittermondSpellItem>, {
            required: true,
            nullable: false,
        }),
        splinterPointUsed: new fields.BooleanField({ required: true, nullable: false }),
        openDegreesOfSuccess: new fields.NumberField({ required: true, nullable: false }),
        constructorKey: new fields.StringField({ required: true, trim: true, blank: false, nullable: false }),
        focusCostHandler: new fields.EmbeddedDataField(FocusCostHandler, { required: true, nullable: false }),
        tickCostHandler: new fields.EmbeddedDataField(TickCostActionHandler, { required: true, nullable: false }),
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

type SpellRollMessageType = Omit<DataModelSchemaType<typeof SpellRollMessageSchema>, "checkReport"> & {
    checkReport: CheckReport;
};

export class SpellRollMessage extends RollMessage<
    SpellRollMessageType,
    ValuedAction | UnvaluedAction,
    AvailableActions
> {
    static defineSchema = SpellRollMessageSchema;

    static initialize(spell: SplittermondSpellItem, checkReport: CheckReport) {
        const reportReference = OnAncestorReference.for(SpellRollMessage)
            .identifiedBy("constructorKey", constructorRegistryKey)
            .references("checkReport");
        const spellReference = ItemReference.initialize(spell);
        const actorReference = AgentReference.initialize(spell.actor);
        return new SpellRollMessage({
            checkReport: checkReport,
            actorReference,
            spellReference: spellReference,
            constructorKey: constructorRegistryKey,
            splinterPointUsed: false,
            focusCostHandler: FocusCostHandler.initialize(actorReference, reportReference, spellReference).toObject(),
            tickCostHandler: TickCostActionHandler.initialize(actorReference, spellReference, 3).toObject(),
            damageHandler: DamageActionHandler.initialize(actorReference, spellReference, reportReference).toObject(),
            noActionOptionsHandler: NoActionOptionsHandler.initialize(spellReference).toObject(),
            noOptionsActionHandler: NoOptionsActionHandler.initialize(
                reportReference,
                spellReference,
                actorReference
            ).toObject(),
            openDegreesOfSuccess: Math.max(
                0,
                checkReport.degreeOfSuccess.fromRoll + checkReport.degreeOfSuccess.modification
            ),
        });
    }

    constructor(data: DataModelConstructorInput<SpellRollMessageType>, ...args: any[]) {
        super(data, ...args);
        const handlers: ActionHandler[] = [];
        handlers.push(this.focusCostHandler);
        handlers.push(this.tickCostHandler);
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

    getData(): SpellRollMessageRenderedData {
        const renderedActions: SpellRollMessageRenderedData["actions"] = {};
        this.renderActions().forEach((action) => (renderedActions[action.type] = action));
        return {
            header: {
                img: this.spellReference.getItem().img,
                difficulty: `${this.checkReport.difficulty}`,
                hideDifficulty: this.checkReport.hideDifficulty,
                rollTypeMessage: foundryApi.localize(`splittermond.rollType.${this.checkReport.rollType}`),
                title: this.spellReference.getItem().name,
            },
            degreeOfSuccessDisplay: renderDegreesOfSuccess(this.checkReport, this.openDegreesOfSuccess),
            rollResult: new RollResultRenderer(this.spellReference.getItem().description, this.checkReport).render(),
            rollResultClass: getRollResultClass(this.checkReport),
            degreeOfSuccessOptions: this.renderOptions()
                .filter((option) => option.cost <= this.openDegreesOfSuccess)
                .map((option) => option.render)
                .map((option) => ({
                    ...option,
                    id: `${option.action}-${option.multiplicity}-${new Date().getTime()}`,
                })),
            actions: renderedActions,
        };
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

    get template() {
        return `${TEMPLATE_BASE_PATH}/chat/spell-chat-card.hbs`;
    }

    protected isAvailableAction = isAvailableAction;
}

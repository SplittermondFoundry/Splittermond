import {DataModelSchemaType, fields, SplittermondDataModel} from "../../../../data/SplittermondDataModel";
import {ActionHandler, ActionInput, UnvaluedAction, ValuedAction} from "../interfaces";
import {OnAncestorReference} from "../../../../data/references/OnAncestorReference";
import {CheckReport} from "../../../../actor/CheckReport";
import {ItemReference} from "../../../../data/references/ItemReference";
import SplittermondSpellItem from "../../../../item/spell";
import {AgentReference} from "../../../../data/references/AgentReference";
import {referencesUtils} from "../../../../data/references/referencesUtils";
import {foundryApi} from "../../../../api/foundryApi";
import {configureUseAction} from "./defaultUseActionAlgorithm";


function NoOptionsActionHandlerSchema() {
    return {
        rollFumbleUsed: new fields.BooleanField({required: true, nullable: false, initial: false}),
        checkReportReference: new fields.EmbeddedDataField(OnAncestorReference<CheckReport>, {
            required: true,
            nullable: false
        }),
        spellReference: new fields.EmbeddedDataField(ItemReference<SplittermondSpellItem>, {
            required: true,
            nullable: false
        }),
        casterReference: new fields.EmbeddedDataField(AgentReference, {required: true, nullable: false}),
    };
}

type NoOptionsActionHandlerType = DataModelSchemaType<typeof NoOptionsActionHandlerSchema>;

export class NoOptionsActionHandler extends SplittermondDataModel<NoOptionsActionHandlerType> implements ActionHandler {
    static defineSchema = NoOptionsActionHandlerSchema;

    static initialize(checkReportReference: OnAncestorReference<CheckReport>, spellReference: ItemReference<SplittermondSpellItem>, casterReference: AgentReference): NoOptionsActionHandler {
        return new NoOptionsActionHandler({
            rollFumbleUsed: false,
            checkReportReference,
            spellReference,
            casterReference
        });
    }

    handlesActions = ["rollMagicFumble", "activeDefense"] as const;

    renderActions(): (ValuedAction | UnvaluedAction)[] {
        const actions: (ValuedAction | UnvaluedAction)[] = [];
        if (this.checkReportReference.get().isFumble) {
            actions.push(
                {
                    type: "rollMagicFumble",
                    disabled: this.rollFumbleUsed,
                    isLocal: false,
                })
        }
        if (this.activeDefenseAvailable())
            actions.push({
                type: "activeDefense",
                get value() {
                    return this.difficulty ?? "";
                },
                difficulty: this.spellReference.getItem().difficulty,
                disabled: false, //Local actions cannot have their state managed because they don't allow updates.
                isLocal: true
            });
        return actions;
    }

    //will fail if the difficulty is not a number, which should only happen if the difficulty is a target property
    //and for an active defense to be available, that must be the case, for the user needs to know how to defend.
    private activeDefenseAvailable() {
        return Number.isNaN(Number.parseFloat(this.spellReference.getItem().difficulty));
    }

    useAction(actionData: ActionInput): Promise<void> {
        if (actionData.action === "rollMagicFumble") {
            return this.rollFumble(actionData);
        } else if (actionData.action === "activeDefense") {
            return this.defendActively()
        } else {
            return Promise.resolve();
        }
    }

    rollFumble(actionData: ActionInput) {
        return configureUseAction()
            .withUsed(() => this.rollFumbleUsed)
            .withHandlesActions(["rollMagicFumble"])
            .withIsOptionEvaluator(() => this.checkReportReference.get().isFumble)
            .whenAllChecksPassed(() => {
                this.updateSource({rollFumbleUsed: true});
                const eg = -this.checkReportReference.get().degreeOfSuccess
                const costs = this.spellReference.getItem().costs
                const skill = this.checkReportReference.get().skill.id;
                this.casterReference.getAgent().rollMagicFumble(eg, costs, skill);
                return Promise.resolve();
            }).useAction(actionData)
    }

    defendActively() {
        try {
            const actorReference = referencesUtils.findBestUserActor();
            return actorReference.getAgent().activeDefenseDialog(this.spellReference.getItem().difficulty)
        } catch (e) {
            foundryApi.informUser("splittermond.pleaseSelectAToken")
        }
        return Promise.resolve();
    }


    renderDegreeOfSuccessOptions() {
        return [];
    }

    handlesDegreeOfSuccessOptions = [] as const;

    useDegreeOfSuccessOption() {
        return {
            usedDegreesOfSuccess: 0, action() {
            }
        }
    }
}
import { DataModelSchemaType, fields, SplittermondDataModel } from "module/data/SplittermondDataModel";
import { ActionHandler, ActionInput, UnvaluedAction, ValuedAction } from "./interfaces";
import { OnAncestorReference } from "module/data/references/OnAncestorReference";
import { CheckReport } from "module/check";
import { ItemReference } from "module/data/references/ItemReference";
import SplittermondSpellItem from "../../../item/spell";
import { AgentReference } from "module/data/references/AgentReference";
import { referencesUtils } from "module/data/references/referencesUtils";
import { foundryApi } from "module/api/foundryApi";
import { configureUseAction } from "./commonAlgorithms/defaultUseActionAlgorithm";

function NoOptionsActionHandlerSchema() {
    return {
        checkReportReference: new fields.EmbeddedDataField(OnAncestorReference<CheckReport>, {
            required: true,
            nullable: false,
        }),
        spellReference: new fields.EmbeddedDataField(ItemReference<SplittermondSpellItem>, {
            required: true,
            nullable: false,
        }),
        casterReference: new fields.EmbeddedDataField(AgentReference, { required: true, nullable: false }),
    };
}

type NoOptionsActionHandlerType = DataModelSchemaType<typeof NoOptionsActionHandlerSchema>;

export class NoOptionsActionHandler extends SplittermondDataModel<NoOptionsActionHandlerType> implements ActionHandler {
    static defineSchema = NoOptionsActionHandlerSchema;

    static initialize(
        checkReportReference: OnAncestorReference<CheckReport>,
        spellReference: ItemReference<SplittermondSpellItem>,
        casterReference: AgentReference
    ): NoOptionsActionHandler {
        return new NoOptionsActionHandler({
            checkReportReference,
            spellReference,
            casterReference,
        });
    }

    handlesActions = ["rollMagicFumble", "activeDefense"] as const;

    renderActions(): (ValuedAction | UnvaluedAction)[] {
        const actions: (ValuedAction | UnvaluedAction)[] = [];
        if (this.checkReportReference.get().isFumble) {
            actions.push({
                disabled: false, //Local actions cannot have their state managed because they don't allow updates.
                type: "rollMagicFumble",
                isLocal: false,
            });
        }
        if (this.activeDefenseAvailable())
            actions.push({
                type: "activeDefense",
                get value() {
                    return this.difficulty ?? "";
                },
                difficulty: this.spellReference.getItem().difficulty,
                disabled: false, //Local actions cannot have their state managed because they don't allow updates.
                isLocal: true,
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
            return this.defendActively();
        } else {
            return Promise.resolve();
        }
    }

    rollFumble(actionData: ActionInput) {
        const degreeOfSuccess = this.checkReportReference.get().degreeOfSuccess;
        return configureUseAction()
            .withUsed(() => false)
            .withHandlesActions(["rollMagicFumble"])
            .withIsOptionEvaluator(() => this.checkReportReference.get().isFumble)
            .whenAllChecksPassed(() => {
                const eg = -Math.abs(degreeOfSuccess.fromRoll + degreeOfSuccess.modification);
                const costs = this.spellReference.getItem().costs;
                const skill = this.checkReportReference.get().skill.id;
                this.casterReference.getAgent().rollMagicFumble(eg, costs, skill);
                return Promise.resolve();
            })
            .useAction(actionData);
    }

    defendActively() {
        try {
            const actorReference = referencesUtils.findBestUserActor();
            return actorReference.getAgent().activeDefenseDialog(this.spellReference.getItem().difficulty);
        } catch (e) {
            foundryApi.informUser("splittermond.pleaseSelectAToken");
        }
        return Promise.resolve();
    }

    renderDegreeOfSuccessOptions() {
        return [];
    }

    handlesDegreeOfSuccessOptions = [] as const;

    useDegreeOfSuccessOption() {
        return {
            usedDegreesOfSuccess: 0,
            action() {},
        };
    }
}

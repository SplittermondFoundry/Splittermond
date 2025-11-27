import { DataModelSchemaType, fields, SplittermondDataModel } from "module/data/SplittermondDataModel";
import { ActionHandler, ActionInput, UnvaluedAction, ValuedAction } from "./interfaces";
import { OnAncestorReference } from "module/data/references/OnAncestorReference";
import { CheckReport } from "module/check";
import { AgentReference } from "module/data/references/AgentReference";
import { referencesUtils } from "module/data/references/referencesUtils";
import { foundryApi } from "module/api/foundryApi";
import { configureUseAction } from "./commonAlgorithms/defaultUseActionAlgorithm";
import type Attack from "module/actor/attack";

function NoOptionsActionHandlerSchema() {
    return {
        checkReportReference: new fields.EmbeddedDataField(OnAncestorReference<CheckReport>, {
            required: true,
            nullable: false,
        }),
        attackReference: new fields.EmbeddedDataField(OnAncestorReference<Attack>, {
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
        attackReference: OnAncestorReference<Attack>,
        casterReference: AgentReference
    ): NoOptionsActionHandler {
        return new NoOptionsActionHandler({
            checkReportReference,
            attackReference,
            casterReference,
        });
    }

    handlesActions = ["rollFumble", "activeDefense"] as const;

    renderActions(): (ValuedAction | UnvaluedAction)[] {
        const actions: (ValuedAction | UnvaluedAction)[] = [];
        if (this.checkReportReference.get().isFumble) {
            actions.push({
                disabled: false, //Local actions cannot have their state managed because they don't allow updates.
                type: "rollFumble",
                isLocal: false,
            });
        }
        if (this.activeDefenseAvailable())
            actions.push({
                type: "activeDefense",
                get value() {
                    return this.difficulty ?? "";
                },
                difficulty: foundryApi.localize(this.getTranslatedDefenseType()),
                disabled: false, //Local actions cannot have their state managed because they don't allow updates.
                isLocal: true,
            });
        return actions;
    }
    private getTranslatedDefenseType() {
        switch (this.checkReportReference.get().defenseType) {
            case "defense":
            case "vtd":
                return "splittermond.derivedAttribute.defense.short";
            case "mindresist":
            case "gw":
                return "splittermond.derivedAttribute.mindresist.short";
            case "bodyresist":
            case "kw":
                return "splittermond.derivedAttribute.bodyresist.short";
            default:
                return "";
        }
    }

    private activeDefenseAvailable() {
        return this.checkReportReference.get().succeeded;
    }

    useAction(actionData: ActionInput): Promise<void> {
        if (actionData.action === "rollFumble") {
            return this.rollFumble(actionData);
        } else if (actionData.action === "activeDefense") {
            return this.defendActively();
        } else {
            return Promise.resolve();
        }
    }

    rollFumble(actionData: ActionInput) {
        return configureUseAction()
            .withUsed(() => false)
            .withHandlesActions(["rollFumble"])
            .withIsOptionEvaluator(() => this.checkReportReference.get().isFumble)
            .whenAllChecksPassed(() => {
                this.casterReference.getAgent().rollAttackFumble();
                return Promise.resolve();
            })
            .useAction(actionData);
    }

    defendActively() {
        try {
            const actorReference = referencesUtils.findBestUserActor();
            return actorReference
                .getAgent()
                .activeDefenseDialog(this.checkReportReference.get().defenseType ?? undefined);
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

import { TooltipFormula } from "../tooltip";
import { foundryApi } from "../../api/foundryApi";
import { CheckReport } from "../../actor/CheckReport";

export class RollResultRenderer {
    private actionDescription: string;
    private checkReport: CheckReport;

    constructor(actionDescription: string, checkReport: CheckReport) {
        this.actionDescription = actionDescription;
        this.checkReport = checkReport;
    }

    render(): {
        rollTotal: number;
        skillAndModifierTooltip: any;
        rollTooltip: string;
        actionDescription: string;
    } {
        return {
            rollTotal: this.checkReport.roll.total,
            skillAndModifierTooltip: renderSkillAndModifiers(this.checkReport),
            rollTooltip: this.checkReport.roll.tooltip,
            actionDescription: this.actionDescription,
        };
    }
}

function renderSkillAndModifiers(checkReport: CheckReport) {
    const tooltip = new TooltipFormula();
    tooltip.addParts(
        Object.entries(checkReport.skill.attributes).map((entry) => ({
            value: `${entry[1]}`,
            description: foundryApi.localize(`splittermond.attribute.${entry[0]}.short`),
        })),
        "+"
    );

    tooltip.addOperator("+");
    tooltip.addPart(checkReport.skill.points, foundryApi.localize("splittermond.skillPointsAbbrev"));
    checkReport.modifierElements.forEach((e) => {
        if (e.isMalus) {
            tooltip.addMalus(e.value, e.description);
        } else {
            tooltip.addBonus(e.value, e.description);
        }
    });
    return tooltip.getData();
}

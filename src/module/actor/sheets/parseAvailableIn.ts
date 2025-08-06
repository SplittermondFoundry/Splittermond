import {foundryApi} from "../../api/foundryApi";
import {FoundryDialog} from "../../api/Application";
import {SpellDataModel} from "../../item/dataModel/SpellDataModel";
import {MasteryDataModel} from "../../item/dataModel/MasteryDataModel";
import type {AllowedSkills, SkillGroup} from "./AllowedSkills";

const defaultLevel = 0;
type SkillOption = { skill: string, level: number|null };
type SelectedOption = Omit<SkillOption,"level"> & {level:number}
/**
 * Parses a normalized availableIn string into an array of { skill, level } objects.
 * @param availableIn e.g. "athletics 3, swords 1"
 * @param allowedSkills Array of valid skill ids
 */
export function parseAvailableIn(availableIn: string, allowedSkills: AllowedSkills): SkillOption[]{
    if (!availableIn){
        return []
    }
    return availableIn
        .split(",")
        .map(entry => {
        const parts = entry.trim().split(" ");
        const skill = parts[0];
        const protoLevel = parseInt(parts[1]);
        const level = isNaN(protoLevel) ? null: protoLevel;
        if (!allowedSkills.includes(skill)){
            return null
        }
        return { skill, level };
    }).filter(option => option !== null);
}

export function skillAlreadySet(item: SpellDataModel|MasteryDataModel, referenceSet: string[]){
   const skill = item.skill;
   return !!skill && referenceSet.includes(skill)
}

/**
 * We're not using DialogV2, because it is way harder to set up the one-click selection with buttons.
 * Prompts the user to select a skill/level from parsed options, or falls back to all allowed skills.
*/
export async function selectFromParsedSkills(parsed: Array<SkillOption>, dialogTitle:string): Promise<SelectedOption|null> {
    return new Promise((resolve) => {
        let buttons: Record<string, any> = {};
        parsed.forEach(({skill, level}) => {
            const skillLevelLabel = level == null ? "" : `${level}`;
            buttons[skill] = {
                label: `${foundryApi.localize(`splittermond.skillLabel.${skill}`)} ${skillLevelLabel}`,
                callback: () => resolve({skill, level: level ?? defaultLevel}),
            };
        });
        buttons["_cancel"] = {
            label: foundryApi.localize("splittermond.cancel"),
            callback: () => resolve(null)
        };
        //@ts-ignore
        let dialog = new Dialog({
            title: dialogTitle,
            content: "",
            buttons: buttons
        }, {
            classes: ["splittermond", "dialog", "selection"]
        });
        dialog.render(true);
    });
}
export async function selectFromAllSkills(skills: AllowedSkills, levels: number[], dialogTitle:string): Promise<SelectedOption|null> {
    const skillOptions=getSkillSelectOptions(skills);
    const levelOptions = levels.map((level) =>
        `<option value="${level}">${level}</option>`
    );
    return await FoundryDialog.prompt({
        window:{title: dialogTitle},
        content: `<select name="skillSelect">${skillOptions.join("")}</select>`+
            `<select name="levelSelect">${levelOptions.join("")}</select>`,
        ok: {
            label: foundryApi.localize("splittermond.ok"),
            callback: handleUserSelection
        }
    }) as Promise<SelectedOption|null>
}

function getSkillSelectOptions(skills: AllowedSkills): string[] {
    if( !skills.isGrouped) {
        return getGroupedSkillSelectOptions(skills.allowedSkills);
    }else{
        const skillGroups: string[] = [];
        const groupedSkills=skills.groupedSkills
        for(const grp in groupedSkills) {
            const group = grp as SkillGroup;
            if(groupedSkills[group]) {
                skillGroups.push(`<optgroup label="${localizeSkillGroup(group)}">`);
                skillGroups.push(...getGroupedSkillSelectOptions(groupedSkills[group] as string[]));
                skillGroups.push(`</optgroup>`);
            }
        }
        return skillGroups;
    }
}

function getGroupedSkillSelectOptions(skills: string[]): string[] {
    return skills.map((skill) =>
        `<option value="${skill}">${foundryApi.localize("splittermond.skillLabel." + skill)}</option>`
    );
}

function localizeSkillGroup(group: SkillGroup): string {
    switch(group) {
        case "general":
            return foundryApi.localize("splittermond.generalSkills");
        case "magic":
            return foundryApi.localize("splittermond.magicSkills");
        case "fighting":
            return foundryApi.localize("splittermond.fightingSkills");
        default:
            return group; // Fallback to the group name if not recognized
    }
}

function handleUserSelection(__:unknown, button: HTMLButtonElement): SelectedOption|null {
    const skillSelect= button.form?.elements.namedItem("skillSelect");
    const levelSelect= button.form?.elements.namedItem("levelSelect");
    if(skillSelect instanceof HTMLSelectElement && levelSelect instanceof HTMLSelectElement){
        const selectedSkillIndex = skillSelect.selectedIndex;
        const selectedLevelIndex = levelSelect.selectedIndex;
        const skill = skillSelect.options[selectedSkillIndex].value;
        const level = levelSelect.options[selectedLevelIndex].value;
        return { skill, level: parseInt(level ?? 0) };
    }
    return null;
}

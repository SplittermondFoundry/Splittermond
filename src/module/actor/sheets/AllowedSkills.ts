export type SkillGroup = "general"|"magic"|"fighting";
export type GroupedSkills = Partial<Record<SkillGroup, string[]>>;
export class AllowedSkills {
    private readonly _groupedSkills: GroupedSkills;
    private readonly _allowedSkills: string[];
    public readonly isGrouped: boolean;

    constructor(allowedSkills: GroupedSkills|string[]) {
        if (Array.isArray(allowedSkills)) {
                this._allowedSkills = allowedSkills;
                this._groupedSkills = {}
                this.isGrouped = false;
        }else{
            this._allowedSkills = Object.values(allowedSkills).flat().filter(skill => skill !== undefined);
            this._groupedSkills = allowedSkills;
            this.isGrouped = true;
        }
    }

    includes(skill: string|null|undefined): boolean {
        return !!skill && this._allowedSkills.includes(skill);
    }

    get groupedSkills(): GroupedSkills {
        return this._groupedSkills;
    }

    get allowedSkills(): string[] {
        return this._allowedSkills;
    }
}
import type { CharacterBiography } from "module/actor/dataModel/CharacterDataModel";

export interface BiographyTemplateData {
    characterDetails?: {
        name: `system.${keyof CharacterBiography}`;
        label: `splittermond.biographyDetails.${keyof CharacterBiography}`;
        value: string;
    }[];
}

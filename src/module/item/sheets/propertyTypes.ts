export interface InputItemProperty {
    field: string;
    value?: unknown;
    template?: string;
    placeholderText?: string;
    label?: string;
    help?: string;
    choices?: Record<string, string>;
    comparison?: InputItemProperty;
    inherited?: boolean;
}

export interface PropertyGroup {
    groupName?: string;
    layout?: "options";
    columnLabels?: { normal: string; comparison: string; help?: string };
    properties: InputItemProperty[];
}

export function propertyInputs(groups: PropertyGroup[]): InputItemProperty[] {
    return groups.flatMap((group) =>
        group.properties.flatMap((property) => (property.comparison ? [property, property.comparison] : [property]))
    );
}

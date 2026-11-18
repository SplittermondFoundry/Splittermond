export interface ModifierHelperField {
    key: string;
    label: string;
    hint: string;
    required: boolean;
    value: string;
    select: boolean;
    searchable: boolean;
    isFeature: boolean;
    valueAfter: boolean;
    suggestions: boolean;
    choiceLabel: string;
    wide: boolean;
    listId: string;
    choices: { value: string; label: string; selected: boolean }[];
    choiceGroups: { category: string; label: string; choices: ModifierHelperField["choices"] }[];
    ungroupedChoices: ModifierHelperField["choices"];
    noResults: string;
}

export interface ModifierHelperContext {
    search: string;
    selectedPath: string;
    multiple: boolean;
    hasResult: boolean;
    selectionErrorId: string;
    modifiers: { path: string; description: string; selected: boolean; category: string; search: string }[];
    categories: { value: string; parent: string; label: string }[];
    sortModes: { value: string; label: string; selected: boolean }[];
    pathSteps: {
        path: string;
        errorId: string;
        value: string;
        label: string;
        choices: { value: string; label: string; description: string; selected: boolean }[];
    }[];
    variantDescription: string;
    description: string;
    requiresValue: boolean;
    valueHidden: boolean;
    valueFirst: boolean;
    valueWithAttribute: boolean;
    valueErrorId: string;
    valueHintId: string;
    value: string;
    valueChoices: { value: string; label: string; selected: boolean }[];
    unsupportedValue: boolean;
    valuePlaceholder: string;
    valueLabel: string;
    canAddFeature: boolean;
    adjustment?: FeatureAdjustmentContext;
    featureRows: {
        id: number;
        field: ModifierHelperField;
        value: string;
        valueHidden: boolean;
        valueChoices: ModifierHelperContext["valueChoices"];
        unsupportedValue: boolean;
        valueLabel: string;
        adjustment?: FeatureAdjustmentContext;
        valueErrorId: string;
        valueHintId: string;
    }[];
    fields: ModifierHelperField[];
    preview: string;
}

export interface FeatureAdjustmentContext {
    id: string;
    rowId: string;
    hint: string;
    target: string;
    automatic: boolean;
    single: boolean;
    enabled: boolean;
    fields: ModifierHelperField[];
    sharpness: boolean;
    currentLevel: string;
    die: string;
    errorId: string;
}

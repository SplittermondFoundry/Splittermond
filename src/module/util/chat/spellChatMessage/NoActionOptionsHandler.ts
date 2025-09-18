import { DataModelSchemaType, fields, SplittermondDataModel } from "../../../data/SplittermondDataModel";
import {
    ActionHandler,
    DegreeOfSuccessAction,
    DegreeOfSuccessOptionInput,
    DegreeOfSuccessOptionSuggestion,
} from "./interfaces";
import { NumberDegreeOfSuccessOptionField } from "./optionFields/NumberDegreeOfSuccessOptionField";
import { ItemReference } from "../../../data/references/ItemReference";
import SplittermondSpellItem from "../../../item/spell";
import { splittermondSpellEnhancement } from "../../../config/SplittermondSpellEnhancements";
import { configureUseOption } from "./commonAlgorithms/defaultUseOptionAlgorithm";

function NoActionOptionsHandlerSchema() {
    return {
        effectArea: new fields.SchemaField(
            {
                isOption: new fields.BooleanField({ required: true, nullable: false }),
                options: new fields.EmbeddedDataField(NumberDegreeOfSuccessOptionField, {
                    required: true,
                    nullable: false,
                }),
            },
            { required: true, nullable: false }
        ),
        effectDuration: new fields.SchemaField(
            {
                isOption: new fields.BooleanField({ required: true, nullable: false }),
                options: new fields.EmbeddedDataField(NumberDegreeOfSuccessOptionField, {
                    required: true,
                    nullable: false,
                }),
            },
            { required: true, nullable: false }
        ),
        range: new fields.SchemaField(
            {
                isOption: new fields.BooleanField({ required: true, nullable: false }),
                options: new fields.EmbeddedDataField(NumberDegreeOfSuccessOptionField, {
                    required: true,
                    nullable: false,
                }),
            },
            { required: true, nullable: false }
        ),
    };
}

type NoActionOptionsHandlerType = DataModelSchemaType<typeof NoActionOptionsHandlerSchema>;

export class NoActionOptionsHandler extends SplittermondDataModel<NoActionOptionsHandlerType> implements ActionHandler {
    static defineSchema = NoActionOptionsHandlerSchema;

    static initialize(spellReference: ItemReference<SplittermondSpellItem>): NoActionOptionsHandler {
        return new NoActionOptionsHandler({
            effectArea: {
                isOption: !!spellReference.getItem().degreeOfSuccessOptions.effectArea,
                options: NumberDegreeOfSuccessOptionField.initialize(
                    splittermondSpellEnhancement.effectArea.degreesOfSuccess,
                    0, //We cannot do calculations on effect area, because the value is given as "5m" or similar
                    splittermondSpellEnhancement.effectArea.textTemplate
                ),
            },
            effectDuration: {
                isOption: !!spellReference.getItem().degreeOfSuccessOptions.effectDuration,
                options: NumberDegreeOfSuccessOptionField.initialize(
                    splittermondSpellEnhancement.effectDuration.degreesOfSuccess,
                    0, //We cannot do calculations on effect duration, because the value can be given a string (e.g."K")
                    splittermondSpellEnhancement.effectDuration.textTemplate
                ),
            },
            range: {
                isOption: !!spellReference.getItem().degreeOfSuccessOptions.range,
                options: NumberDegreeOfSuccessOptionField.initialize(
                    splittermondSpellEnhancement.range.degreesOfSuccess,
                    0, //We cannot do calculations on range, because the value can be given as "5m" or similar
                    splittermondSpellEnhancement.range.textTemplate
                ),
            },
        });
    }

    handlesActions = [] as const;

    renderActions(): never[] {
        return [];
    }

    useAction(): Promise<void> {
        return Promise.resolve();
    }

    handlesDegreeOfSuccessOptions = ["effectAreaUpdate", "effectDurationUpdate", "rangeUpdate"] as const;

    renderDegreeOfSuccessOptions(): DegreeOfSuccessOptionSuggestion[] {
        let options: DegreeOfSuccessOptionSuggestion[] = [];
        if (this.effectArea.isOption) {
            options.push(...this.renderOption(this.effectArea.options, "effectAreaUpdate"));
        }
        if (this.effectDuration.isOption) {
            options.push(...this.renderOption(this.effectDuration.options, "effectDurationUpdate"));
        }
        if (this.range.isOption) {
            options.push(...this.renderOption(this.range.options, "rangeUpdate"));
        }
        return options;
    }

    private renderOption(options: NumberDegreeOfSuccessOptionField, action: string): DegreeOfSuccessOptionSuggestion[] {
        return options
            .getMultiplicities()
            .map((m) => options.forMultiplicity(m))
            .map((m) => ({
                render: {
                    ...m.render(),
                    disabled: false,
                    action,
                },
                cost: m.isChecked() ? -1 * m.cost : m.cost,
            }));
    }

    useDegreeOfSuccessOption(degreeOfSuccessOptionData: DegreeOfSuccessOptionInput): DegreeOfSuccessAction {
        return configureUseOption()
            .withHandlesOptions(this.handlesDegreeOfSuccessOptions)
            .whenAllChecksPassed((degreeOfSuccessOptionData) => {
                const multiplicity = Number.parseInt(degreeOfSuccessOptionData.multiplicity);
                switch (degreeOfSuccessOptionData.action) {
                    case "effectAreaUpdate":
                        return this.useOption(this.effectArea.options, multiplicity);
                    case "effectDurationUpdate":
                        return this.useOption(this.effectDuration.options, multiplicity);
                    case "rangeUpdate":
                        return this.useOption(this.range.options, multiplicity);
                }
            })
            .useOption(degreeOfSuccessOptionData);
    }
    private useOption(options: NumberDegreeOfSuccessOptionField, multiplicity: number): DegreeOfSuccessAction {
        const option = options.forMultiplicity(multiplicity);
        return {
            usedDegreesOfSuccess: option.isChecked() ? -1 * option.cost : option.cost,
            action: () => {
                option.check();
                //no math needed, there is no action programmed for these options.
            },
        };
    }
}

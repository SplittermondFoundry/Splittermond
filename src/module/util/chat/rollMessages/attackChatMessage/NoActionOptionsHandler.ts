import { DataModelSchemaType, fields, SplittermondDataModel } from "module/data/SplittermondDataModel";
import {
    ActionHandler,
    DegreeOfSuccessAction,
    DegreeOfSuccessOptionInput,
    DegreeOfSuccessOptionSuggestion,
} from "./interfaces";
import { NumberDegreeOfSuccessOptionField } from "./optionFields/NumberDegreeOfSuccessOptionField";
import { splittermondSpellEnhancement } from "module/config/SplittermondSpellEnhancements";
import { configureUseOption } from "./commonAlgorithms/defaultUseOptionAlgorithm";
import type Attack from "module/actor/attack";
import { isMember } from "module/util/util";
import { splittermond } from "module/config";

function NoActionOptionsHandlerSchema() {
    return {
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

    static initialize(attack: Attack): NoActionOptionsHandler {
        return new NoActionOptionsHandler({
            range: {
                isOption: !!isMember(splittermond.skillGroups.ranged, attack.skill.id),
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

    handlesDegreeOfSuccessOptions = ["rangeUpdate"] as const;

    renderDegreeOfSuccessOptions(): DegreeOfSuccessOptionSuggestion[] {
        let options: DegreeOfSuccessOptionSuggestion[] = [];
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

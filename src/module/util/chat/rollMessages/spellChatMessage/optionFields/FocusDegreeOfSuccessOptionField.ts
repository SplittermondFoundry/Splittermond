import { DataModelSchemaType, fields, SplittermondDataModel } from "module/data/SplittermondDataModel";
import { CostModifier } from "../../../../costs/Cost";
import { foundryApi } from "module/api/foundryApi";

function FocusDegreeOfSuccessOptionFieldSchema() {
    return {
        isOption: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        /**the amount of degrees of success one has to spend to get the effect */
        cost: new fields.NumberField({ required: true, nullable: false }),
        effect: new fields.EmbeddedDataField(CostModifier, { required: true, blank: false, nullable: false }),
        textTemplate: new fields.StringField({ required: true, blank: false, nullable: false }),
        /**Poor man's map of multiplicities, because we need it to be serializable */
        multiplicities: new fields.ArrayField(
            new fields.SchemaField(
                {
                    multiplicity: new fields.NumberField({ required: true, nullable: false }),
                    checked: new fields.BooleanField({ required: true, nullable: false }),
                },
                { required: true, nullable: false }
            ),
            { required: true, nullable: false }
        ),
    };
}

type FocusDegreeOfSuccessOptionFieldType = DataModelSchemaType<typeof FocusDegreeOfSuccessOptionFieldSchema>;

export class FocusDegreeOfSuccessOptionField extends SplittermondDataModel<FocusDegreeOfSuccessOptionFieldType> {
    static defineSchema = FocusDegreeOfSuccessOptionFieldSchema;

    static initialize(
        isOption: boolean,
        cost: number,
        effect: CostModifier,
        text: string
    ): FocusDegreeOfSuccessOptionField {
        return new FocusDegreeOfSuccessOptionField({
            isOption,
            cost,
            effect: effect.toObject(),
            textTemplate: text,
            multiplicities: [
                { multiplicity: 1, checked: false },
                { multiplicity: 2, checked: false },
                { multiplicity: 4, checked: false },
                { multiplicity: 8, checked: false },
            ],
        });
    }

    forMultiplicity(multiplicity: number) {
        if (!this.getMultiplicities().includes(multiplicity)) {
            throw new Error(`${multiplicity} is not supported by this field`);
        }
        return {
            multiplicity: multiplicity,
            cost: this.getCost(multiplicity),
            effect: this.effect.multiply(multiplicity),
            check: () => this.check(multiplicity),
            isChecked: () => this.isChecked(multiplicity),
            render: () => this.renderMultiplicities([multiplicity])[0],
        };
    }

    check(multiplicity: number): void {
        const updatedMap = this.multiplicities.map((m) => ({
            ...m,
            checked: m.multiplicity === multiplicity ? !m.checked : m.checked,
        }));
        this.updateSource({ multiplicities: updatedMap });
    }

    isChecked(multiplicity: number): boolean {
        return this.multiplicities.find((m) => m.multiplicity === multiplicity)?.checked ?? false;
    }

    getCost(multiplicity: number): number {
        return this.cost * multiplicity;
    }

    getMultiplicities(): number[] {
        return this.multiplicities.map((m) => m.multiplicity);
    }

    renderMultiplicities(multiplicities: number[]) {
        return this.multiplicities
            .filter((m) => multiplicities.includes(m.multiplicity))
            .map((m) => {
                return {
                    cost: this.getCost(m.multiplicity),
                    checked: m.checked,
                    multiplicity: `${m.multiplicity}`,
                    text: this.createText(m.multiplicity),
                };
            });
    }

    private createText(multiplicity: number): string {
        return `${this.getCost(multiplicity)} EG – ${multiplicity > 1 ? `${multiplicity} ` : ""}${foundryApi.localize(this.textTemplate)}`;
    }
}

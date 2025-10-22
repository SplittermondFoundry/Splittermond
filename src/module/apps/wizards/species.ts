import SplittermondWizard from "./wizard";
import { foundryApi } from "../../api/foundryApi";
import { splittermond } from "../../config";
import { ApplicationContextOptions, ApplicationRenderContext } from "../../data/SplittermondApplication";
import SplittermondActor from "../../actor/actor";
import SplittermondItem from "../../item/item";
import { SpeciesDataModel } from "../../item/dataModel/SpeciesDataModel";
import { initMapper } from "../../util/LanguageMapper";
import { attributes, SplittermondAttribute } from "../../config/attributes";

const attributeMapper = initMapper(attributes)
    .withTranslator((t) => `splittermond.attribute.${t}.long`)
    .andOtherMappers((t) => `splittermond.attribute.${t}.short`)
    .build();

type AttributeModifier = {
    label: string;
    value: number;
    min: number;
    max: number;
    incDisabled?: boolean;
    decDisabled?: boolean;
};

type AttributeModifiers = Record<SplittermondAttribute, AttributeModifier>;
type SplittermondSpecies = SplittermondItem & { system: SpeciesDataModel };

export default class SplittermondSpeciesWizard extends SplittermondWizard {
    static DEFAULT_OPTIONS = {
        tag: "form",
        classes: ["splittermond", "wizard", "species"],
        window: {
            title: "Species Wizard",
        },
    };

    static PARTS = {
        form: {
            template: "systems/splittermond/templates/apps/wizards/species.hbs",
        },
    };

    actor: SplittermondActor;
    species: SplittermondSpecies;
    attributeModifiers: AttributeModifiers;

    constructor(actor: SplittermondActor, item: SplittermondSpecies) {
        super();
        this.actor = actor;
        this.species = item;

        this.attributeModifiers = {} as AttributeModifiers;
        splittermond.attributes.forEach((attr) => {
            this.attributeModifiers[attr] = {
                label: `splittermond.attribute.${attr}.long`,
                value: 0,
                min: 0,
                max: 1,
            };
        });

        (item.system.attributeMod ?? "").split(",").forEach((elem: string) => {
            const elemParts = elem.trim().split(" ");
            const attribute = attributeMapper().toCode(elemParts[0].toLowerCase());
            const value = parseInt(elemParts[1]);
            if (attribute) {
                this.attributeModifiers[attribute].value = value;
                this.attributeModifiers[attribute].min = value;
                this.attributeModifiers[attribute].max = this.attributeModifiers[attribute].value + 1;
            }
        });
    }

    async _prepareContext(options: ApplicationContextOptions) {
        const data = await super._prepareContext(options);
        data.species = this.species;
        data.attributeModifiers = this.attributeModifiers;

        let sum = 0;
        splittermond.attributes.forEach((attr) => {
            sum += this.attributeModifiers[attr].value;
        });

        splittermond.attributes.forEach((attr) => {
            //we know these are AttributeModifiers, we just set them above
            (data.attributeModifiers as AttributeModifiers)[attr].incDisabled =
                this.attributeModifiers[attr].value >= this.attributeModifiers[attr].max || sum >= 2;
            (data.attributeModifiers as AttributeModifiers)[attr].decDisabled =
                this.attributeModifiers[attr].value <= this.attributeModifiers[attr].min || sum <= 0;
        });

        data.ready = false;
        let template = "splittermond.wizard.distributeAttributemod";
        if (2 - sum > 1) {
            template = "splittermond.wizard.distributeAttributemodPlural";
        }

        if (sum === 2) {
            template = "splittermond.wizard.distributeAttributemodReady";
            data.ready = true;
        }

        data.message = foundryApi.format(template, { points: `${2 - sum}` });

        return data;
    }

    async _onRender(context: ApplicationRenderContext, options?: { parts?: string[] }): Promise<void> {
        await super._onRender(context, options);

        // Replace jQuery with direct DOM manipulation
        this.element.querySelectorAll('button[value="-1"], button[value="+1"]').forEach((btn) => {
            btn.addEventListener("click", (event: Event) => {
                const target = event.currentTarget as HTMLButtonElement;
                const value = parseInt(target.value);
                const attr = target.name;
                if (!this.isAttribute(attr)) {
                    console.warn(`Splittermond | Unknown attribute: ${attr}`);
                    return;
                }
                this.attributeModifiers[attr].value += value;
                this.render(true); //Phew! we're using a render to update a single value. Probably better to use a readonly input.
            });
        });
    }

    private isAttribute(attr: string | null | undefined): attr is SplittermondAttribute {
        return !!attr && (splittermond.attributes as readonly string[]).includes(attr);
    }

    protected _onSaveEvent() {
        const actorData: any = {
            attributes: {},
            species: {
                value: this.species.name,
                size: this.species.system.size,
            },
        };

        splittermond.attributes.forEach((attr) => {
            actorData.attributes[attr] = {
                species: this.attributeModifiers[attr].value,
            };
        });

        this.actor.update({ system: actorData });
    }

    protected _onCancelEvent(): void {
        // No additional logic needed for cancel in this wizard
    }
}

import {DialogV2ConstructorInput, DialogV2RenderOptions, FoundryDialog} from "../../../../api/Dialog";
import {UserReport} from "./UserReporterImpl";
import {Renderer} from "./Renderer";
import {foundryApi} from "../../../../api/foundryApi";
import {CostType, isCostType} from "../../../costs/costTypes";
import SplittermondActor from "../../../../actor/actor";

type UserAction = "cancel" | "apply" | "skip" | null;
export type UserAdjustments = ReturnType<DamageReportDialog["getUserAdjustments"]>;

export class DamageReportDialog extends FoundryDialog {
    private currentUserAdjustment: number = 0;
    private wasAdjusted: boolean = false;
    private baseChange: boolean = false;
    private selectedAction: UserAction = null;
    private splinterpointBonus = 0;
    private usedSplinterpointBonus = false;
    private previousValue: number;

    static async create(userReport: UserReport): Promise<DamageReportDialog> {
        const renderedContent = new Renderer(userReport);
        const dialog = new DamageReportDialog({
            classes: ["splittermond", "dialog", "dialog-apply-damage"],
            window: {
                title: foundryApi.format("splittermond.damageMessage.title", {
                    attacker: renderedContent.attackerName,
                    defender: renderedContent.defenderName
                })
            },
            form: {
                closeOnSubmit: true
            },
            content: await renderedContent.getHtml(),
            buttons: [{
                action: "cancel",
                label: foundryApi.localize("splittermond.damageMessage.skip"),
                default: true,
                callback: () => {
                    dialog.selectedAction = "skip";
                    return Promise.resolve();
                }
            }, {
                action: "apply",
                label: foundryApi.localize("splittermond.apply"),
                default: true,
                callback: () => {
                    dialog.selectedAction = "apply";
                    return Promise.resolve();
                }
            }],
        }, userReport.totalDamage.length, renderedContent.costType, userReport.target);
        return dialog;
    }


    constructor(options: DialogV2ConstructorInput, originalDamage: number, private currentCostType: CostType, private target: SplittermondActor) {
        super(options);
        this.previousValue = originalDamage;
    }

    getUserAdjustments() {
        return {
            damageAdjustment: this.currentUserAdjustment,
            wasAdjusted: this.wasAdjusted,
            costBase: this.currentCostType,
            costBaseChanged: this.baseChange,
            selectedAction: this.selectedAction,
            splinterpointBonus: this.splinterpointBonus,
            usedSplinterpointBonus: this.usedSplinterpointBonus
        }

    }

    async render(options: DialogV2RenderOptions) {
        const result = await super.render(options);
        result.element.querySelector("button.button-inline[data-action='inc-value']")?.addEventListener("click", (plusClickEvent) => {
            this.operateOnInput((value) => value + 1);
            plusClickEvent.stopPropagation();
        });
        result.element.querySelector("button.button-inline[data-action='dec-value']")?.addEventListener("click", (minusClickEvent) => {
            this.operateOnInput((value) => value - 1);
            minusClickEvent.stopPropagation();
        });
        result.element.querySelector("button.button-inline[data-action='half-value']")?.addEventListener("click", (halfClickEvent) => {
            this.operateOnInput((value) => Math.round(value * 0.5));
            halfClickEvent.stopPropagation();
        });
        result.element.querySelector("input[name='damage']")?.addEventListener("change", () => {
            const newValue = this.getInputValue();
            if (newValue !== null) {
                this.currentUserAdjustment = newValue - this.previousValue;
                this.previousValue = newValue;
            }
        });
        result.element.querySelector("button.dialog-buttons[data-action='useSplinterpoint']")?.addEventListener("click", () => {
            const button = result.element.querySelector("button.dialog-buttons[data-action='useSplinterpoint']") as HTMLButtonElement
            if (button) {
                button.disabled = true;
            }
            this.spendSplinterpoint();
            this.operateOnInput((value) => value - this.splinterpointBonus);
        });
        result.element.querySelector("select[name='costTypeSelect']")?.addEventListener("change", (event) => {
            if (event.target instanceof HTMLSelectElement) {
                const selectedValue = Array.from(event.target.selectedOptions).map(o => o.value)[0];
                this.handleSelectChange(selectedValue);
                event.stopPropagation();
            }
        });

        return result;
    }

    private handleSelectChange(newValue: string) {
        if (isCostType(newValue)) {
            this.currentCostType = newValue;
            this.baseChange = true;
        } else {
            console.warn(`Splittermond | Matched SELECT element had invalid selected option ${newValue}`);
        }
    }

    private operateOnInput(operate: (value: number) => number) {
        const currentValue = this.getInputValue();
        if (currentValue !== null) {
            this.setInputValue(operate(currentValue));
        }
    }

    private setInputValue(newValue: number) {
        const input = this.getInput();
        input.value = `${newValue}`
        const doc = input.ownerDocument.defaultView!;
        const event = new doc.Event("change", {bubbles: true, cancelable: true});
        input.dispatchEvent(event);

    }

    private getInputValue(): number | null {
        this.wasAdjusted = true;
        return parseInputValue(this.getInput().value);
    }

    private getInput() {
        const input = this.element.querySelector("input[name='damage']")
        if (!input) {
            throw new Error("Could not find input element in dialog, even though it should be there");
        }
        return input as HTMLInputElement
    }

    private spendSplinterpoint() {
        const splinterpointAction = this.target.spendSplinterpoint();
        if (splinterpointAction.pointSpent) {
            const splinterpointBonus = splinterpointAction.getBonus("health")
            this.currentUserAdjustment -= splinterpointBonus;
            this.usedSplinterpointBonus = true;
            this.splinterpointBonus = splinterpointBonus;
        }
    }
}

function parseInputValue(input: string | number | string[] | undefined): number | null {
    if (typeof input === "string") {
        return parseInt(input);
    } else if (typeof input === "number") {
        return input;
    } else if (Array.isArray(input)) {
        return parseInputValue(input[0]);
    } else {
        return null;
    }
}
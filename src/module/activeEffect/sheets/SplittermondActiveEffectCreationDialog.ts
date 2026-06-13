import { FoundryDialog } from "module/api/Application";
import { foundryApi } from "module/api/foundryApi";

type ActiveEffectCreationType = "base" | "modifier" | "costModifier";

interface CreateDialogOptions {
    parent?: FoundryDocument;
    pack?: string;
    [key: string]: unknown;
}

interface CreateDialogRenderOptions {
    renderContext?: string;
    renderData?: object;
    [key: string]: unknown;
}

const TYPE_OPTIONS: { value: ActiveEffectCreationType; label: string }[] = [
    { value: "base", label: "splittermond.activeEffect.type.base" },
    { value: "modifier", label: "splittermond.activeEffect.type.modifier" },
    { value: "costModifier", label: "splittermond.activeEffect.type.costModifier" },
];

export class SplittermondActiveEffectCreationDialog {
    static async show(
        cls: {
            create: (data: object, options: object) => Promise<FoundryDocument>;
            defaultName?: (data: object) => string;
        },
        data: Record<string, unknown> = {},
        createOptions: CreateDialogOptions = {},
        dialogOptions: Record<string, unknown> = {},
        renderOptions: CreateDialogRenderOptions = {}
    ): Promise<unknown> {
        const type = this.#normalizeType(data.type);
        const parent = createOptions.parent;
        const pack = createOptions.pack;
        const defaultName = cls.defaultName?.({ type, parent, pack }) ?? "";
        const title = foundryApi.localize("splittermond.activeEffect.creation.title");
        const nameLabel = foundryApi.localize("splittermond.name");
        const typeLabel = foundryApi.localize("splittermond.activeEffect.creation.type");
        const options = TYPE_OPTIONS.map(
            ({ value, label }) =>
                `<option value="${value}"${value === type ? " selected" : ""}>${foundryApi.localize(label)}</option>`
        ).join("");

        const content = `<form class="standard-form">
            <div class="form-group">
                <label>${nameLabel}</label>
                <input name="name" type="text" value="${this.#escapeHtml((data.name as string) ?? "")}" placeholder="${this.#escapeHtml(defaultName)}" autofocus />
            </div>
            <div class="form-group">
                <label>${typeLabel}</label>
                <select name="type">${options}</select>
            </div>
        </form>`;

        return FoundryDialog.prompt({
            ...dialogOptions,
            content,
            rejectClose: true,
            window: {
                title,
                ...(dialogOptions.window as object),
            },
            ok: {
                label: foundryApi.localize("splittermond.ok"),
                callback: async (_event: Event, button: HTMLButtonElement) => {
                    const form = button.form;
                    if (!form) return null;
                    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
                    const selectedType = this.#normalizeType(
                        (form.elements.namedItem("type") as HTMLSelectElement).value
                    );
                    const createData: Record<string, unknown> = {
                        ...data,
                        name: name || defaultName,
                        origin: parent?.uuid ?? data.origin ?? "",
                    };
                    createData.type = selectedType;

                    const doc = await cls.create(createData, { renderSheet: false, ...createOptions });
                    const finalRenderOptions = {
                        renderContext: renderOptions.renderContext ?? "createActiveEffect",
                        renderData: renderOptions.renderData ?? createData,
                        ...renderOptions,
                    };
                    (doc as any).sheet?.render(true, finalRenderOptions);
                    return doc;
                },
            },
        });
    }

    static #normalizeType(value: unknown): ActiveEffectCreationType {
        if (value === "modifier" || value === "costModifier" || value === "base") return value;
        return "base";
    }

    static #escapeHtml(value: string): string {
        return value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }
}

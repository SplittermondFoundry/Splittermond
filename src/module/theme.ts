import { settings } from "./settings";

export function initTheme() {
    settings
        .registerString("theme", {
            position: 2,
            scope: "client",
            config: true,
            choices: {
                // If choices are defined, the resulting setting will be a select menu
                default: "splittermond.settings.theme.options.default",
                dark: "splittermond.settings.theme.options.dark",
                "splittermond-blue": "splittermond.settings.theme.options.splittermond_blue",
            },
            default: "default",
            onChange: (theme: string) => {
                document.body.setAttribute("data-theme", theme);
            },
        })
        .then((accessor) => {
            document.body.setAttribute("data-theme", accessor.get());
        })
        .catch((e) => console.error("Splittermond | Failed to register theme", e));
}

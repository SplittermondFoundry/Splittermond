export function toRollFormula(displayFormula: string) {
    return displayFormula.replace(/(?<=[0-9]+)[wWD](?=[0-9]+)/g, "d");
}

export function toDisplayFormula(rollFormula: string) {
    return rollFormula
        .replace(/(?<=[0-9]+)d(?=[0-9]+)/g, "W")
        .replace(/(?<=[0-9])\s*?[+]\s*?(?=[0-9])/g, " + ")
        .replace(/(?<=[0-9])\s*?-\s*?(?=[0-9])/g, " - ");
}

import type { ErrorMessage } from "module/modifiers/parsing/index";
import { foundryApi } from "module/api/foundryApi";

export interface IErrorConsumer {
    push(...errors: ErrorMessage[]): number;
    pushKey(messageKey: string, templateArgs: Record<string, string>): void;
    printAll(): void;
}

export class ParseErrors implements IErrorConsumer {
    private readonly errors: ErrorMessage[] = [];
    constructor(
        private readonly modifierString: string,
        private readonly itemName: string
    ) {}

    get consumer() {
        return (...errors: string[]) => this.errors.push(...errors);
    }
    push(...errors: ErrorMessage[]): number {
        return this.errors.push(...errors);
    }

    pushKey(messageKey: string, templateArgs: Record<string, string>): void {
        this.errors.push(foundryApi.format(messageKey, templateArgs));
    }

    printAll(): void {
        if (this.errors.length > 0) {
            const introMessage = foundryApi.format("splittermond.modifiers.parseMessages.allErrorMessage", {
                str: this.modifierString,
                objectName: this.itemName,
            });
            foundryApi.reportError(`${introMessage}\n${this.errors.join("\n")}`);
        }
    }
}

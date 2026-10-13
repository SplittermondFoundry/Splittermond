import type { ErrorMessage } from "module/modifiers/parsing/index";
import { foundryApi } from "module/api/foundryApi";

export interface ModifierDiagnostic {
    attribute?: string;
    message: string;
}

export type ModifierErrorLogger = ((...messages: string[]) => void) & {
    forAttribute?: (attribute: string, ...messages: string[]) => void;
};

export interface IErrorConsumer {
    push(...errors: ErrorMessage[]): number;
    pushKey(messageKey: string, templateArgs: Record<string, string>): void;
    printAll(): void;
}

export class ParseErrors implements IErrorConsumer {
    private readonly errors: ModifierDiagnostic[] = [];
    constructor(
        private readonly modifierString: string,
        private readonly itemName: string
    ) {}

    get hasErrors(): boolean {
        return this.errors.length > 0;
    }

    get diagnostics(): readonly ModifierDiagnostic[] {
        return this.errors;
    }

    get consumer() {
        return Object.assign((...errors: string[]) => this.push(...errors), {
            forAttribute: (attribute: string, ...messages: string[]) => this.pushAttribute(attribute, ...messages),
        });
    }
    push(...errors: ErrorMessage[]): number {
        return this.errors.push(...errors.map((message) => ({ message })));
    }

    pushKey(messageKey: string, templateArgs: Record<string, string>): void {
        this.push(foundryApi.format(messageKey, templateArgs));
    }

    withAttribute(attribute: string): IErrorConsumer {
        return {
            push: (...messages) => this.pushAttribute(attribute, ...messages),
            pushKey: (key, args) => this.pushAttribute(attribute, foundryApi.format(key, args)),
            printAll: () => this.printAll(),
        };
    }

    private pushAttribute(attribute: string, ...messages: string[]): number {
        return this.errors.push(...messages.map((message) => ({ attribute, message })));
    }

    printAll(): void {
        if (this.errors.length > 0) {
            const introMessage = foundryApi.format("splittermond.modifiers.parseMessages.allErrorMessage", {
                str: this.modifierString,
                objectName: this.itemName,
            });
            foundryApi.reportError(`${introMessage}\n${this.errors.map(({ message }) => message).join("\n")}`);
        }
    }
}

import type { ErrorMessage } from "module/modifiers/parsing/index";
import { foundryApi } from "module/api/foundryApi";

export type ModifierDiagnostic =
    { scope: "modifier"; message: string } | { scope: "attribute"; attribute: string; message: string };

export interface ModifierErrorLogger {
    global(...messages: string[]): void;
    forAttribute(attribute: string, ...messages: string[]): void;
}

export interface IErrorConsumer {
    push(...errors: ErrorMessage[]): number;
    pushKey(messageKey: string, templateArgs: Record<string, string>): void;
    printAll(): void;
}

export class ParseErrors implements IErrorConsumer {
    private readonly collectedDiagnostics: ModifierDiagnostic[] = [];
    constructor(
        private readonly modifierString: string,
        private readonly itemName: string
    ) {}

    get hasErrors(): boolean {
        return this.collectedDiagnostics.length > 0;
    }

    get diagnostics(): readonly ModifierDiagnostic[] {
        return this.collectedDiagnostics;
    }

    get consumer(): ModifierErrorLogger {
        return {
            global: (...messages: string[]) => this.push(...messages),
            forAttribute: (attribute: string, ...messages: string[]) => this.pushAttribute(attribute, ...messages),
        };
    }
    push(...errors: ErrorMessage[]): number {
        return this.collectedDiagnostics.push(...errors.map((message) => ({ scope: "modifier" as const, message })));
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
        return this.collectedDiagnostics.push(
            ...messages.map((message) => ({ scope: "attribute" as const, attribute, message }))
        );
    }

    printAll(): void {
        if (this.hasErrors) {
            const introMessage = foundryApi.format("splittermond.modifiers.parseMessages.allErrorMessage", {
                str: this.modifierString,
                objectName: this.itemName,
            });
            const messages = this.collectedDiagnostics.map((diagnostic) =>
                diagnostic.scope === "attribute"
                    ? foundryApi.format("splittermond.modifiers.parseMessages.attributeErrorMessage", {
                          attribute: diagnostic.attribute,
                          message: diagnostic.message,
                      })
                    : diagnostic.message
            );
            foundryApi.reportError(`${introMessage}\n${messages.join("\n")}`);
        }
    }
}

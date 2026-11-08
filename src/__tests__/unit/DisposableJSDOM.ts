import { JSDOM } from "jsdom";

export class DisposableJSDOM extends JSDOM {
    [Symbol.dispose](): void {
        this.window.close();
    }
}

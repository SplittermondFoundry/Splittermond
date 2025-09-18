import { hideElementIn, showElementIn } from "../../util/animatedDisplay";

export class ElementToggler {
    constructor(private readonly element: HTMLElement | null) {}

    show() {
        if (!this.element) return;
        showElementIn(this.element);
    }

    hide() {
        if (!this.element) return;
        hideElementIn(this.element);
    }
}

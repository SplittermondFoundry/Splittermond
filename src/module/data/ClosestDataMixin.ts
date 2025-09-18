import { FoundryApplication } from "../api/Application";

type Constructor<T = {}> = new (...args: any[]) => T;

export function ClosestDataMixin<TBase extends Constructor<InstanceType<typeof FoundryApplication>>>(base: TBase) {
    return class ClosestDataMixin extends base {
        closestData(dataAttribute: string): string | null {
            return closestData(this.element, dataAttribute);
        }
    };
}

export function closestData(element: Element, dataAttribute: string): string | null {
    const targetElement = element.closest(`[data-${dataAttribute}]`);
    if (targetElement && hasDataset(targetElement)) {
        return targetElement.attributes.getNamedItem(`data-${dataAttribute}`)!.value;
    } else {
        console.debug("Splittermond | No closest element with data attribute found");
        return null;
    }
}

function hasDataset(e: Element): e is Element & { dataset: Record<string, string | undefined> } {
    return "dataset" in e && typeof e.dataset === "object";
}

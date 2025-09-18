import { IllegalStateException } from "./exceptions";

type Constructor<T = {}> = new (...args: any[]) => T;

export function DocumentAccessMixin<TBase extends Constructor, TAncestorDocument extends Constructor>(
    base: TBase,
    DocumentClass: TAncestorDocument
) {
    return class AncestorDocumentAccessor extends base {
        private _document: InstanceType<TAncestorDocument> | null = null;
        private triedToFindDocument = false;

        get document(): InstanceType<TAncestorDocument> {
            const doc = this._document ?? this.findDocument();
            if (doc === null) {
                throw new IllegalStateException(`Could not find ancestor document of type ${DocumentClass.name}`);
            }
            return doc;
        }

        findDocument(): InstanceType<TAncestorDocument> | null {
            const traversed: unknown[] = [];
            if (!this.triedToFindDocument && "parent" in this) {
                let currentParent: unknown = this.parent;
                while (currentParent !== null && typeof currentParent === "object") {
                    traversed.push(currentParent);
                    if (currentParent instanceof DocumentClass) {
                        this._document = currentParent as InstanceType<TAncestorDocument>;
                        break;
                    }
                    if (!("parent" in currentParent)) {
                        break;
                    }
                    currentParent = currentParent.parent;
                    if (traversed.includes(currentParent)) {
                        console.warn(
                            "Splittermond | DocumentAccessMixin: Detected cyclic parent reference. Stopping search for ancestor document."
                        );
                        break;
                    }
                }
            }
            this.triedToFindDocument = true;
            return this._document;
        }
    };
}

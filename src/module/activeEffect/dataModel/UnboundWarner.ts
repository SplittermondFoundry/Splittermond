import {foundryApi} from "module/api/foundryApi";
import type {ModifierAttributes} from "module/modifiers";

type Constructor = new (...args: any[]) => object;

export function UnboundWarner<TBase extends Constructor>(base: TBase) {
    abstract class UnboundWarner extends base {
        private _unboundWarningIssued = false;

        abstract readonly path: string;
        abstract readonly attributes: ModifierAttributes;

        protected issueUnboundWarning() {
            if (!this._unboundWarningIssued) {
                this._unboundWarningIssued = true;
                const isOwnerOrGm = (this as any).parent?.isOwner || foundryApi.currentUser?.isGM;
                if (isOwnerOrGm) {
                    foundryApi.warnUser("splittermond.modifiers.parseMessages.unboundReference", {
                        modifierName: this.attributes?.name ?? this.path,
                        propertyPath: this.path,
                    });
                }
            }
        }

        protected produceIssueWarning() {
            return ()=>this.issueUnboundWarning();
        }
    }
    return UnboundWarner;
}

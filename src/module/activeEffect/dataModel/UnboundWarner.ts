import { foundryApi } from "module/api/foundryApi";

type Constructor = new (...args: any[]) => object;

export function UnboundWarner<TBase extends Constructor>(base: TBase) {
    abstract class UnboundWarner extends base {
        private _unboundWarningIssued = false;

        protected abstract unboundWarningContext(): { modifierName: string; propertyPath: string };

        protected produceIssueWarning() {
            return () => this.issueUnboundWarning();
        }

        private issueUnboundWarning() {
            if (!this._unboundWarningIssued) {
                this._unboundWarningIssued = true;
                const isOwnerOrGm = (this as any).parent?.isOwner || foundryApi.currentUser?.isGM;
                if (isOwnerOrGm) {
                    foundryApi.warnUser(
                        "splittermond.modifiers.parseMessages.unboundReference",
                        this.unboundWarningContext()
                    );
                }
            }
        }
    }
    return UnboundWarner;
}

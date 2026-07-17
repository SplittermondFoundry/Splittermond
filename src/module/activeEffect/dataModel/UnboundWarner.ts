import { foundryApi } from "module/api/foundryApi";

// any[] required: TS2545 forces mixin base constructors to use any[].
type Constructor = new (...args: any[]) => { parent?: FoundryDocument | null };

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
                const isOwnerOrGm = this.parent?.isOwner || foundryApi.currentUser?.isGM;
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

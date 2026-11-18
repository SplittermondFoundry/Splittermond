import { fields } from "module/data/SplittermondDataModel";

/** A text override whose absence remains distinct from an explicitly empty string. */
export const NullableStringField: new () => InstanceType<typeof fields.StringField<true, true>> =
    class extends fields.StringField<true, true> {
        constructor() {
            super({ required: true, nullable: true, blank: true, initial: null });
        }

        // Foundry's StringField supplies an empty initial value when blank is allowed,
        // even with initial: null. Keep the default consistent with inheritance.
        getInitialValue(): null {
            return null;
        }
    };

import { type DataModelSchemaType, fields, SplittermondDataModel } from "module/data/SplittermondDataModel";
import { AgentReference } from "module/data/references/AgentReference";
import type Attack from "module/actor/attack";

function AttackReferenceSchema() {
    return {
        actor: new fields.EmbeddedDataField(AgentReference, { required: true, nullable: false }),
        attack: new fields.StringField({ required: true, nullable: false }),
    };
}

type AttackReferenceType = DataModelSchemaType<typeof AttackReferenceSchema>;

export class AttackReference extends SplittermondDataModel<AttackReferenceType> {
    static defineSchema = AttackReferenceSchema;

    get(): Attack {
        const found = this.actor.getAgent().attacks.find((a) => a.id === this.attack);
        if (!found) {
            throw new Error("No attack found for given ID");
        }
        return found;
    }
}

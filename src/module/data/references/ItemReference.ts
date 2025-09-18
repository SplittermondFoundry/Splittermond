import { AgentReference } from "./AgentReference";
import { DataModelSchemaType, fields, SplittermondDataModel } from "../SplittermondDataModel";
import SplittermondItem from "../../item/item.js";
import { IllegalStateException } from "../exceptions";
import { itemRetriever } from "../EntityRetriever";

function ItemReferenceSchema() {
    return {
        id: new fields.StringField({ required: true, blank: false, nullable: false }),
        actorReference: new fields.EmbeddedDataField(AgentReference, {
            required: true,
            blank: false,
            nullable: true,
        }),
    };
}
type ItemReferenceType = DataModelSchemaType<typeof ItemReferenceSchema>;

export class ItemReference<T extends SplittermondItem> extends SplittermondDataModel<ItemReferenceType> {
    static defineSchema() {
        return ItemReferenceSchema();
    }

    static initialize<T extends SplittermondItem>(item: T): ItemReference<T> {
        if (item.actor) {
            return new ItemReference({ id: item.id, actorReference: AgentReference.initialize(item.actor) });
        } else {
            return new ItemReference({ id: item.id, actorReference: null });
        }
    }

    getItem(): T {
        const item = this.actorReference ? this.#getFromActor(this.actorReference) : this.#getFromCollection();
        if (!item) {
            throw new Error("ItemReference could not resolve the item");
        }
        return item;
    }

    #getFromActor(ref: AgentReference): T {
        const actor = ref.getAgent();
        const item = actor.items.get(this.id);
        if (!item) {
            throw new IllegalStateException("Did not find item for whoms presence we checked");
        }
        //We can only make this assumption because we only allow instancce construction through the type guarded factory method;
        return item as T;
    }

    #getFromCollection(): T | undefined {
        return itemRetriever.get(this.id) as T | undefined;
    }
}

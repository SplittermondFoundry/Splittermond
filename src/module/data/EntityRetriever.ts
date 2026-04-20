import { foundryApi } from "../api/foundryApi";
import type SplittermondActor from "../actor/actor";
import SplittermondItem from "../item/item";

export const itemRetriever = {
    get items() {
        return foundryApi.collections.items as Collection<SplittermondItem>;
    },
    get(id: string): SplittermondItem | null {
        return foundryApi.getItem(id) as SplittermondItem;
    },
};

export const actorRetriever = {
    get actors() {
        return foundryApi.collections.actors as Collection<SplittermondActor>;
    },
    get(id: string): SplittermondActor | undefined {
        return foundryApi.getActor(id) as SplittermondActor | undefined;
    },
};

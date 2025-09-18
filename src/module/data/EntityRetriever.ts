import { foundryApi } from "../api/foundryApi";
import SplittermondItem from "../item/item";

export const itemRetriever = {
    get items() {
        return foundryApi.collections.items as Collection<SplittermondItem>;
    },
    get(id: string): SplittermondItem | null {
        return foundryApi.getItem(id) as SplittermondItem;
    },
};

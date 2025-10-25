import SplittermondPhysicalItem from "./physical";
import type { EquipmentDataModel } from "module/item/dataModel/EquipmentDataModel";

export default class SplittermondEquipmentItem extends SplittermondPhysicalItem {
    declare system: EquipmentDataModel;
}

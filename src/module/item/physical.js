import SplittermondItem from "./item.js";

export default class SplittermondPhysicalItem extends SplittermondItem {
    prepareBaseData() {
        super.prepareBaseData();
        const data = this.system;
        data.durability = parseInt(data.weight) + parseInt(data.hardness);
        data.sufferedDamage = parseInt(data.sufferedDamage) || 0;

        if (data.durability == 0) {
            if (data.sufferedDamage > 0) {
                data.damageLevel = 3;
            } else {
                data.damageLevel = 0;
            }
        } else {
            data.damageLevel = Math.max(
                Math.min(Math.floor((parseInt(data.sufferedDamage) - 1) / data.durability), 3),
                0
            );
            if (data.sufferedDamage === 3 * data.durability) {
                data.damageLevel = 3;
            }
        }

        data.damageLevelText = CONFIG.splittermond.damageLevel[data.damageLevel];
    }
}

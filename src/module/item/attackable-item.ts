import Attack from "../actor/attack";
import SplittermondItem from "./item";
import SplittermondShieldItem from "./shield";
import SplittermondWeaponItem from "./weapon";
import SplittermondNPCAttackItem from "./npcattack";

// Helper type to define a constructor
type Constructor<T = {}> = new (...args: any[]) => T;

// Mixin function to extend SplittermondItem
function AttackableItem<TBase extends Constructor<SplittermondItem>>(Base: TBase) {
    return class AttackableItem extends Base {
        // Define attacks as an array of Attack instances
        attacks: Attack[] = [];

        prepareBaseData(): void {
            super.prepareBaseData();
            this.attacks = [];
        }

        prepareActorData(): void {
            super.prepareActorData();

            const isUnequipped = !("equipped" in this.system && this.system.equipped);
            if (isUnequipped && this.type !== "npcattack") {
                return;
            }
            if (!isAttackItem(this)) {
                console.warn(
                    `Splittermond | Item ${this.name} was declared attackable but is not a valid attack item!`
                );
                return;
            }

            this.attacks.push(Attack.initialize(this.actor, this));

            if (this.hasSecondaryAttack) {
                this.attacks.push(Attack.initialize(this.actor, this, true));
            }

            this.attacks.forEach((attack) => this.actor.attacks.push(attack));
        }

        get featuresList() {
            if ("features" in this.system && this.system.features) {
                return this.system.features.featuresAsStringList();
            } else {
                return [];
            }
        }

        get hasSecondaryAttack(): boolean {
            return (
                "secondaryAttack" in this.system &&
                !!this.system.secondaryAttack &&
                this.system.secondaryAttack.skill !== "" &&
                this.system.secondaryAttack.skill !== "none"
            );
        }
    };
}

function isAttackItem(
    item: SplittermondItem
): item is SplittermondNPCAttackItem | SplittermondShieldItem | SplittermondWeaponItem {
    return ["npcattack", "shield", "weapon"].includes(item.type);
}

export default AttackableItem;

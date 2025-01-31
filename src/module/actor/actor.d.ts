import SplittermondItem from "../item/item";
import type {SplittermondSkill} from "../config/skillGroups";
import Attack from "./attack";

declare class SplittermondActor extends Actor {
    items: Collection<SplittermondItem>;
    async activeDefenseDialog(type?: "defense"|"vtd"|"kw"|"gw"):Promise<void>;
    readonly splinterpoints: {value:number, max:number};
    spendSplinterpoint(): {pointSpent:boolean, getBonus(skillName:SplittermondSkill):number};
    async rollMagicFumble(eg:number, costs?:string, skill?:SplittermondSkill):Promise<void>;
    async addTicks(value:number, message?:string, askPlayer?:boolean):Promise<void>;
    consumeCost(type:"health"|"focus", valueStr:string, description:unknown):void;
    importFromJSON(json:string, overwriteData?):Promise<unknown>;
    attacks: Attack[]
}
export default SplittermondActor;
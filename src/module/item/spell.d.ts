import SplittermondItem from "./item";
import AttackableItem from "./attackable-item";
import {SpellDataModelType} from "./dataModel/SpellDataModel";

declare class SplittermondSpellItem extends AttackableItem(SplittermondItem) {
   type: "spell";
   system: SpellDataModelType;
   constructor(data: any, context: any, availabilityParser: any): void;

   get costs(): string;
   get enhancementCosts(): string;
   get availableIn(): any;
   update(data: any, context: any): any;

   get skill(): any;
   get enoughFocus(): boolean;
   get difficulty(): any;
   get castDuration(): any;
   get range(): any;
   get effectDuration(): any;
   get effectArea(): any;
   get description(): any;
   get enhancementDescription(): any;
   get degreeOfSuccessOptions(): Exclude<SpellDataModelType["degreeOfSuccessOptions"],null|undefined>;
   get spellType(): string;
   get spellTypeList(): string[];
   get damage(): any;
   get availableInList(): any;

   roll(options: any): Promise<boolean>;
   getCostsForFinishedRoll(degreeOfSuccess: number, successful: boolean): PrimaryCost;
}

export default SplittermondSpellItem;
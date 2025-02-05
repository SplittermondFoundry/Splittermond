import Splittermond from './template.json';
import WithTemplate = ItemTemplates.WithTemplate;

type SplittermondTypes = typeof Splittermond;
type CostTypes = keyof SplittermondTypes["Actor"]["templates"]  & ("health"| "focus");
type SplittermondSpellSystemData = WithTemplate<SplittermondTypes["Item"]["spell"]["availableIn"]>
type SpellDegreesOfSuccessOptions = keyof SplittermondSpellSystemData["degreeOfSuccessOptions"]

export {SplittermondTypes, SpellDegreesOfSuccessOptions, CostTypes, SplittermondSkill}

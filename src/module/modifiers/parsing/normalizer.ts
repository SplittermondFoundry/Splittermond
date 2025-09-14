import {Value} from "./index";
import {initMapper, LanguageMapper} from "module/util/LanguageMapper";
import {attributes, derivedAttributes} from "module/config/attributes";
import {isRoll} from "module/api/Roll";
import {splittermond} from "module/config";

const modifierKeys = ["emphasis", "damageType", "value", "skill", "feature", "features", "item", "itemType", "unit"] as const;
const attributeMapper = initMapper(attributes)
    .withTranslator((t) => `splittermond.attribute.${t}.long`)
    .andOtherMappers((t) => `splittermond.attribute.${t}.short`)
    .build();
const derivedAttributeMapper = initMapper(derivedAttributes)
    .withTranslator((t) => `splittermond.derivedAttribute.${t}.long`)
    .andOtherMappers((t) => `splittermond.derivedAttribute.${t}.short`)
    .build();
const modifierKeyMapper = initMapper(modifierKeys)
    .withTranslator((t) => `splittermond.modifiers.keys.${t}`)
    .build()
const skillMapper = initMapper(splittermond.skillGroups.all)
    .withTranslator((t) => `splittermond.skillLabel.${t}`)
    .andOtherMappers((t) => `splittermond.skillAbbreviation.${t}`)
    .build();
const damageTypeMapper = initMapper(splittermond.damageTypes)
    .withTranslator((t) => `splittermond.damageTypes.long.${t}`)
    .andOtherMappers((t) => `splittermond.damageTypes.short.${t}`)
    .build();
const itemTypeMapper = initMapper(splittermond.itemTypes)
    .withTranslator((t) => `TYPES.Item.${t}`)
    .build();

/**
 * Only use for testing
 */
export function clearMappers() {
    (attributeMapper as any).clear();
    (derivedAttributeMapper as any).clear();
    (modifierKeyMapper as any).clear();
    (skillMapper as any).clear();
    (damageTypeMapper as any).clear();
    (itemTypeMapper as any).clear();
}

export function normalizeKey(key: string) {
    return new NoValueAdornmentNormalizer(key).usingMappers("modifiers").do()
}

export function normalizeDescriptor(descriptor:string){
    return new NoValueAdornmentNormalizer(descriptor);
}

export function normalizeValue(value: Value) {
    const replacer = new Or(replaceAttribute, replaceDerivedAttribute, replaceSkill);
    if (typeof value === "string") {
        const sign: 1 | -1 = /^-/.test(value) ? -1 : 1;
        const unsignedValue = value.replace(/^[-+]/, "");
        const replacement = replacer.tryReplace(unsignedValue);
        //Assume the string is a reference only if we managed to replace it! (It could, for instance, also be focus.)
        if (replacement !== unsignedValue) {
            return {propertyPath: replacement, sign, original: value};
        }
    } else if (typeof value === "object" && !isRoll(value)) {
        const replacement = replacer.tryReplace(value.propertyPath);
        if (replacement !== value.propertyPath) {
            value.propertyPath = replacement;
            return value;
        }
    }
    return value;
}

function replaceAttribute(value: string): string {
    return createReplace(attributes, attributeMapper(), (v) => `attributes.${v}.value`)(value)
}

function replaceDerivedAttribute(value: string): string {
    return createReplace(
        derivedAttributes,
        derivedAttributeMapper(),
        (v) => `derivedAttributes.${v}.value`
    )(value)
}

function replaceSkill(value: string): string {
    return createReplace(
        splittermond.skillGroups.all,
        skillMapper(),
        (v) => `skills.${v}.value`
    )(value)

}

function createReplace<T extends string>(collection: Readonly<T[]>, mapper: LanguageMapper<T>, path: (v: string) => string) {
    return (value: string) => {
        const identifiedValue = mapper.toCode(value)
        if (identifiedValue && collection.includes(identifiedValue)) {
            return path(identifiedValue);
        }
        return value;
    }
}

class Or {
    private replaceOperations: ((x: string) => string)[] = [];

    constructor(...replaceOperations: ((x: string) => string)[]) {
        this.replaceOperations = replaceOperations
    }

    tryReplace(value: string): string {
        for (const operation of this.replaceOperations) {
            const replacement = operation(value);
            if (replacement !== value) {
                return replacement;
            }
        }
        return value;
    }
}


type MapperSelection = (keyof typeof NoValueAdornmentNormalizer["mappers"])
class NoValueAdornmentNormalizer {
    private selectedMappers: MapperSelection[] =[];
    static mappers = {
        attributes: {collection:splittermond.attributes, mapper:attributeMapper},
        derivedAttributes:{collection: splittermond.attributes, mapper:derivedAttributeMapper},
        skills: {collection: splittermond.skillGroups.all, mapper:skillMapper},
        modifiers: {collection: modifierKeys, mapper: modifierKeyMapper},
        damageTypes: {collection: splittermond.damageTypes, mapper: damageTypeMapper},
        itemTypes: {collection: splittermond.itemTypes, mapper: itemTypeMapper }
    } as const;
    constructor(private readonly descriptor: string) {
    }

    usingMappers(...mapper: MapperSelection[]) {
        this.selectedMappers = mapper;
        return this;
    }

    do() {
       const replacers = this.selectedMappers
           .map(m=> NoValueAdornmentNormalizer.mappers[m])
           .map(m=> createReplace(m.collection, m.mapper(), v=>v))
       return  new Or(...replacers).tryReplace(this.descriptor);
    }
}

import {SplittermondSkill} from "../../../public/template";

/**
 * This module transformes the internal representation of the availability of spells and masteries into a
 * localized string. It caches the generated parsers, because in production there is only one real set of
 * localizer and skills that is required. In testing, however, the localizer and skills can change between tests.
 */
let cachedSpellAvailabilityParser: SpellAvailabilityParser;
let cachedMasteryAvailabilityParser: MasteryAvailabilityParser;

type Localizer = {localize: (arg0: string)=>string};

/**
 * Returns a cached instance of the spell availability parser or creates a new one if inputs don't match.
 */
export function getMasteryAvailabilityParser(i18n:Localizer, masterySkills:Readonly<SplittermondSkill[]>) {
    if (!cachedMasteryAvailabilityParser || !cachedMasteryAvailabilityParser.isSame(i18n, masterySkills)){
        cachedMasteryAvailabilityParser = new MasteryAvailabilityParser(i18n, masterySkills);
    }
    return cachedMasteryAvailabilityParser;
}

/**
 * Returns a cached instance of the spell availability parser or creates a new one if inputs don't match.
 */
export function getSpellAvailabilityParser(i18n:Localizer, magicSkills:Readonly<SplittermondSkill[]>):SpellAvailabilityParser {
    if (!cachedSpellAvailabilityParser || !cachedSpellAvailabilityParser.isSame(i18n, magicSkills)){
        cachedSpellAvailabilityParser = new SpellAvailabilityParser(i18n, magicSkills);
    }
    return cachedSpellAvailabilityParser;
}

/**
 * In a comma separated list of string this class translates entries of the form "magicSkill level" into either
 * the localized version of the magic skill or the internal representation, while preserving the rest of the string.
 */
abstract class AvailabilityParser {
    private _internalsAsKeys = new Map<SplittermondSkill,string>();
    private _translationsAsKeys = new Map<string,SplittermondSkill>();
    private __skills : Iterable<SplittermondSkill>;
    private __i18n : Localizer;

    /**
     *
     * @param i18n The localizer to obtain the translations from
     * @param skills The skills to translate
     * @param additonalTranslations Additional translation to skills that are not the official translations.
     */
    constructor(i18n:Localizer, skills:Iterable<SplittermondSkill>, additonalTranslations:Map<string,SplittermondSkill>=new Map()) {
        this.__skills = skills;
        this.__i18n = i18n;

        additonalTranslations.forEach((value, key) =>this._translationsAsKeys.set(key, value));
        for (const skill of skills) {
            const translation = i18n.localize(`splittermond.skillLabel.${skill}`);
            this._translationsAsKeys.set(translation.toLowerCase(), skill);
            this._internalsAsKeys.set(skill, translation);
        }
    }

    private processString(availability:string|undefined|null, translationsMap:Map<string,string>):string|undefined|null {
        const availabilityExists = !!(availability && typeof availability === "string" && availability.trim() !== '');
        let transformed;
        if (availabilityExists) {
            transformed = availability.split(",")
                .map(item => item.trim())
                .filter(item => item !== "")
                .map(item => this._translateSingleItem(item, translationsMap))
                .join(", ");
        }
        return transformed ? transformed : availability;
    }

    isSame(i18n:Localizer, skills:Iterable<SplittermondSkill>) {
        return this.__i18n === i18n && this.__skills === skills;
    }


    /**
     * Transforms the internal string representation of the availabilties of the form "skill level, skill level"
     * into a localized string
     */
    toDisplayRepresentation(availability?:string|null):string|undefined|null {
        return this.processString(availability, this._internalsAsKeys);
    }

    /**
     * Turns the internal representation of the availabilities into a localized string
     */
    toInternalRepresentation(availability:string):string|undefined|null{
        return this.processString(availability, this._translationsAsKeys);
    }

    protected abstract _translateSingleItem(availablityItem:string, translationsMap:Map<string,string>):string;
}

class SpellAvailabilityParser extends AvailabilityParser {

    constructor(i18n:Localizer, magicSkills:Iterable<SplittermondSkill>) {
        super(i18n, magicSkills, shorthandTranslations(i18n,magicSkills));
    }

    protected _translateSingleItem(availablityItem:string, translationsMap:Map<string,string>):string {
        if (this.isWellFormattedAvailability(availablityItem)) {
            const splitItem = availablityItem.trim().split(/[ :]/).filter(item=>!!item);
            const hasTranslation = translationsMap.get(splitItem[0].trim().toLowerCase());
            return `${hasTranslation ?? splitItem[0]} ${splitItem[1].trim()}`;
        } else {
            return availablityItem;
        }
    }

    /**
     * checks whether a single spell availability token is well formatted
     */
    isWellFormattedAvailability(availability:string):boolean {
        const splitItem = availability.trim().split(/[ :]/).filter(item=>!!item);
        return Array.isArray(splitItem) &&
            splitItem.length === 2 &&
            !isNaN(parseFloat(splitItem[1]));
    }
}

function shorthandTranslations(i18n:Localizer, skills:Iterable<SplittermondSkill>):Map<string,SplittermondSkill> {
    const translations = new Map<string,SplittermondSkill>();
    for (const skill of skills) {
        const translation = i18n.localize(`splittermond.skillAbbreviation.${skill}`);
        const shorthand = translation.split(" ")[0].toLowerCase();
        translations.set(shorthand, skill);
    }
    return translations;
}

class MasteryAvailabilityParser extends AvailabilityParser {

    constructor(i18n:Localizer, masteries:Iterable<SplittermondSkill>) {
        super(i18n, masteries);
    }

    protected _translateSingleItem(availablityItem:string, translationsMap:Map<string,string>):string {
        const hasTranslation = translationsMap.get(availablityItem.trim().toLowerCase());
        return hasTranslation ?? availablityItem;
    }
}

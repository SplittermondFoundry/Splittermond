import { foundryApi } from "../api/foundryApi";

export class LanguageMapper<T extends string> {
    private translationsAsKeys: Map<string, T> = new Map();
    private internalsAsKeys: Map<T, string> = new Map();

    constructor(translations: Map<T, string>, additionalTranslations: Map<string, T> = new Map()) {
        additionalTranslations.forEach((value, key) => this.translationsAsKeys.set(key.toLowerCase(), value));
        translations.forEach((value, key) => {
            this.translationsAsKeys.set(value.toLowerCase(), key);
            this.internalsAsKeys.set(key, value.toLowerCase());
        });
    }

    toTranslation(code: T) {
        return this.internalsAsKeys.get(code);
    }

    toCode(translation: string): T | undefined {
        return this.translationsAsKeys.get(translation.toLowerCase());
    }
}

/**
 * Initializes a language mapper that allows to map between an internal representation and a human-readable form. Initialization
 * is delayed because we cannot be sure that the localization system is already present when the module loads.
 * @param codeCollection The internal representation of the language keys
 */
export function initMapper<T extends string>(codeCollection: Readonly<T[]>) {
    let languageMapper: LanguageMapper<T> | null = null;
    let localizer = (s: string) => foundryApi.localize(s);
    let translator: (s: T) => string;
    let backTranslations: ((s: T) => string)[] = [];
    let directMaps: Map<string, T> = new Map();

    /**
     * @param codeToTranslation The language keys that allow to localize an internal represenation to a human-readable form
     */
    function withTranslator(codeToTranslation: (s: T) => string) {
        translator = codeToTranslation;
        return { andOtherMappers, andDirectMap, andLocalizer, build };
    }

    /**
     * @param mappers Additional mappers that allow to map from human-readable to internal representation
     */
    function andOtherMappers(...mappers: ((s: T) => string)[]) {
        backTranslations = mappers;
        return { andDirectMap, andLocalizer, build };
    }

    function andDirectMap(key: string, value: T) {
        directMaps.set(key, value);
        return { andLocalizer, andDirectMap, andOtherMappers, build };
    }

    function build() {
        Object.defineProperty(getLanguageMapper, "clear", { value: () => (languageMapper = null) }); //secret workaround to reset the mapper for tests
        return getLanguageMapper;
    }

    function andLocalizer(localizerFunction: (key: string) => string) {
        localizer = localizerFunction;
        return { andDirectMap, andOtherMappers, build };
    }

    function getLanguageMapper(): LanguageMapper<T> {
        if (!languageMapper) {
            const codeMappings = new Map<T, string>(codeCollection.map((code) => [code, localizer(translator(code))]));
            const additionalTranslations = new Map<string, T>(
                backTranslations.flatMap((mapper) => codeCollection.map((code) => [localizer(mapper(code)), code]))
            );
            directMaps.forEach((value, key) => additionalTranslations.set(key, value));
            languageMapper = new LanguageMapper<T>(codeMappings, additionalTranslations);
        }
        return languageMapper;
    }

    return { withTranslator };
}

import fs from 'fs';
import path from 'path';


export function initLocalizer() {
    const currentFileUrl = import.meta.url;
    const currentFileLocation = path.dirname(new URL(currentFileUrl).pathname).slice(1);
    const languageFileLocation = path.resolve(path.dirname(currentFileLocation), '../../../../../public/lang/de.json');
    const languageJson = JSON.parse(fs.readFileSync(languageFileLocation,'utf-8'));
    return function localize(str: string) {
        const keys = str.split(".");
        let currentValue = languageJson;
        for(const languageKey of keys){
            if(languageKey in currentValue){
                currentValue = currentValue[languageKey];
            }else {
                return str;
            }
        }
        return currentValue;

    }
}
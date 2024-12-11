export interface SplittermondSpellSystemData {
    "description": string,
    "source": string
    "availableIn": string,
    "skill": string,
    "skillLevel": number,
    "spellType": string,
    "costs": string,
    "difficulty": string,
    "damage": string,
    "range": string,
    "castDuration": string,
    "effectDuration": string,
    "effectArea": string,
    "enhancementDescription": string,
    "enhancementCosts": string,
    "features": string,
    "degreeOfSuccessOptions": {
        "castDuration": boolean,
        "consumedFocus": boolean,
        "exhaustedFocus": boolean,
        "channelizedFocus": boolean,
        "effectDuration": boolean,
        "damage": boolean,
        "range": boolean,
        "effectArea": boolean
    }
}
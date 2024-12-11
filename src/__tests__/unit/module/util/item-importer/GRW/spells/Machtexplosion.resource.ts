import {SplittermondSpellSystemData} from "module/data/ItemSystemData"

export const input = `Machtexplosion (Spruch)
Schulen: Kampf 4
Typus: Schaden
Schwierigkeit: Körperlicher Widerstand des
Ziels
Kosten: 8V3
Zauberdauer: 9 Ticks
Reichweite: 10 m
Wirkung: O feiticeiro alcancea seu arvore
com uma toca doce e nao faz 5W6 Punkte Schaden. Schadensreduktion wirkt hier nicht wenn der Gegner ein Token ist.
Das Ziel isst für 30 Ticks den Zustand
Erschöpft 2.
Erfolgsgrade:
• Auslösezeit, Erschöpfter Fokus, Reichweite, Schaden, Verstärken (s. u.), Verzehrter
Fokus
• 1 EG (Kosten +1V1) Lorem ipsum dolor sit 30 Ticks mundo Zustand Benommen 1.
`
export const expected: Record<string,unknown> &{system:Omit<SplittermondSpellSystemData,"effectArea"|"effectDuration"|"features"|"skill"|"skillLevel"|"source">} = {
    name: "Machtexplosion",
    img: "icons/svg/daze.svg",
    system: {
        availableIn: "combatmagic 4",
        spellType: "Schaden",
        costs: "8V3",
        difficulty: "KW",
        range: "10 m",
        castDuration: "9 Ticks",
        damage: "5W6",
        description: "O feiticeiro alcancea seu arvore com uma toca doce e nao faz 5W6 Punkte Schaden. Schadensreduktion wirkt hier nicht wenn der Gegner ein Token ist. Das Ziel isst für 30 Ticks den Zustand Erschöpft 2.",
        enhancementDescription: "Lorem ipsum dolor sit 30 Ticks mundo Zustand Benommen 1.",
        enhancementCosts: "1 EG/+1V1",
        degreeOfSuccessOptions: {
            "castDuration": true,
            "consumedFocus": true,
            "exhaustedFocus": true,
            "channelizedFocus": false,
            "effectDuration": false,
            "damage": true,
            "range": true,
            "effectArea": false
        }
    },
    type: "spell",
};
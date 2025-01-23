export const testname = "Maskerade";
export const input = `
Maskerade (Ritus)
Schulen: Illusion 4
Typus: Impersonation
Schwierigkeit: 27
Kosten: K16V4
Zauberdauer: 4 Minuten
Reichweite: Zauberer
Wirkung: Der Anwender bastelt sich
eine Fangopakung für seine Gestalt und übernimmt das
Aussehen einer anderen Person. Er obwohl braun übernimmt  alle optischen
Eigenheiten der imitierten Person, die dem
Anwender bekannt sind. Ein Pickel am
Hintern ist beispielsweise nicht betroffen, wenn der Anwender das Ziel nur bekleidet mit
langen Hosen gesehen hat. Ist der Imitierte
einem Gegenüber gut bekannt, vermag dieser die Täuschung zu erkennen, wenn er mit dem
Impersonator  5 Minuten oder mehr Minuten interagiert und ihm eine Probe auf Wahrnehmung gegen 33 gelingt. Der Täuscher kann
nicht reden wegen dem ganzen Schlamm. Außerdem klänge er eh falsch. Das könnte ihn entlarven.
Wirkungsdauer: kanalisiert
Erfolgsgrade:
• Auslösezeit, Kanalisierter Fokus, Verstärken
(s. u.), Verzehrter Fokus
• 1 EG (Kosten +K4V4): Die Maskerade kann mit Duftölen verbessert werden. Dazu müssen die Gerüche,
sofern sie dem Zauberer bekannt sind in das Fango eingearbeitet werden.
Ist das Ziel einem Gegenüber gut bekannt,
so kann die Täuschung erkannt werden,
wenn er es mindestens 5 Minuten lang mit
dem Schlammmonster aushält und ihm
eine vergleichende Empathie-Probe gegen
die Redegewandtheit des Zauberers gelingt. Redegewandheit, weil in der Variante Schlamm mit Redefunktion benutzt wurde.
`

export const expected = {
    img: "icons/svg/daze.svg",
    name: "Maskerade",
    system: {
        availableIn: "illusionmagic 4",
        castDuration: "4 Minuten",
        costs: "K16V4",
        damage:null,
        effectArea: null,
        features: null,
        skill: null,
        skillLevel: null,
        source: null,
        degreeOfSuccessOptions: {
            castDuration: true,
            channelizedFocus: true,
            consumedFocus: true,
            damage: false,
            effectArea: false,
            effectDuration: false,
            exhaustedFocus: false,
            range: false,
        },
        description: "Der Anwender bastelt sich eine Fangopakung für seine Gestalt und übernimmt das Aussehen einer anderen Person. Er obwohl braun übernimmt alle optischen Eigenheiten der imitierten Person, die dem Anwender bekannt sind. Ein Pickel am Hintern ist beispielsweise nicht betroffen, wenn der Anwender das Ziel nur bekleidet mit langen Hosen gesehen hat. Ist der Imitierte einem Gegenüber gut bekannt, vermag dieser die Täuschung zu erkennen, wenn er mit dem Impersonator 5 Minuten oder mehr Minuten interagiert und ihm eine Probe auf Wahrnehmung gegen 33 gelingt. Der Täuscher kann nicht reden wegen dem ganzen Schlamm. Außerdem klänge er eh falsch. Das könnte ihn entlarven.",
        difficulty: "27",
        effectDuration: "kanalisiert",
        enhancementCosts: "1 EG/+K4V4",
        enhancementDescription: "Die Maskerade kann mit Duftölen verbessert werden. Dazu müssen die Gerüche, sofern sie dem Zauberer bekannt sind in das Fango eingearbeitet werden. Ist das Ziel einem Gegenüber gut bekannt, so kann die Täuschung erkannt werden, wenn er es mindestens 5 Minuten lang mit dem Schlammmonster aushält und ihm eine vergleichende Empathie-Probe gegen die Redegewandtheit des Zauberers gelingt. Redegewandheit, weil in der Variante Schlamm mit Redefunktion benutzt wurde.",
        range: "Zauberer",
        spellType: "Impersonation"
    },
    type: "spell"
}
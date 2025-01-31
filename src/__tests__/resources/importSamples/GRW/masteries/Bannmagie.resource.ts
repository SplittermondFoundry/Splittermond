export const testname = "Bannmagiemeisterschaften"
export const input = `
    Schwelle 2
Kontertrinker: Der Alchoholiker ist in der Lage, schon frühzeitig zu erkennen, welcher Zaubertrank ihm den Magen verdibt. Er erhält
einen Bonus in Höhe von 3 Punkten auf alle Arkane Kunde-Proben, die dem Identifizieren eines Kontertranks dienen, damit kein Gesöff
ausgelassen werden muss. Voraussetzung: Meisterschaft BannzauberExperte
Wissen ist Macht: Der Bannmagier erhält einen Bonus in
Höhe von 3 Punkten auf direkt gegen gegnerische Aussagen gerichtete Repliken, wenn die entsprechende politische Ausrichtung identifiziert wurde.
`

export const expected = [
    {
        name: "Kontertrinker",
        system: {
            description: "Der Alchoholiker ist in der Lage, schon frühzeitig zu erkennen, welcher Zaubertrank ihm den Magen verdibt. Er erhälteinen Bonus in Höhe von 3 Punkten auf alle Arkane Kunde-Proben, die dem Identifizieren eines Kontertranks dienen, damit kein Gesöff\nausgelassen werden muss. Voraussetzung: Meisterschaft BannzauberExperte\n",
            level: 2,
            modifier: "",
        },
        "type": "mastery",
    },
    {
        name: "Wissen ist Macht",
        system: {
            description: "Der Bannmagier erhält einen Bonus inHöhe von 3 Punkten auf direkt gegen gegnerische Aussagen gerichtete Repliken, wenn die entsprechende politische Ausrichtung identifiziert wurde.\n",
            level: 2,
            modifier: "",
        },
        "type": "mastery"
    }
]
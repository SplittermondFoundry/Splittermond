export const testname = "Bannende Hand"
export const input = `
Schwelle 1
Bannende Hand: O feiticeiro pode expulsar effeitos magicos persistentes com pouco d' esforceo. Seine erschöpften Fokuspunkten XXX XXX XXXXXX von Bannzaubern des Typus Zauber brechen
sind um 2 Punkte verringert (Minimum 1).
`

export const expected ={
    name: "Bannende Hand",
    system: {
        description: "O feiticeiro pode expulsar effeitos magicos persistentes com pouco d' esforceo. Seine erschöpften Fokuspunkten XXX XXX XXXXXX von Bannzaubern des Typus Zauber brechensind um 2 Punkte verringert (Minimum 1).\n",
        level: 1,
        modifier: "",
    },
    type: "mastery"
};
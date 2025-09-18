export const testname = "Schuppenrüstung";
export const input = `Schuppe Kleinstadt 25 L 5 7 F +4 3 4 2 3 Wattiert`;
export const expected = {
    folder: "",
    img: "icons/svg/statue.svg",
    name: "Schuppe",
    system: {
        availability: "town",
        complexity: "F",
        damageReduction: 3,
        defenseBonus: "+4",
        features: "Wattiert",
        handicap: 4,
        hardness: 7,
        minStr: 3,
        price: "25 L",
        tickMalus: 2,
        weight: 5,
    },
    type: "armor",
};

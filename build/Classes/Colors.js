let currentIndex = 0;
export const fullPallette = [
    { name: "charcoal", RGBA: "38, 70, 83, 1" },
    { name: "persian green", RGBA: "42, 157, 143, 1" },
    { name: "saffron", RGBA: "233, 196, 106, 1" },
    { name: "sandy brown", RGBA: "244, 162, 97, 1" },
    { name: "burnt sienna", RGBA: "231, 111, 81, 1" }
];
export const getRandomColor = () => {
    const randomIndex = Math.floor(Math.random() * fullPallette.length);
    return fullPallette[randomIndex];
};
export const getNextColor = () => {
    currentIndex = currentIndex < fullPallette.length - 1 ? currentIndex + 1 : 0;
    return fullPallette[currentIndex];
};
//# sourceMappingURL=Colors.js.map
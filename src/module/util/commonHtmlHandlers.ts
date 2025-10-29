export function autoExpandInputs(element: HTMLElement): void {
    const inputs = element.querySelectorAll<HTMLInputElement>("input.autoexpand");
    inputs.forEach((input) => {
        const updateWidth = () => {
            // Create a hidden span to measure text width
            const dummy = document.createElement("span");
            dummy.style.visibility = "hidden";
            dummy.style.position = "absolute";
            dummy.style.whiteSpace = "pre";
            dummy.textContent = input.value || input.placeholder || "";
            // Match input font styles using getComputedStyle
            const inputStyle = window.getComputedStyle(input);
            dummy.style.font = inputStyle.font;
            dummy.style.fontSize = inputStyle.fontSize;
            dummy.style.fontFamily = inputStyle.fontFamily;
            dummy.style.fontWeight = inputStyle.fontWeight;
            dummy.style.fontStyle = inputStyle.fontStyle;
            dummy.style.letterSpacing = inputStyle.letterSpacing;
            document.body.appendChild(dummy);
            input.style.width = `${dummy.offsetWidth}px`;
            document.body.removeChild(dummy);
        };
        input.addEventListener("input", updateWidth);
        updateWidth();
    });
}

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
            // Match input font styles
            const inputStyle = element.computedStyleMap();
            dummy.style.font = inputStyle.get("font")?.toString() ?? "";
            dummy.style.fontSize = inputStyle.get("fontSize")?.toString() ?? "";
            dummy.style.fontFamily = inputStyle.get("fontFamily")?.toString() ?? "";
            document.body.appendChild(dummy);
            input.style.width = `${dummy.offsetWidth}px`;
            document.body.removeChild(dummy);
        };
        input.addEventListener("input", updateWidth);
        updateWidth();
    });
}

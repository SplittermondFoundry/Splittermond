export function toggleElement(element: HTMLElement) {
    if (element.style.display === "none" || !element.style.display) {
        showElementIn(element);
    } else {
        hideElementIn(element);
        // Hide with animation
    }
}

export function showElementIn(element: HTMLElement, duration = 200) {
    // Show with animation
    element.style.display = "";
    const inheritedDisplay = element.ownerDocument.defaultView
        ?.getComputedStyle(element, null)
        .getPropertyValue("display");
    if (!inheritedDisplay || inheritedDisplay === "none") {
        element.style.display = "block";
    }
    element.animate(
        [
            { opacity: 0, maxHeight: "0" },
            { opacity: 1, maxHeight: `${element.scrollHeight}px` },
        ],
        { duration, easing: "ease-in-out" }
    );
}

export function hideElementIn(element: HTMLElement, duration = 200) {
    const animation = element.animate(
        [
            { opacity: 1, maxHeight: `${element.scrollHeight}px` },
            { opacity: 0, maxHeight: "0" },
        ],
        { duration, easing: "ease-in-out" }
    );
    animation.onfinish = () => {
        element.style.display = "none";
    };
}

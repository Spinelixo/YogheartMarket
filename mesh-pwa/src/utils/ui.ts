import React from "react";

/**
 * Material Design Ripple Effect with Hold-and-Release states.
 * Spawns an expanding splash overlay and repeating water wave rings on pointerdown.
 * Fades out and garbage collects the elements on pointerup/pointerleave.
 */
export function triggerRipple(event: React.PointerEvent<HTMLElement>) {
    const container = event.currentTarget;
    if (!container) return;

    // Ensure the container has relative positioning and overflow hidden
    container.classList.add("ripple-container");

    const rect = container.getBoundingClientRect();
    const clientX = event.clientX;
    const clientY = event.clientY;

    // Double the size of the box's largest diagonal to ensure complete coverage of corners
    const size = Math.max(rect.width, rect.height) * 2;
    const x = clientX - rect.left - size / 2;
    const y = clientY - rect.top - size / 2;

    const ripple = document.createElement("span");
    ripple.className = "ripple-effect-hold";
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    // Initial state before transition triggers
    ripple.style.transform = "scale(0)";
    ripple.style.opacity = "0";

    container.appendChild(ripple);

    // Force browser reflow to register initial state
    void ripple.offsetWidth;

    // Transition to hold state (fully expanded and semi-transparent 0.15 opacity)
    ripple.style.transform = "scale(1)";
    ripple.style.opacity = "0.15";

    let released = false;

    // Release phase: smooth fade out
    const release = () => {
        if (released) return;
        released = true;

        ripple.style.opacity = "0";

        // Remove element from DOM after fade-out transition completes
        setTimeout(() => {
            ripple.remove();
        }, 400);

        // Remove event listeners from container
        container.removeEventListener("pointerup", release);
        container.removeEventListener("pointerleave", release);
        container.removeEventListener("pointercancel", release);
    };

    // Attach release triggers to the container
    container.addEventListener("pointerup", release);
    container.addEventListener("pointerleave", release);
    container.addEventListener("pointercancel", release);
}

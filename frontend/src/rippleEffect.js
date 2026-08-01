// Delegated "ripple" micro-interaction for every button/element carrying the
// .jelly-btn class, app-wide, with zero per-component wiring. Attached once
// at boot from main.jsx.
export function installRippleEffect() {
  const handler = (e) => {
    const target = e.target.closest(".jelly-btn");
    if (!target) return;

    const style = window.getComputedStyle(target);
    if (style.position === "static") target.style.position = "relative";

    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.4;
    const dot = document.createElement("span");
    dot.className = "ripple-dot";
    dot.style.width = `${size}px`;
    dot.style.height = `${size}px`;
    dot.style.left = `${(e.clientX ?? rect.left + rect.width / 2) - rect.left - size / 2}px`;
    dot.style.top = `${(e.clientY ?? rect.top + rect.height / 2) - rect.top - size / 2}px`;

    target.appendChild(dot);
    window.setTimeout(() => dot.remove(), 650);
  };

  document.addEventListener("pointerdown", handler);
  return () => document.removeEventListener("pointerdown", handler);
}

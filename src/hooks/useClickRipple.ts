import { useEffect } from "react";

const BUBBLE_COUNT = 3;

const ACCENT_VARS = ["--accent", "--accent2", "--accent3"] as const;

function getRandomAccentColor(): string {
  const varName = ACCENT_VARS[Math.floor(Math.random() * ACCENT_VARS.length)];
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function useClickRipple(containerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      for (let i = 0; i < BUBBLE_COUNT; i++) {
        const bubble = document.createElement("div");
        bubble.className = "click-bubble";

        const color = getRandomAccentColor();

        const size = 24 + Math.random() * 42;
        const driftX = (Math.random() - 0.5) * 80;
        const driftY = -(30 + Math.random() * 60);
        const delay = Math.random() * 120;
        const duration = 500 + Math.random() * 300;

        bubble.style.left = `${x}px`;
        bubble.style.top = `${y}px`;
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.setProperty("--drift-x", `${driftX}px`);
        bubble.style.setProperty("--drift-y", `${driftY}px`);
        bubble.style.animationDelay = `${delay}ms`;
        bubble.style.animationDuration = `${duration}ms`;

        bubble.style.borderColor = hexToRgba(color, 0.8);
        bubble.style.boxShadow = `0 0 6px 2px ${hexToRgba(color, 0.3)}, inset 0 0 4px 1px ${hexToRgba(color, 0.15)}`;
        bubble.style.background = `radial-gradient(circle at 30% 30%, ${hexToRgba(color, 0.25)}, transparent 60%)`;

        container.appendChild(bubble);
        bubble.addEventListener("animationend", () => bubble.remove());
      }
    };

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [containerRef]);
}

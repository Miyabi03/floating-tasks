import { useEffect } from "react";

const BUBBLE_COUNT = 3;

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

        const size = 16 + Math.random() * 28;
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

        container.appendChild(bubble);
        bubble.addEventListener("animationend", () => bubble.remove());
      }
    };

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [containerRef]);
}

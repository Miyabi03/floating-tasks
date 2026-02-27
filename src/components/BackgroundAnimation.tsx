import { useEffect, useRef } from "react";

// --- Types ---

interface Particle {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly radius: number;
  readonly colorIndex: number;
  readonly opacity: number;
  // Warp state
  readonly isWarping: boolean;
  readonly warpTimer: number;
  readonly warpTrail: ReadonlyArray<{ x: number; y: number; opacity: number }>;
}

interface PulseWave {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly maxRadius: number;
  readonly opacity: number;
  readonly colorIndex: number;
}

// --- Constants ---

const PARTICLE_COUNT = 40;
const CONNECTION_DISTANCE = 100;
const PULSE_INTERVAL = 3000;
const WARP_CHANCE = 0.002;
const WARP_DURATION = 20;
const WARP_SPEED_MULTIPLIER = 8;
const TRAIL_LENGTH = 6;

// --- Color helpers ---

function getAccentColors(): string[] {
  const style = getComputedStyle(document.documentElement);
  return [
    style.getPropertyValue("--accent").trim() || "#34c759",
    style.getPropertyValue("--accent2").trim() || "#5ac8fa",
    style.getPropertyValue("--accent3").trim() || "#bf5af2",
  ];
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace("#", "");
  return {
    r: parseInt(cleaned.substring(0, 2), 16),
    g: parseInt(cleaned.substring(2, 4), 16),
    b: parseInt(cleaned.substring(4, 6), 16),
  };
}

// --- Particle creation ---

function createParticle(width: number, height: number): Particle {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    radius: 1.5 + Math.random() * 2,
    colorIndex: Math.floor(Math.random() * 3),
    opacity: 0.3 + Math.random() * 0.4,
    isWarping: false,
    warpTimer: 0,
    warpTrail: [],
  };
}

// --- Particle update (immutable) ---

function updateParticle(p: Particle, width: number, height: number): Particle {
  // Warp logic
  if (p.isWarping) {
    const remaining = p.warpTimer - 1;
    const newTrail = [
      { x: p.x, y: p.y, opacity: 0.6 },
      ...p.warpTrail.slice(0, TRAIL_LENGTH - 1).map((t) => ({
        ...t,
        opacity: t.opacity * 0.75,
      })),
    ];

    if (remaining <= 0) {
      return {
        ...p,
        x: p.x + p.vx * WARP_SPEED_MULTIPLIER,
        y: p.y + p.vy * WARP_SPEED_MULTIPLIER,
        isWarping: false,
        warpTimer: 0,
        warpTrail: newTrail,
      };
    }

    return {
      ...p,
      x: p.x + p.vx * WARP_SPEED_MULTIPLIER,
      y: p.y + p.vy * WARP_SPEED_MULTIPLIER,
      warpTimer: remaining,
      warpTrail: newTrail,
    };
  }

  // Fade out old trails
  const fadedTrail = p.warpTrail
    .map((t) => ({ ...t, opacity: t.opacity * 0.85 }))
    .filter((t) => t.opacity > 0.02);

  // Random warp trigger
  const shouldWarp = Math.random() < WARP_CHANCE;

  let nx = p.x + p.vx;
  let ny = p.y + p.vy;

  // Wrap around edges
  if (nx < -10) nx = width + 10;
  if (nx > width + 10) nx = -10;
  if (ny < -10) ny = height + 10;
  if (ny > height + 10) ny = -10;

  return {
    ...p,
    x: nx,
    y: ny,
    isWarping: shouldWarp,
    warpTimer: shouldWarp ? WARP_DURATION : 0,
    warpTrail: fadedTrail,
  };
}

// --- Pulse wave creation ---

function createPulseWave(width: number, height: number): PulseWave {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    radius: 0,
    maxRadius: 80 + Math.random() * 60,
    opacity: 0.25,
    colorIndex: Math.floor(Math.random() * 3),
  };
}

function updatePulseWave(pw: PulseWave): PulseWave {
  const progress = pw.radius / pw.maxRadius;
  return {
    ...pw,
    radius: pw.radius + 1.2,
    opacity: 0.25 * (1 - progress),
  };
}

// --- Drawing ---

function drawScene(
  ctx: CanvasRenderingContext2D,
  particles: ReadonlyArray<Particle>,
  pulseWaves: ReadonlyArray<PulseWave>,
  colors: string[],
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height);

  const rgbColors = colors.map(hexToRgb);

  // Draw pulse waves
  for (const pw of pulseWaves) {
    const rgb = rgbColors[pw.colorIndex];
    ctx.beginPath();
    ctx.arc(pw.x, pw.y, pw.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${pw.opacity})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Inner glow
    if (pw.opacity > 0.1) {
      ctx.beginPath();
      ctx.arc(pw.x, pw.y, pw.radius * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${pw.opacity * 0.3})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  // Draw connections
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i];
      const b = particles[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < CONNECTION_DISTANCE) {
        const opacity = (1 - dist / CONNECTION_DISTANCE) * 0.15;
        const rgb = rgbColors[a.colorIndex];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  // Draw warp trails
  for (const p of particles) {
    const rgb = rgbColors[p.colorIndex];
    for (const t of p.warpTrail) {
      ctx.beginPath();
      ctx.arc(t.x, t.y, p.radius * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${t.opacity})`;
      ctx.fill();
    }
  }

  // Draw particles
  for (const p of particles) {
    const rgb = rgbColors[p.colorIndex];

    // Glow for warping particles
    if (p.isWarping) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(
        p.x,
        p.y,
        0,
        p.x,
        p.y,
        p.radius * 4
      );
      grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`);
      grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Particle dot
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.isWarping ? 0.9 : p.opacity})`;
    ctx.fill();
  }
}

// --- Component ---

export function BackgroundAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let particles: Particle[] = [];
    let pulseWaves: PulseWave[] = [];
    let lastPulseTime = 0;
    let colors = getAccentColors();

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const init = () => {
      resize();
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      particles = Array.from({ length: PARTICLE_COUNT }, () =>
        createParticle(w, h)
      );
    };

    const loop = (time: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      // Refresh colors periodically (theme changes)
      if (Math.floor(time / 2000) !== Math.floor((time - 16) / 2000)) {
        colors = getAccentColors();
      }

      // Spawn pulse waves
      if (time - lastPulseTime > PULSE_INTERVAL) {
        pulseWaves = [...pulseWaves, createPulseWave(w, h)];
        lastPulseTime = time;
      }

      // Update
      particles = particles.map((p) => updateParticle(p, w, h));
      pulseWaves = pulseWaves
        .map(updatePulseWave)
        .filter((pw) => pw.radius < pw.maxRadius);

      drawScene(ctx, particles, pulseWaves, colors, w, h);
      animId = requestAnimationFrame(loop);
    };

    init();
    animId = requestAnimationFrame(loop);

    const observer = new ResizeObserver(() => resize());
    if (canvas.parentElement) {
      observer.observe(canvas.parentElement);
    }

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: -1,
      }}
    />
  );
}

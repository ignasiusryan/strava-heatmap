export const DARK = {
  bg: "#0a0a0a",
  surface: "#141414",
  surface2: "#1e1e1e",
  border: "#2a2a2a",
  text: "#e8e8e8",
  textMuted: "#666666",
  textDim: "#444444",
  orange1: "#1a1208",
  orange2: "#3d2a08",
  orange3: "#7a4a0a",
  orange4: "#c46d0a",
  orange5: "#ff8c00",
};

export const LIGHT = {
  bg: "#fafafa",
  surface: "#ffffff",
  surface2: "#f0f0f0",
  border: "#e0e0e0",
  text: "#1a1a1a",
  textMuted: "#777777",
  textDim: "#aaaaaa",
  orange1: "#fff3e0",
  orange2: "#ffe0b2",
  orange3: "#ffb74d",
  orange4: "#f57c00",
  orange5: "#e65100",
};

export type ThemeColors = typeof DARK;

export function getLevelColor(level: number, c: ThemeColors) {
  switch (level) {
    case 0: return c.surface2;
    case 1: return c.orange1;
    case 2: return c.orange2;
    case 3: return c.orange3;
    case 4: return c.orange4;
    case 5: return c.orange5;
    default: return "transparent";
  }
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export const downloadBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--orange-4)",
  color: "var(--orange-5)",
  padding: "0.5rem 1rem",
  borderRadius: "8px",
  fontFamily: "var(--font-mono)",
  fontSize: "0.7rem",
  cursor: "pointer",
  transition: "all 0.2s",
  letterSpacing: "0.05em",
};

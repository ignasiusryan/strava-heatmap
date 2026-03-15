"use client";

import type { HeatmapMode } from "@/lib/heatmap";

interface Props {
  years: number[];
  mode: HeatmapMode;
  onSelect: (mode: HeatmapMode) => void;
}

const btnBase: React.CSSProperties = {
  padding: "0.35rem 0.75rem",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  background: "transparent",
  color: "var(--text-muted)",
  fontFamily: "var(--font-mono)",
  fontSize: "0.72rem",
  cursor: "pointer",
  transition: "all 0.15s",
};

const btnActive: React.CSSProperties = {
  ...btnBase,
  background: "var(--orange-5)",
  color: "#000",
  borderColor: "var(--orange-5)",
};

export function YearSelector({ years, mode, onSelect }: Props) {
  return (
    <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
      <button
        style={mode.type === "all" ? btnActive : btnBase}
        onClick={() => onSelect({ type: "all" })}
      >
        All Years
      </button>
      <button
        style={mode.type === "rolling" ? btnActive : btnBase}
        onClick={() => onSelect({ type: "rolling" })}
      >
        Past Year
      </button>
      {years.map((y) => (
        <button
          key={y}
          style={
            mode.type === "year" && mode.year === y ? btnActive : btnBase
          }
          onClick={() => onSelect({ type: "year", year: y })}
        >
          {y}
        </button>
      ))}
    </div>
  );
}

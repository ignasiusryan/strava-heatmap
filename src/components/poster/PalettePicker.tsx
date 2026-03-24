"use client";

import { palettes, type PosterPalette } from "@/data/poster-palettes";

interface Props {
  selected: string;
  onSelect: (id: string) => void;
}

export function PalettePicker({ selected, onSelect }: Props) {
  return (
    <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
      {palettes.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          title={p.name}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: selected === p.id ? `2px solid ${p.routeColor}` : "2px solid transparent",
            outline: selected === p.id ? `2px solid ${p.routeColor}` : "none",
            outlineOffset: "2px",
            cursor: "pointer",
            padding: 0,
            overflow: "hidden",
            background: p.bg,
            position: "relative",
            transition: "all 0.15s",
          }}
        >
          {/* Route color slash across the circle */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "15%",
              width: "70%",
              height: 3,
              background: p.routeColor,
              borderRadius: 2,
              transform: "rotate(-45deg)",
            }}
          />
        </button>
      ))}
    </div>
  );
}

"use client";

import type { HeatmapData } from "@/lib/heatmap";
import { HeatmapCell } from "./HeatmapCell";

interface Props {
  data: HeatmapData;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function Heatmap({ data }: Props) {
  const cellSize = 13;
  const gap = 3;
  const weekWidth = cellSize + gap;

  return (
    <>
      {/* Month labels */}
      <div
        style={{
          position: "relative",
          height: 16,
          marginLeft: 36,
          marginBottom: 6,
          width: data.weeks.length * weekWidth,
        }}
      >
        {data.months.map((m, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: m.weekIndex * weekWidth,
              fontSize: "0.6rem",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {m.label}
          </span>
        ))}
      </div>

      <div style={{ overflowX: "auto", paddingBottom: "0.5rem" }}>
        <div style={{ display: "inline-flex", gap: 0, alignItems: "flex-start" }}>
          {/* Day labels */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              marginRight: 8,
            }}
          >
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                style={{
                  height: cellSize,
                  marginBottom: gap,
                  fontSize: "0.6rem",
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-mono)",
                  lineHeight: `${cellSize}px`,
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: "flex", gap }}>
            {data.weeks.map((week, wi) => (
              <div
                key={wi}
                style={{ display: "flex", flexDirection: "column", gap }}
              >
                {week.map((day, di) => (
                  <HeatmapCell key={di} day={day} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.35rem",
          marginTop: "1rem",
          justifyContent: "flex-end",
        }}
      >
        <span
          style={{
            fontSize: "0.65rem",
            color: "var(--text-dim)",
            fontFamily: "var(--font-mono)",
            margin: "0 0.25rem",
          }}
        >
          Less
        </span>
        {[
          "var(--surface-2)",
          "var(--orange-1)",
          "var(--orange-2)",
          "var(--orange-3)",
          "var(--orange-4)",
          "var(--orange-5)",
        ].map((bg, i) => (
          <div
            key={i}
            style={{
              width: 13,
              height: 13,
              borderRadius: 3,
              background: bg,
              ...(i === 1 ? { border: "1px solid var(--orange-2)" } : {}),
            }}
          />
        ))}
        <span
          style={{
            fontSize: "0.65rem",
            color: "var(--text-dim)",
            fontFamily: "var(--font-mono)",
            margin: "0 0.25rem",
          }}
        >
          More
        </span>
      </div>
    </>
  );
}

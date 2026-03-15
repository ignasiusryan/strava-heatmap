"use client";

import { buildHeatmap } from "@/lib/heatmap";
import { HeatmapCell } from "./HeatmapCell";
import type { HeatmapData } from "@/lib/heatmap";

interface Props {
  years: number[];
  dateMap: Record<string, number>;
  excluded: Set<number>;
  onToggleYear: (year: number) => void;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function StackedHeatmap({ years, dateMap, excluded, onToggleYear }: Props) {
  const cellSize = 13;
  const gap = 3;
  const step = cellSize + gap;

  const visibleYears = years.filter((y) => !excluded.has(y));

  const yearData: { year: number; data: HeatmapData }[] = visibleYears.map(
    (year) => ({
      year,
      data: buildHeatmap(dateMap, { type: "year", year }),
    })
  );

  return (
    <div>
      {/* Year filter chips */}
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          flexWrap: "wrap",
          marginBottom: "1.25rem",
        }}
      >
        {years.map((y) => {
          const isActive = !excluded.has(y);
          return (
            <button
              key={y}
              onClick={() => onToggleYear(y)}
              style={{
                padding: "0.3rem 0.6rem",
                border: `1px solid ${isActive ? "var(--orange-4)" : "var(--border)"}`,
                borderRadius: "6px",
                background: isActive ? "var(--orange-1)" : "transparent",
                color: isActive ? "var(--orange-5)" : "var(--text-dim)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.68rem",
                cursor: "pointer",
                transition: "all 0.15s",
                opacity: isActive ? 1 : 0.5,
              }}
            >
              {y}
            </button>
          );
        })}
      </div>

      {/* Each year stacked */}
      {yearData.map(({ year, data }) => (
        <div key={year} style={{ marginBottom: "1.5rem" }}>
          {/* Year label centered */}
          <div
            style={{
              textAlign: "center",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              marginBottom: "0.5rem",
            }}
          >
            {year}
          </div>

          {/* Month labels per year */}
          <div
            style={{
              position: "relative",
              height: 16,
              marginLeft: 36,
              marginBottom: 4,
              width: data.weeks.length * step,
            }}
          >
            {data.months.map((m, i) => (
              <span
                key={i}
                style={{
                  position: "absolute",
                  left: m.weekIndex * step,
                  fontSize: "0.6rem",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div style={{ overflowX: "auto", paddingBottom: "0.25rem" }}>
            <div
              style={{
                display: "inline-flex",
                gap: 0,
                alignItems: "flex-start",
              }}
            >
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
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap,
                    }}
                  >
                    {week.map((day, di) => (
                      <HeatmapCell key={di} day={day} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Shared legend at bottom */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.35rem",
          marginTop: "0.5rem",
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
    </div>
  );
}

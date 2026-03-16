"use client";

import { useState, useMemo } from "react";
import { useTheme } from "./ThemeProvider";
import { DARK, LIGHT, downloadCanvas, downloadBtnStyle } from "@/lib/download-theme";
import type { Activity } from "./Dashboard";

interface Props {
  activities: Activity[];
}

type SplitMode = "all" | "weekday" | "weekend";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function hourLabel(h: number): string {
  return `${h.toString().padStart(2, "0")}:00`;
}

function hourLabelShort(h: number): string {
  return h.toString().padStart(2, "0");
}

// Extract hour directly from the ISO string to avoid timezone conversion.
// Strava's start_date_local is already in the activity's local time but
// has a Z suffix, so new Date() would misinterpret it as UTC.
function getLocalHour(dateStr: string): number {
  // Format: "2024-01-15T06:30:00Z" — hour is at index 11-12
  return parseInt(dateStr.slice(11, 13), 10);
}

function getHourCounts(activities: Activity[]): number[] {
  const counts = new Array(24).fill(0);
  for (const a of activities) {
    counts[getLocalHour(a.start_date_local)]++;
  }
  return counts;
}

function isWeekend(dateStr: string): boolean {
  // Parse date portion only to avoid timezone shift
  const day = new Date(dateStr.slice(0, 10) + "T12:00:00").getDay();
  return day === 0 || day === 6;
}

export function RunTimesChart({ activities }: Props) {
  const [split, setSplit] = useState<SplitMode>("all");
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const [capturing, setCapturing] = useState(false);
  const { theme } = useTheme();

  const weekdayActivities = useMemo(
    () => activities.filter((a) => !isWeekend(a.start_date_local)),
    [activities]
  );
  const weekendActivities = useMemo(
    () => activities.filter((a) => isWeekend(a.start_date_local)),
    [activities]
  );

  const allCounts = useMemo(() => getHourCounts(activities), [activities]);
  const weekdayCounts = useMemo(
    () => getHourCounts(weekdayActivities),
    [weekdayActivities]
  );
  const weekendCounts = useMemo(
    () => getHourCounts(weekendActivities),
    [weekendActivities]
  );

  const datasets = useMemo(() => {
    if (split === "all") {
      return [{ label: "All runs", counts: allCounts, color: "#ff8c00" }];
    }
    return [
      { label: "Weekday", counts: weekdayCounts, color: "#ff8c00" },
      { label: "Weekend", counts: weekendCounts, color: "#4ecdc4" },
    ];
  }, [split, allCounts, weekdayCounts, weekendCounts]);

  const maxCount = Math.max(1, ...datasets.flatMap((d) => d.counts));

  // SVG dimensions
  const size = 460;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 50;
  const innerR = outerR * 0.3;
  const barMaxR = outerR - innerR;

  const barAngle = (2 * Math.PI) / 24;
  const barGap = 0.015; // radians
  const barWidth =
    split === "all" ? barAngle - barGap * 2 : (barAngle - barGap * 3) / 2;

  function polarToXY(
    angle: number,
    r: number
  ): { x: number; y: number } {
    // 0 hours at top, clockwise
    const a = angle - Math.PI / 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }

  function barPath(
    hourIndex: number,
    datasetIndex: number,
    value: number
  ): string {
    const barR = innerR + (value / maxCount) * barMaxR;
    if (barR <= innerR + 1) return "";

    const baseAngle = (hourIndex / 24) * 2 * Math.PI;
    let startAngle: number;
    if (split === "all") {
      startAngle = baseAngle + barGap;
    } else {
      startAngle = baseAngle + barGap + datasetIndex * (barWidth + barGap);
    }
    const endAngle = startAngle + barWidth;

    const p1 = polarToXY(startAngle, innerR);
    const p2 = polarToXY(startAngle, barR);
    const p3 = polarToXY(endAngle, barR);
    const p4 = polarToXY(endAngle, innerR);

    const largeArc = 0;
    return [
      `M${p1.x},${p1.y}`,
      `L${p2.x},${p2.y}`,
      `A${barR},${barR},0,${largeArc},1,${p3.x},${p3.y}`,
      `L${p4.x},${p4.y}`,
      `A${innerR},${innerR},0,${largeArc},0,${p1.x},${p1.y}`,
      "Z",
    ].join(" ");
  }

  // Find peak hour for center display
  const peakHour = allCounts.indexOf(Math.max(...allCounts));
  const totalRuns = allCounts.reduce((a, b) => a + b, 0);

  // Download handler
  const handleDownload = () => {
    setCapturing(true);
    try {
      const c = theme === "dark" ? DARK : LIGHT;
      const S = 2;
      const canvasSize = 560 * S;
      const canvas = document.createElement("canvas");
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      const ctx = canvas.getContext("2d")!;

      // Background
      ctx.fillStyle = c.surface;
      ctx.beginPath();
      ctx.roundRect(0, 0, canvasSize, canvasSize, 18 * S);
      ctx.fill();
      ctx.strokeStyle = c.border;
      ctx.lineWidth = S;
      ctx.beginPath();
      ctx.roundRect(0, 0, canvasSize, canvasSize, 18 * S);
      ctx.stroke();

      const px = 30 * S;

      // Header
      ctx.fillStyle = c.orange5;
      ctx.font = `600 ${7 * S}px 'JetBrains Mono', monospace`;
      ctx.fillText("STRAVA HEATMAP", px, px + 10 * S);

      ctx.fillStyle = c.text;
      ctx.font = `800 ${16 * S}px Outfit, sans-serif`;
      ctx.fillText("Run Times", px, px + 28 * S);

      // Clock
      const clockCx = canvasSize / 2;
      const clockCy = canvasSize / 2 + 20 * S;
      const clockOuterR = (canvasSize - 120 * S) / 2;
      const clockInnerR = clockOuterR * 0.3;
      const clockBarMaxR = clockOuterR - clockInnerR;
      const clockBarAngle = (2 * Math.PI) / 24;
      const clockBarGap = 0.015;
      const clockBarWidth =
        split === "all"
          ? clockBarAngle - clockBarGap * 2
          : (clockBarAngle - clockBarGap * 3) / 2;

      function cPolar(angle: number, r: number) {
        const a = angle - Math.PI / 2;
        return { x: clockCx + r * Math.cos(a), y: clockCy + r * Math.sin(a) };
      }

      // Concentric rings
      ctx.strokeStyle = c.border;
      ctx.lineWidth = 0.5 * S;
      for (let ring = 0.25; ring <= 1; ring += 0.25) {
        const r = clockInnerR + ring * clockBarMaxR;
        ctx.beginPath();
        ctx.arc(clockCx, clockCy, r, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Hour lines and labels
      ctx.fillStyle = c.textDim;
      ctx.font = `400 ${8 * S}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let h = 0; h < 24; h++) {
        const angle = (h / 24) * 2 * Math.PI;
        const tickStart = cPolar(angle, clockInnerR - 4 * S);
        const tickEnd = cPolar(angle, clockInnerR);
        ctx.strokeStyle = c.border;
        ctx.lineWidth = 0.5 * S;
        ctx.beginPath();
        ctx.moveTo(tickStart.x, tickStart.y);
        ctx.lineTo(tickEnd.x, tickEnd.y);
        ctx.stroke();

        const labelPos = cPolar(angle, clockOuterR + 14 * S);
        ctx.fillStyle = h % 6 === 0 ? c.textMuted : c.textDim;
        ctx.font = h % 6 === 0
          ? `600 ${8 * S}px 'JetBrains Mono', monospace`
          : `400 ${6.5 * S}px 'JetBrains Mono', monospace`;
        ctx.fillText(hourLabelShort(h), labelPos.x, labelPos.y);
      }

      // Bars
      for (let di = 0; di < datasets.length; di++) {
        const ds = datasets[di];
        for (let h = 0; h < 24; h++) {
          if (ds.counts[h] === 0) continue;
          const barR = clockInnerR + (ds.counts[h] / maxCount) * clockBarMaxR;
          const baseAngle = (h / 24) * 2 * Math.PI;
          let startA: number;
          if (split === "all") {
            startA = baseAngle + clockBarGap;
          } else {
            startA = baseAngle + clockBarGap + di * (clockBarWidth + clockBarGap);
          }
          const endA = startA + clockBarWidth;

          const p1 = cPolar(startA, clockInnerR);
          const p2 = cPolar(startA, barR);
          const p3 = cPolar(endA, barR);
          const p4 = cPolar(endA, clockInnerR);

          ctx.fillStyle = ds.color;
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.arc(clockCx, clockCy, barR, startA - Math.PI / 2, endA - Math.PI / 2);
          ctx.lineTo(p4.x, p4.y);
          ctx.arc(clockCx, clockCy, clockInnerR, endA - Math.PI / 2, startA - Math.PI / 2, true);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // Center text
      ctx.fillStyle = c.text;
      ctx.font = `800 ${20 * S}px Outfit, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(hourLabel(peakHour), clockCx, clockCy - 4 * S);
      ctx.fillStyle = c.textDim;
      ctx.font = `400 ${7 * S}px 'JetBrains Mono', monospace`;
      ctx.fillText("peak hour", clockCx, clockCy + 12 * S);

      // Legend
      if (split !== "all") {
        const legendY = canvasSize - 24 * S;
        ctx.font = `600 ${7 * S}px 'JetBrains Mono', monospace`;
        for (let di = 0; di < datasets.length; di++) {
          const lx = canvasSize / 2 + (di - 0.5) * 80 * S;
          ctx.fillStyle = datasets[di].color;
          ctx.beginPath();
          ctx.arc(lx - 8 * S, legendY, 4 * S, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = c.textMuted;
          ctx.textAlign = "left";
          ctx.fillText(datasets[di].label, lx, legendY + 3 * S);
        }
      }

      downloadCanvas(canvas, "strava-run-times.png");
    } catch (e) {
      console.error("Download failed:", e);
    }
    setCapturing(false);
  };

  return (
    <div>
      {/* Controls */}
      <div
        className="filter-row"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.25rem" }}>
          {(["all", "weekday", "weekend"] as const).map((s) => {
            const isActive = split === s;
            const labels: Record<SplitMode, string> = {
              all: "All Days",
              weekday: "Weekday",
              weekend: "Weekend",
            };
            return (
              <button
                key={s}
                onClick={() =>
                  setSplit((prev) => (prev === s && s !== "all" ? "all" : s))
                }
                style={{
                  padding: "0.25rem 0.5rem",
                  border: `1px solid ${isActive ? "var(--orange-3)" : "var(--border)"}`,
                  borderRadius: "6px",
                  background: isActive ? "linear-gradient(135deg, var(--surface), var(--orange-1))" : "transparent",
                  color: isActive ? "var(--orange-5)" : "var(--text-dim)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {labels[s]}
              </button>
            );
          })}
          {split === "all" && (
            <button
              onClick={() => setSplit("weekday")}
              style={{
                padding: "0.25rem 0.5rem",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                background: "transparent",
                color: "var(--text-dim)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.65rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              Split Weekday / Weekend
            </button>
          )}
        </div>
        <button
          onClick={handleDownload}
          disabled={capturing}
          style={{
            ...downloadBtnStyle,
            cursor: capturing ? "wait" : "pointer",
            opacity: capturing ? 0.5 : 1,
          }}
        >
          {capturing ? "Capturing..." : "Download PNG"}
        </button>
      </div>

      {/* Clock chart */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "1rem 0",
        }}
      >
        <svg
          viewBox={`0 0 ${size} ${size}`}
          style={{ width: "100%", maxWidth: 460, height: "auto" }}
        >
          {/* Concentric guide rings */}
          {[0.25, 0.5, 0.75, 1].map((ring) => {
            const r = innerR + ring * barMaxR;
            return (
              <circle
                key={ring}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="var(--border)"
                strokeWidth={0.5}
                opacity={0.5}
              />
            );
          })}

          {/* Hour tick marks and labels */}
          {HOURS.map((h) => {
            const angle = (h / 24) * 2 * Math.PI;
            const tickStart = polarToXY(angle, innerR - 4);
            const tickEnd = polarToXY(angle, innerR);
            const labelPos = polarToXY(angle, outerR + 14);

            return (
              <g key={h}>
                <line
                  x1={tickStart.x}
                  y1={tickStart.y}
                  x2={tickEnd.x}
                  y2={tickEnd.y}
                  stroke="var(--border)"
                  strokeWidth={0.5}
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={h % 6 === 0 ? "var(--text-muted)" : "var(--text-dim)"}
                  fontSize={h % 6 === 0 ? 9 : 7.5}
                  fontWeight={h % 6 === 0 ? 600 : 400}
                  fontFamily="var(--font-mono)"
                >
                  {hourLabelShort(h)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {datasets.map((ds, di) =>
            HOURS.map((h) => {
              if (ds.counts[h] === 0) return null;
              const d = barPath(h, di, ds.counts[h]);
              if (!d) return null;
              const isHovered = hoveredHour === h;

              return (
                <path
                  key={`${di}-${h}`}
                  d={d}
                  fill={ds.color}
                  opacity={
                    hoveredHour !== null ? (isHovered ? 0.95 : 0.2) : 0.75
                  }
                  style={{ cursor: "pointer", transition: "opacity 0.15s" }}
                  onMouseEnter={() => setHoveredHour(h)}
                  onMouseLeave={() => setHoveredHour(null)}
                />
              );
            })
          )}

          {/* Center info */}
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            fill="var(--text)"
            fontSize={22}
            fontWeight={800}
            fontFamily="Outfit, sans-serif"
          >
            {hoveredHour !== null ? hourLabel(hoveredHour) : hourLabel(peakHour)}
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            fill="var(--text-dim)"
            fontSize={9}
            fontFamily="var(--font-mono)"
          >
            {hoveredHour !== null
              ? `${allCounts[hoveredHour]} runs`
              : "peak hour"}
          </text>
          {hoveredHour !== null && split !== "all" && (
            <>
              <text
                x={cx}
                y={cy + 28}
                textAnchor="middle"
                fontSize={8}
                fontFamily="var(--font-mono)"
              >
                <tspan fill="#ff8c00">
                  {weekdayCounts[hoveredHour]} weekday
                </tspan>
                <tspan fill="var(--text-dim)"> / </tspan>
                <tspan fill="#4ecdc4">
                  {weekendCounts[hoveredHour]} weekend
                </tspan>
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Legend for split mode */}
      {split !== "all" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.5rem",
            marginTop: "0.5rem",
          }}
        >
          {datasets.map((ds) => (
            <div
              key={ds.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: ds.color,
                }}
              />
              <span
                style={{
                  fontSize: "0.68rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                }}
              >
                {ds.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Summary stats */}
      <div
        className="time-summary-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0.75rem",
          marginTop: "1.25rem",
        }}
      >
        {[
          {
            label: "Morning",
            desc: "5am - 12pm",
            count: allCounts.slice(5, 12).reduce((a, b) => a + b, 0),
          },
          {
            label: "Afternoon",
            desc: "12pm - 5pm",
            count: allCounts.slice(12, 17).reduce((a, b) => a + b, 0),
          },
          {
            label: "Evening",
            desc: "5pm - 10pm",
            count: allCounts.slice(17, 22).reduce((a, b) => a + b, 0),
          },
        ].map((period) => (
          <div
            key={period.label}
            style={{
              background: "var(--surface-2)",
              borderRadius: "10px",
              padding: "0.75rem 1rem",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "1.1rem",
                fontWeight: 800,
                color: "var(--text)",
              }}
            >
              {period.count}
            </div>
            <div
              style={{
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {period.label}
            </div>
            <div
              style={{
                fontSize: "0.6rem",
                color: "var(--text-dim)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {period.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

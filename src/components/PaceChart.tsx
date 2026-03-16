"use client";

import { useState, useMemo } from "react";
import { formatPace } from "@/lib/format";
import type { Activity } from "./Dashboard";

interface Props {
  activities: Activity[];
  allActivities: Activity[];
  showYearComparison: boolean;
}

interface DataPoint {
  id: number;
  name: string;
  date: string;
  year: number;
  distanceKm: number;
  paceMinKm: number;
}

// Distinct colors for year trend lines
const YEAR_COLORS = [
  "#ff6b00", // deep orange
  "#4ecdc4", // teal
  "#ff6b9d", // pink
  "#a78bfa", // purple
  "#fbbf24", // amber
  "#34d399", // emerald
  "#60a5fa", // blue
  "#f472b6", // rose
  "#c084fc", // violet
  "#fb923c", // light orange
];

function toPoints(activities: Activity[]): DataPoint[] {
  return activities
    .filter((a) => a.distance > 0 && a.moving_time > 0)
    .map((a) => {
      const distanceKm = a.distance / 1000;
      const paceMinKm = a.moving_time / 60 / distanceKm;
      return {
        id: a.id,
        name: a.name,
        date: a.start_date_local.slice(0, 10),
        year: new Date(a.start_date_local).getFullYear(),
        distanceKm,
        paceMinKm,
      };
    })
    .filter((p) => p.paceMinKm > 2 && p.paceMinKm < 15);
}

/** Compute a smoothed trend line using binned averages */
function computeTrendLine(
  pts: DataPoint[],
  maxDist: number
): { x: number; y: number }[] {
  if (pts.length < 3) return [];

  const numBins = 20;
  const binWidth = maxDist / numBins;
  const bins: { sum: number; count: number }[] = Array.from(
    { length: numBins },
    () => ({ sum: 0, count: 0 })
  );

  for (const p of pts) {
    const bi = Math.min(Math.floor(p.distanceKm / binWidth), numBins - 1);
    bins[bi].sum += p.paceMinKm;
    bins[bi].count += 1;
  }

  // Only keep bins with data, and smooth with neighbors
  const raw: { x: number; y: number }[] = [];
  for (let i = 0; i < numBins; i++) {
    if (bins[i].count === 0) continue;
    raw.push({
      x: (i + 0.5) * binWidth,
      y: bins[i].sum / bins[i].count,
    });
  }

  if (raw.length < 2) return raw;

  // Simple 3-point moving average for smoothing
  const smoothed: { x: number; y: number }[] = [];
  for (let i = 0; i < raw.length; i++) {
    const prev = i > 0 ? raw[i - 1].y : raw[i].y;
    const next = i < raw.length - 1 ? raw[i + 1].y : raw[i].y;
    smoothed.push({ x: raw[i].x, y: (prev + raw[i].y + next) / 3 });
  }

  return smoothed;
}

/** Build an SVG path from points */
function trendPath(
  line: { x: number; y: number }[],
  xScale: (v: number) => number,
  yScale: (v: number) => number
): string {
  if (line.length === 0) return "";
  return line
    .map((p, i) => `${i === 0 ? "M" : "L"}${xScale(p.x)},${yScale(p.y)}`)
    .join(" ");
}

export function PaceChart({
  activities,
  allActivities,
  showYearComparison,
}: Props) {
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);

  // Points for display (filtered by current mode)
  const points = useMemo(() => toPoints(activities), [activities]);

  // Points grouped by year (for trend lines in "all years" mode)
  const yearGroups = useMemo(() => {
    if (!showYearComparison) return new Map<number, DataPoint[]>();
    const all = toPoints(allActivities);
    const groups = new Map<number, DataPoint[]>();
    for (const p of all) {
      if (!groups.has(p.year)) groups.set(p.year, []);
      groups.get(p.year)!.push(p);
    }
    return groups;
  }, [allActivities, showYearComparison]);

  const sortedYears = useMemo(
    () => [...yearGroups.keys()].sort((a, b) => a - b),
    [yearGroups]
  );

  const displayPoints = showYearComparison
    ? toPoints(allActivities)
    : points;

  if (displayPoints.length === 0) {
    return (
      <div
        style={{
          padding: "3rem",
          textAlign: "center",
          color: "var(--text-dim)",
          fontFamily: "var(--font-mono)",
          fontSize: "0.8rem",
        }}
      >
        No pace data available
      </div>
    );
  }

  // Chart dimensions
  const width = 800;
  const height = 420;
  const pad = { top: 20, right: 30, bottom: 50, left: 55 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  // Axis ranges
  const maxDist =
    Math.ceil(Math.max(...displayPoints.map((p) => p.distanceKm)) + 1);
  const minPace = Math.floor(
    Math.min(...displayPoints.map((p) => p.paceMinKm))
  );
  const maxPace = Math.ceil(
    Math.max(...displayPoints.map((p) => p.paceMinKm))
  );

  // Scale functions
  const xScale = (v: number) => pad.left + (v / maxDist) * plotW;
  const yScale = (v: number) =>
    pad.top + ((v - minPace) / (maxPace - minPace)) * plotH;

  // Grid lines
  const xTicks: number[] = [];
  const xStep = maxDist <= 15 ? 2 : maxDist <= 30 ? 5 : 10;
  for (let i = 0; i <= maxDist; i += xStep) xTicks.push(i);

  const yTicks: number[] = [];
  const yStep = maxPace - minPace > 6 ? 1 : 0.5;
  for (let i = minPace; i <= maxPace; i += yStep) yTicks.push(i);

  // Year color map
  const yearColor = (year: number) => {
    const idx = sortedYears.indexOf(year);
    return YEAR_COLORS[idx % YEAR_COLORS.length];
  };

  // Dot color: by pace (single year) or by year (comparison)
  const getColor = (p: DataPoint) => {
    if (showYearComparison) return yearColor(p.year);
    const t = 1 - (p.paceMinKm - minPace) / (maxPace - minPace);
    if (t > 0.8) return "#ff6b00";
    if (t > 0.6) return "#ff8c00";
    if (t > 0.4) return "#ffa940";
    if (t > 0.2) return "#ffc470";
    return "#ffdca8";
  };

  // Compute trend lines per year
  const trendLines = useMemo(() => {
    if (!showYearComparison) return [];
    return sortedYears.map((year) => ({
      year,
      line: computeTrendLine(yearGroups.get(year) || [], maxDist),
    }));
  }, [showYearComparison, sortedYears, yearGroups, maxDist]);

  // Dot opacity
  const dotOpacity = (p: DataPoint) => {
    if (hoveredPoint) return hoveredPoint.id === p.id ? 1 : 0.2;
    if (hoveredYear !== null) return p.year === hoveredYear ? 0.85 : 0.12;
    return showYearComparison ? 0.5 : 0.75;
  };

  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto" }}
      >
        {/* Grid lines */}
        {xTicks.map((v) => (
          <line
            key={`xg-${v}`}
            x1={xScale(v)}
            x2={xScale(v)}
            y1={pad.top}
            y2={pad.top + plotH}
            stroke="var(--border)"
            strokeWidth={0.5}
          />
        ))}
        {yTicks.map((v) => (
          <line
            key={`yg-${v}`}
            x1={pad.left}
            x2={pad.left + plotW}
            y1={yScale(v)}
            y2={yScale(v)}
            stroke="var(--border)"
            strokeWidth={0.5}
          />
        ))}

        {/* Axis labels */}
        {xTicks.map((v) => (
          <text
            key={`xl-${v}`}
            x={xScale(v)}
            y={pad.top + plotH + 24}
            textAnchor="middle"
            fill="var(--text-dim)"
            fontSize={10}
            fontFamily="var(--font-mono)"
          >
            {v}
          </text>
        ))}
        {yTicks.map((v) => (
          <text
            key={`yl-${v}`}
            x={pad.left - 10}
            y={yScale(v) + 4}
            textAnchor="end"
            fill="var(--text-dim)"
            fontSize={10}
            fontFamily="var(--font-mono)"
          >
            {formatPace(v)}
          </text>
        ))}

        {/* Axis titles */}
        <text
          x={pad.left + plotW / 2}
          y={height - 6}
          textAnchor="middle"
          fill="var(--text-muted)"
          fontSize={11}
          fontFamily="var(--font-mono)"
        >
          Distance (km)
        </text>
        <text
          x={14}
          y={pad.top + plotH / 2}
          textAnchor="middle"
          fill="var(--text-muted)"
          fontSize={11}
          fontFamily="var(--font-mono)"
          transform={`rotate(-90, 14, ${pad.top + plotH / 2})`}
        >
          Avg Pace (min/km)
        </text>

        {/* Data points */}
        {displayPoints.map((p) => (
          <circle
            key={p.id}
            cx={xScale(p.distanceKm)}
            cy={yScale(p.paceMinKm)}
            r={hoveredPoint?.id === p.id ? 6 : 3.5}
            fill={getColor(p)}
            opacity={dotOpacity(p)}
            stroke={hoveredPoint?.id === p.id ? "var(--text)" : "transparent"}
            strokeWidth={1.5}
            style={{ cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={(e) => {
              const svg = e.currentTarget.closest("svg");
              if (!svg) return;
              const rect = svg.getBoundingClientRect();
              const scaleX = rect.width / width;
              const scaleY = rect.height / height;
              setHoverPos({
                x: xScale(p.distanceKm) * scaleX,
                y: yScale(p.paceMinKm) * scaleY,
              });
              setHoveredPoint(p);
            }}
            onMouseLeave={() => setHoveredPoint(null)}
          />
        ))}

        {/* Trend lines per year */}
        {trendLines.map(({ year, line }) => {
          if (line.length < 2) return null;
          const color = yearColor(year);
          const isHovered = hoveredYear === year;
          const dimmed = hoveredYear !== null && !isHovered;
          const pathD = trendPath(line, xScale, yScale);

          // Find label position at end of line
          const last = line[line.length - 1];

          return (
            <g key={`trend-${year}`}>
              <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={isHovered ? 3 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={dimmed ? 0.15 : 0.9}
                style={{ transition: "all 0.2s" }}
              />
              {/* Year label at end of trend line */}
              <text
                x={xScale(last.x) + 6}
                y={yScale(last.y) + 4}
                fill={color}
                fontSize={11}
                fontWeight={700}
                fontFamily="var(--font-mono)"
                opacity={dimmed ? 0.2 : 1}
                style={{ transition: "opacity 0.2s" }}
              >
                {year}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          style={{
            position: "absolute",
            left: hoverPos.x,
            top: hoverPos.y - 12,
            transform: "translate(-50%, -100%)",
            background: "var(--surface)",
            border: "1px solid var(--orange-3)",
            borderRadius: "10px",
            padding: "0.5rem 0.75rem",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 10,
            boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: "0.75rem",
              color: "var(--text)",
              marginBottom: "0.2rem",
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {hoveredPoint.name}
          </div>
          <div
            style={{
              fontSize: "0.68rem",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              display: "flex",
              gap: "0.75rem",
            }}
          >
            <span>{hoveredPoint.distanceKm.toFixed(1)} km</span>
            <span>{formatPace(hoveredPoint.paceMinKm)} /km</span>
            <span style={{ color: "var(--text-dim)" }}>{hoveredPoint.date}</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "0.35rem",
          marginTop: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        {showYearComparison ? (
          /* Year legend with hover interaction */
          sortedYears.map((year) => (
            <button
              key={year}
              onMouseEnter={() => setHoveredYear(year)}
              onMouseLeave={() => setHoveredYear(null)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.25rem 0.5rem",
                border: `1px solid ${
                  hoveredYear === year ? yearColor(year) : "var(--border)"
                }`,
                borderRadius: "6px",
                background:
                  hoveredYear === year
                    ? `${yearColor(year)}18`
                    : "transparent",
                cursor: "pointer",
                transition: "all 0.15s",
                opacity: hoveredYear !== null && hoveredYear !== year ? 0.4 : 1,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: yearColor(year),
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
                {year}
              </span>
            </button>
          ))
        ) : (
          <>
            <span
              style={{
                fontSize: "0.65rem",
                color: "var(--text-dim)",
                fontFamily: "var(--font-mono)",
                marginRight: "0.25rem",
              }}
            >
              Slower
            </span>
            {["#ffdca8", "#ffc470", "#ffa940", "#ff8c00", "#ff6b00"].map(
              (c, i) => (
                <div
                  key={i}
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: "50%",
                    background: c,
                  }}
                />
              )
            )}
            <span
              style={{
                fontSize: "0.65rem",
                color: "var(--text-dim)",
                fontFamily: "var(--font-mono)",
                marginLeft: "0.25rem",
              }}
            >
              Faster
            </span>
          </>
        )}
      </div>
    </div>
  );
}

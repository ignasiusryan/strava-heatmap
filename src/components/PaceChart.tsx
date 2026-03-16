"use client";

import { useState, useMemo } from "react";
import { formatPace } from "@/lib/format";
import { useTheme } from "./ThemeProvider";
import { DARK, LIGHT, downloadCanvas, downloadBtnStyle } from "@/lib/download-theme";
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
  "#ff6b00",
  "#4ecdc4",
  "#ff6b9d",
  "#a78bfa",
  "#fbbf24",
  "#34d399",
  "#60a5fa",
  "#f472b6",
  "#c084fc",
  "#fb923c",
];

// Static Y-axis bounds
const MIN_PACE = 4;
const MAX_PACE = 10;

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
    .filter((p) => p.paceMinKm >= MIN_PACE && p.paceMinKm <= MAX_PACE);
}

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

  const raw: { x: number; y: number }[] = [];
  for (let i = 0; i < numBins; i++) {
    if (bins[i].count === 0) continue;
    raw.push({ x: (i + 0.5) * binWidth, y: bins[i].sum / bins[i].count });
  }

  if (raw.length < 2) return raw;

  const smoothed: { x: number; y: number }[] = [];
  for (let i = 0; i < raw.length; i++) {
    const prev = i > 0 ? raw[i - 1].y : raw[i].y;
    const next = i < raw.length - 1 ? raw[i + 1].y : raw[i].y;
    smoothed.push({ x: raw[i].x, y: (prev + raw[i].y + next) / 3 });
  }
  return smoothed;
}

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
  const [maxDistFilter, setMaxDistFilter] = useState<number>(0); // 0 = no filter
  const [capturing, setCapturing] = useState(false);
  const { theme } = useTheme();

  const allPoints = useMemo(
    () => toPoints(showYearComparison ? allActivities : activities),
    [activities, allActivities, showYearComparison]
  );

  // Determine natural max distance for the slider
  const naturalMaxDist = useMemo(() => {
    if (allPoints.length === 0) return 10;
    return Math.ceil(Math.max(...allPoints.map((p) => p.distanceKm)) + 1);
  }, [allPoints]);

  // Effective max distance for display
  const effectiveMaxDist = maxDistFilter > 0 ? maxDistFilter : naturalMaxDist;

  // Filter points by distance
  const displayPoints = useMemo(
    () =>
      maxDistFilter > 0
        ? allPoints.filter((p) => p.distanceKm <= maxDistFilter)
        : allPoints,
    [allPoints, maxDistFilter]
  );

  // Year groups for trend lines
  const yearGroups = useMemo(() => {
    if (!showYearComparison) return new Map<number, DataPoint[]>();
    const groups = new Map<number, DataPoint[]>();
    for (const p of displayPoints) {
      if (!groups.has(p.year)) groups.set(p.year, []);
      groups.get(p.year)!.push(p);
    }
    return groups;
  }, [displayPoints, showYearComparison]);

  const sortedYears = useMemo(
    () => [...yearGroups.keys()].sort((a, b) => a - b),
    [yearGroups]
  );

  if (allPoints.length === 0) {
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

  const xScale = (v: number) => pad.left + (v / effectiveMaxDist) * plotW;
  const yScale = (v: number) =>
    pad.top + ((v - MIN_PACE) / (MAX_PACE - MIN_PACE)) * plotH;

  const xTicks: number[] = [];
  const xStep = effectiveMaxDist <= 15 ? 2 : effectiveMaxDist <= 30 ? 5 : 10;
  for (let i = 0; i <= effectiveMaxDist; i += xStep) xTicks.push(i);

  const yTicks: number[] = [];
  for (let i = MIN_PACE; i <= MAX_PACE; i += 0.5) yTicks.push(i);

  const yearColor = (year: number) => {
    const idx = sortedYears.indexOf(year);
    return YEAR_COLORS[idx % YEAR_COLORS.length];
  };

  const getColor = (p: DataPoint) => {
    if (showYearComparison) return yearColor(p.year);
    const t = 1 - (p.paceMinKm - MIN_PACE) / (MAX_PACE - MIN_PACE);
    if (t > 0.8) return "#ff6b00";
    if (t > 0.6) return "#ff8c00";
    if (t > 0.4) return "#ffa940";
    if (t > 0.2) return "#ffc470";
    return "#ffdca8";
  };

  const trendLines = useMemo(() => {
    if (!showYearComparison) return [];
    return sortedYears.map((year) => ({
      year,
      line: computeTrendLine(yearGroups.get(year) || [], effectiveMaxDist),
    }));
  }, [showYearComparison, sortedYears, yearGroups, effectiveMaxDist]);

  const dotOpacity = (p: DataPoint) => {
    if (hoveredPoint) return hoveredPoint.id === p.id ? 1 : 0.2;
    if (hoveredYear !== null) return p.year === hoveredYear ? 0.85 : 0.12;
    return showYearComparison ? 0.5 : 0.75;
  };

  // Distance filter options
  const distOptions = [0, 5, 10, 15, 21, 30, 42].filter(
    (d) => d === 0 || d <= naturalMaxDist
  );

  // Download handler
  const handleDownload = () => {
    setCapturing(true);
    try {
      const c = theme === "dark" ? DARK : LIGHT;
      const S = 2;
      const canvasW = 900 * S;
      const canvasH = 560 * S;
      const canvas = document.createElement("canvas");
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext("2d")!;

      // Background
      ctx.fillStyle = c.surface;
      ctx.beginPath();
      ctx.roundRect(0, 0, canvasW, canvasH, 18 * S);
      ctx.fill();
      ctx.strokeStyle = c.border;
      ctx.lineWidth = S;
      ctx.beginPath();
      ctx.roundRect(0, 0, canvasW, canvasH, 18 * S);
      ctx.stroke();

      const px = 40 * S;
      const py = 30 * S;
      const headerH = 40 * S;

      // Header
      ctx.fillStyle = c.orange5;
      ctx.font = `600 ${7 * S}px 'JetBrains Mono', monospace`;
      ctx.fillText("STRAVA HEATMAP", px, py + 10 * S);

      ctx.fillStyle = c.text;
      ctx.font = `800 ${16 * S}px Outfit, sans-serif`;
      ctx.fillText("Pace vs Distance", px, py + 28 * S);

      // Chart area
      const chartX = px;
      const chartY = py + headerH;
      const chartW = canvasW - px * 2;
      const chartH = canvasH - chartY - 50 * S;

      const cxScale = (v: number) => chartX + (v / effectiveMaxDist) * chartW;
      const cyScale = (v: number) =>
        chartY + ((v - MIN_PACE) / (MAX_PACE - MIN_PACE)) * chartH;

      // Grid
      ctx.strokeStyle = c.border;
      ctx.lineWidth = 0.5 * S;
      for (const v of xTicks) {
        ctx.beginPath();
        ctx.moveTo(cxScale(v), chartY);
        ctx.lineTo(cxScale(v), chartY + chartH);
        ctx.stroke();
      }
      for (const v of yTicks) {
        ctx.beginPath();
        ctx.moveTo(chartX, cyScale(v));
        ctx.lineTo(chartX + chartW, cyScale(v));
        ctx.stroke();
      }

      // Axis labels
      ctx.fillStyle = c.textDim;
      ctx.font = `400 ${8 * S}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "center";
      for (const v of xTicks) {
        ctx.fillText(String(v), cxScale(v), chartY + chartH + 16 * S);
      }
      ctx.textAlign = "right";
      for (const v of yTicks) {
        if (v === Math.floor(v))
          ctx.fillText(formatPace(v), chartX - 6 * S, cyScale(v) + 4 * S);
      }

      // Axis titles
      ctx.fillStyle = c.textMuted;
      ctx.font = `400 ${9 * S}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "center";
      ctx.fillText("Distance (km)", chartX + chartW / 2, canvasH - 10 * S);

      ctx.save();
      ctx.translate(12 * S, chartY + chartH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("Avg Pace (min/km)", 0, 0);
      ctx.restore();

      // Data points
      for (const p of displayPoints) {
        ctx.beginPath();
        ctx.arc(cxScale(p.distanceKm), cyScale(p.paceMinKm), 3 * S, 0, 2 * Math.PI);
        ctx.fillStyle = getColor(p);
        ctx.globalAlpha = showYearComparison ? 0.5 : 0.75;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Trend lines
      if (showYearComparison) {
        for (const { year, line } of trendLines) {
          if (line.length < 2) continue;
          const color = yearColor(year);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2 * S;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(cxScale(line[0].x), cyScale(line[0].y));
          for (let i = 1; i < line.length; i++) {
            ctx.lineTo(cxScale(line[i].x), cyScale(line[i].y));
          }
          ctx.stroke();

          // Year label
          const last = line[line.length - 1];
          ctx.fillStyle = color;
          ctx.font = `700 ${9 * S}px 'JetBrains Mono', monospace`;
          ctx.textAlign = "left";
          ctx.fillText(String(year), cxScale(last.x) + 6 * S, cyScale(last.y) + 4 * S);
        }
      }

      downloadCanvas(canvas, "strava-pace-chart.png");
    } catch (e) {
      console.error("Download failed:", e);
    }
    setCapturing(false);
  };

  return (
    <div>
      {/* Controls row */}
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
        {/* Distance filter */}
        <div
          className="filter-chips"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
        >
          <span
            style={{
              fontSize: "0.68rem",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              marginRight: "0.25rem",
            }}
          >
            Max distance:
          </span>
          {distOptions.map((d) => {
            const isActive =
              d === 0 ? maxDistFilter === 0 : maxDistFilter === d;
            const label = d === 0 ? "All" : `${d} km`;
            return (
              <button
                key={d}
                onClick={() => setMaxDistFilter(d)}
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
                {label}
              </button>
            );
          })}
        </div>

        {/* Download */}
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

      {/* Chart */}
      <div style={{ position: "relative" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: "100%", height: "auto" }}
        >
          {/* Grid */}
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
          {yTicks
            .filter((v) => v === Math.floor(v))
            .map((v) => (
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

          {/* Trend lines */}
          {trendLines.map(({ year, line }) => {
            if (line.length < 2) return null;
            const color = yearColor(year);
            const isHovered = hoveredYear === year;
            const dimmed = hoveredYear !== null && !isHovered;
            const pathD = trendPath(line, xScale, yScale);
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
              <span style={{ color: "var(--text-dim)" }}>
                {hoveredPoint.date}
              </span>
            </div>
          </div>
        )}
      </div>

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
                opacity:
                  hoveredYear !== null && hoveredYear !== year ? 0.4 : 1,
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

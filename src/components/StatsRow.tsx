"use client";

import { formatDuration, formatPace, formatNumber } from "@/lib/format";
import type { Activity } from "./Dashboard";

interface Props {
  activities: Activity[];
}

export function StatsRow({ activities }: Props) {
  const totalKm = activities.reduce((s, a) => s + a.distance, 0) / 1000;
  const totalTime = activities.reduce((s, a) => s + a.moving_time, 0);
  const totalRuns = activities.length;
  const avgPace = totalKm > 0 ? totalTime / 60 / totalKm : 0;

  const stats = [
    { label: "Total Runs", value: formatNumber(totalRuns), unit: "", highlight: false },
    { label: "Distance", value: formatNumber(totalKm, 1), unit: "km", highlight: true },
    { label: "Time", value: formatDuration(totalTime), unit: "", highlight: false },
    {
      label: "Avg Pace",
      value: avgPace > 0 ? formatPace(avgPace) : "—",
      unit: avgPace > 0 ? "/km" : "",
      highlight: false,
    },
  ];

  return (
    <div
      className="stats-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "1rem",
        marginBottom: "2.5rem",
      }}
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          style={{
            background: s.highlight
              ? "linear-gradient(135deg, var(--surface), var(--orange-1))"
              : "var(--surface)",
            border: `1px solid ${s.highlight ? "var(--orange-3)" : "var(--border)"}`,
            borderRadius: "14px",
            padding: "1.25rem 1.5rem",
            animation: `slideUp 0.5s ease ${0.05 + i * 0.05}s both`,
          }}
        >
          <div
            style={{
              fontSize: "0.68rem",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              marginBottom: "0.6rem",
            }}
          >
            {s.label}
          </div>
          <div
            className="stat-value"
            style={{
              fontSize: "1.6rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: s.highlight ? "var(--orange-5)" : undefined,
            }}
          >
            {s.value}
            <span
              style={{
                fontSize: "0.85rem",
                fontWeight: 400,
                color: "var(--text-muted)",
                marginLeft: "0.15rem",
              }}
            >
              {s.unit}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { formatDuration, formatPace, formatNumber } from "@/lib/format";
import type { Activity } from "./Dashboard";

interface Props {
  activities: Activity[];
}

export function RecentRuns({ activities }: Props) {
  const runs = [...activities]
    .sort(
      (a, b) =>
        new Date(b.start_date_local).getTime() -
        new Date(a.start_date_local).getTime()
    )
    .slice(0, 8);

  return (
    <div
      className="recent-runs-card"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "18px",
        padding: "2rem",
        animation: "slideUp 0.5s ease 0.35s both",
      }}
    >
      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.25rem" }}>
        Recent Runs
      </h2>

      {runs.length === 0 ? (
        <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
          No runs recorded in this period.
        </p>
      ) : (
        runs.map((r) => {
          const d = new Date(r.start_date_local);
          const dateStr = d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          const km = formatNumber(r.distance / 1000, 2);
          const pace =
            r.distance > 0
              ? formatPace(r.moving_time / 60 / (r.distance / 1000))
              : "—";
          const dur = formatDuration(r.moving_time);

          return (
            <div
              key={r.id}
              className="run-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "0.85rem 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--orange-5)",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {r.name}
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {dateStr}
                </div>
              </div>
              <div className="run-stats" style={{ display: "flex", gap: "1.5rem", flexShrink: 0 }}>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      textAlign: "right",
                    }}
                  >
                    {km}
                    <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>
                      {" "}
                      km
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.6rem",
                      color: "var(--text-dim)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontFamily: "var(--font-mono)",
                      textAlign: "right",
                    }}
                  >
                    Distance
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      textAlign: "right",
                    }}
                  >
                    {pace}
                  </div>
                  <div
                    style={{
                      fontSize: "0.6rem",
                      color: "var(--text-dim)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontFamily: "var(--font-mono)",
                      textAlign: "right",
                    }}
                  >
                    Pace
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      textAlign: "right",
                    }}
                  >
                    {dur}
                  </div>
                  <div
                    style={{
                      fontSize: "0.6rem",
                      color: "var(--text-dim)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontFamily: "var(--font-mono)",
                      textAlign: "right",
                    }}
                  >
                    Time
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

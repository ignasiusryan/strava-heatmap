"use client";

import { useMemo } from "react";
import { formatDuration, formatPace, formatNumber } from "@/lib/format";
import { decodePolyline, normalizePoints } from "@/lib/polyline";
import type { Activity } from "./Dashboard";

interface Props {
  activities: Activity[];
}

const THUMB_SIZE = 36;

function RouteThumb({ activity }: { activity: Activity }) {
  const polyline = activity.map?.summary_polyline;

  const path = useMemo(() => {
    if (!polyline) return null;
    const decoded = decodePolyline(polyline);
    if (decoded.length < 2) return null;
    const pts = normalizePoints(decoded, THUMB_SIZE);
    return (
      "M " +
      pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")
    );
  }, [polyline]);

  if (!path) {
    return (
      <div
        style={{
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: 8,
          background: "var(--surface-2)",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <svg
      width={THUMB_SIZE}
      height={THUMB_SIZE}
      viewBox={`0 0 ${THUMB_SIZE} ${THUMB_SIZE}`}
      style={{
        display: "block",
        flexShrink: 0,
        borderRadius: 8,
        background: "var(--surface-2)",
      }}
    >
      <path
        d={path}
        fill="none"
        stroke="var(--orange-5)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getLocation(activity: Activity): string | null {
  // Prefer reverse-geocoded city
  if (activity.resolved_city) return activity.resolved_city;
  if (activity.location_city) return activity.location_city;
  if (activity.location_state) return activity.location_state;
  if (activity.timezone) {
    const match = activity.timezone.match(/\/([^)]+)$/);
    if (match) return match[1].replace(/_/g, " ");
  }
  return null;
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
          const location = getLocation(r);

          return (
            <div
              key={r.id}
              className="run-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.85rem 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {/* Route thumbnail */}
              <RouteThumb activity={r} />

              {/* Name, date, location */}
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
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                  }}
                >
                  <span>{dateStr}</span>
                  {location && (
                    <>
                      <span style={{ color: "var(--text-dim)" }}>·</span>
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {location}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Stats - fixed width columns */}
              <div
                className="run-stats"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(60px, auto) minmax(48px, auto) minmax(56px, auto)",
                  gap: "1rem",
                  flexShrink: 0,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      textAlign: "right",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {km}
                    <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>
                      {" "}km
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
                      whiteSpace: "nowrap",
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
                      whiteSpace: "nowrap",
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

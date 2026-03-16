"use client";

import { useMemo, useState } from "react";
import { decodePolyline, normalizePoints } from "@/lib/polyline";
import type { Activity } from "./Dashboard";

interface Props {
  activities: Activity[];
}

type SortMode = "oldest" | "newest" | "longest" | "shortest";

const CELL_SIZE = 48;

const sortLabels: Record<SortMode, string> = {
  oldest: "Oldest first",
  newest: "Newest first",
  longest: "Longest first",
  shortest: "Shortest first",
};

function RouteThumb({ activity }: { activity: Activity }) {
  const polyline = activity.map?.summary_polyline;

  const path = useMemo(() => {
    if (!polyline) return null;
    const decoded = decodePolyline(polyline);
    if (decoded.length < 2) return null;
    const pts = normalizePoints(decoded, CELL_SIZE);
    return (
      "M " +
      pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")
    );
  }, [polyline]);

  if (!path) return null;

  return (
    <svg
      width={CELL_SIZE}
      height={CELL_SIZE}
      viewBox={`0 0 ${CELL_SIZE} ${CELL_SIZE}`}
      style={{ display: "block" }}
    >
      <path
        d={path}
        fill="none"
        stroke="var(--text)"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RouteFacets({ activities }: Props) {
  const [sort, setSort] = useState<SortMode>("oldest");

  const withRoutes = useMemo(() => {
    const filtered = activities.filter((a) => a.map?.summary_polyline);

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return (
            new Date(a.start_date_local).getTime() -
            new Date(b.start_date_local).getTime()
          );
        case "newest":
          return (
            new Date(b.start_date_local).getTime() -
            new Date(a.start_date_local).getTime()
          );
        case "longest":
          return b.distance - a.distance;
        case "shortest":
          return a.distance - b.distance;
      }
    });
  }, [activities, sort]);

  if (withRoutes.length === 0) {
    return (
      <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
        No routes with GPS data found.
      </p>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--text-dim)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {withRoutes.length} routes
        </p>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          {(Object.keys(sortLabels) as SortMode[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              style={{
                padding: "0.3rem 0.6rem",
                border: `1px solid ${sort === s ? "var(--orange-3)" : "var(--border)"}`,
                borderRadius: "6px",
                background: sort === s ? "linear-gradient(135deg, var(--surface), var(--orange-1))" : "transparent",
                color: sort === s ? "var(--orange-5)" : "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.65rem",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {sortLabels[s]}
            </button>
          ))}
        </div>
      </div>
      <div
        className="route-facets-grid"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        {withRoutes.map((a) => (
          <div
            key={a.id}
            title={`${a.name} — ${(a.distance / 1000).toFixed(1)} km`}
            style={{ lineHeight: 0 }}
          >
            <RouteThumb activity={a} />
          </div>
        ))}
      </div>
    </div>
  );
}

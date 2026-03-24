"use client";

import { useEffect, useState } from "react";
import { buildHeatmap, type HeatmapMode } from "@/lib/heatmap";
import { StatsRow } from "./StatsRow";
import { Heatmap } from "./Heatmap";
import { StackedHeatmap } from "./StackedHeatmap";
import { RecentRuns } from "./RecentRuns";
import { YearSelector } from "./YearSelector";
import { ThemeToggle } from "./ThemeToggle";
import { DownloadButton } from "./DownloadButton";
import { DownloadStackedButton } from "./DownloadStackedButton";
import { DownloadFacetsButton } from "./DownloadFacetsButton";
import { StravaAttribution } from "./StravaAttribution";
import { RouteFacets } from "./RouteFacets";
import { PaceChart } from "./PaceChart";
import { RunTimesChart } from "./RunTimesChart";

type View = "heatmap" | "routes" | "insights" | "times";

export interface Activity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  start_date_local: string;
  type: string;
  sport_type?: string;
  map?: {
    summary_polyline?: string;
  };
  location_city?: string | null;
  location_state?: string | null;
  location_country?: string | null;
  timezone?: string;
}

interface Props {
  athleteName: string;
}

export function Dashboard({ athleteName }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<HeatmapMode>({ type: "rolling" });
  const [view, setView] = useState<View>("heatmap");
  const [excludedYears, setExcludedYears] = useState<Set<number>>(new Set());

  const toggleExcludedYear = (y: number) => {
    setExcludedYears((prev) => {
      const next = new Set(prev);
      if (next.has(y)) {
        next.delete(y);
      } else {
        // Need at least the full sortedYears list to check count — use activities
        // We'll check against sortedYears length in the render
        next.add(y);
      }
      return next;
    });
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/strava/activities");
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = "/api/auth/logout";
            return;
          }
          throw new Error("Failed to fetch activities");
        }
        const data = await res.json();
        setActivities(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: "1.5rem",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid var(--border)",
            borderTopColor: "var(--orange-5)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <div
          style={{
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          Fetching your runs...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: "1rem",
          padding: "2rem",
        }}
      >
        <p style={{ color: "#ff6b6b", fontSize: "0.9rem" }}>
          Failed to load data: {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "0.5rem 1rem",
            background: "var(--orange-5)",
            color: "#000",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Determine available years
  const yearsSet = new Set<number>();
  const currentYear = new Date().getFullYear();
  yearsSet.add(currentYear);
  activities.forEach((a) =>
    yearsSet.add(new Date(a.start_date_local).getFullYear())
  );
  const sortedYears = [...yearsSet].sort((a, b) => b - a);

  // Build date → km map
  const dateMap: Record<string, number> = {};
  activities.forEach((a) => {
    const d = a.start_date_local.slice(0, 10);
    dateMap[d] = (dateMap[d] || 0) + a.distance / 1000;
  });

  // Filter activities for stats and recent runs
  const filteredActivities =
    mode.type === "all"
      ? activities
      : activities.filter((a) => {
          const date = new Date(a.start_date_local);
          if (mode.type === "rolling") {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 364);
            return date >= cutoff;
          }
          return date.getFullYear() === mode.year;
        });

  const heatmapData =
    mode.type === "all" ? null : buildHeatmap(dateMap, mode);

  const downloadFilename =
    mode.type === "all"
      ? "strava-heatmap-all-years.png"
      : mode.type === "rolling"
        ? "strava-heatmap-past-year.png"
        : `strava-heatmap-${mode.year}.png`;

  return (
    <div
      className="dashboard-container"
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "2.5rem 2rem 4rem",
        animation: "fadeIn 0.6s ease",
      }}
    >
      {/* Header */}
      <div
        className="dashboard-header"
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: "2.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--orange-5)",
              fontFamily: "var(--font-mono)",
              marginBottom: "0.4rem",
            }}
          >
            Strava Heatmap
          </div>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            Run Activity
          </h1>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-muted)",
              fontWeight: 400,
            }}
          >
            {athleteName}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <ThemeToggle />
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                fontFamily: "var(--font-mono)",
                fontSize: "0.7rem",
                cursor: "pointer",
                transition: "all 0.2s",
                letterSpacing: "0.05em",
              }}
            >
              Disconnect
            </button>
          </form>
        </div>
      </div>

      {/* Stats */}
      <StatsRow activities={filteredActivities} />

      {/* View toggle */}
      <div
        className="view-toggle"
        style={{
          display: "flex",
          gap: "0.25rem",
          marginBottom: "1rem",
        }}
      >
        {(["heatmap", "routes", "insights", "times"] as const).map((v) => {
          const labels: Record<View, string> = {
            heatmap: "Heatmap",
            routes: "Routes",
            insights: "Insights",
            times: "Run Times",
          };
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "0.4rem 1rem",
                border: `1px solid ${view === v ? "var(--orange-3)" : "var(--border)"}`,
                borderRadius: "8px",
                background: view === v ? "linear-gradient(135deg, var(--surface), var(--orange-1))" : "transparent",
                color: view === v ? "var(--orange-5)" : "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {labels[v]}
            </button>
          );
        })}
      </div>

      {view === "heatmap" && (
        <>
          {/* Heatmap */}
          <div
            className="card-section"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "18px",
              padding: "2rem",
              marginBottom: "2rem",
              overflow: "hidden",
              animation: "slideUp 0.5s ease 0.25s both",
            }}
          >
            <div
              className="card-header"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.5rem",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                {mode.type === "all"
                  ? "All years of running"
                  : heatmapData!.title}
              </h2>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <YearSelector years={sortedYears} mode={mode} onSelect={setMode} />
                {heatmapData ? (
                  <DownloadButton
                    heatmapData={heatmapData}
                    activities={filteredActivities}
                    athleteName={athleteName}
                    filename={downloadFilename}
                  />
                ) : (
                  <DownloadStackedButton
                    years={sortedYears.filter((y) => !excludedYears.has(y))}
                    dateMap={dateMap}
                    athleteName={athleteName}
                  />
                )}
              </div>
            </div>
            {mode.type === "all" ? (
              <StackedHeatmap
                    years={sortedYears}
                    dateMap={dateMap}
                    excluded={excludedYears}
                    onToggleYear={(y) => {
                      const visibleCount = sortedYears.filter((yr) => !excludedYears.has(yr)).length;
                      if (!excludedYears.has(y) && visibleCount <= 1) return;
                      toggleExcludedYear(y);
                    }}
                  />
            ) : (
              <Heatmap data={heatmapData!} />
            )}
          </div>

          {/* Recent Runs */}
          <RecentRuns activities={filteredActivities} />
        </>
      )}

      {view === "routes" && (
        <div
          className="card-section"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "18px",
            padding: "2rem",
            marginBottom: "2rem",
            overflow: "hidden",
            animation: "slideUp 0.5s ease 0.25s both",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
              Route Facets
            </h2>
            <DownloadFacetsButton
              activities={activities}
              athleteName={athleteName}
            />
          </div>
          <RouteFacets activities={activities} />
        </div>
      )}

      {view === "insights" && (
        <div
          className="card-section"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "18px",
            padding: "2rem",
            marginBottom: "2rem",
            overflow: "hidden",
            animation: "slideUp 0.5s ease 0.25s both",
          }}
        >
          <div
            className="card-header"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.5rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
              Pace vs Distance
            </h2>
            <YearSelector years={sortedYears} mode={mode} onSelect={setMode} />
          </div>
          <PaceChart
            activities={filteredActivities}
            allActivities={activities}
            showYearComparison={mode.type === "all"}
          />
        </div>
      )}

      {view === "times" && (
        <div
          className="card-section"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "18px",
            padding: "2rem",
            marginBottom: "2rem",
            overflow: "hidden",
            animation: "slideUp 0.5s ease 0.25s both",
          }}
        >
          <div
            className="card-header"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.5rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
              Run Times
            </h2>
            <YearSelector years={sortedYears} mode={mode} onSelect={setMode} />
          </div>
          <RunTimesChart activities={filteredActivities} />
        </div>
      )}

      {/* Attribution */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "2rem",
        }}
      >
        <StravaAttribution />
      </div>
    </div>
  );
}

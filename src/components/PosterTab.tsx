"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Activity } from "./Dashboard";
import { PosterMap } from "./poster/PosterMap";
import { PalettePicker } from "./poster/PalettePicker";
import { getPalette, type PosterPalette } from "@/data/poster-palettes";
import { formatPace, formatNumber } from "@/lib/format";
import type maplibregl from "maplibre-gl";

interface Props {
  activities: Activity[];
}

function getLocation(a: Activity): string {
  const parts: string[] = [];
  if (a.location_city) parts.push(a.location_city);
  if (a.location_country) parts.push(a.location_country);
  if (parts.length > 0) return parts.join(", ");
  if (a.timezone) {
    const match = a.timezone.match(/\/([^/]+)$/);
    if (match) return match[1].replace(/_/g, " ");
  }
  return "";
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Poster dimensions
const POSTER_W = 1080;
const POSTER_H = 1920;
const PREVIEW_SCALE = 0.38; // preview at ~410px wide

export function PosterTab({ activities }: Props) {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [paletteId, setPaletteId] = useState("gold");
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [exporting, setExporting] = useState(false);

  const palette = getPalette(paletteId);

  // Filter to 10km+ runs
  const qualifyingRuns = activities.filter((a) => a.distance >= 10000);

  useEffect(() => {
    if (qualifyingRuns.length > 0 && !selectedActivity) {
      setSelectedActivity(qualifyingRuns[0]);
    }
  }, [qualifyingRuns.length, selectedActivity]);

  const handleMapReady = useCallback((map: maplibregl.Map) => {
    setMapInstance(map);
    setMapReady(true);
  }, []);

  // Reset map ready when activity changes
  useEffect(() => {
    setMapReady(false);
    setMapInstance(null);
  }, [selectedActivity?.id]);

  const handleDownload = useCallback(async () => {
    if (!mapInstance || !selectedActivity) return;
    setExporting(true);

    try {
      // Wait a tick for any pending renders
      await new Promise((r) => setTimeout(r, 200));

      const canvas = document.createElement("canvas");
      canvas.width = POSTER_W;
      canvas.height = POSTER_H;
      const ctx = canvas.getContext("2d")!;
      const p = palette;

      // ── Background ──
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, POSTER_W, POSTER_H);

      // ── Border frame ──
      const borderInset = 24;
      ctx.strokeStyle = p.border;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(borderInset, borderInset, POSTER_W - borderInset * 2, POSTER_H - borderInset * 2);

      // ── Map ──
      const mapCanvas = mapInstance.getCanvas();
      const mapZoneTop = borderInset;
      const mapZoneHeight = POSTER_H * 0.75;

      // Draw map scaled to fill the map zone
      ctx.drawImage(
        mapCanvas,
        borderInset + 1, mapZoneTop + 1,
        POSTER_W - borderInset * 2 - 2, mapZoneHeight
      );

      // ── Text zone ──
      const textZoneTop = mapZoneTop + mapZoneHeight + 30;
      const cx = POSTER_W / 2;

      // Activity name — large spaced letters
      const name = selectedActivity.name.toUpperCase();
      ctx.font = "600 52px 'JetBrains Mono', Menlo, monospace";
      ctx.fillStyle = p.text;
      ctx.letterSpacing = "8px";
      const nameW = ctx.measureText(name).width;
      // Scale down if too wide
      if (nameW > POSTER_W - 120) {
        const scale = (POSTER_W - 120) / nameW;
        ctx.font = `600 ${Math.floor(52 * scale)}px 'JetBrains Mono', Menlo, monospace`;
      }
      const finalNameW = ctx.measureText(name).width;
      ctx.fillText(name, cx - finalNameW / 2, textZoneTop + 40);
      ctx.letterSpacing = "0px";

      // Accent line under name
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 50, textZoneTop + 60);
      ctx.lineTo(cx + 50, textZoneTop + 60);
      ctx.stroke();

      // Location
      const location = getLocation(selectedActivity);
      if (location) {
        ctx.font = "400 26px 'JetBrains Mono', Menlo, monospace";
        ctx.fillStyle = p.textMuted;
        ctx.letterSpacing = "4px";
        const locW = ctx.measureText(location.toUpperCase()).width;
        ctx.fillText(location.toUpperCase(), cx - locW / 2, textZoneTop + 100);
        ctx.letterSpacing = "0px";
      }

      // Stats row
      const distKm = selectedActivity.distance / 1000;
      const paceMin = distKm > 0 ? selectedActivity.moving_time / 60 / distKm : 0;
      const stats = [
        { label: "DISTANCE", value: `${formatNumber(distKm, 2)} km` },
        { label: "TIME", value: formatTime(selectedActivity.moving_time) },
        { label: "PACE", value: paceMin > 0 ? `${formatPace(paceMin)} /km` : "—" },
      ];

      const statsY = textZoneTop + 160;
      const statColW = (POSTER_W - 120) / stats.length;
      for (let i = 0; i < stats.length; i++) {
        const sx = 60 + statColW * i + statColW / 2;

        ctx.font = "600 34px Outfit, sans-serif";
        ctx.fillStyle = p.text;
        const vw = ctx.measureText(stats[i].value).width;
        ctx.fillText(stats[i].value, sx - vw / 2, statsY);

        ctx.font = "400 14px 'JetBrains Mono', Menlo, monospace";
        ctx.fillStyle = p.textMuted;
        ctx.letterSpacing = "2px";
        const lw = ctx.measureText(stats[i].label).width;
        ctx.fillText(stats[i].label, sx - lw / 2, statsY + 24);
        ctx.letterSpacing = "0px";
      }

      // Watermark footer
      ctx.font = "400 14px 'JetBrains Mono', Menlo, monospace";
      ctx.fillStyle = p.textMuted;
      ctx.globalAlpha = 0.5;
      ctx.fillText("lariviz.xyz", borderInset + 16, POSTER_H - borderInset - 12);

      const osmText = "\u00A9 OpenStreetMap contributors";
      const osmW = ctx.measureText(osmText).width;
      ctx.fillText(osmText, POSTER_W - borderInset - 16 - osmW, POSTER_H - borderInset - 12);
      ctx.globalAlpha = 1;

      // ── Download ──
      const slug = selectedActivity.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
      const dateStr = selectedActivity.start_date_local.slice(0, 10);
      const link = document.createElement("a");
      link.download = `lariviz-poster-${slug}-${dateStr}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Poster export failed:", e);
    }

    setExporting(false);
  }, [mapInstance, selectedActivity, palette]);

  if (qualifyingRuns.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
        No qualifying runs found (10km+). Try a different filter or check back after your next long run.
      </div>
    );
  }

  const previewW = Math.round(POSTER_W * PREVIEW_SCALE);
  const previewH = Math.round(POSTER_H * PREVIEW_SCALE);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Activity selector */}
      <div>
        <label style={sectionLabel}>Select a run (10km+)</label>
        <div
          className="sticker-run-list"
          style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.5rem" }}
        >
          {qualifyingRuns.slice(0, 30).map((a) => {
            const km = (a.distance / 1000).toFixed(1);
            const date = new Date(a.start_date_local).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const isSelected = selectedActivity?.id === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setSelectedActivity(a)}
                style={{
                  flexShrink: 0,
                  padding: "0.6rem 1rem",
                  background: isSelected ? "linear-gradient(135deg, var(--orange-1), var(--orange-2))" : "var(--bg)",
                  border: isSelected ? "1px solid var(--orange-3)" : "1px solid var(--border)",
                  borderRadius: "10px",
                  cursor: "pointer",
                  textAlign: "left",
                  minWidth: "160px",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: isSelected ? "var(--orange-5)" : "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }}>
                  {a.name}
                </div>
                <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                  {km} km · {date}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedActivity && selectedActivity.map?.summary_polyline && (
        <>
          {/* Palette picker */}
          <div>
            <label style={sectionLabel}>Color palette</label>
            <PalettePicker selected={paletteId} onSelect={setPaletteId} />
          </div>

          {/* Poster preview */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            <div
              className="poster-preview-wrapper"
              style={{
                width: previewW,
                maxWidth: "100%",
                position: "relative",
              }}
            >
              {/* The poster at fixed dimensions, scaled via CSS */}
              <div
                style={{
                  width: POSTER_W,
                  height: POSTER_H,
                  transform: `scale(${PREVIEW_SCALE})`,
                  transformOrigin: "top left",
                  background: palette.bg,
                  borderRadius: "4px",
                  overflow: "hidden",
                  position: "relative",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
                }}
              >
                {/* Border frame */}
                <div
                  style={{
                    position: "absolute",
                    inset: 24,
                    border: `1.5px solid ${palette.border}`,
                    pointerEvents: "none",
                    zIndex: 2,
                  }}
                />

                {/* Map zone */}
                <div style={{ position: "absolute", top: 25, left: 25, right: 25, height: POSTER_H * 0.75 }}>
                  <PosterMap
                    polyline={selectedActivity.map.summary_polyline}
                    palette={palette}
                    width={POSTER_W - 50}
                    height={Math.round(POSTER_H * 0.75)}
                    onMapReady={handleMapReady}
                  />
                </div>

                {/* Text zone */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: POSTER_H * 0.22,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    padding: "0 60px",
                  }}
                >
                  {/* Activity name */}
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 46,
                      fontWeight: 600,
                      color: palette.text,
                      letterSpacing: "8px",
                      textTransform: "uppercase",
                      textAlign: "center",
                      lineHeight: 1.2,
                      maxWidth: POSTER_W - 120,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {selectedActivity.name}
                  </div>

                  {/* Accent line */}
                  <div style={{ width: 100, height: 2, background: palette.accent }} />

                  {/* Location */}
                  {getLocation(selectedActivity) && (
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 22,
                        color: palette.textMuted,
                        letterSpacing: "4px",
                        textTransform: "uppercase",
                      }}
                    >
                      {getLocation(selectedActivity)}
                    </div>
                  )}

                  {/* Stats row */}
                  <div style={{ display: "flex", gap: 60, marginTop: 16 }}>
                    {(() => {
                      const distKm = selectedActivity.distance / 1000;
                      const paceMin = distKm > 0 ? selectedActivity.moving_time / 60 / distKm : 0;
                      return [
                        { label: "DISTANCE", value: `${formatNumber(distKm, 2)} km` },
                        { label: "TIME", value: formatTime(selectedActivity.moving_time) },
                        { label: "PACE", value: paceMin > 0 ? `${formatPace(paceMin)} /km` : "—" },
                      ].map((stat) => (
                        <div key={stat.label} style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "Outfit, sans-serif", fontSize: 30, fontWeight: 600, color: palette.text }}>
                            {stat.value}
                          </div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: palette.textMuted, letterSpacing: "2px", marginTop: 4 }}>
                            {stat.label}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Footer watermarks */}
                <div style={{ position: "absolute", bottom: 36, left: 40, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: palette.textMuted, opacity: 0.5 }}>
                  lariviz.xyz
                </div>
                <div style={{ position: "absolute", bottom: 36, right: 40, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: palette.textMuted, opacity: 0.5 }}>
                  &copy; OpenStreetMap contributors
                </div>
              </div>

              {/* Spacer to maintain layout height since the poster is position-scaled */}
              <div style={{ height: previewH }} />
            </div>

            {/* Download button */}
            <button
              onClick={handleDownload}
              disabled={!mapReady || exporting}
              style={{
                background: mapReady && !exporting ? "var(--orange-5)" : "var(--border)",
                color: mapReady && !exporting ? "#000" : "var(--text-muted)",
                border: "none",
                padding: "0.7rem 2.5rem",
                borderRadius: "10px",
                fontFamily: "var(--font-mono)",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: mapReady && !exporting ? "pointer" : "wait",
                transition: "all 0.15s",
              }}
            >
              {exporting ? "Exporting..." : !mapReady ? "Map loading..." : "Download Poster"}
            </button>
          </div>
        </>
      )}

      {selectedActivity && !selectedActivity.map?.summary_polyline && (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          This activity has no route data. Select a run with GPS tracking.
        </div>
      )}
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  display: "block",
  fontSize: "0.7rem",
  fontFamily: "var(--font-mono)",
  color: "var(--text-muted)",
  marginBottom: "0.5rem",
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

"use client";

import { useState } from "react";
import { useTheme } from "./ThemeProvider";
import { decodePolyline, normalizePoints } from "@/lib/polyline";
import { DARK, LIGHT, downloadCanvas, downloadBtnStyle } from "@/lib/download-theme";
import type { Activity } from "./Dashboard";

interface Props {
  activities: Activity[];
  athleteName: string;
}

const THUMB = 48;

export function DownloadFacetsButton({ activities, athleteName }: Props) {
  const [capturing, setCapturing] = useState(false);
  const { theme } = useTheme();

  const handleDownload = () => {
    setCapturing(true);
    try {
      const c = theme === "dark" ? DARK : LIGHT;
      const S = 2;
      const thumbSize = THUMB * S;
      const thumbGap = 2 * S;

      const withRoutes = activities.filter((a) => a.map?.summary_polyline);
      if (withRoutes.length === 0) return;

      const padX = 32 * S;
      const padY = 28 * S;
      const headerHeight = 50 * S;

      // Calculate grid layout
      const contentW = Math.min(1100 * S, Math.max(600 * S, padX * 2 + 20 * (thumbSize + thumbGap)));
      const cols = Math.floor((contentW - padX * 2 + thumbGap) / (thumbSize + thumbGap));
      const rows = Math.ceil(withRoutes.length / cols);

      const gridW = cols * (thumbSize + thumbGap) - thumbGap;
      const gridH = rows * (thumbSize + thumbGap) - thumbGap;

      const totalW = padX * 2 + gridW;
      const totalH = padY * 2 + headerHeight + gridH;

      const canvas = document.createElement("canvas");
      canvas.width = totalW;
      canvas.height = totalH;
      const ctx = canvas.getContext("2d")!;

      // Background
      ctx.fillStyle = c.surface;
      ctx.beginPath();
      ctx.roundRect(0, 0, totalW, totalH, 18 * S);
      ctx.fill();
      ctx.strokeStyle = c.border;
      ctx.lineWidth = S;
      ctx.beginPath();
      ctx.roundRect(0, 0, totalW, totalH, 18 * S);
      ctx.stroke();

      const ox = padX;
      let oy = padY;

      // Header
      ctx.fillStyle = c.orange5;
      ctx.font = `600 ${7 * S}px 'JetBrains Mono', monospace`;
      ctx.fillText("STRAVA HEATMAP", ox, oy + 10 * S);

      ctx.fillStyle = c.text;
      ctx.font = `800 ${18 * S}px Outfit, sans-serif`;
      ctx.fillText("Route Facets", ox, oy + 30 * S);

      ctx.font = `700 ${14 * S}px Outfit, sans-serif`;
      const nameW = ctx.measureText(athleteName).width;
      ctx.fillText(athleteName, totalW - padX - nameW, oy + 30 * S);

      ctx.fillStyle = c.textDim;
      ctx.font = `400 ${7 * S}px 'JetBrains Mono', monospace`;
      ctx.fillText(`${withRoutes.length} routes`, ox, oy + 44 * S);

      oy += headerHeight;

      // Draw each route
      for (let i = 0; i < withRoutes.length; i++) {
        const a = withRoutes[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = ox + col * (thumbSize + thumbGap);
        const y = oy + row * (thumbSize + thumbGap);

        const polyline = a.map?.summary_polyline;
        if (!polyline) continue;

        const decoded = decodePolyline(polyline);
        if (decoded.length < 2) continue;

        const pts = normalizePoints(decoded, thumbSize);

        ctx.strokeStyle = c.text;
        ctx.lineWidth = 1.2 * S;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(x + pts[0][0], y + pts[0][1]);
        for (let j = 1; j < pts.length; j++) {
          ctx.lineTo(x + pts[j][0], y + pts[j][1]);
        }
        ctx.stroke();
      }

      downloadCanvas(canvas, "strava-route-facets.png");
    } catch (e) {
      console.error("Download failed:", e);
    }
    setCapturing(false);
  };

  return (
    <button
      onClick={handleDownload}
      disabled={capturing}
      style={{
        ...downloadBtnStyle,
        cursor: capturing ? "wait" : "pointer",
        opacity: capturing ? 0.5 : 1,
      }}
    >
      {capturing ? "Capturing…" : "Download PNG"}
    </button>
  );
}

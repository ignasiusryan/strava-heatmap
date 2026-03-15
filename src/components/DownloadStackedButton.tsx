"use client";

import { useState } from "react";
import { useTheme } from "./ThemeProvider";
import { buildHeatmap, type HeatmapData } from "@/lib/heatmap";
import { DARK, LIGHT, getLevelColor, downloadCanvas, downloadBtnStyle } from "@/lib/download-theme";

interface Props {
  years: number[];
  dateMap: Record<string, number>;
  athleteName: string;
}

export function DownloadStackedButton({ years, dateMap, athleteName }: Props) {
  const [capturing, setCapturing] = useState(false);
  const { theme } = useTheme();

  const handleDownload = () => {
    setCapturing(true);
    try {
      const c = theme === "dark" ? DARK : LIGHT;
      const S = 2;
      const cellSize = 13 * S;
      const gap = 3 * S;
      const step = cellSize + gap;
      const dayLabelWidth = 36 * S;
      const monthLabelHeight = 18 * S;
      const padX = 32 * S;
      const padY = 28 * S;
      const headerHeight = 44 * S;
      const yearLabelHeight = 20 * S;
      const yearGap = 12 * S;
      const legendHeight = 36 * S;
      const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

      // Build all year data
      const allData = years.map((year) => ({
        year,
        data: buildHeatmap(dateMap, { type: "year", year }),
      }));

      const gridH = 7 * step;
      const maxWeeks = Math.max(...allData.map((d) => d.data.weeks.length));
      const gridW = maxWeeks * step;

      const totalW = padX * 2 + dayLabelWidth + gridW + 10 * S;
      const yearBlockH = yearLabelHeight + monthLabelHeight + gridH + yearGap;
      const totalH = padY * 2 + headerHeight + allData.length * yearBlockH + legendHeight;

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
      ctx.fillText("All years of running", ox, oy + 30 * S);

      ctx.font = `700 ${14 * S}px Outfit, sans-serif`;
      const nameW = ctx.measureText(athleteName).width;
      ctx.fillText(athleteName, totalW - padX - nameW, oy + 30 * S);

      oy += headerHeight;

      // Each year
      const gridBaseX = ox + dayLabelWidth;

      for (const { year, data } of allData) {
        // Year label
        ctx.fillStyle = c.textMuted;
        ctx.font = `700 ${9 * S}px 'JetBrains Mono', monospace`;
        const yearStr = String(year);
        const yearW = ctx.measureText(yearStr).width;
        ctx.fillText(yearStr, gridBaseX + gridW / 2 - yearW / 2, oy + 14 * S);
        oy += yearLabelHeight;

        // Month labels
        ctx.fillStyle = c.textMuted;
        ctx.font = `400 ${7 * S}px 'JetBrains Mono', monospace`;
        for (const m of data.months) {
          ctx.fillText(m.label, gridBaseX + m.weekIndex * step, oy + 10 * S);
        }
        oy += monthLabelHeight;

        // Day labels
        ctx.fillStyle = c.textDim;
        ctx.font = `400 ${6.5 * S}px 'JetBrains Mono', monospace`;
        for (let i = 0; i < 7; i++) {
          ctx.fillText(dayLabels[i], ox, oy + i * step + cellSize * 0.78);
        }

        // Grid
        for (let wi = 0; wi < data.weeks.length; wi++) {
          const week = data.weeks[wi];
          for (let di = 0; di < week.length; di++) {
            const day = week[di];
            const x = gridBaseX + wi * step;
            const y = oy + di * step;
            if (!day.inRange) continue;

            if (day.isFuture) {
              ctx.strokeStyle = c.border;
              ctx.lineWidth = S;
              ctx.globalAlpha = 0.3;
              ctx.beginPath();
              ctx.roundRect(x, y, cellSize, cellSize, 3 * S);
              ctx.stroke();
              ctx.globalAlpha = 1;
            } else {
              ctx.fillStyle = getLevelColor(day.level, c);
              ctx.beginPath();
              ctx.roundRect(x, y, cellSize, cellSize, 3 * S);
              ctx.fill();
              if (day.level === 1) {
                ctx.strokeStyle = c.orange2;
                ctx.lineWidth = S;
                ctx.beginPath();
                ctx.roundRect(x, y, cellSize, cellSize, 3 * S);
                ctx.stroke();
              }
              if (day.level === 5) {
                ctx.shadowColor = "rgba(255,140,0,0.3)";
                ctx.shadowBlur = 8 * S;
                ctx.fillStyle = c.orange5;
                ctx.beginPath();
                ctx.roundRect(x, y, cellSize, cellSize, 3 * S);
                ctx.fill();
                ctx.shadowColor = "transparent";
                ctx.shadowBlur = 0;
              }
            }
          }
        }

        oy += gridH + yearGap;
      }

      // Legend
      const legendColors = [c.surface2, c.orange1, c.orange2, c.orange3, c.orange4, c.orange5];
      ctx.font = `400 ${7 * S}px 'JetBrains Mono', monospace`;
      const lessW = ctx.measureText("Less").width;
      const moreW = ctx.measureText("More").width;
      const legendTotalW = lessW + 8 * S + 6 * step + 8 * S + moreW;
      let lx = gridBaseX + gridW - legendTotalW;

      ctx.fillStyle = c.textDim;
      ctx.fillText("Less", lx, oy + cellSize * 0.75);
      lx += lessW + 8 * S;

      for (let i = 0; i < legendColors.length; i++) {
        ctx.fillStyle = legendColors[i];
        ctx.beginPath();
        ctx.roundRect(lx, oy, cellSize, cellSize, 3 * S);
        ctx.fill();
        if (i === 1) {
          ctx.strokeStyle = c.orange2;
          ctx.lineWidth = S;
          ctx.beginPath();
          ctx.roundRect(lx, oy, cellSize, cellSize, 3 * S);
          ctx.stroke();
        }
        lx += step;
      }
      lx += 4 * S;
      ctx.fillStyle = c.textDim;
      ctx.fillText("More", lx, oy + cellSize * 0.75);

      downloadCanvas(canvas, "strava-heatmap-all-years.png");
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

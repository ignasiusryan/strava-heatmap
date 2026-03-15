"use client";

import { useState } from "react";
import { useTheme } from "./ThemeProvider";
import type { HeatmapData } from "@/lib/heatmap";
import { formatDuration, formatPace } from "@/lib/format";
import { DARK, LIGHT, getLevelColor, downloadCanvas, downloadBtnStyle } from "@/lib/download-theme";
import type { Activity } from "./Dashboard";

interface Props {
  heatmapData: HeatmapData;
  activities: Activity[];
  athleteName: string;
  filename: string;
}

export function DownloadButton({ heatmapData, activities, athleteName, filename }: Props) {
  const [capturing, setCapturing] = useState(false);
  const { theme } = useTheme();

  const handleDownload = () => {
    setCapturing(true);

    try {
      const c = theme === "dark" ? DARK : LIGHT;
      const S = 2; // retina scale
      const cellSize = 13 * S;
      const gap = 3 * S;
      const step = cellSize + gap;

      const dayLabelWidth = 36 * S;
      const monthLabelHeight = 20 * S;
      const padX = 32 * S;
      const padY = 28 * S;
      const headerHeight = 44 * S;
      const statsRowHeight = 70 * S;
      const statsGap = 16 * S;
      const legendHeight = 36 * S;

      const gridW = heatmapData.weeks.length * step;
      const gridH = 7 * step;

      const totalW = padX * 2 + dayLabelWidth + gridW + 10 * S;
      const totalH =
        padY * 2 +
        headerHeight +
        statsGap +
        statsRowHeight +
        statsGap +
        monthLabelHeight +
        gridH +
        legendHeight;

      const canvas = document.createElement("canvas");
      canvas.width = totalW;
      canvas.height = totalH;
      const ctx = canvas.getContext("2d")!;

      // ── Background card ──
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

      // ── Header ──
      ctx.fillStyle = c.orange5;
      ctx.font = `600 ${7 * S}px 'JetBrains Mono', monospace`;
      ctx.fillText("STRAVA HEATMAP", ox, oy + 10 * S);

      ctx.fillStyle = c.text;
      ctx.font = `800 ${18 * S}px Outfit, sans-serif`;
      ctx.fillText(heatmapData.title, ox, oy + 30 * S);

      // Athlete name — right-aligned, large
      ctx.fillStyle = c.text;
      ctx.font = `700 ${14 * S}px Outfit, sans-serif`;
      const nameW = ctx.measureText(athleteName).width;
      ctx.fillText(athleteName, totalW - padX - nameW, oy + 30 * S);

      oy += headerHeight + statsGap;

      // ── Stats cards ──
      const totalKm = activities.reduce((s, a) => s + a.distance, 0) / 1000;
      const totalTime = activities.reduce((s, a) => s + a.moving_time, 0);
      const totalRuns = activities.length;
      const avgPace = totalKm > 0 ? (totalTime / 60) / totalKm : 0;

      let longest = activities[0] || null;
      for (const a of activities) {
        if (a.distance > (longest?.distance ?? 0)) longest = a;
      }

      interface StatCard {
        label: string;
        value: string;
        unit: string;
        sub?: string;
        highlight?: boolean;
      }

      const cards: StatCard[] = [
        { label: "TOTAL RUNS", value: String(totalRuns), unit: "runs" },
        { label: "DISTANCE", value: totalKm.toFixed(1), unit: "km", highlight: true },
        { label: "TIME", value: formatDuration(totalTime), unit: "" },
        {
          label: "AVG PACE",
          value: avgPace > 0 ? formatPace(avgPace) : "—",
          unit: avgPace > 0 ? "/km" : "",
        },
      ];

      if (longest) {
        const lkm = (longest.distance / 1000).toFixed(1);
        const lpace =
          longest.distance > 0
            ? formatPace((longest.moving_time / 60) / (longest.distance / 1000))
            : "—";
        const ldate = new Date(longest.start_date_local).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric" }
        );
        cards.push({
          label: "LONGEST RUN",
          value: lkm,
          unit: "km",
          sub: `${lpace} /km  ·  ${ldate}`,
        });
      }

      const contentW = totalW - padX * 2;
      const cardGap = 10 * S;
      const cardW = (contentW - cardGap * (cards.length - 1)) / cards.length;
      const cardH = statsRowHeight;
      const cardR = 10 * S;

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const cx = ox + i * (cardW + cardGap);
        const cy = oy;

        // Card background
        if (card.highlight) {
          // Gradient-like effect for highlight card
          ctx.fillStyle = c.orange1;
          ctx.beginPath();
          ctx.roundRect(cx, cy, cardW, cardH, cardR);
          ctx.fill();
          ctx.strokeStyle = c.orange3;
        } else {
          ctx.fillStyle = c.bg;
          ctx.beginPath();
          ctx.roundRect(cx, cy, cardW, cardH, cardR);
          ctx.fill();
          ctx.strokeStyle = c.border;
        }
        ctx.lineWidth = S;
        ctx.beginPath();
        ctx.roundRect(cx, cy, cardW, cardH, cardR);
        ctx.stroke();

        // Label
        ctx.fillStyle = c.textMuted;
        ctx.font = `600 ${6 * S}px 'JetBrains Mono', monospace`;
        ctx.fillText(card.label, cx + 12 * S, cy + 16 * S);

        // Value
        ctx.fillStyle = card.highlight ? c.orange5 : c.text;
        ctx.font = `800 ${16 * S}px Outfit, sans-serif`;
        ctx.fillText(card.value, cx + 12 * S, cy + 38 * S);

        // Unit
        if (card.unit) {
          const valW = ctx.measureText(card.value).width;
          ctx.fillStyle = c.textMuted;
          ctx.font = `400 ${9 * S}px Outfit, sans-serif`;
          ctx.fillText(card.unit, cx + 12 * S + valW + 4 * S, cy + 38 * S);
        }

        // Sub line (for longest run)
        if (card.sub) {
          ctx.fillStyle = c.textDim;
          ctx.font = `400 ${6 * S}px 'JetBrains Mono', monospace`;
          ctx.fillText(card.sub, cx + 12 * S, cy + 52 * S);
        }
      }

      oy += statsRowHeight + statsGap;

      // ── Month labels ──
      ctx.fillStyle = c.textMuted;
      ctx.font = `400 ${7 * S}px 'JetBrains Mono', monospace`;
      const monthBaseX = ox + dayLabelWidth;
      for (const m of heatmapData.months) {
        ctx.fillText(m.label, monthBaseX + m.weekIndex * step, oy + 10 * S);
      }
      oy += monthLabelHeight;

      // ── Day labels (all 7) ──
      const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      ctx.fillStyle = c.textDim;
      ctx.font = `400 ${6.5 * S}px 'JetBrains Mono', monospace`;
      for (let i = 0; i < 7; i++) {
        ctx.fillText(dayLabels[i], ox, oy + i * step + cellSize * 0.78);
      }

      // ── Grid ──
      const gridBaseX = ox + dayLabelWidth;
      for (let wi = 0; wi < heatmapData.weeks.length; wi++) {
        const week = heatmapData.weeks[wi];
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

      // ── Legend ──
      const legendY = oy + gridH + 12 * S;
      const legendColors = [
        c.surface2, c.orange1, c.orange2, c.orange3, c.orange4, c.orange5,
      ];
      ctx.font = `400 ${7 * S}px 'JetBrains Mono', monospace`;
      const lessW = ctx.measureText("Less").width;
      const moreW = ctx.measureText("More").width;
      const legendTotalW = lessW + 8 * S + 6 * step + 8 * S + moreW;
      let lx = gridBaseX + gridW - legendTotalW;

      ctx.fillStyle = c.textDim;
      ctx.fillText("Less", lx, legendY + cellSize * 0.75);
      lx += lessW + 8 * S;

      for (let i = 0; i < legendColors.length; i++) {
        ctx.fillStyle = legendColors[i];
        ctx.beginPath();
        ctx.roundRect(lx, legendY, cellSize, cellSize, 3 * S);
        ctx.fill();
        if (i === 1) {
          ctx.strokeStyle = c.orange2;
          ctx.lineWidth = S;
          ctx.beginPath();
          ctx.roundRect(lx, legendY, cellSize, cellSize, 3 * S);
          ctx.stroke();
        }
        lx += step;
      }
      lx += 4 * S;
      ctx.fillStyle = c.textDim;
      ctx.fillText("More", lx, legendY + cellSize * 0.75);

      downloadCanvas(canvas, filename);
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

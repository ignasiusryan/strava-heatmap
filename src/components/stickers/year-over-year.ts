import type { InsightTemplate, InsightConfig } from "./types";
import { getColors, drawTextCentered, drawWatermark } from "./shared";

const W = 540, H = 540;

function computeYoY(activities: { start_date_local: string; distance: number; moving_time: number; total_elevation_gain?: number }[]) {
  const now = new Date();
  const thisYear = now.getFullYear();
  const lastYear = thisYear - 1;

  const years: Record<number, { km: number; runs: number; time: number; elev: number; totalSpeed: number }> = {};
  for (const yr of [lastYear, thisYear]) {
    years[yr] = { km: 0, runs: 0, time: 0, elev: 0, totalSpeed: 0 };
  }

  for (const a of activities) {
    const yr = new Date(a.start_date_local).getFullYear();
    if (yr !== lastYear && yr !== thisYear) continue;
    const y = years[yr];
    y.km += a.distance / 1000;
    y.runs++;
    y.time += a.moving_time;
    y.elev += a.total_elevation_gain || 0;
    if (a.distance > 0 && a.moving_time > 0) {
      y.totalSpeed += a.moving_time / 60 / (a.distance / 1000); // pace min/km
    }
  }

  const prev = years[lastYear];
  const curr = years[thisYear];
  const prevPace = prev.runs > 0 ? prev.totalSpeed / prev.runs : 0;
  const currPace = curr.runs > 0 ? curr.totalSpeed / curr.runs : 0;

  return { thisYear, lastYear, prev, curr, prevPace, currPace };
}

function fmtPace(p: number): string {
  if (p <= 0) return "—";
  const m = Math.floor(p);
  const s = Math.round((p - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtDelta(prev: number, curr: number, unit: string): { text: string; up: boolean } {
  if (prev === 0) return { text: "—", up: true };
  const diff = ((curr - prev) / prev) * 100;
  return { text: `${diff >= 0 ? "+" : ""}${Math.round(diff)}${unit}`, up: diff >= 0 };
}

export const yearOverYear: InsightTemplate = {
  id: "year-over-year",
  name: "Year-over-Year",
  description: "Compare this year vs last across key metrics",
  width: W,
  height: H,
  render(ctx: CanvasRenderingContext2D, config: InsightConfig) {
    const c = getColors(config.theme);

    if (config.theme === "dark") {
      ctx.fillStyle = c.bg;
      ctx.fillRect(0, 0, W, H);
    }

    const { thisYear, lastYear, prev, curr, prevPace, currPace } = computeYoY(config.activities);

    // Header
    drawTextCentered(ctx, "ANNUAL COMPARE", W / 2, 40, "500 10px 'JetBrains Mono', monospace", c.textDim);
    drawTextCentered(ctx, `${lastYear}  vs  ${thisYear}`, W / 2, 78, "800 36px 'Plus Jakarta Sans', sans-serif", c.text);

    // Table
    const rows = [
      {
        label: "DISTANCE",
        prev: `${Math.round(prev.km).toLocaleString()}`,
        curr: `${Math.round(curr.km).toLocaleString()}`,
        delta: fmtDelta(prev.km, curr.km, "%"),
      },
      {
        label: "RUNS",
        prev: `${prev.runs}`,
        curr: `${curr.runs}`,
        delta: { text: `${curr.runs - prev.runs >= 0 ? "+" : ""}${curr.runs - prev.runs}`, up: curr.runs >= prev.runs },
      },
      {
        label: "AVG PACE",
        prev: fmtPace(prevPace),
        curr: fmtPace(currPace),
        delta: {
          text: prevPace > 0 && currPace > 0
            ? `${currPace < prevPace ? "-" : "+"}${fmtPace(Math.abs(currPace - prevPace))}`
            : "—",
          up: currPace < prevPace, // lower pace = faster = good
        },
      },
      {
        label: "ELEVATION",
        prev: `${Math.round(prev.elev).toLocaleString()}`,
        curr: `${Math.round(curr.elev).toLocaleString()}`,
        delta: fmtDelta(prev.elev, curr.elev, "%"),
      },
      {
        label: "TIME",
        prev: `${Math.round(prev.time / 3600)}h`,
        curr: `${Math.round(curr.time / 3600)}h`,
        delta: fmtDelta(prev.time, curr.time, "%"),
      },
    ];

    // Column positions
    const colLabel = 36;
    const colPrev = 300;
    const colCurr = 400;
    const colDelta = W - 36;
    const startY = 112;
    const rowH = 68;

    // Table header
    ctx.font = "500 10px 'JetBrains Mono', monospace";
    ctx.fillStyle = c.textDim;
    ctx.letterSpacing = "1.5px";
    ctx.textAlign = "right";
    ctx.fillText(`${lastYear}`, colPrev, startY);
    ctx.fillText(`${thisYear}`, colCurr, startY);
    ctx.fillText("+/-", colDelta, startY);
    ctx.textAlign = "left";
    ctx.letterSpacing = "0px";

    for (let i = 0; i < rows.length; i++) {
      const y = startY + 20 + i * rowH;

      // Separator line
      if (i > 0) {
        ctx.fillStyle = config.theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
        ctx.fillRect(colLabel, y - 6, W - 72, 1);
      }

      // Label
      ctx.font = "500 11px 'JetBrains Mono', monospace";
      ctx.fillStyle = c.textMuted;
      ctx.letterSpacing = "1.5px";
      ctx.textAlign = "left";
      ctx.fillText(rows[i].label, colLabel, y + 28);
      ctx.letterSpacing = "0px";

      // Values
      ctx.font = "700 22px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = c.text;
      ctx.textAlign = "right";
      ctx.fillText(rows[i].prev, colPrev, y + 28);
      ctx.fillText(rows[i].curr, colCurr, y + 28);

      // Delta
      ctx.font = "600 12px 'JetBrains Mono', monospace";
      ctx.fillStyle = rows[i].delta.up ? "#4ADE80" : "#f87171";
      ctx.fillText(rows[i].delta.text, colDelta, y + 28);
      ctx.textAlign = "left";
    }

    // Footer
    drawWatermark(ctx, W / 2 - 30, H - 20, c.textDim, 10);
  },
};

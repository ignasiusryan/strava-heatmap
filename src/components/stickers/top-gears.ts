import type { InsightTemplate, InsightConfig } from "./types";
import { getColors, drawWatermark } from "./shared";

const W = 540, H = 540;
const MAX_LIFE_KM = 900;

export const topGears: InsightTemplate = {
  id: "top-gears",
  name: "Top 5 Gears",
  description: "Shoe rotation ranked by km with wear bar",
  width: W,
  height: H,
  render(ctx: CanvasRenderingContext2D, config: InsightConfig) {
    const c = getColors(config.theme);
    const shoes = [...config.shoes]
      .filter((s) => !s.retired && s.distance > 0)
      .sort((a, b) => b.distance - a.distance)
      .slice(0, 5);

    if (config.theme === "dark") {
      ctx.fillStyle = c.bg;
      ctx.fillRect(0, 0, W, H);
    }

    // Header
    ctx.font = "500 11px 'JetBrains Mono', monospace";
    ctx.fillStyle = c.textDim;
    ctx.letterSpacing = "3px";
    ctx.fillText("MY ROTATION", 40, 48);
    ctx.letterSpacing = "0px";

    ctx.font = "800 32px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = c.text;
    ctx.fillText("Top 5 Gears", 40, 84);

    if (shoes.length === 0) {
      ctx.font = "400 14px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = c.textMuted;
      ctx.fillText("No shoes found in your Strava profile", 40, 140);
      return;
    }

    const topKm = shoes[0].distance / 1000;
    const startY = 120;
    const rowH = 72;

    for (let i = 0; i < shoes.length; i++) {
      const y = startY + i * rowH;
      const km = shoes[i].distance / 1000;
      const pct = km / topKm;
      const lifePct = Math.min(100, Math.round((shoes[i].distance / MAX_LIFE_KM / 1000) * 100));

      // Rank
      ctx.font = "400 28px 'Bebas Neue', sans-serif";
      ctx.fillStyle = c.textDim;
      ctx.textAlign = "right";
      ctx.fillText(`${i + 1}`, 56, y + 24);
      ctx.textAlign = "left";

      // Name
      ctx.font = "600 14px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = c.text;
      ctx.fillText(shoes[i].name, 72, y + 14);

      // Bar background
      const barX = 72, barY = y + 24, barW = 310, barH = 8, barR = 4;
      ctx.fillStyle = config.theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, barR);
      ctx.fill();

      // Bar fill
      const fillW = Math.max(barH, barW * pct);
      ctx.globalAlpha = 1 - i * 0.15;
      const grad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
      grad.addColorStop(0, "#ff8c00");
      grad.addColorStop(1, "#ffb347");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, fillW, barH, barR);
      ctx.fill();
      ctx.globalAlpha = 1;

      // KM value
      ctx.font = "600 13px 'JetBrains Mono', monospace";
      ctx.fillStyle = c.accent;
      ctx.textAlign = "right";
      ctx.fillText(`${Math.round(km)} km`, W - 40, y + 14);

      // Life %
      ctx.font = "400 10px 'JetBrains Mono', monospace";
      ctx.fillStyle = c.textDim;
      ctx.fillText(`${lifePct}% life`, W - 40, y + 34);
      ctx.textAlign = "left";
    }

    // Footer
    const totalKm = shoes.reduce((s, g) => s + g.distance / 1000, 0);
    ctx.font = "400 11px 'JetBrains Mono', monospace";
    ctx.fillStyle = c.textDim;
    ctx.fillText(`${Math.round(totalKm).toLocaleString()} km total`, 40, H - 28);
    drawWatermark(ctx, W - 120, H - 28, c.textDim, 10);
  },
};

import type { InsightTemplate, InsightConfig } from "./types";
import { getColors, drawTextCentered, drawWatermark } from "./shared";

const W = 540, H = 540;

function getCity(a: { location_city?: string | null; location_state?: string | null }): string | null {
  return a.location_city || a.location_state || null;
}

function getCountry(a: { location_country?: string | null }): string {
  return a.location_country || "";
}

export const cityStamps: InsightTemplate = {
  id: "city-stamps",
  name: "City Stamps",
  description: "Passport-style stamps for every city",
  width: W,
  height: H,
  render(ctx: CanvasRenderingContext2D, config: InsightConfig) {
    const c = getColors(config.theme);

    if (config.theme === "dark") {
      ctx.fillStyle = c.bg;
      ctx.fillRect(0, 0, W, H);
    }

    // Aggregate cities
    const cityMap = new Map<string, { city: string; country: string; count: number }>();
    for (const a of config.activities) {
      const city = getCity(a);
      if (!city) continue;
      const country = getCountry(a);
      const key = `${city}|${country}`;
      const existing = cityMap.get(key);
      if (existing) existing.count++;
      else cityMap.set(key, { city, country, count: 1 });
    }
    const cities = [...cityMap.values()].sort((a, b) => b.count - a.count).slice(0, 6);

    // Header
    ctx.font = "500 10px 'JetBrains Mono', monospace";
    ctx.fillStyle = c.textDim;
    ctx.letterSpacing = "4px";
    drawTextCentered(ctx, "RUNS WORLDWIDE", W / 2, 42, `500 10px 'JetBrains Mono', monospace`, c.textDim);
    ctx.letterSpacing = "0px";

    ctx.font = "700 28px 'Playfair Display', serif";
    drawTextCentered(ctx, "City Stamps", W / 2, 74, "700 28px 'Playfair Display', serif", c.text);

    if (cities.length === 0) {
      drawTextCentered(ctx, "No location data available", W / 2, 280, "400 14px 'Plus Jakarta Sans', sans-serif", c.textMuted);
      return;
    }

    // Draw stamps in 3x2 grid
    const cols = 3, pad = 36;
    const stampSize = (W - pad * 2 - 14 * (cols - 1)) / cols;
    const startY = 100;

    for (let i = 0; i < cities.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = pad + col * (stampSize + 14) + stampSize / 2;
      const cy = startY + row * (stampSize + 14) + stampSize / 2;
      const r = stampSize / 2 - 4;

      // Outer circle
      ctx.strokeStyle = config.theme === "dark" ? "rgba(255,140,0,0.3)" : "rgba(230,81,0,0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Dashed inner circle
      ctx.strokeStyle = config.theme === "dark" ? "rgba(255,140,0,0.2)" : "rgba(230,81,0,0.15)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, r - 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // City name
      const cityName = cities[i].city.length > 10 ? cities[i].city.slice(0, 9) + "." : cities[i].city;
      drawTextCentered(ctx, cityName.toUpperCase(), cx, cy - 18, "700 12px 'Plus Jakarta Sans', sans-serif", c.accent);

      // Country
      const country = cities[i].country.length > 12 ? cities[i].country.slice(0, 11) + "." : cities[i].country;
      drawTextCentered(ctx, country.toUpperCase(), cx, cy - 4, "400 8px 'JetBrains Mono', monospace", c.textDim);

      // Count
      drawTextCentered(ctx, `${cities[i].count}`, cx, cy + 22, "400 24px 'Bebas Neue', sans-serif", c.text);

      // "runs"
      drawTextCentered(ctx, "RUNS", cx, cy + 34, "400 7px 'JetBrains Mono', monospace", c.textDim);
    }

    // Footer
    const totalRuns = cities.reduce((s, c) => s + c.count, 0);
    drawTextCentered(ctx, `${cities.length} cities · ${totalRuns} runs`, W / 2, H - 28, "400 11px 'JetBrains Mono', monospace", c.textDim);
    drawWatermark(ctx, W - 120, H - 28, c.textDim, 10);
  },
};

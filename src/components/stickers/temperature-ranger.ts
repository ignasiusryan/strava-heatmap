import type { InsightTemplate, InsightConfig } from "./types";
import { getColors, drawTextCentered, drawWatermark } from "./shared";

const W = 540, H = 540;

export const temperatureRanger: InsightTemplate = {
  id: "temperature-ranger",
  name: "Temperature Ranger",
  description: "Coldest to hottest run with gradient spectrum",
  width: W,
  height: H,
  render(ctx: CanvasRenderingContext2D, config: InsightConfig) {
    const c = getColors(config.theme);

    if (config.theme === "dark") {
      ctx.fillStyle = c.bg;
      ctx.fillRect(0, 0, W, H);
    }

    // Find runs with temperature data
    const withTemp = config.activities.filter(
      (a) => a.average_temp != null && a.average_temp !== undefined
    );

    // Header
    drawTextCentered(ctx, "ALL-WEATHER RUNNER", W / 2, 60, "500 10px 'JetBrains Mono', monospace", c.textDim);
    drawTextCentered(ctx, "Temperature Range", W / 2, 96, "700 26px 'Plus Jakarta Sans', sans-serif", c.text);

    if (withTemp.length === 0) {
      drawTextCentered(ctx, "No temperature data available", W / 2, 280, "400 14px 'Plus Jakarta Sans', sans-serif", c.textMuted);
      return;
    }

    // Find coldest and hottest
    let coldest = withTemp[0], hottest = withTemp[0];
    for (const a of withTemp) {
      if ((a.average_temp ?? 0) < (coldest.average_temp ?? 0)) coldest = a;
      if ((a.average_temp ?? 0) > (hottest.average_temp ?? 0)) hottest = a;
    }

    const coldTemp = coldest.average_temp ?? 0;
    const hotTemp = hottest.average_temp ?? 0;
    const coldDate = new Date(coldest.start_date_local).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const hotDate = new Date(hottest.start_date_local).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    // Cold extreme
    const leftX = W / 2 - 100;
    const rightX = W / 2 + 100;

    drawTextCentered(ctx, `${coldTemp}°`, leftX, 210, "400 72px 'Bebas Neue', sans-serif", "#60a5fa");
    drawTextCentered(ctx, "COLDEST", leftX, 232, "500 11px 'JetBrains Mono', monospace", "rgba(96,165,250,0.7)");
    drawTextCentered(ctx, coldDate, leftX, 250, "400 10px 'JetBrains Mono', monospace", c.textDim);

    // Dash
    drawTextCentered(ctx, "—", W / 2, 200, "300 24px 'Plus Jakarta Sans', sans-serif", c.textDim);

    // Hot extreme
    drawTextCentered(ctx, `${hotTemp}°`, rightX, 210, "400 72px 'Bebas Neue', sans-serif", "#f97316");
    drawTextCentered(ctx, "HOTTEST", rightX, 232, "500 11px 'JetBrains Mono', monospace", "rgba(249,115,22,0.7)");
    drawTextCentered(ctx, hotDate, rightX, 250, "400 10px 'JetBrains Mono', monospace", c.textDim);

    // Gradient bar
    const barX = 100, barY = 290, barW = 340, barH = 12, barR = 6;
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grad.addColorStop(0, "#3b82f6");
    grad.addColorStop(0.3, "#60a5fa");
    grad.addColorStop(0.5, "#fbbf24");
    grad.addColorStop(0.75, "#f97316");
    grad.addColorStop(1, "#ef4444");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, barR);
    ctx.fill();

    // Markers on bar (map temp to position, range -10 to 40)
    const tempToX = (t: number) => barX + ((t + 10) / 50) * barW;

    // Cold marker
    const coldX = Math.max(barX + 9, Math.min(barX + barW - 9, tempToX(coldTemp)));
    ctx.beginPath();
    ctx.arc(coldX, barY + barH / 2, 9, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(96,165,250,0.3)";
    ctx.fill();
    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Hot marker
    const hotX = Math.max(barX + 9, Math.min(barX + barW - 9, tempToX(hotTemp)));
    ctx.beginPath();
    ctx.arc(hotX, barY + barH / 2, 9, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(249,115,22,0.3)";
    ctx.fill();
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Bar labels
    ctx.font = "400 10px 'JetBrains Mono', monospace";
    ctx.fillStyle = c.textDim;
    ctx.textAlign = "left";
    ctx.fillText("-10°C", barX, barY + 30);
    ctx.textAlign = "center";
    ctx.fillText("0°", barX + barW * 0.2, barY + 30);
    ctx.fillText("20°", barX + barW * 0.6, barY + 30);
    ctx.textAlign = "right";
    ctx.fillText("40°C", barX + barW, barY + 30);
    ctx.textAlign = "left";

    // Range summary
    const range = hotTemp - coldTemp;
    drawTextCentered(ctx, `${range}° range`, W / 2, 370, "600 22px 'JetBrains Mono', monospace", c.text);
    drawTextCentered(ctx, `across ${withTemp.length} runs`, W / 2, 394, "400 11px 'JetBrains Mono', monospace", c.textDim);

    // Footer
    drawWatermark(ctx, W / 2 - 30, H - 24, c.textDim, 10);
  },
};

import type { InsightTemplate, InsightConfig } from "./types";
import { getColors, drawTextCentered, drawWatermark } from "./shared";

const W = 540, H = 540;

function computeWeeklyStreaks(activities: { start_date_local: string }[]) {
  if (activities.length === 0) return { current: 0, longest: 0 };

  // Get unique weeks (ISO week number) with at least one run
  const weeks = new Set<string>();
  for (const a of activities) {
    const d = new Date(a.start_date_local);
    // Get Monday of this week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    weeks.add(monday.toISOString().slice(0, 10));
  }

  const sorted = [...weeks].sort().reverse();
  if (sorted.length === 0) return { current: 0, longest: 0 };

  // Check current streak from this week
  const now = new Date();
  const nowDay = now.getDay();
  const nowDiff = now.getDate() - nowDay + (nowDay === 0 ? -6 : 1);
  const thisMonday = new Date(now);
  thisMonday.setDate(nowDiff);
  const thisMondayStr = thisMonday.toISOString().slice(0, 10);

  // Also allow last week (in case no run yet this week)
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);
  const lastMondayStr = lastMonday.toISOString().slice(0, 10);

  let startIdx = sorted.indexOf(thisMondayStr);
  if (startIdx === -1) startIdx = sorted.indexOf(lastMondayStr);
  if (startIdx === -1) startIdx = 0;

  // Count current streak
  let current = 0;
  let expected = new Date(sorted[startIdx]);
  for (let i = startIdx; i < sorted.length; i++) {
    const weekDate = sorted[i];
    const exp = expected.toISOString().slice(0, 10);
    if (weekDate === exp) {
      current++;
      expected.setDate(expected.getDate() - 7);
    } else {
      break;
    }
  }

  // Count longest streak across all weeks
  const asc = [...weeks].sort();
  let longest = 0, streak = 0;
  let prev: Date | null = null;
  for (const w of asc) {
    const d = new Date(w);
    if (prev && Math.abs(d.getTime() - prev.getTime() - 7 * 86400000) < 86400000) {
      streak++;
    } else {
      streak = 1;
    }
    if (streak > longest) longest = streak;
    prev = d;
  }

  return { current, longest };
}

export const streakCounter: InsightTemplate = {
  id: "streak-counter",
  name: "Streak Counter",
  description: "Consecutive weeks with at least one run",
  width: W,
  height: H,
  render(ctx: CanvasRenderingContext2D, config: InsightConfig) {
    const c = getColors(config.theme);

    if (config.theme === "dark") {
      ctx.fillStyle = c.bg;
      ctx.fillRect(0, 0, W, H);
    }

    const { current, longest } = computeWeeklyStreaks(config.activities);

    // Label
    drawTextCentered(ctx, "CURRENT STREAK", W / 2, 100, "500 11px 'JetBrains Mono', monospace", c.textDim);

    // Big number
    drawTextCentered(ctx, `${current}`, W / 2, 248, "400 160px 'Bebas Neue', sans-serif", c.accent);

    // Unit
    drawTextCentered(ctx, "CONSECUTIVE WEEKS", W / 2, 280, "300 20px 'Plus Jakarta Sans', sans-serif", c.textMuted);

    // Type
    drawTextCentered(ctx, "WEEKLY STREAK", W / 2, 306, "500 11px 'JetBrains Mono', monospace", c.accent);

    // Divider
    ctx.fillStyle = config.theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
    ctx.fillRect(W / 2 - 30, 330, 60, 1.5);

    // Longest ever
    drawTextCentered(ctx, `${longest}`, W / 2, 378, "700 32px 'Plus Jakarta Sans', sans-serif", c.text);
    drawTextCentered(ctx, "LONGEST EVER (WEEKS)", W / 2, 398, "400 10px 'JetBrains Mono', monospace", c.textDim);

    // Dots (last 14 weeks)
    const dotR = 4, dotGap = 13;
    const totalDots = 14;
    const dotsWidth = totalDots * (dotR * 2 + dotGap) - dotGap + 8; // +8 for gap between groups
    const dotsX = W / 2 - dotsWidth / 2;
    const dotsY = 432;

    for (let i = 0; i < totalDots; i++) {
      const x = dotsX + i * (dotR * 2 + dotGap) + (i >= 7 ? 8 : 0);
      ctx.beginPath();
      ctx.arc(x + dotR, dotsY, dotR, 0, Math.PI * 2);
      ctx.fillStyle = i < current ? c.accent : (config.theme === "dark" ? "rgba(255,140,0,0.12)" : "rgba(230,81,0,0.12)");
      ctx.fill();
    }

    // Footer
    drawWatermark(ctx, W / 2 - 30, H - 24, c.textDim, 10);
  },
};

export type HeatmapMode =
  | { type: "year"; year: number }
  | { type: "rolling" }
  | { type: "all" };

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  km: number;
  level: number; // 0-5, -1 for out of range
  isFuture: boolean;
  inRange: boolean;
}

export interface HeatmapData {
  weeks: HeatmapDay[][];
  months: { label: string; weekIndex: number }[];
  title: string;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Monday = 0, Tuesday = 1, ..., Sunday = 6
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function getLevel(km: number, sortedVals: number[]): number {
  if (!km || km <= 0) return 0;
  if (sortedVals.length === 0) return 1;
  // Percentile-based: rank this value among all non-zero values
  const rank = sortedVals.filter((v) => v <= km).length;
  const pct = rank / sortedVals.length;
  if (pct <= 0.2) return 1;
  if (pct <= 0.4) return 2;
  if (pct <= 0.6) return 3;
  if (pct <= 0.8) return 4;
  return 5;
}

export function buildHeatmap(
  dateMap: Record<string, number>,
  mode: HeatmapMode
): HeatmapData {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;
  let title: string;

  if (mode.type === "rolling") {
    // 52 full weeks ending today (364 days back)
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 364);
    title = "Past year of running";
  } else if (mode.type === "year") {
    const year = mode.year;
    const isCurrentYear = year === now.getFullYear();
    startDate = new Date(year, 0, 1);
    endDate = isCurrentYear
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
      : new Date(year, 11, 31);
    title = `${year} running activity`;
  } else {
    // "all" mode — not used directly, StackedHeatmap calls per-year
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 364);
    title = "All years of running";
  }

  // Collect all non-zero values in range for percentile-based coloring
  const vals: number[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const k = dateMap[toDateStr(cursor)];
    if (k && k > 0) vals.push(k);
    cursor.setDate(cursor.getDate() + 1);
  }
  const sortedVals = vals.sort((a, b) => a - b);

  // Pad start to Monday
  const gridStart = new Date(startDate);
  gridStart.setDate(gridStart.getDate() - mondayIndex(gridStart));

  const weeks: HeatmapDay[][] = [];
  const months: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  const current = new Date(gridStart);
  const isCurrentYear =
    mode.type === "year" && mode.year === now.getFullYear();
  const isRolling = mode.type === "rolling";

  while (current <= endDate || mondayIndex(current) !== 0) {
    if (mondayIndex(current) === 0) weeks.push([]);

    const dateStr = toDateStr(current);
    const inRange = current >= startDate && current <= endDate;
    const isFuture =
      (isCurrentYear || isRolling) &&
      current >
        new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const km = dateMap[dateStr] || 0;

    weeks[weeks.length - 1].push({
      date: dateStr,
      km,
      level: inRange && !isFuture ? getLevel(km, sortedVals) : -1,
      isFuture: isFuture && inRange,
      inRange,
    });

    // Month labels — place on Monday of each new month
    if (inRange && mondayIndex(current) === 0) {
      const m = current.getMonth();
      if (m !== lastMonth) {
        months.push({ label: MONTH_NAMES[m], weekIndex: weeks.length - 1 });
        lastMonth = m;
      }
    }

    current.setDate(current.getDate() + 1);
    if (weeks.length > 54) break;
  }

  return { weeks, months, title };
}

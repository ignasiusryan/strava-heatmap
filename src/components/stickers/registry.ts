import type { InsightTemplate } from "./types";
import { topGears } from "./top-gears";
import { cityStamps } from "./city-stamps";
import { streakCounter } from "./streak-counter";
import { yearOverYear } from "./year-over-year";
import { temperatureRanger } from "./temperature-ranger";

export const templates: InsightTemplate[] = [
  topGears,
  cityStamps,
  streakCounter,
  yearOverYear,
  temperatureRanger,
];

export function getTemplate(id: string): InsightTemplate | undefined {
  return templates.find((t) => t.id === id);
}

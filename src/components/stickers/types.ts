import type { Activity } from "../Dashboard";

export interface Shoe {
  id: string;
  name: string;
  distance: number;
  primary: boolean;
  retired: boolean;
}

export interface InsightConfig {
  activities: Activity[];
  theme: "dark" | "clear";
  athleteName: string;
  shoes: Shoe[];
}

export interface InsightTemplate {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  render: (ctx: CanvasRenderingContext2D, config: InsightConfig) => void;
}

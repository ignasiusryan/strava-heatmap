export interface PosterPalette {
  id: string;
  name: string;
  bg: string;
  mapBg: string;
  mapWater: string;
  mapRoads: string;
  mapRoadsMinor: string;
  mapBuildings: string;
  mapLanduse: string;
  routeColor: string;
  routeGlow: string;
  text: string;
  textMuted: string;
  accent: string;
  border: string;
}

export const palettes: PosterPalette[] = [
  {
    id: "midnight",
    name: "Midnight",
    bg: "#0B1426",
    mapBg: "#0B1426",
    mapWater: "#081020",
    mapRoads: "#1a2a4a",
    mapRoadsMinor: "#121e38",
    mapBuildings: "#0f1a30",
    mapLanduse: "#0d1628",
    routeColor: "#00D4FF",
    routeGlow: "rgba(0, 212, 255, 0.4)",
    text: "#e0e8f0",
    textMuted: "#5a7090",
    accent: "#00D4FF",
    border: "#1a2a4a",
  },
  {
    id: "ink",
    name: "Ink",
    bg: "#000000",
    mapBg: "#000000",
    mapWater: "#050505",
    mapRoads: "#1a1a1a",
    mapRoadsMinor: "#111111",
    mapBuildings: "#0a0a0a",
    mapLanduse: "#060606",
    routeColor: "#FFFFFF",
    routeGlow: "rgba(255, 255, 255, 0.3)",
    text: "#e8e8e8",
    textMuted: "#555555",
    accent: "#FFFFFF",
    border: "#1a1a1a",
  },
  {
    id: "forest",
    name: "Forest",
    bg: "#0A1F0A",
    mapBg: "#0A1F0A",
    mapWater: "#061506",
    mapRoads: "#1a3a1a",
    mapRoadsMinor: "#132e13",
    mapBuildings: "#0e240e",
    mapLanduse: "#0c200c",
    routeColor: "#4ADE80",
    routeGlow: "rgba(74, 222, 128, 0.35)",
    text: "#d0e8d0",
    textMuted: "#4a7a4a",
    accent: "#4ADE80",
    border: "#1a3a1a",
  },
  {
    id: "ember",
    name: "Ember",
    bg: "#1A1A1A",
    mapBg: "#1A1A1A",
    mapWater: "#121212",
    mapRoads: "#2e2e2e",
    mapRoadsMinor: "#242424",
    mapBuildings: "#1e1e1e",
    mapLanduse: "#1c1c1c",
    routeColor: "#FF6B35",
    routeGlow: "rgba(255, 107, 53, 0.35)",
    text: "#f0e8e0",
    textMuted: "#6a5a4a",
    accent: "#FF6B35",
    border: "#2e2e2e",
  },
  {
    id: "paper",
    name: "Paper",
    bg: "#F5F0EB",
    mapBg: "#F5F0EB",
    mapWater: "#ddd8d0",
    mapRoads: "#c8c0b8",
    mapRoadsMinor: "#d8d2ca",
    mapBuildings: "#e8e2da",
    mapLanduse: "#eae4dc",
    routeColor: "#1B2A4A",
    routeGlow: "rgba(27, 42, 74, 0.25)",
    text: "#1a1a1a",
    textMuted: "#8a8078",
    accent: "#1B2A4A",
    border: "#c8c0b8",
  },
  {
    id: "gold",
    name: "Gold",
    bg: "#0e1528",
    mapBg: "#0e1528",
    mapWater: "#0a1020",
    mapRoads: "#3a3520",
    mapRoadsMinor: "#252218",
    mapBuildings: "#141c30",
    mapLanduse: "#111828",
    routeColor: "#D4A843",
    routeGlow: "rgba(212, 168, 67, 0.35)",
    text: "#D4A843",
    textMuted: "#6a5a30",
    accent: "#D4A843",
    border: "#2a2518",
  },
];

export function getPalette(id: string): PosterPalette {
  return palettes.find((p) => p.id === id) || palettes[0];
}

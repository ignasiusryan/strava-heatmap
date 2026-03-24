import type { PosterPalette } from "@/data/poster-palettes";
import type { StyleSpecification } from "maplibre-gl";

export function buildMapStyle(palette: PosterPalette): StyleSpecification {
  return {
    version: 8,
    sources: {
      openmaptiles: {
        type: "vector",
        tiles: ["https://tiles.openfreemap.org/planet/{z}/{x}/{y}.pbf"],
        maxzoom: 14,
      },
    },
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    layers: [
      // ── Background ──
      {
        id: "background",
        type: "background",
        paint: { "background-color": palette.mapBg },
      },

      // ── Water ──
      {
        id: "water",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "water",
        paint: { "fill-color": palette.mapWater },
      },
      {
        id: "waterway",
        type: "line",
        source: "openmaptiles",
        "source-layer": "waterway",
        paint: {
          "line-color": palette.mapWater,
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.5, 14, 2],
        },
        layout: { "line-cap": "round" },
      },

      // ── Land ──
      {
        id: "landcover",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landcover",
        paint: {
          "fill-color": palette.mapLanduse,
          "fill-opacity": 0.6,
        },
      },
      {
        id: "landuse",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landuse",
        paint: {
          "fill-color": palette.mapLanduse,
          "fill-opacity": 0.5,
        },
      },
      {
        id: "park",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "park",
        paint: {
          "fill-color": palette.mapLanduse,
          "fill-opacity": 0.4,
        },
      },

      // ── Buildings ──
      {
        id: "building",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "building",
        minzoom: 12,
        paint: {
          "fill-color": palette.mapBuildings,
          "fill-opacity": 0.8,
        },
      },

      // ── Roads — layered from minor to major ──
      // Path / track (thinnest)
      {
        id: "road-path",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: ["in", "class", "path", "track"],
        minzoom: 12,
        paint: {
          "line-color": palette.mapRoadsMinor,
          "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.5, 14, 1],
          "line-opacity": 0.6,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      },
      // Service roads
      {
        id: "road-service",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: ["==", "class", "service"],
        minzoom: 11,
        paint: {
          "line-color": palette.mapRoadsMinor,
          "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.4, 14, 1.2],
          "line-opacity": 0.7,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      },
      // Minor / residential
      {
        id: "road-minor",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: ["==", "class", "minor"],
        paint: {
          "line-color": palette.mapRoadsMinor,
          "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.3, 12, 0.8, 14, 1.5],
          "line-opacity": 0.8,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      },
      // Tertiary
      {
        id: "road-tertiary",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: ["==", "class", "tertiary"],
        paint: {
          "line-color": palette.mapRoads,
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.5, 12, 1.2, 14, 2],
        },
        layout: { "line-cap": "round", "line-join": "round" },
      },
      // Secondary
      {
        id: "road-secondary",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: ["==", "class", "secondary"],
        paint: {
          "line-color": palette.mapRoads,
          "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.6, 12, 1.5, 14, 2.5],
        },
        layout: { "line-cap": "round", "line-join": "round" },
      },
      // Primary / trunk
      {
        id: "road-primary",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: ["in", "class", "primary", "trunk"],
        paint: {
          "line-color": palette.mapRoadsMajor,
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.8, 12, 2, 14, 3.5],
        },
        layout: { "line-cap": "round", "line-join": "round" },
      },
      // Motorway (brightest, thickest)
      {
        id: "road-motorway",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: ["==", "class", "motorway"],
        paint: {
          "line-color": palette.mapRoadsMajor,
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1, 12, 2.5, 14, 4],
        },
        layout: { "line-cap": "round", "line-join": "round" },
      },
    ],
  } as StyleSpecification;
}

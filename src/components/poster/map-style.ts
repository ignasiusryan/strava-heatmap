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
      {
        id: "background",
        type: "background",
        paint: { "background-color": palette.mapBg },
      },
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
          "line-width": 1,
        },
      },
      {
        id: "landcover",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landcover",
        paint: {
          "fill-color": palette.mapLanduse,
          "fill-opacity": 0.5,
        },
      },
      {
        id: "landuse",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landuse",
        paint: {
          "fill-color": palette.mapLanduse,
          "fill-opacity": 0.4,
        },
      },
      {
        id: "building",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "building",
        minzoom: 13,
        paint: {
          "fill-color": palette.mapBuildings,
          "fill-opacity": 0.6,
        },
      },
      // Roads — minor first (below), then major on top
      {
        id: "road-minor",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: ["in", "class", "minor", "service", "track", "path"],
        paint: {
          "line-color": palette.mapRoadsMinor,
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.3, 14, 1],
        },
        layout: { "line-cap": "round", "line-join": "round" },
      },
      {
        id: "road-tertiary",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: ["in", "class", "tertiary"],
        paint: {
          "line-color": palette.mapRoads,
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.4, 14, 1.5],
        },
        layout: { "line-cap": "round", "line-join": "round" },
      },
      {
        id: "road-secondary",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: ["in", "class", "secondary"],
        paint: {
          "line-color": palette.mapRoads,
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.6, 14, 2],
        },
        layout: { "line-cap": "round", "line-join": "round" },
      },
      {
        id: "road-primary",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: ["in", "class", "primary", "trunk"],
        paint: {
          "line-color": palette.mapRoads,
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.5, 14, 2.5],
        },
        layout: { "line-cap": "round", "line-join": "round" },
      },
      {
        id: "road-motorway",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: ["==", "class", "motorway"],
        paint: {
          "line-color": palette.mapRoads,
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.8, 14, 3],
        },
        layout: { "line-cap": "round", "line-join": "round" },
      },
    ],
  } as StyleSpecification;
}

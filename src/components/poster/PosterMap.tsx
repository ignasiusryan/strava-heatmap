"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { PosterPalette } from "@/data/poster-palettes";
import { buildMapStyle } from "./map-style";
import { decodePolyline } from "@/lib/polyline";

interface Props {
  polyline: string;
  palette: PosterPalette;
  width: number;
  height: number;
  onMapReady?: (map: maplibregl.Map) => void;
}

export function PosterMap({ polyline, palette, width, height, onMapReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const updateStyle = useCallback(
    (map: maplibregl.Map) => {
      // Update route layer colors
      if (map.getLayer("route-glow")) {
        map.setPaintProperty("route-glow", "line-color", palette.routeGlow);
      }
      if (map.getLayer("route-line")) {
        map.setPaintProperty("route-line", "line-color", palette.routeColor);
      }
    },
    [palette]
  );

  // Init map
  useEffect(() => {
    if (!containerRef.current) return;

    const points = decodePolyline(polyline);
    if (points.length === 0) return;

    // Convert to GeoJSON
    const coordinates = points.map(([lat, lng]) => [lng, lat]);
    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates,
          },
        },
      ],
    };

    // Calculate bounds
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const [lng, lat] of coordinates) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    const style = buildMapStyle(palette);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      bounds: [[minLng, minLat], [maxLng, maxLat]] as maplibregl.LngLatBoundsLike,
      fitBoundsOptions: { padding: 60 },
      interactive: false,
      attributionControl: false,
      canvasContextAttributes: {
        preserveDrawingBuffer: true,
        antialias: true,
      },
    });

    map.on("load", () => {
      // Add route source
      map.addSource("route", { type: "geojson", data: geojson });

      // Route glow (wider, transparent)
      map.addLayer({
        id: "route-glow",
        type: "line",
        source: "route",
        paint: {
          "line-color": palette.routeGlow,
          "line-width": 10,
          "line-blur": 8,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      // Route line (sharp)
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: {
          "line-color": palette.routeColor,
          "line-width": 3,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      // Start marker
      const startPoint: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: coordinates[0] },
        }],
      };
      map.addSource("start", { type: "geojson", data: startPoint });
      map.addLayer({
        id: "start-dot",
        type: "circle",
        source: "start",
        paint: {
          "circle-radius": 5,
          "circle-color": palette.routeColor,
          "circle-stroke-width": 2,
          "circle-stroke-color": palette.bg,
        },
      });
    });

    map.on("idle", () => {
      onMapReady?.(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polyline]); // Only re-create map when polyline changes

  // Update palette without recreating map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Update base style layers
    const newStyle = buildMapStyle(palette);
    for (const layer of newStyle.layers) {
      if ("paint" in layer && layer.paint) {
        try {
          for (const [prop, val] of Object.entries(layer.paint as Record<string, unknown>)) {
            map.setPaintProperty(layer.id, prop, val);
          }
        } catch {
          // Layer may not exist yet
        }
      }
    }

    // Update route colors
    updateStyle(map);
  }, [palette, updateStyle]);

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        overflow: "hidden",
      }}
    />
  );
}

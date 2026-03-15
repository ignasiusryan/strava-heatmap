// Decode Google encoded polyline into [lat, lng] pairs
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

// Normalize points to fit within a [0, size] x [0, size] square, preserving aspect ratio
export function normalizePoints(
  points: [number, number][],
  size: number
): [number, number][] {
  if (points.length === 0) return [];

  let minLat = Infinity,
    maxLat = -Infinity,
    minLng = Infinity,
    maxLng = -Infinity;

  for (const [lat, lng] of points) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  const dLat = maxLat - minLat || 0.001;
  const dLng = maxLng - minLng || 0.001;
  const scale = size / Math.max(dLat, dLng);
  const pad = 2; // small padding

  const effectiveSize = size - pad * 2;
  const effectiveScale = effectiveSize / Math.max(dLat, dLng);

  // Center the route
  const offsetX = (effectiveSize - dLng * effectiveScale) / 2 + pad;
  const offsetY = (effectiveSize - dLat * effectiveScale) / 2 + pad;

  return points.map(([lat, lng]) => [
    (lng - minLng) * effectiveScale + offsetX,
    // Flip Y so north is up
    (maxLat - lat) * effectiveScale + offsetY,
  ]);
}

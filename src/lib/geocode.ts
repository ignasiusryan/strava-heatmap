// Client-side reverse geocoding using OpenStreetMap Nominatim
// Caches results by ~11km grid cell, rate-limited to 1 req/sec

const cache = new Map<string, { city: string | null; country: string | null }>();
let lastRequest = 0;

function gridKey(lat: number, lng: number): string {
  return `${Math.round(lat * 10) / 10},${Math.round(lng * 10) / 10}`;
}

async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastRequest));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
}

async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ city: string | null; country: string | null }> {
  const key = gridKey(lat, lng);
  if (cache.has(key)) return cache.get(key)!;

  await throttle();

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&accept-language=en`;
    const res = await fetch(url, {
      headers: { "User-Agent": "lariviz.xyz" },
    });
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city =
        addr.city || addr.town || addr.village || addr.municipality ||
        addr.county || addr.state || null;
      const country = addr.country || null;
      const result = { city, country };
      cache.set(key, result);
      return result;
    }
  } catch {
    // ignore
  }

  const fallback = { city: null, country: null };
  cache.set(key, fallback);
  return fallback;
}

export interface GeoActivity {
  start_latlng?: [number, number] | null;
  location_city?: string | null;
}

/**
 * Reverse-geocode a batch of activities.
 * Returns a Map from grid key to { city, country }.
 * Deduplicates and rate-limits automatically.
 */
export async function geocodeActivities(
  activities: GeoActivity[],
  onProgress?: (resolved: number, total: number) => void
): Promise<Map<string, { city: string | null; country: string | null }>> {
  // Collect unique grid cells that need geocoding
  const toResolve = new Map<string, { lat: number; lng: number }>();
  for (const a of activities) {
    if (!a.start_latlng || a.start_latlng.length !== 2) continue;
    if (a.location_city) continue; // already has city from Strava
    const key = gridKey(a.start_latlng[0], a.start_latlng[1]);
    if (!cache.has(key) && !toResolve.has(key)) {
      toResolve.set(key, { lat: a.start_latlng[0], lng: a.start_latlng[1] });
    }
  }

  const entries = [...toResolve.entries()];
  for (let i = 0; i < entries.length; i++) {
    const [, coord] = entries[i];
    await reverseGeocode(coord.lat, coord.lng);
    onProgress?.(i + 1, entries.length);
  }

  return cache;
}

/**
 * Look up the cached geocode result for a single activity.
 */
export function getGeocodedLocation(
  activity: GeoActivity
): { city: string | null; country: string | null } | null {
  if (!activity.start_latlng || activity.start_latlng.length !== 2) return null;
  const key = gridKey(activity.start_latlng[0], activity.start_latlng[1]);
  return cache.get(key) || null;
}

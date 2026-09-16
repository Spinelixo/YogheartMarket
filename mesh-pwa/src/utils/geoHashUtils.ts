/**
 * Pure TypeScript Geohash Utilities for Firestore Geo-Queries and Distance Calculations
 */

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

/**
 * Standard known coordinates for common cities / regions in Yogheart Marketplace
 */
export const KNOWN_CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  montreal: { lat: 45.5017, lng: -73.5673 },
  toronto: { lat: 43.6532, lng: -79.3832 },
  vancouver: { lat: 49.2827, lng: -123.1207 },
  ottawa: { lat: 45.4215, lng: -75.6972 },
  calgary: { lat: 51.0447, lng: -114.0719 },
  edmonton: { lat: 53.5461, lng: -113.4938 },
  quebec: { lat: 46.8139, lng: -71.208 },
  "new york": { lat: 40.7128, lng: -74.006 },
};

/**
 * Resolve coordinate object from user/item location string or lat/lng fields
 */
export function resolveCoordinates(
  locationStr?: string,
  coords?: { lat?: number; lng?: number; latitude?: number; longitude?: number }
): { lat: number; lng: number } {
  if (coords) {
    const lat = coords.lat ?? coords.latitude;
    const lng = coords.lng ?? coords.longitude;
    if (typeof lat === "number" && typeof lng === "number") {
      return { lat, lng };
    }
  }

  if (locationStr) {
    const lower = locationStr.toLowerCase();
    for (const [city, point] of Object.entries(KNOWN_CITY_COORDINATES)) {
      if (lower.includes(city)) {
        return point;
      }
    }
  }

  // Default fallback: Montreal (default hub)
  return KNOWN_CITY_COORDINATES.montreal;
}

/**
 * Encodes a latitude and longitude into a geohash of given precision
 */
export function encodeGeohash(latitude: number, longitude: number, precision: number = 9): string {
  let latMin = -90.0;
  let latMax = 90.0;
  let lonMin = -180.0;
  let lonMax = 180.0;

  let geohash = "";
  let bits = 0;
  let bitsCount = 0;
  let isEven = true;

  while (geohash.length < precision) {
    if (isEven) {
      const lonMid = (lonMin + lonMax) / 2;
      if (longitude >= lonMid) {
        bits = (bits << 1) | 1;
        lonMin = lonMid;
      } else {
        bits = bits << 1;
        lonMax = lonMid;
      }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (latitude >= latMid) {
        bits = (bits << 1) | 1;
        latMin = latMid;
      } else {
        bits = bits << 1;
        latMax = latMid;
      }
    }

    isEven = !isEven;
    bitsCount++;

    if (bitsCount === 5) {
      geohash += BASE32[bits];
      bits = 0;
      bitsCount = 0;
    }
  }

  return geohash;
}

/**
 * Calculate distance in kilometers using the Haversine formula
 */
export function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Approximate geohash precision appropriate for given radius in km
 */
export function geohashPrecisionForRadiusKm(radiusKm: number): number {
  if (radiusKm <= 0.019) return 9;
  if (radiusKm <= 0.076) return 8;
  if (radiusKm <= 0.61) return 7;
  if (radiusKm <= 2.4) return 6;
  if (radiusKm <= 20) return 5;
  if (radiusKm <= 78) return 4;
  if (radiusKm <= 630) return 3;
  if (radiusKm <= 2500) return 2;
  return 1;
}

/**
 * Returns bounding box geohash range pairs [lower, upper] for Firestore queries
 * Example: collection('items').where('geohash', '>=', b[0]).where('geohash', '<=', b[1])
 */
export function geohashQueryBounds(
  center: [number, number],
  radiusKm: number
): [string, string][] {
  const [lat, lon] = center;
  const precision = geohashPrecisionForRadiusKm(radiusKm);

  // Degrees approximation (1 deg lat ~= 110.574 km)
  const latDelta = radiusKm / 110.574;
  const lonDelta = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));

  const minLat = Math.max(-90, lat - latDelta);
  const maxLat = Math.min(90, lat + latDelta);
  const minLon = Math.max(-180, lon - lonDelta);
  const maxLon = Math.min(180, lon + lonDelta);

  const points: [number, number][] = [
    [minLat, minLon],
    [minLat, maxLon],
    [maxLat, minLon],
    [maxLat, maxLon],
    [lat, lon],
  ];

  const hashes = new Set<string>();
  points.forEach(([pLat, pLon]) => {
    hashes.add(encodeGeohash(pLat, pLon, precision));
  });

  const bounds: [string, string][] = [];
  hashes.forEach((hash) => {
    bounds.push([hash, hash + "~"]);
  });

  return bounds;
}

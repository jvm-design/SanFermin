/**
 * Geo helpers — dependency-free.
 *
 * Privacy note (invariant 1): these run SERVER-side on positions the
 * client sent about ITSELF. Another user's coordinates, distances, or
 * bearings are never computed client-side nor sent to clients.
 */

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

/** Standard geohash encoding (e.g. precision 6 ≈ 1.2 km cell). */
export function geohashEncode(lat: number, lng: number, precision: number): string {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let hash = "";
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;

  while (hash.length < precision) {
    if (evenBit) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        idx = idx * 2 + 1;
        lngMin = mid;
      } else {
        idx = idx * 2;
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        idx = idx * 2 + 1;
        latMin = mid;
      } else {
        idx = idx * 2;
        latMax = mid;
      }
    }
    evenBit = !evenBit;
    bit += 1;
    if (bit === 5) {
      hash += BASE32[idx];
      bit = 0;
      idx = 0;
    }
  }
  return hash;
}

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in meters. */
export function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

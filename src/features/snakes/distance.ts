export const METERS_PER_MILE = 1609.344;

export function toMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

export function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // meters
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const meters = R * c;
  return toMiles(meters);
}

export type BoundingBox = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

export function computeBoundingBox(
  lat: number,
  lon: number,
  radiusMiles: number
): BoundingBox {
  const deltaLat = radiusMiles / 69; // ~ miles per degree latitude
  const latRad = (lat * Math.PI) / 180;
  const deltaLon = radiusMiles / (69 * Math.cos(latRad));

  return {
    minLat: lat - deltaLat,
    maxLat: lat + deltaLat,
    minLon: lon - deltaLon,
    maxLon: lon + deltaLon,
  };
}

export function isWithinBoundingBox(
  lat: number,
  lon: number,
  box: BoundingBox
): boolean {
  return (
    lat >= box.minLat &&
    lat <= box.maxLat &&
    lon >= box.minLon &&
    lon <= box.maxLon
  );
}



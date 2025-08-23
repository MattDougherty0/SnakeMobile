import { computeBoundingBox, haversineMiles, isWithinBoundingBox } from './distance';

export type Occurrence = { lat: number; lon: number };
export type SpeciesOccurrences = { name: string; occurrences: Occurrence[] };
export type SpeciesInfo = {
  scientific_name: string;
  common_name: string;
  image: string; // relative path under /assets/images
  safety_blurb: string;
};

export type NearbySpecies = {
  scientificName: string;
  nearestMiles: number;
};

export async function loadOccurrences(): Promise<SpeciesOccurrences[]> {
  // Bundled JSON via metro: require JSON to bundle it
  const data = require('../../../assets/data/occurrences_us.min.json');
  return data as SpeciesOccurrences[];
}

export async function loadSpeciesInfo(): Promise<SpeciesInfo[]> {
  const data = require('../../../assets/data/species_info.json');
  return data as SpeciesInfo[];
}

export function findSpeciesWithinRadius(
  occurrences: SpeciesOccurrences[],
  userLat: number,
  userLon: number,
  radiusMiles: number
): NearbySpecies[] {
  const box = computeBoundingBox(userLat, userLon, radiusMiles);

  const results: NearbySpecies[] = [];

  for (const species of occurrences) {
    let nearest = Number.POSITIVE_INFINITY;

    for (const point of species.occurrences) {
      if (!isFinite(point.lat) || !isFinite(point.lon)) continue;
      if (!isWithinBoundingBox(point.lat, point.lon, box)) continue;
      const dist = haversineMiles(userLat, userLon, point.lat, point.lon);
      if (dist <= radiusMiles && dist < nearest) {
        nearest = dist;
      }
    }

    if (nearest !== Number.POSITIVE_INFINITY) {
      results.push({ scientificName: species.name, nearestMiles: nearest });
    }
  }

  results.sort((a, b) => a.nearestMiles - b.nearestMiles);
  return results;
}

export function mergeSpeciesDetails(
  nearby: NearbySpecies[],
  infoList: SpeciesInfo[]
) {
  const infoByName = new Map(infoList.map((i) => [i.scientific_name, i]));

  return nearby.map((n) => {
    const info = infoByName.get(n.scientificName);
    return {
      scientificName: n.scientificName,
      commonName: info?.common_name ?? n.scientificName,
      image: info?.image ?? null,
      safetyBlurb:
        info?.safety_blurb ??
        'Keep your distance. Never handle unidentified snakes. If bitten, call 911 immediately.',
      nearestMiles: n.nearestMiles,
    };
  });
}



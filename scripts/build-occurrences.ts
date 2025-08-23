import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

/*
  Usage:
  npx tsx scripts/build-occurrences.ts \
    --input /path/to/VenomMaps/data/occurrence \
    --output assets/data/occurrences_us.min.json

  The script:
  - Scans input dir recursively for .xlsx/.xls files
  - Extracts scientific name, decimalLatitude, decimalLongitude
  - Filters to US bounds (approx) if country not present
  - Deduplicates exact coord repeats and rounds to 4 decimals
  - Groups by species and writes array per app schema
*/

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1];
      args[key] = val;
      i++;
    }
  }
  return args;
}

function walkFiles(dir: string, exts: string[], out: string[] = []) {
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) walkFiles(p, exts, out);
    else if (exts.includes(path.extname(entry).toLowerCase())) out.push(p);
  }
  return out;
}

function isWithinApproxUS(lat: number, lon: number): boolean {
  // Rough bounds for contiguous US + AK + HI boxes; generous to not over-filter
  const inCONUS = lat >= 24 && lat <= 50 && lon >= -125 && lon <= -66;
  const inAK = lat >= 51 && lat <= 72 && lon >= -170 && lon <= -129;
  const inHI = lat >= 18 && lat <= 23 && lon >= -161 && lon <= -154;
  return inCONUS || inAK || inHI;
}

function round(n: number, places = 4) {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}

function inferScientificNameFromFilename(filePath: string): string | null {
  const base = path.basename(filePath).replace(/\.(xlsx|xls)$/i, '');
  // Common pattern may be like Genus_species or Genus species
  const cleaned = base.replace(/[_-]+/g, ' ').trim();
  // Heuristic: first two tokens
  const tokens = cleaned.split(/\s+/);
  if (tokens.length >= 2) return `${tokens[0]} ${tokens[1]}`;
  return null;
}

function loadSheetRows(filePath: string) {
  // 1) Try standard readFile (xlsx/xls detection by extension)
  try {
    const wb = XLSX.readFile(filePath, { cellDates: false });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    return XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null });
  } catch (err1) {
    // 2) Try buffer mode (helps if extension is misleading)
    try {
      const buf = fs.readFileSync(filePath);
      const wb = XLSX.read(buf, { type: 'buffer' });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw err1;
      const sheet = wb.Sheets[sheetName];
      return XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null });
    } catch (err2) {
      // 3) Try string mode (CSV / XML / HTML)
      const buf = fs.readFileSync(filePath);
      const text = buf.toString('utf8');
      const wb = XLSX.read(text, { type: 'string' });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw err2;
      const sheet = wb.Sheets[sheetName];
      return XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null });
    }
  }
}

function buildOccurrences(inputDir: string) {
  const files = walkFiles(inputDir, ['.xlsx', '.xls', '.csv', '.tsv']);
  const grouped = new Map<string, Set<string>>();

  for (const file of files) {
    let rows: Record<string, any>[] = [];
    try {
      rows = loadSheetRows(file);
    } catch (err) {
      console.warn(`Skipping unreadable file: ${file}`);
      continue;
    }
    // Name from filename unless there is a column we can read
    let inferredName = inferScientificNameFromFilename(file);

    for (const row of rows) {
      const sciRaw =
        row.final_species ||
        row.taxonomy_updated_species ||
        row.database_recorded_species ||
        row.scientificName ||
        row.scientific_name ||
        row.species ||
        inferredName;
      const sci = sciRaw ? String(sciRaw).replace(/_/g, ' ').trim() : null;
      const lat = Number(
        row.decimalLatitude ?? row.latitude ?? row.lat ?? row.Latitude ?? row.y ?? row.Y
      );
      const lon = Number(
        row.decimalLongitude ?? row.longitude ?? row.lon ?? row.Longitude ?? row.x ?? row.X
      );
      const country = (row.country || row.Country || row.countryCode || row.COUNTRY || '').toString();
      if (!sci || !isFinite(lat) || !isFinite(lon)) continue;

      // Global ingestion: do not filter by country/US bounds

      const key = `${round(lat, 4)},${round(lon, 4)}`;
      if (!grouped.has(sci)) grouped.set(sci, new Set());
      grouped.get(sci)!.add(key);
    }
  }

  const results = Array.from(grouped.entries()).map(([name, coordSet]) => {
    const occurrences = Array.from(coordSet).map((k) => {
      const [latStr, lonStr] = k.split(',');
      return { lat: Number(latStr), lon: Number(lonStr) };
    });
    return { name, occurrences };
  });

  return results;
}

function main() {
  const { input, output } = parseArgs(process.argv);
  if (!input || !output) {
    console.error('Usage: tsx scripts/build-occurrences.ts --input <dir> --output <file>');
    process.exit(1);
  }
  const results = buildOccurrences(path.resolve(input));
  const outPath = path.resolve(output);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(results));
  console.log(`Wrote ${results.length} species to ${outPath}`);
}

if (require.main === module) main();

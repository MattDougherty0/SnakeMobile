# Venom Nearby (MVP)

React Native + Expo minimal iOS app:
- Requests foreground location
- Finds venomous snake species with occurrences within 25 miles (bundled dataset)
- Displays a simple list with image, names, safety blurb, and nearest distance

## Setup

1. Install deps:
```bash
npm install
```

2. Run iOS simulator or device:
```bash
npm run ios
```

## Data
- `assets/data/occurrences_us.min.json`: sample subset of species with occurrences
- `assets/data/species_info.json`: names, images, safety blurbs

Replace with full processed VenomMaps dataset later.

## Notes
- iOS permission string set in `app.json` (`NSLocationWhenInUseUsageDescription`).
- Distance via Haversine; quick bbox prefilter.

## Build real occurrences from VenomMaps (converter)

Prepare a local folder of VenomMaps occurrence Excel files. For a lightweight checkout of just the folder:
```bash
mkdir -p venommaps && cd venommaps
# Option 1: Manual copy your extracted occurrence files here into ./occurrence
# Option 2: Git sparse checkout (if repo accessible and large)
# git clone --filter=blob:none --no-checkout https://github.com/RhettRautsaw/VenomMaps.git .
# git sparse-checkout set --no-cone data/occurrence
# git checkout main
# mv data/occurrence ../venommaps/occurrence
cd ..
```

Run the converter (writes to `assets/data/occurrences_us.min.json`):
```bash
npm run build:occurrences
```

Script assumptions:
- Looks for columns `decimalLatitude`/`decimalLongitude` (falls back to `latitude`/`longitude`/`lat`/`lon`).
- Tries to infer `scientific name` from filename if a column isn’t present.
- Filters to US using either `country` column (US/USA) or approximate geobounds.
- Dedupes exact coordinates and rounds to 4 decimals.



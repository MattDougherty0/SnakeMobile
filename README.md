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



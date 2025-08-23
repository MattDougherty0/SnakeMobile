# Image Sourcing Pipeline Documentation

## Overview

The SnakeMobile Image Sourcing Pipeline is a comprehensive, automated system that harvests high-quality images for venomous snake species from multiple open data sources. The pipeline ensures license compliance, provides proper attribution, and delivers a curated selection of images optimized for mobile app use.

## Data Sources

### 1. iNaturalist (Primary)
- **API Endpoint**: `https://api.inaturalist.org/v1`
- **Content**: Research-grade observations with photos
- **License Policy**: CC0, CC BY, CC BY-SA
- **Quality Filters**: Research-grade observations, minimum dimensions, faves count
- **Rate Limits**: 60 requests/minute

### 2. Wikimedia Commons (Backfill/Hero)
- **API Endpoint**: `https://commons.wikimedia.org/w/api.php`
- **Content**: Curated, high-quality images
- **License Policy**: CC0, CC BY, CC BY-SA
- **Quality Filters**: Minimum dimensions, proper categorization
- **Rate Limits**: 30 requests/minute

### 3. GBIF (Last Resort)
- **API Endpoint**: `https://api.gbif.org/v1`
- **Content**: Occurrence records with media
- **License Policy**: CC0, CC BY, CC BY-SA
- **Quality Filters**: Still images, minimum dimensions
- **Rate Limits**: 20 requests/minute

## License Policy

### Allowed Licenses
- **CC0**: Public Domain (no restrictions)
- **CC BY**: Attribution required
- **CC BY-SA**: Attribution + ShareAlike required

### Disallowed Licenses
- **CC BY-NC**: Non-commercial use only
- **All Rights Reserved**: Copyrighted
- **Unknown**: Unclear licensing

## Attribution Requirements

### Required Fields
- **Author**: Photographer/creator name
- **License**: License type and version
- **License URL**: Link to license details
- **Original Page**: Source page URL
- **Source**: Data source identifier

### Attribution Format
```
Photo: [Author], [License]
```

### Example
```
Photo: John Smith, CC BY 4.0
```

## Image Quality Standards

### Minimum Requirements
- **Dimensions**: 800px shortest side
- **Format**: JPG, PNG, WebP
- **Content**: Snake clearly visible, good lighting
- **Metadata**: Complete licensing and attribution info

### Scoring Algorithm
1. **Source Weight**: iNaturalist (1.0) > Commons (0.9) > GBIF (0.7)
2. **Dimension Boost**: Larger images get higher scores
3. **Faves Boost**: Popular iNaturalist images get bonus points
4. **Diversity**: Ensures representation from multiple sources

## Pipeline Architecture

### 1. Bootstrap & Configuration
- Load configuration from `config/image_seeding.json`
- Initialize HTTP client with caching and rate limiting
- Set up harvesters for each data source

### 2. Taxon Mapping
- Map species names to iNaturalist taxon IDs
- Handle synonyms and subspecies
- Generate `inat_taxa.json` mapping file

### 3. Image Harvesting
- **iNaturalist**: Query observations by taxon ID
- **Commons**: Search by scientific name and categories
- **GBIF**: Search occurrences with media
- Apply license and quality filters

### 4. Processing & Selection
- Deduplicate images using content hashing
- Score candidates using quality algorithm
- Select top 1-3 images per species
- Designate hero image (best quality)

### 5. Output Generation
- Generate `species_images.json` manifest
- Create QA report with coverage metrics
- Optionally download and cache images
- Copy manifest to `web/data/` for app consumption

## File Structure

```
scripts/image_seeding/
├── taxonomy/
│   ├── species_taxonomy.csv      # Canonical species list
│   ├── synonyms.csv              # Name mappings (optional)
│   └── inat_taxa.json           # iNaturalist taxon mapping
├── harvest/
│   ├── cache/                    # API response cache
│   ├── inaturalist.ts           # iNaturalist harvester
│   ├── commons.ts               # Wikimedia Commons harvester
│   └── gbif.ts                  # GBIF harvester
├── stage/
│   ├── media_index.jsonl        # All harvested candidates
│   └── imageProcessor.ts        # Processing logic
├── out/
│   └── species_images.json      # Final manifest
├── shared/
│   └── httpClient.ts            # HTTP client with caching
├── types/
│   └── index.ts                 # TypeScript interfaces
├── pipeline.ts                  # Main orchestrator
└── run.ts                       # Entry point
```

## Usage

### Basic Pipeline
```bash
npx tsx scripts/image_seeding/run.ts
```

### Process Specific Species
```bash
npx tsx scripts/image_seeding/run.ts --species vipera_berus
```

### Continue Previous Run
```bash
npx tsx scripts/image_seeding/run.ts --continue
```

### Refresh All Data
```bash
npx tsx scripts/image_seeding/run.ts --refresh
```

## Output Files

### 1. species_images.json
The main manifest consumed by the app:
```json
{
  "$schema": "https://example.com/schemas/species_images.schema.json",
  "type": "array",
  "items": [
    {
      "species_id": "vipera_berus",
      "canonical_name": "Vipera berus",
      "images": [
        {
          "source": "inaturalist",
          "full_url": "https://...",
          "thumb_url": "https://...",
          "original_page": "https://...",
          "author": "John Smith",
          "license": "CC BY 4.0",
          "license_url": "https://...",
          "width": 1200,
          "height": 800,
          "score": 1.85
        }
      ],
      "hero_index": 0
    }
  ]
}
```

### 2. image_seed_qc.json
Quality assurance report:
```json
{
  "coverage": {
    "total_species": 100,
    "species_with_0_images": 0,
    "species_with_1_images": 5,
    "species_with_2_images": 15,
    "species_with_3_plus_images": 80
  },
  "license_compliance": {
    "cc0_count": 45,
    "cc_by_count": 35,
    "cc_by_sa_count": 20,
    "disallowed_count": 0,
    "unknown_count": 0
  }
}
```

## Quality Metrics

### Coverage Targets
- **100%** of species present in manifest
- **≥95%** of species have ≥1 image
- **≥80%** of species have ≥2 images
- **≥60%** of species have ≥3 images

### License Compliance
- **0** images with disallowed licenses
- **100%** of images have complete attribution
- **100%** of images have valid license URLs

## Error Handling

### Retry Logic
- Exponential backoff for failed requests
- Maximum 3 retry attempts
- Graceful degradation if sources are unavailable

### Fallback Strategy
1. **iNaturalist** (primary source)
2. **Wikimedia Commons** (backfill)
3. **GBIF** (last resort)
4. **Placeholder** (if no images found)

## Monitoring & Logging

### Log Files
- `logs/run-YYYYMMDD-HHMM.log`: Detailed execution logs
- Console output with progress indicators
- Error and warning summaries

### Metrics
- Request counts per source
- Processing time per species
- Success/failure rates
- Image quality distribution

## Future Enhancements

### Planned Features
- **Image Quality Detection**: AI-powered snake presence detection
- **Responsive Derivatives**: Generate thumb/medium/full sizes
- **Format Optimization**: WebP/AVIF conversion
- **Manual Overrides**: Curator control for specific species

### Scalability
- **Parallel Processing**: Concurrent species processing
- **Distributed Caching**: Redis-based response caching
- **Incremental Updates**: Process only changed species
- **Webhook Integration**: Real-time updates from sources

## Troubleshooting

### Common Issues
1. **Rate Limiting**: Check API quotas and adjust delays
2. **License Parsing**: Verify metadata extraction logic
3. **Image Download**: Check network connectivity and permissions
4. **Memory Usage**: Monitor for large image processing

### Debug Mode
Enable verbose logging by setting environment variable:
```bash
DEBUG=image-seeding npx tsx scripts/image_seeding/run.ts
```

## Support

For issues or questions about the image sourcing pipeline:
1. Check the logs in `scripts/image_seeding/logs/`
2. Review the QA report in `reports/image_seed_qc.json`
3. Verify configuration in `config/image_seeding.json`
4. Test individual harvesters in isolation

## License

This pipeline is part of the SnakeMobile project and follows the same licensing terms. The harvested images retain their original licenses and attribution requirements.

# 🐍 SnakeMobile Image Seeding Pipeline

A comprehensive, automated pipeline for harvesting high-quality images of venomous snake species from multiple open data sources.

## 🚀 Quick Start

### Test the Pipeline
```bash
npm run image:seed:test
```

### Run Full Pipeline
```bash
npm run image:seed
```

### Process Specific Species
```bash
npm run image:seed:species vipera_berus
```

### Continue Previous Run
```bash
npm run image:seed:continue
```

### Refresh All Data
```bash
npm run image:seed:refresh
```

## 📁 Structure

```
scripts/image_seeding/
├── taxonomy/              # Species taxonomy and mappings
├── harvest/               # Data source harvesters
├── stage/                 # Processing and staging
├── out/                   # Final outputs
├── shared/                # Shared utilities
├── types/                 # TypeScript interfaces
├── pipeline.ts            # Main orchestrator
├── run.ts                 # Entry point
└── test.ts                # Test script
```

## 🔧 Configuration

Edit `config/image_seeding.json` to customize:
- License policies
- Rate limits
- Image quality requirements
- Scoring weights
- Caching options

## 📊 Outputs

### 1. Final Manifest
- **Location**: `web/data/species_images.json`
- **Format**: JSON with complete image metadata
- **Usage**: Consumed by the SnakeMobile app

### 2. QA Report
- **Location**: `reports/image_seed_qc.json`
- **Content**: Coverage metrics, license compliance, validation results

### 3. Media Index
- **Location**: `stage/media_index.jsonl`
- **Format**: JSONL with all harvested candidates
- **Usage**: Debugging and analysis

## 🌐 Data Sources

### Primary: iNaturalist
- Research-grade observations
- High-quality photos
- CC0/CC BY/CC BY-SA licenses
- Faves-based scoring

### Secondary: Wikimedia Commons
- Curated images
- Professional quality
- Comprehensive licensing
- Category-based search

### Tertiary: GBIF
- Occurrence records
- Scientific accuracy
- Media attachments
- Fallback option

## 📋 License Policy

### ✅ Allowed
- **CC0**: Public Domain
- **CC BY**: Attribution required
- **CC BY-SA**: Attribution + ShareAlike

### ❌ Disallowed
- **CC BY-NC**: Non-commercial only
- **All Rights Reserved**: Copyrighted
- **Unknown**: Unclear licensing

## 🎯 Quality Standards

- **Minimum Dimensions**: 800px shortest side
- **Format Support**: JPG, PNG, WebP
- **Content**: Snake clearly visible
- **Metadata**: Complete attribution info
- **Diversity**: Multiple sources per species

## 🔍 Scoring Algorithm

1. **Source Weight**: iNaturalist (1.0) > Commons (0.9) > GBIF (0.7)
2. **Dimension Boost**: Larger images get higher scores
3. **Faves Boost**: Popular iNaturalist images get bonus points
4. **Diversity**: Ensures representation from multiple sources

## 📈 Coverage Targets

- **100%** of species present in manifest
- **≥95%** of species have ≥1 image
- **≥80%** of species have ≥2 images
- **≥60%** of species have ≥3 images

## 🛠️ Development

### Adding New Data Sources
1. Create harvester class in `harvest/`
2. Implement required interfaces
3. Add to pipeline orchestrator
4. Update configuration

### Customizing Scoring
1. Modify `ImageProcessor.scoreCandidates()`
2. Adjust weights in config
3. Add new scoring factors
4. Test with sample data

### Extending Types
1. Update interfaces in `types/index.ts`
2. Ensure backward compatibility
3. Update all implementations
4. Regenerate documentation

## 🐛 Troubleshooting

### Common Issues

#### Rate Limiting
```bash
# Check current limits
grep "rate_limits" config/image_seeding.json

# Increase delays
npm run image:seed:refresh
```

#### License Parsing
```bash
# Check specific species
npm run image:seed:species vipera_berus

# Review logs
tail -f scripts/image_seeding/logs/run-*.log
```

#### Memory Issues
```bash
# Process fewer species at once
npm run image:seed:species vipera_berus

# Check system resources
top -p $(pgrep -f "image_seeding")
```

### Debug Mode
```bash
DEBUG=image-seeding npm run image:seed
```

## 📚 API Reference

### Core Classes

#### `ImageSeedingPipeline`
Main orchestrator for the entire pipeline.

```typescript
const pipeline = new ImageSeedingPipeline(configPath);
await pipeline.run(options);
```

#### `HttpClient`
Shared HTTP client with caching and retries.

```typescript
const client = new HttpClient(cacheConfig);
const data = await client.get(url, source);
```

#### `ImageProcessor`
Handles deduplication, scoring, and selection.

```typescript
const processor = new ImageProcessor(config);
const results = await processor.processImages(candidates, taxonomyPath);
```

### Interfaces

#### `MediaCandidate`
Represents a single image candidate from any source.

```typescript
interface MediaCandidate {
  source: 'inaturalist' | 'commons' | 'gbif';
  full_url: string;
  thumb_url?: string;
  original_page: string;
  author: string;
  license: string;
  license_url: string;
  width?: number;
  height?: number;
  score?: number;
}
```

#### `SpeciesImages`
Final output for a single species.

```typescript
interface SpeciesImages {
  species_id: string;
  canonical_name: string;
  images: MediaCandidate[];
  hero_index: number;
}
```

## 🔮 Future Enhancements

### Planned Features
- **AI Quality Detection**: Snake presence detection
- **Responsive Derivatives**: Thumb/medium/full sizes
- **Format Optimization**: WebP/AVIF conversion
- **Manual Overrides**: Curator control

### Scalability Improvements
- **Parallel Processing**: Concurrent species processing
- **Distributed Caching**: Redis-based caching
- **Incremental Updates**: Process only changed species
- **Webhook Integration**: Real-time updates

## 📞 Support

### Getting Help
1. Check the logs in `scripts/image_seeding/logs/`
2. Review the QA report in `reports/image_seed_qc.json`
3. Verify configuration in `config/image_seeding.json`
4. Test individual components in isolation

### Contributing
1. Follow the existing code structure
2. Add comprehensive tests
3. Update documentation
4. Ensure backward compatibility

## 📄 License

This pipeline is part of the SnakeMobile project. The harvested images retain their original licenses and attribution requirements.

---

**Happy Image Seeding! 🐍📸**

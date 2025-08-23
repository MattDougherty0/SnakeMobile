import { MediaCandidate, SpeciesImages, ImageSeedingConfig, SpeciesTaxonomy } from '../types';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class ImageProcessor {
  private config: ImageSeedingConfig;

  constructor(config: ImageSeedingConfig) {
    this.config = config;
  }

  async processImages(
    mediaCandidates: MediaCandidate[],
    speciesTaxonomyPath: string
  ): Promise<SpeciesImages[]> {
    console.log('🔄 Processing and selecting images...');
    
    // Load species taxonomy
    const taxonomyData = fs.readFileSync(speciesTaxonomyPath, 'utf8');
    const species = parse(taxonomyData, { columns: true });
    
    // Group candidates by species
    const speciesGroups = this.groupBySpecies(mediaCandidates, species);
    
    // Process each species
    const results: SpeciesImages[] = [];
    
    for (const [speciesId, candidates] of Object.entries(speciesGroups)) {
      try {
        const processed = await this.processSpeciesImages(speciesId, candidates);
        if (processed) {
          results.push(processed);
        }
      } catch (error) {
        console.warn(`Failed to process images for ${speciesId}:`, error);
      }
    }
    
    console.log(`✅ Processed images for ${results.length} species`);
    return results;
  }

  private groupBySpecies(
    candidates: MediaCandidate[],
    species: SpeciesTaxonomy[]
  ): Record<string, MediaCandidate[]> {
    const groups: Record<string, MediaCandidate[]> = {};
    
    // Initialize groups for all species
    for (const speciesRow of species) {
      groups[speciesRow.species_id] = [];
    }
    
    // Group candidates by matching species names
    for (const candidate of candidates) {
      const speciesId = this.findSpeciesId(candidate, species);
      if (speciesId) {
        if (!groups[speciesId]) {
          groups[speciesId] = [];
        }
        groups[speciesId].push(candidate);
      }
    }
    
    return groups;
  }

  private findSpeciesId(candidate: MediaCandidate, species: SpeciesTaxonomy[]): string | null {
    // Try to match by URL content or metadata
    const candidateText = JSON.stringify(candidate).toLowerCase();
    
    for (const speciesRow of species) {
      const scientificName = speciesRow.canonical_name.toLowerCase();
      const commonName = speciesRow.common_name.toLowerCase();
      
      if (candidateText.includes(scientificName) || candidateText.includes(commonName)) {
        return speciesRow.species_id;
      }
    }
    
    return null;
  }

  private async processSpeciesImages(
    speciesId: string,
    candidates: MediaCandidate[]
  ): Promise<SpeciesImages | null> {
    if (candidates.length === 0) {
      return null;
    }
    
    // Deduplicate candidates
    const deduped = this.deduplicateCandidates(candidates);
    
    // Score candidates
    const scored = this.scoreCandidates(deduped);
    
    // Select top candidates
    const selected = this.selectTopCandidates(scored);
    
    if (selected.length === 0) {
      return null;
    }
    
    // Determine hero image
    const heroIndex = this.determineHeroIndex(selected);
    
    // Get species info
    const speciesInfo = this.getSpeciesInfo(speciesId);
    
    return {
      species_id: speciesId,
      canonical_name: speciesInfo?.canonical_name || speciesId,
      images: selected,
      hero_index: heroIndex
    };
  }

  private deduplicateCandidates(candidates: MediaCandidate[]): MediaCandidate[] {
    const seen = new Set<string>();
    const deduped: MediaCandidate[] = [];
    
    for (const candidate of candidates) {
      const hash = this.computeContentHash(candidate);
      candidate.content_hash = hash;
      
      if (!seen.has(hash)) {
        seen.add(hash);
        deduped.push(candidate);
      }
    }
    
    return deduped;
  }

  private computeContentHash(candidate: MediaCandidate): string {
    // Create a hash based on URL and dimensions to identify similar images
    const content = `${candidate.full_url}_${candidate.width || 0}_${candidate.height || 0}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  private scoreCandidates(candidates: MediaCandidate[]): MediaCandidate[] {
    for (const candidate of candidates) {
      let score = 0;
      
      // Source weight
      const sourceWeight = this.config.scoring.source_weights[candidate.source] || 0.5;
      score += sourceWeight;
      
      // Dimension boost
      if (candidate.width && candidate.height) {
        const minDimension = Math.min(candidate.width, candidate.height);
        const dimensionScore = Math.min(minDimension / 1000, 1) * this.config.scoring.dimension_boost;
        score += dimensionScore;
      }
      
      // Faves boost (for iNaturalist)
      if (candidate.source === 'inaturalist' && candidate.metadata?.faves_count) {
        const favesScore = Math.min(candidate.metadata.faves_count / 10, 1) * this.config.scoring.faves_boost;
        score += favesScore;
      }
      
      candidate.score = score;
    }
    
    // Sort by score descending
    return candidates.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  private selectTopCandidates(candidates: MediaCandidate[]): MediaCandidate[] {
    const maxImages = this.config.image_requirements.desired_per_species;
    const selected: MediaCandidate[] = [];
    
    // Group by source to ensure diversity
    const bySource: Record<string, MediaCandidate[]> = {};
    for (const candidate of candidates) {
      if (!bySource[candidate.source]) {
        bySource[candidate.source] = [];
      }
      bySource[candidate.source].push(candidate);
    }
    
    // Select top candidates from each source
    for (const [source, sourceCandidates] of Object.entries(bySource)) {
      const maxPerSource = this.config.image_requirements.max_per_source_per_species[source] || 3;
      const topFromSource = sourceCandidates.slice(0, maxPerSource);
      selected.push(...topFromSource);
      
      if (selected.length >= maxImages) {
        break;
      }
    }
    
    // Sort by score and limit to desired count
    return selected
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, maxImages);
  }

  private determineHeroIndex(images: MediaCandidate[]): number {
    if (images.length === 0) return 0;
    
    // Find the image with the highest score and largest dimensions
    let bestIndex = 0;
    let bestScore = 0;
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const score = image.score || 0;
      
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      } else if (score === bestScore) {
        // If scores are equal, prefer larger images
        const currentArea = (images[bestIndex].width || 0) * (images[bestIndex].height || 0);
        const newArea = (image.width || 0) * (image.height || 0);
        
        if (newArea > currentArea) {
          bestIndex = i;
        }
      }
    }
    
    return bestIndex;
  }

  private getSpeciesInfo(speciesId: string): SpeciesTaxonomy | null {
    // This would typically load from the taxonomy file
    // For now, return a basic structure
    return {
      species_id: speciesId,
      canonical_name: speciesId.replace(/_/g, ' '),
      common_name: '',
      family: 'Viperidae',
      genus: speciesId.split('_')[0]
    };
  }

  async saveMediaIndex(candidates: MediaCandidate[], outputPath: string): Promise<void> {
    console.log('💾 Saving media index...');
    
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save as JSONL for easy processing
    const lines = candidates.map(candidate => JSON.stringify(candidate));
    fs.writeFileSync(outputPath, lines.join('\n'));
    
    console.log(`✅ Saved ${candidates.length} media candidates to ${outputPath}`);
  }
}

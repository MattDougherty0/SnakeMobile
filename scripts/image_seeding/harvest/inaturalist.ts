import { HttpClient } from '../shared/httpClient';
import { MediaCandidate, INatTaxon, ImageSeedingConfig } from '../types';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

export interface INatObservation {
  id: number;
  taxon_id: number;
  quality_grade: string;
  faves_count: number;
  photos: INatPhoto[];
}

export interface INatPhoto {
  id: number;
  url: string;
  large_url: string;
  medium_url: string;
  small_url: string;
  original_dimensions: {
    width: number;
    height: number;
  };
  attribution: string;
  license_code: string;
  license_name: string;
  license_url: string;
}

export class INaturalistHarvester {
  private httpClient: HttpClient;
  private config: ImageSeedingConfig;
  private baseUrl = 'https://api.inaturalist.org/v1';

  constructor(httpClient: HttpClient, config: ImageSeedingConfig) {
    this.httpClient = httpClient;
    this.config = config;
  }

  async mapTaxa(speciesTaxonomyPath: string): Promise<INatTaxon[]> {
    console.log('🔍 Mapping species to iNaturalist taxa...');
    
    const taxonomyData = fs.readFileSync(speciesTaxonomyPath, 'utf8');
    const species = parse(taxonomyData, { columns: true });
    
    const taxa: INatTaxon[] = [];
    const errors: string[] = [];
    let processedCount = 0;

    for (const speciesRow of species) {
      try {
        processedCount++;
        console.log(`  Processing ${processedCount}/${species.length}: ${speciesRow.canonical_name}`);
        
        const taxon = await this.findTaxon(speciesRow.canonical_name);
        if (taxon) {
          taxa.push({
            species_id: speciesRow.species_id,
            taxon_id: taxon.id,
            rank: taxon.rank,
            matched_name: taxon.name,
            exact_match: taxon.name.toLowerCase() === speciesRow.canonical_name.toLowerCase()
          });
          console.log(`    ✅ Mapped to taxon ID: ${taxon.id}`);
        } else {
          errors.push(`No taxon found for ${speciesRow.canonical_name}`);
          console.log(`    ⚠️  No taxon found`);
        }
        
        // Rate limiting
        await this.delay(1000);
      } catch (error) {
        const errorMsg = `Error mapping ${speciesRow.canonical_name}: ${error}`;
        errors.push(errorMsg);
        console.log(`    ❌ ${errorMsg}`);
        
        // Continue processing other species instead of failing completely
        continue;
      }
    }

    // Save taxa mapping
    const taxaPath = path.join(__dirname, '../taxonomy/inat_taxa.json');
    fs.writeFileSync(taxaPath, JSON.stringify(taxa, null, 2));
    
    console.log(`✅ Mapped ${taxa.length} species to iNaturalist taxa`);
    if (errors.length > 0) {
      console.log(`⚠️  ${errors.length} mapping errors logged`);
    }
    
    return taxa;
  }

  private async findTaxon(scientificName: string): Promise<any> {
    const url = `${this.baseUrl}/taxa/autocomplete?q=${encodeURIComponent(scientificName)}&rank_level=10`;
    
    try {
      const response = await this.httpClient.get(url, 'inaturalist');
      const taxa = response.results || [];
      
      // Find exact match first
      const exactMatch = taxa.find((t: any) => 
        t.name.toLowerCase() === scientificName.toLowerCase()
      );
      
      if (exactMatch) {
        return exactMatch;
      }
      
      // Find species-level matches
      const speciesMatches = taxa.filter((t: any) => 
        t.rank === 'species' && 
        t.name.toLowerCase().includes(scientificName.toLowerCase())
      );
      
      return speciesMatches[0] || null;
    } catch (error) {
      console.warn(`Failed to find taxon for ${scientificName}:`, error);
      return null;
    }
  }

  async harvestImages(taxa: INatTaxon[]): Promise<MediaCandidate[]> {
    console.log('📸 Harvesting images from iNaturalist...');
    
    const allCandidates: MediaCandidate[] = [];
    
    for (const taxon of taxa) {
      try {
        const candidates = await this.harvestSpeciesImages(taxon);
        allCandidates.push(...candidates);
        
        console.log(`  ${taxon.matched_name}: ${candidates.length} images`);
        
        // Rate limiting
        await this.delay(2000);
      } catch (error) {
        console.warn(`Failed to harvest images for ${taxon.matched_name}:`, error);
      }
    }
    
    console.log(`✅ Harvested ${allCandidates.length} total images from iNaturalist`);
    return allCandidates;
  }

  private async harvestSpeciesImages(taxon: INatTaxon): Promise<MediaCandidate[]> {
    const url = `${this.baseUrl}/observations?taxon_id=${taxon.taxon_id}&quality_grade=research&photos=true&order_by=faves&per_page=200`;
    
    try {
      const response = await this.httpClient.get(url, 'inaturalist');
      const observations = response.results || [];
      
      const candidates: MediaCandidate[] = [];
      
      for (const obs of observations) {
        if (!obs.photos || obs.photos.length === 0) continue;
        
        for (const photo of obs.photos) {
          // Check license compliance
          if (!this.isLicenseAllowed(photo.license_code)) {
            continue;
          }
          
          // Check minimum dimensions
          if (photo.original_dimensions) {
            const minDimension = Math.min(photo.original_dimensions.width, photo.original_dimensions.height);
            if (minDimension < this.config.image_requirements.min_dimension) {
              continue;
            }
          }
          
          // Construct medium URL from square URL
          const squareUrl = photo.url;
          const mediumUrl = squareUrl.replace('/square.jpg', '/medium.jpg');
          
          const candidate: MediaCandidate = {
            source: 'inaturalist',
            full_url: mediumUrl, // Use constructed medium URL
            thumb_url: squareUrl, // Use the square URL as thumbnail
            original_page: `https://www.inaturalist.org/observations/${obs.id}`,
            author: photo.attribution || 'Unknown', // Use attribution field
            license: photo.license_code || 'Unknown',
            license_url: photo.license_url || '',
            width: photo.original_dimensions?.width,
            height: photo.original_dimensions?.height,
            taxon_id: taxon.taxon_id, // Add the taxon_id for proper species matching
            metadata: {
              observation_id: obs.id,
              photo_id: photo.id,
              faves_count: obs.faves_count,
              quality_grade: obs.quality_grade
            }
          };
          
          candidates.push(candidate);
          
          // Limit per species per source
          if (candidates.length >= this.config.image_requirements.max_per_source_per_species.inaturalist) {
            break;
          }
        }
        
        if (candidates.length >= this.config.image_requirements.max_per_source_per_species.inaturalist) {
          break;
        }
      }
      
      return candidates;
    } catch (error) {
      console.warn(`Failed to harvest images for taxon ${taxon.taxon_id}:`, error);
      return [];
    }
  }

  private isLicenseAllowed(licenseCode: string): boolean {
    if (!licenseCode) return false;
    
    const upperLicense = licenseCode.toUpperCase();
    return this.config.allowed_licenses.some(allowed => 
      upperLicense.includes(allowed.toUpperCase())
    );
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

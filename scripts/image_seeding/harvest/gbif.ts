import { HttpClient } from '../shared/httpClient';
import { MediaCandidate, ImageSeedingConfig } from '../types';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

export interface GBIFOccurrence {
  key: string;
  scientificName: string;
  media: GBIFMedia[];
  license: string;
  rightsHolder: string;
}

export interface GBIFMedia {
  type: string;
  format: string;
  identifier: string;
  references: string;
  created: string;
  creator: string;
  license: string;
  rightsHolder: string;
  width: number;
  height: number;
}

export class GBIFHarvester {
  private httpClient: HttpClient;
  private config: ImageSeedingConfig;
  private baseUrl = 'https://api.gbif.org/v1';

  constructor(httpClient: HttpClient, config: ImageSeedingConfig) {
    this.httpClient = httpClient;
    this.config = config;
  }

  async harvestImages(speciesTaxonomyPath: string): Promise<MediaCandidate[]> {
    console.log('🌍 Harvesting images from GBIF...');
    
    const taxonomyData = fs.readFileSync(speciesTaxonomyPath, 'utf8');
    const species = parse(taxonomyData, { columns: true });
    
    const allCandidates: MediaCandidate[] = [];
    
    for (const speciesRow of species) {
      try {
        const candidates = await this.harvestSpeciesImages(speciesRow.canonical_name);
        allCandidates.push(...candidates);
        
        console.log(`  ${speciesRow.canonical_name}: ${candidates.length} images`);
        
        // Rate limiting
        await this.delay(3000);
      } catch (error) {
        console.warn(`Failed to harvest images for ${speciesRow.canonical_name}:`, error);
      }
    }
    
    console.log(`✅ Harvested ${allCandidates.length} total images from GBIF`);
    return allCandidates;
  }

  private async harvestSpeciesImages(scientificName: string): Promise<MediaCandidate[]> {
    const searchUrl = `${this.baseUrl}/occurrence/search?scientificName=${encodeURIComponent(scientificName)}&hasCoordinate=true&mediaType=StillImage&limit=300`;
    
    try {
      const response = await this.httpClient.get(searchUrl, 'gbif');
      const occurrences = response.results || [];
      
      const candidates: MediaCandidate[] = [];
      
      for (const occurrence of occurrences) {
        if (!occurrence.media || occurrence.media.length === 0) continue;
        
        for (const media of occurrence.media) {
          // Check if it's an image
          if (media.type !== 'StillImage') continue;
          
          // Check license compliance
          if (!this.isLicenseAllowed(media.license)) {
            continue;
          }
          
          // Check minimum dimensions
          if (media.width && media.height) {
            const minDimension = Math.min(media.width, media.height);
            if (minDimension < this.config.image_requirements.min_dimension) {
              continue;
            }
          }
          
          const candidate: MediaCandidate = {
            source: 'gbif',
            full_url: media.identifier,
            thumb_url: media.identifier, // GBIF doesn't provide thumbnails
            original_page: media.references || `https://www.gbif.org/occurrence/${occurrence.key}`,
            author: media.creator || occurrence.rightsHolder || 'Unknown',
            license: media.license || occurrence.license || 'Unknown',
            license_url: this.getLicenseUrl(media.license || occurrence.license),
            width: media.width,
            height: media.height,
            metadata: {
              occurrence_key: occurrence.key,
              media_type: media.type,
              format: media.format,
              created: media.created,
              rights_holder: media.rightsHolder
            }
          };
          
          candidates.push(candidate);
          
          // Limit per species per source
          if (candidates.length >= this.config.image_requirements.max_per_source_per_species.gbif) {
            break;
          }
        }
        
        if (candidates.length >= this.config.image_requirements.max_per_source_per_species.gbif) {
          break;
        }
      }
      
      return candidates;
    } catch (error) {
      console.warn(`Failed to harvest images for ${scientificName}:`, error);
      return [];
    }
  }

  private isLicenseAllowed(license: string): boolean {
    if (!license) return false;
    
    const upperLicense = license.toUpperCase();
    return this.config.allowed_licenses.some(allowed => 
      upperLicense.includes(allowed.toUpperCase())
    );
  }

  private getLicenseUrl(license: string): string {
    if (!license) return '';
    
    const licenseUrls: Record<string, string> = {
      'CC0': 'https://creativecommons.org/publicdomain/zero/1.0/',
      'CC BY': 'https://creativecommons.org/licenses/by/4.0/',
      'CC BY-SA': 'https://creativecommons.org/licenses/by-sa/4.0/',
      'CC BY-NC': 'https://creativecommons.org/licenses/by-nc/4.0/'
    };
    
    const upperLicense = license.toUpperCase();
    for (const [key, url] of Object.entries(licenseUrls)) {
      if (upperLicense.includes(key)) {
        return url;
      }
    }
    
    return '';
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

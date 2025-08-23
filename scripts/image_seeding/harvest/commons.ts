import { HttpClient } from '../shared/httpClient';
import { MediaCandidate, ImageSeedingConfig, INatTaxon } from '../types';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

export interface CommonsFile {
  title: string;
  url: string;
  author: string;
  license: string;
  license_url: string;
  width: number;
  height: number;
  description: string;
}

export class WikimediaCommonsHarvester {
  private httpClient: HttpClient;
  private config: ImageSeedingConfig;
  private baseUrl = 'https://commons.wikimedia.org/w/api.php';

  constructor(httpClient: HttpClient, config: ImageSeedingConfig) {
    this.httpClient = httpClient;
    this.config = config;
  }

  async harvestImages(taxa: INatTaxon[]): Promise<MediaCandidate[]> {
    console.log('🖼️  Harvesting images from Wikimedia Commons...');
    
    const allCandidates: MediaCandidate[] = [];
    
    for (const taxon of taxa) {
      try {
        const candidates = await this.harvestSpeciesImages(taxon.matched_name);
        allCandidates.push(...candidates);
        
        console.log(`  ${taxon.matched_name}: ${candidates.length} images`);
        
        // Rate limiting
        await this.delay(2000);
      } catch (error) {
        console.warn(`Failed to harvest images for ${taxon.matched_name}:`, error);
      }
    }
    
    console.log(`✅ Harvested ${allCandidates.length} total images from Wikimedia Commons`);
    return allCandidates;
  }

  private async harvestSpeciesImages(scientificName: string): Promise<MediaCandidate[]> {
    const searchTerms = this.generateSearchTerms(scientificName);
    const candidates: MediaCandidate[] = [];
    
    for (const term of searchTerms) {
      try {
        const files = await this.searchCommonsFiles(term);
        
        for (const file of files) {
          // Check license compliance
          if (!this.isLicenseAllowed(file.license)) {
            continue;
          }
          
          // Check minimum dimensions
          const minDimension = Math.min(file.width, file.height);
          if (minDimension < this.config.image_requirements.min_dimension) {
            continue;
          }
          
          const candidate: MediaCandidate = {
            source: 'commons',
            full_url: file.url,
            thumb_url: this.generateThumbnailUrl(file.url),
            original_page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(file.title)}`,
            author: file.author,
            license: file.license,
            license_url: file.license_url,
            width: file.width,
            height: file.height,
            metadata: {
              title: file.title,
              description: file.description
            }
          };
          
          candidates.push(candidate);
          
          // Limit per species per source
          if (candidates.length >= this.config.image_requirements.max_per_source_per_species.commons) {
            break;
          }
        }
        
        if (candidates.length >= this.config.image_requirements.max_per_source_per_species.commons) {
          break;
        }
      } catch (error) {
        console.warn(`Failed to search for term "${term}":`, error);
      }
    }
    
    return candidates;
  }

  private generateSearchTerms(scientificName: string): string[] {
    const terms = [scientificName];
    
    // Add common name variations if available
    const parts = scientificName.split(' ');
    if (parts.length >= 2) {
      terms.push(`${parts[0]} ${parts[1]}`); // Genus species
      terms.push(`${parts[1]} ${parts[0]}`); // species Genus
    }
    
    // Add snake-related terms
    terms.push(`${scientificName} snake`);
    terms.push(`${scientificName} viper`);
    terms.push(`${scientificName} rattlesnake`);
    
    return terms;
  }

  private async searchCommonsFiles(searchTerm: string): Promise<CommonsFile[]> {
    const searchUrl = `${this.baseUrl}?action=query&list=search&srsearch=${encodeURIComponent(searchTerm + ' snake')}&format=json&srlimit=50&srnamespace=6`;
    
    try {
      const response = await this.httpClient.get(searchUrl, 'commons');
      const searchResults = response.query?.search || [];
      
      const files: CommonsFile[] = [];
      
      for (const result of searchResults) {
        try {
          const fileInfo = await this.getFileInfo(result.title);
          if (fileInfo) {
            files.push(fileInfo);
          }
        } catch (error) {
          console.warn(`Failed to get file info for ${result.title}:`, error);
        }
      }
      
      return files;
    } catch (error) {
      console.warn(`Failed to search Commons for "${searchTerm}":`, error);
      return [];
    }
  }

  private async getFileInfo(title: string): Promise<CommonsFile | null> {
    const infoUrl = `${this.baseUrl}?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo|extmetadata&iiprop=url|size&format=json`;
    
    try {
      const response = await this.httpClient.get(infoUrl, 'commons');
      const pages = response.query?.pages || {};
      const pageId = Object.keys(pages)[0];
      const page = pages[pageId];
      
      if (!page.imageinfo || !page.extmetadata) {
        return null;
      }
      
      const imageInfo = page.imageinfo[0];
      const metadata = page.extmetadata;
      
      // Extract license information
      const license = this.extractLicense(metadata);
      if (!license || !this.isLicenseAllowed(license.license)) {
        return null;
      }
      
      // Extract author information
      const author = this.extractAuthor(metadata);
      
      return {
        title: title,
        url: imageInfo.url,
        author: author,
        license: license.license,
        license_url: license.url,
        width: imageInfo.width,
        height: imageInfo.height,
        description: metadata.ImageDescription?.value || ''
      };
    } catch (error) {
      console.warn(`Failed to get file info for ${title}:`, error);
      return null;
    }
  }

  private extractLicense(metadata: any): { license: string; url: string } | null {
    // Try different license fields
    const licenseFields = [
      'License',
      'LicenseShortName',
      'UsageTerms',
      'Copyrighted'
    ];
    
    for (const field of licenseFields) {
      if (metadata[field]?.value) {
        const value = metadata[field].value;
        const license = this.normalizeLicense(value);
        const url = this.getLicenseUrl(license);
        
        if (license) {
          return { license, url };
        }
      }
    }
    
    return null;
  }

  private extractAuthor(metadata: any): string {
    const authorFields = [
      'Artist',
      'Author',
      'Creator',
      'Photographer'
    ];
    
    for (const field of authorFields) {
      if (metadata[field]?.value) {
        return metadata[field].value;
      }
    }
    
    return 'Unknown';
  }

  private normalizeLicense(licenseText: string): string {
    const upper = licenseText.toUpperCase();
    
    if (upper.includes('CC0') || upper.includes('PUBLIC DOMAIN')) {
      return 'CC0';
    } else if (upper.includes('CC BY-SA')) {
      return 'CC BY-SA';
    } else if (upper.includes('CC BY')) {
      return 'CC BY';
    } else if (upper.includes('CC BY-NC')) {
      return 'CC BY-NC';
    }
    
    return licenseText;
  }

  private getLicenseUrl(license: string): string {
    const licenseUrls: Record<string, string> = {
      'CC0': 'https://creativecommons.org/publicdomain/zero/1.0/',
      'CC BY': 'https://creativecommons.org/licenses/by/4.0/',
      'CC BY-SA': 'https://creativecommons.org/licenses/by-sa/4.0/',
      'CC BY-NC': 'https://creativecommons.org/licenses/by-nc/4.0/'
    };
    
    return licenseUrls[license] || '';
  }

  private isLicenseAllowed(license: string): boolean {
    if (!license) return false;
    
    const upperLicense = license.toUpperCase();
    return this.config.allowed_licenses.some(allowed => 
      upperLicense.includes(allowed.toUpperCase())
    );
  }

  private generateThumbnailUrl(fullUrl: string): string {
    // Commons doesn't provide direct thumbnail URLs, so we'll use the full URL
    // In production, you might want to generate thumbnails or use a thumbnail service
    return fullUrl;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

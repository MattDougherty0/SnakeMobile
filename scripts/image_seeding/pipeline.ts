import { HttpClient, CacheConfig } from './shared/httpClient';
import { INaturalistHarvester } from './harvest/inaturalist';
import { WikimediaCommonsHarvester } from './harvest/commons';
import { GBIFHarvester } from './harvest/gbif';
import { ImageProcessor } from './stage/imageProcessor';
import { 
  ImageSeedingConfig, 
  MediaCandidate, 
  SpeciesImages, 
  QAResults,
  PipelineStats 
} from './types';
import fs from 'fs';
import path from 'path';

export class ImageSeedingPipeline {
  private config: ImageSeedingConfig;
  private httpClient: HttpClient;
  private inatHarvester: INaturalistHarvester;
  private commonsHarvester: WikimediaCommonsHarvester;
  private gbifHarvester: GBIFHarvester;
  private imageProcessor: ImageProcessor;
  private stats: PipelineStats;

  constructor(configPath: string) {
    this.config = this.loadConfig(configPath);
    this.httpClient = this.createHttpClient();
    this.inatHarvester = new INaturalistHarvester(this.httpClient, this.config);
    this.commonsHarvester = new WikimediaCommonsHarvester(this.httpClient, this.config);
    this.gbifHarvester = new GBIFHarvester(this.httpClient, this.config);
    this.imageProcessor = new ImageProcessor(this.config);
    
    this.stats = {
      startTime: new Date(),
      speciesProcessed: 0,
      imagesHarvested: 0,
      imagesSelected: 0,
      errors: [],
      warnings: []
    };
  }

  private loadConfig(configPath: string): ImageSeedingConfig {
    const configData = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configData);
  }

  private createHttpClient(): HttpClient {
    const cacheConfig: CacheConfig = {
      enableDiskCaching: this.config.cache.enable_disk_caching,
      cacheTtlHours: this.config.cache.cache_ttl_hours,
      cacheDir: path.join(__dirname, 'harvest/cache')
    };

    return new HttpClient(cacheConfig);
  }

  async run(options: {
    species?: string;
    continue?: boolean;
    refresh?: boolean;
  } = {}): Promise<void> {
    console.log('🚀 Starting Image Seeding Pipeline...');
    console.log(`📅 Started at: ${this.stats.startTime.toISOString()}`);
    
    try {
      // Step 1: Map species to iNaturalist taxa
      const taxa = await this.inatHarvester.mapTaxa(
        path.join(__dirname, 'taxonomy/species_taxonomy.csv')
      );
      
      if (taxa.length === 0) {
        throw new Error('No taxa were mapped successfully. Cannot proceed with image harvesting.');
      }
      
      console.log(`✅ Successfully mapped ${taxa.length} species to iNaturalist taxa`);
      
      // Step 2: Harvest images from all sources
      const allCandidates = await this.harvestFromAllSources();
      
      // Step 3: Process and select images
      const speciesImages = await this.imageProcessor.processImages(
        allCandidates,
        path.join(__dirname, 'taxonomy/species_taxonomy.csv')
      );
      
      // Step 4: Save media index
      await this.imageProcessor.saveMediaIndex(
        allCandidates,
        path.join(__dirname, 'stage/media_index.jsonl')
      );
      
      // Step 5: Generate final manifest
      await this.generateFinalManifest(speciesImages);
      
      // Step 6: Generate QA report
      const qaResults = await this.generateQAReport(speciesImages);
      
      // Step 7: Update stats and log completion
      this.stats.endTime = new Date();
      this.stats.speciesProcessed = speciesImages.length;
      this.stats.imagesHarvested = allCandidates.length;
      this.stats.imagesSelected = speciesImages.reduce((sum, s) => sum + s.images.length, 0);
      
      console.log('\n🎉 Pipeline completed successfully!');
      this.logSummary();
      
    } catch (error) {
      console.error('❌ Pipeline failed:', error);
      this.stats.errors.push(error.toString());
      throw error;
    }
  }

  private async harvestFromAllSources(): Promise<MediaCandidate[]> {
    console.log('\n📥 Harvesting images from all sources...');
    
    const allCandidates: MediaCandidate[] = [];
    
    // Harvest from iNaturalist
    try {
      const inatCandidates = await this.inatHarvester.harvestImages(
        path.join(__dirname, 'taxonomy/species_taxonomy.csv')
      );
      allCandidates.push(...inatCandidates);
      console.log(`✅ iNaturalist: ${inatCandidates.length} images`);
    } catch (error) {
      console.warn('⚠️  iNaturalist harvesting failed:', error);
      this.stats.warnings.push(`iNaturalist: ${error}`);
    }
    
    // Harvest from Wikimedia Commons
    try {
      const commonsCandidates = await this.commonsHarvester.harvestImages(
        path.join(__dirname, 'taxonomy/species_taxonomy.csv')
      );
      allCandidates.push(...commonsCandidates);
      console.log(`✅ Wikimedia Commons: ${commonsCandidates.length} images`);
    } catch (error) {
      console.warn('⚠️  Wikimedia Commons harvesting failed:', error);
      this.stats.warnings.push(`Wikimedia Commons: ${error}`);
    }
    
    // Harvest from GBIF
    try {
      const gbifCandidates = await this.gbifHarvester.harvestImages(
        path.join(__dirname, 'taxonomy/species_taxonomy.csv')
      );
      allCandidates.push(...gbifCandidates);
      console.log(`✅ GBIF: ${gbifCandidates.length} images`);
    } catch (error) {
      console.warn('⚠️  GBIF harvesting failed:', error);
      this.stats.warnings.push(`GBIF: ${error}`);
    }
    
    console.log(`📊 Total images harvested: ${allCandidates.length}`);
    return allCandidates;
  }

  private async generateFinalManifest(speciesImages: SpeciesImages[]): Promise<void> {
    console.log('\n📋 Generating final manifest...');
    
    const manifest = {
      $schema: "https://example.com/schemas/species_images.schema.json",
      type: "array",
      items: speciesImages
    };
    
    // Save to output directory
    const outputPath = path.join(__dirname, 'out/species_images.json');
    fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
    
    // Copy to web data directory
    const webDataPath = path.join(__dirname, '../../web/data/species_images.json');
    const webDataDir = path.dirname(webDataPath);
    if (!fs.existsSync(webDataDir)) {
      fs.mkdirSync(webDataDir, { recursive: true });
    }
    fs.copyFileSync(outputPath, webDataPath);
    
    console.log(`✅ Manifest saved to ${outputPath}`);
    console.log(`✅ Manifest copied to ${webDataPath}`);
  }

  private async generateQAReport(speciesImages: SpeciesImages[]): Promise<QAResults> {
    console.log('\n🔍 Generating QA report...');
    
    const qaResults: QAResults = {
      coverage: {
        total_species: speciesImages.length,
        species_with_0_images: 0,
        species_with_1_images: 0,
        species_with_2_images: 0,
        species_with_3_plus_images: 0
      },
      license_compliance: {
        cc0_count: 0,
        cc_by_count: 0,
        cc_by_sa_count: 0,
        disallowed_count: 0,
        unknown_count: 0
      },
      validation: {
        schema_valid: true,
        broken_links: 0,
        total_images: 0,
        average_dimensions: { width: 0, height: 0 }
      },
      errors: []
    };
    
    // Calculate coverage
    for (const species of speciesImages) {
      const imageCount = species.images.length;
      if (imageCount === 0) qaResults.coverage.species_with_0_images++;
      else if (imageCount === 1) qaResults.coverage.species_with_1_images++;
      else if (imageCount === 2) qaResults.coverage.species_with_2_images++;
      else qaResults.coverage.species_with_3_plus_images++;
      
      // Count licenses
      for (const image of species.images) {
        qaResults.validation.total_images++;
        
        const license = image.license.toUpperCase();
        if (license.includes('CC0')) qaResults.license_compliance.cc0_count++;
        else if (license.includes('CC BY-SA')) qaResults.license_compliance.cc_by_sa_count++;
        else if (license.includes('CC BY')) qaResults.license_compliance.cc_by_count++;
        else if (this.config.disallowed_licenses.some(d => license.includes(d.toUpperCase()))) {
          qaResults.license_compliance.disallowed_count++;
        } else {
          qaResults.license_compliance.unknown_count++;
        }
        
        // Calculate average dimensions
        if (image.width && image.height) {
          qaResults.validation.average_dimensions.width += image.width;
          qaResults.validation.average_dimensions.height += image.height;
        }
      }
    }
    
    // Calculate averages
    if (qaResults.validation.total_images > 0) {
      qaResults.validation.average_dimensions.width = Math.round(
        qaResults.validation.average_dimensions.width / qaResults.validation.total_images
      );
      qaResults.validation.average_dimensions.height = Math.round(
        qaResults.validation.average_dimensions.height / qaResults.validation.total_images
      );
    }
    
    // Save QA report
    const qaPath = path.join(__dirname, '../../reports/image_seed_qc.json');
    fs.writeFileSync(qaPath, JSON.stringify(qaResults, null, 2));
    
    console.log(`✅ QA report saved to ${qaPath}`);
    return qaResults;
  }

  private logSummary(): void {
    const duration = this.stats.endTime 
      ? this.stats.endTime.getTime() - this.stats.startTime.getTime()
      : 0;
    
    console.log('\n📊 Pipeline Summary:');
    console.log(`⏱️  Duration: ${Math.round(duration / 1000)}s`);
    console.log(`🐍 Species processed: ${this.stats.speciesProcessed}`);
    console.log(`🖼️  Images harvested: ${this.stats.imagesHarvested}`);
    console.log(`✅ Images selected: ${this.stats.imagesSelected}`);
    
    if (this.stats.errors.length > 0) {
      console.log(`❌ Errors: ${this.stats.errors.length}`);
    }
    
    if (this.stats.warnings.length > 0) {
      console.log(`⚠️  Warnings: ${this.stats.warnings.length}`);
    }
  }
}

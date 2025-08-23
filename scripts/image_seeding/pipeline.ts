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
  PipelineStats,
  INatTaxon
} from './types';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

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
      let taxa = await this.inatHarvester.mapTaxa(
        path.join(__dirname, 'taxonomy/species_taxonomy.csv')
      );
      
      if (taxa.length === 0) {
        throw new Error('No taxa were mapped successfully. Cannot proceed with image harvesting.');
      }
      
      // Apply testing limit if enabled
      if (this.config.testing?.enable_testing_mode && this.config.testing?.max_species_to_process) {
        const limit = this.config.testing.max_species_to_process;
        taxa = taxa.slice(0, limit);
        console.log(`🧪 TESTING MODE: Limited to first ${limit} species`);
      }
      
      console.log(`✅ Successfully mapped ${taxa.length} species to iNaturalist taxa`);
      
      // Step 2: Harvest images from all sources
      console.log(`🔍 Debug: taxa array has ${taxa.length} items`);
      console.log(`🔍 Debug: first taxon: ${JSON.stringify(taxa[0])}`);
      const allCandidates = await this.harvestFromAllSources(taxa);
      
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

  private async harvestFromAllSources(taxa: INatTaxon[]): Promise<MediaCandidate[]> {
    console.log('\n📥 Harvesting images from all sources...');
    console.log(`🔍 Debug: harvestFromAllSources received ${taxa.length} taxa`);
    console.log(`🔍 Debug: first taxon in harvest: ${JSON.stringify(taxa[0])}`);
    
    const allCandidates: MediaCandidate[] = [];
    
    // Harvest from iNaturalist
    try {
      const inatCandidates = await this.inatHarvester.harvestImages(taxa);
      allCandidates.push(...inatCandidates);
      console.log(`✅ iNaturalist: ${inatCandidates.length} images`);
    } catch (error) {
      console.warn('⚠️  iNaturalist harvesting failed:', error);
      this.stats.warnings.push(`iNaturalist: ${error}`);
    }
    
    // Harvest from Wikimedia Commons (if enabled)
    if (this.config.harvesting?.enable_commons !== false) {
      try {
        const commonsCandidates = await this.commonsHarvester.harvestImages(taxa);
        allCandidates.push(...commonsCandidates);
        console.log(`✅ Wikimedia Commons: ${commonsCandidates.length} images`);
      } catch (error) {
        console.warn('⚠️  Wikimedia Commons harvesting failed:', error);
        this.stats.warnings.push(`Wikimedia Commons: ${error}`);
      }
    } else {
      console.log('⏭️  Wikimedia Commons harvesting disabled');
    }
    
    // Harvest from GBIF (if enabled)
    if (this.config.harvesting?.enable_gbif !== false) {
      try {
        const gbifCandidates = await this.gbifHarvester.harvestImages(taxa);
        allCandidates.push(...gbifCandidates);
        console.log(`✅ GBIF: ${gbifCandidates.length} images`);
      } catch (error) {
        console.warn('⚠️  GBIF harvesting failed:', error);
        this.stats.warnings.push(`GBIF: ${error}`);
      }
    } else {
      console.log('⏭️  GBIF harvesting disabled');
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

  async getSpeciesList(): Promise<string[]> {
    const taxonomyPath = path.join(__dirname, 'taxonomy/species_taxonomy.csv');
    const taxonomyData = fs.readFileSync(taxonomyPath, 'utf8');
    const species = parse(taxonomyData, { columns: true });
    return species.map((s: any) => s.species_id);
  }

  async processSingleSpecies(speciesId: string): Promise<void> {
    console.log(`🎯 Processing single species: ${speciesId}`);
    
    try {
      // Step 1: Map just this species to iNaturalist taxon
      const taxa = await this.inatHarvester.mapTaxa(
        path.join(__dirname, 'taxonomy/species_taxonomy.csv'),
        speciesId
      );
      
      if (taxa.length === 0) {
        throw new Error(`No taxa found for species ${speciesId}`);
      }
      
      console.log(`✅ Mapped ${speciesId} to taxon ID: ${taxa[0].taxon_id}`);
      
      // Step 2: Harvest images for just this species
      const candidates = await this.harvestFromAllSources(taxa);
      
      // Step 3: Process and select images
      const speciesImages = await this.imageProcessor.processImages(
        candidates,
        path.join(__dirname, 'taxonomy/species_taxonomy.csv')
      );
      
      // Step 4: Save individual species results
      await this.saveSpeciesResults(speciesId, speciesImages);
      
      console.log(`✅ Completed processing ${speciesId}`);
      
    } catch (error) {
      console.error(`❌ Failed to process ${speciesId}:`, error);
      throw error;
    }
  }

  private async saveSpeciesResults(speciesId: string, speciesImages: SpeciesImages[]): Promise<void> {
    // Save to individual species file
    const speciesDir = path.join(__dirname, 'out/species');
    if (!fs.existsSync(speciesDir)) {
      fs.mkdirSync(speciesDir, { recursive: true });
    }
    
    const speciesPath = path.join(speciesDir, `${speciesId}.json`);
    fs.writeFileSync(speciesPath, JSON.stringify(speciesImages, null, 2));
    
    // Update the main manifest incrementally
    await this.updateMainManifest(speciesId, speciesImages);
  }

  private async updateMainManifest(speciesId: string, speciesImages: SpeciesImages[]): Promise<void> {
    const manifestPath = path.join(__dirname, 'out/species_images.json');
    let manifest: any = { items: [] };
    
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch (error) {
        console.warn('⚠️  Could not parse existing manifest, starting fresh');
      }
    }
    
    // Remove existing entry for this species if it exists
    manifest.items = manifest.items.filter((item: any) => item.species_id !== speciesId);
    
    // Add new entry
    if (speciesImages.length > 0) {
      manifest.items.push(speciesImages[0]);
    }
    
    // Save updated manifest
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    // Copy to web data directory
    const webDataPath = path.join(__dirname, '../../web/data/species_images.json');
    const webDataDir = path.dirname(webDataPath);
    if (!fs.existsSync(webDataDir)) {
      fs.mkdirSync(webDataDir, { recursive: true });
    }
    fs.copyFileSync(manifestPath, webDataPath);
  }

  // New methods for the extend pipeline
  async getFullSpeciesList(): Promise<string[]> {
    try {
      // Read the original Excel file to get all species
      const xlsx = require('xlsx');
      const workbook = xlsx.readFile(path.join(__dirname, '../../venommaps/occurrence/combined_records_v4.xlsx'));
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(sheet);
      
      // Extract unique species names
      const speciesSet = new Set<string>();
      for (const row of data) {
        if (row.final_species) {
          // Convert to lowercase with underscores for consistency
          const speciesId = row.final_species.toLowerCase().replace(/\s+/g, '_');
          speciesSet.add(speciesId);
        }
      }
      
      return Array.from(speciesSet).sort();
    } catch (error) {
      console.error('❌ Failed to read original species list:', error);
      throw error;
    }
  }

  async getAlreadyProcessedSpecies(): Promise<string[]> {
    try {
      // Read the segment progress to see what we already attempted
      const progressPath = path.join(__dirname, 'segment-progress.json');
      if (fs.existsSync(progressPath)) {
        const data = fs.readFileSync(progressPath, 'utf8');
        const progress = JSON.parse(data);
        return progress.completed_species || [];
      }
      return [];
    } catch (error) {
      console.warn('⚠️  Could not read progress file, assuming no species processed');
      return [];
    }
  }

  async processSpeciesBatch(speciesList: string[]): Promise<void> {
    console.log(`🔄 Processing batch of ${speciesList.length} species...`);
    
    // Create a temporary taxonomy file with just these species
    const tempTaxonomyPath = path.join(__dirname, 'temp_taxonomy.csv');
    const tempTaxonomy = speciesList.map(species => ({
      species_id: species,
      canonical_name: species.replace(/_/g, ' '),
      common_name: species.replace(/_/g, ' '),
      family: 'Unknown',
      genus: species.split('_')[0]
    }));
    
    // Write temporary taxonomy
    const csvContent = 'species_id,canonical_name,common_name,family,genus\n' +
      tempTaxonomy.map(row => Object.values(row).join(',')).join('\n');
    fs.writeFileSync(tempTaxonomyPath, csvContent);
    
    try {
      // Map taxa for this batch
      const taxa = await this.inatHarvester.mapTaxa(tempTaxonomyPath);
      console.log(`✅ Mapped ${taxa.length} taxa for batch`);
      
      // Harvest images for this batch
      const candidates = await this.harvestFromAllSources(taxa);
      console.log(`🖼️  Harvested ${candidates.length} images for batch`);
      
      // Process and select images
      const speciesImages = await this.imageProcessor.processImages(candidates, tempTaxonomyPath);
      console.log(`✅ Processed ${speciesImages.length} species for batch`);
      
      // Save individual species files
      for (const speciesData of speciesImages) {
        const speciesPath = path.join(__dirname, 'out/species', `${speciesData.species_id}.json`);
        fs.writeFileSync(speciesPath, JSON.stringify(speciesData, null, 2));
        console.log(`💾 Saved ${speciesData.species_id}.json with ${speciesData.images.length} images`);
      }
      
      // Update main manifest incrementally
      await this.updateMainManifestBatch(speciesImages);
      
    } finally {
      // Clean up temporary file
      if (fs.existsSync(tempTaxonomyPath)) {
        fs.unlinkSync(tempTaxonomyPath);
      }
    }
  }

  private async updateMainManifestBatch(speciesImages: SpeciesImages[]): Promise<void> {
    const manifestPath = path.join(__dirname, 'out/species_images.json');
    let manifest: any = { items: [] };
    
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch (error) {
        console.warn('⚠️  Could not parse existing manifest, starting fresh');
      }
    }
    
    // Add new entries, avoiding duplicates
    for (const speciesData of speciesImages) {
      const existingIndex = manifest.items.findIndex((item: any) => item.species_id === speciesData.species_id);
      if (existingIndex >= 0) {
        manifest.items[existingIndex] = speciesData;
      } else {
        manifest.items.push(speciesData);
      }
    }
    
    // Save updated manifest
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`📝 Updated main manifest with ${speciesImages.length} species`);
    
    // Copy to web data directory
    const webDataPath = path.join(__dirname, '../../web/data/species_images.json');
    const webDataDir = path.dirname(webDataPath);
    if (!fs.existsSync(webDataDir)) {
      fs.mkdirSync(webDataDir, { recursive: true });
    }
    fs.copyFileSync(manifestPath, webDataPath);
  }
}

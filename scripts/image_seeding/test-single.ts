#!/usr/bin/env tsx

import { INaturalistHarvester } from './harvest/inaturalist';
import { HttpClient, CacheConfig } from './shared/httpClient';
import { ImageSeedingConfig } from './types';
import path from 'path';
import fs from 'fs';

async function testSingleSpecies() {
  console.log('🧪 Testing Single Species Taxon Mapping...\n');
  
  try {
    // Load config
    const configPath = path.join(__dirname, '../../config/image_seeding.json');
    const config: ImageSeedingConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Create HTTP client
    const cacheConfig: CacheConfig = {
      enableDiskCaching: true,
      cacheTtlHours: 24,
      cacheDir: path.join(__dirname, 'harvest/cache')
    };
    const httpClient = new HttpClient(cacheConfig);
    
    // Create harvester
    const harvester = new INaturalistHarvester(httpClient, config);
    
    // Test with just one species
    const testSpecies = 'Vipera berus';
    console.log(`🔍 Testing taxon mapping for: ${testSpecies}`);
    
    const startTime = Date.now();
    const taxon = await harvester['findTaxon'](testSpecies);
    const duration = Date.now() - startTime;
    
    if (taxon) {
      console.log('✅ Taxon found successfully!');
      console.log(`   ID: ${taxon.id}`);
      console.log(`   Name: ${taxon.name}`);
      console.log(`   Rank: ${taxon.rank}`);
      console.log(`   Duration: ${duration}ms`);
    } else {
      console.log('❌ No taxon found');
    }
    
    console.log('\n🎉 Single species test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test
if (require.main === module) {
  testSingleSpecies().catch(console.error);
}

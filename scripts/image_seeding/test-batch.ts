#!/usr/bin/env tsx

import { ImageSeedingPipeline } from './pipeline';
import path from 'path';

async function testBatch() {
  console.log('🧪 Testing Image Seeding Pipeline with 10 Species');
  console.log('================================================\n');
  
  try {
    // Initialize pipeline
    const configPath = path.join(__dirname, '../../config/image_seeding.json');
    const pipeline = new ImageSeedingPipeline(configPath);
    
    // Test with just 10 species that we know have images
    const testSpecies = [
      'porthidium_lansbergii',      // Had 10 images
      'pseudocerastes_fieldi',      // Had 10 images  
      'trimeresurus_gumprechti',    // Had 7 images
      'trimeresurus_insularis',     // Had 10 images
      'trimeresurus_sumatranus',    // Had 9 images
      'ovophis_monticola',          // Had 1 image
      'trimeresurus_vogeli',        // Had 1 image
      'vipera_dinniki',             // Had 1 image
      'montivipera_latifii',        // Had 0 images (test edge case)
      'ophryacus_smaragdinus'       // Had 0 images (test edge case)
    ];
    
    console.log(`🎯 Testing with ${testSpecies.length} species:`);
    console.log(testSpecies.join(', '));
    console.log('');
    
    // Process the test batch
    await pipeline.processSpeciesBatch(testSpecies);
    
    console.log('\n✅ Test batch completed successfully!');
    console.log('📁 Check the output files to verify results.');
    
  } catch (error) {
    console.error('❌ Test batch failed:', error);
    throw error;
  }
}

// Run the test
testBatch().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

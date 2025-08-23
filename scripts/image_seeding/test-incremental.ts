#!/usr/bin/env tsx

import { ImageSeedingPipeline } from './pipeline';
import path from 'path';

async function testIncremental() {
  console.log('🧪 Testing Incremental Image Seeding Pipeline...\n');
  
  try {
    // Initialize pipeline
    const configPath = path.join(__dirname, '../../config/image_seeding.json');
    const pipeline = new ImageSeedingPipeline(configPath);
    
    // Test with just 3 species first
    console.log('🎯 Testing with just 3 species to verify pipeline works...');
    
    // Run the pipeline
    await pipeline.run();
    
    console.log('\n🎉 Incremental test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test
if (require.main === module) {
  testIncremental().catch(console.error);
}

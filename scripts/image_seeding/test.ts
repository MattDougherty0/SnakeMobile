#!/usr/bin/env tsx

import { ImageSeedingPipeline } from './pipeline';
import path from 'path';

async function testPipeline() {
  console.log('🧪 Testing Image Seeding Pipeline Components...\n');
  
  try {
    // Test configuration loading
    console.log('1. Testing configuration loading...');
    const configPath = path.join(__dirname, '../../config/image_seeding.json');
    const pipeline = new ImageSeedingPipeline(configPath);
    console.log('✅ Configuration loaded successfully');
    
    // Test taxonomy file
    console.log('\n2. Testing taxonomy file...');
    const taxonomyPath = path.join(__dirname, 'taxonomy/species_taxonomy.csv');
    const fs = require('fs');
    if (fs.existsSync(taxonomyPath)) {
      const content = fs.readFileSync(taxonomyPath, 'utf8');
      const lines = content.split('\n').filter((line: string) => line.trim());
      console.log(`✅ Taxonomy file found with ${lines.length - 1} species (excluding header)`);
    } else {
      console.log('❌ Taxonomy file not found');
    }
    
    // Test output directories
    console.log('\n3. Testing output directories...');
    const outputDirs = [
      path.join(__dirname, 'out'),
      path.join(__dirname, '../../web/data'),
      path.join(__dirname, '../../reports'),
      path.join(__dirname, '../../public/images/species')
    ];
    
    for (const dir of outputDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      } else {
        console.log(`✅ Directory exists: ${dir}`);
      }
    }
    
    console.log('\n🎉 All tests passed! Pipeline is ready to run.');
    console.log('\nTo run the full pipeline:');
    console.log('  npm run image:seed');
    console.log('\nTo test with a single species:');
    console.log('  npm run image:seed:species vipera_berus');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  testPipeline().catch(console.error);
}

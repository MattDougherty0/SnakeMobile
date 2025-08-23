#!/usr/bin/env tsx

import { ImageSeedingPipeline } from './pipeline';
import path from 'path';

async function main() {
  console.log('🐍 SnakeMobile Image Seeding Pipeline');
  console.log('=====================================\n');
  
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const options: {
      species?: string;
      continue?: boolean;
      refresh?: boolean;
      help?: boolean;
    } = {};
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--species':
          options.species = args[++i];
          break;
        case '--continue':
          options.continue = true;
          break;
        case '--refresh':
          options.refresh = true;
          break;
        case '--help':
        case '-h':
          options.help = true;
          break;
        default:
          console.warn(`Unknown argument: ${arg}`);
          break;
      }
    }
    
    if (options.help) {
      showHelp();
      return;
    }
    
    // Initialize pipeline
    const configPath = path.join(__dirname, '../../config/image_seeding.json');
    const pipeline = new ImageSeedingPipeline(configPath);
    
    // Run pipeline
    await pipeline.run(options);
    
  } catch (error) {
    console.error('❌ Pipeline execution failed:', error);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
Usage: npx tsx run.ts [options]

Options:
  --species <id>     Process only the specified species ID
  --continue         Resume from where the pipeline left off
  --refresh          Refresh all cached data
  --help, -h         Show this help message

Examples:
  # Run full pipeline
  npx tsx run.ts
  
  # Process specific species
  npx tsx run.ts --species vipera_berus
  
  # Continue from previous run
  npx tsx run.ts --continue
  
  # Refresh all data
  npx tsx run.ts --refresh

Output:
  - species_images.json: Final manifest in out/ and web/data/
  - media_index.jsonl: All harvested media candidates
  - image_seed_qc.json: QA and coverage report
  - Cached images in public/images/species/ (if enabled)
`);
}

// Run the pipeline
if (require.main === module) {
  main().catch(console.error);
}

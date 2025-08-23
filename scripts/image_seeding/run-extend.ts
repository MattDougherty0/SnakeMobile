#!/usr/bin/env tsx

import { ImageSeedingPipeline } from './pipeline';
import path from 'path';
import fs from 'fs';

interface ExtendProgress {
  already_processed: string[];
  newly_processed: string[];
  remaining_to_process: string[];
  total_original_species: number;
  start_time: string;
  last_updated: string;
  errors: string[];
}

async function runExtend() {
  console.log('🐍 SnakeMobile Extend Image Seeding Pipeline');
  console.log('=============================================\n');
  
  const progressFile = path.join(__dirname, 'extend-progress.json');
  const progress: ExtendProgress = loadProgress(progressFile);
  
  try {
    // Initialize pipeline
    const configPath = path.join(__dirname, '../../config/image_seeding.json');
    const pipeline = new ImageSeedingPipeline(configPath);
    
    // Get the full species list from the original dataset
    const allSpecies = await pipeline.getFullSpeciesList();
    console.log(`📊 Found ${allSpecies.length} total species in original dataset`);
    
    // Get the 73 species we already attempted
    const alreadyProcessed = await pipeline.getAlreadyProcessedSpecies();
    console.log(`✅ Already attempted: ${alreadyProcessed.length} species`);
    
    // Calculate remaining species
    const remainingSpecies = allSpecies.filter(s => !alreadyProcessed.includes(s));
    console.log(`🆕 Remaining to process: ${remainingSpecies.length} species`);
    
    // Update progress
    progress.already_processed = alreadyProcessed;
    progress.remaining_to_process = remainingSpecies;
    progress.total_original_species = allSpecies.length;
    progress.start_time = new Date().toISOString();
    saveProgress(progressFile, progress);
    
    if (remainingSpecies.length === 0) {
      console.log('🎉 All species already processed!');
      return;
    }
    
    // Process remaining species in small batches
    const batchSize = 5; // Process 5 at a time
    let processedCount = 0;
    
    for (let i = 0; i < remainingSpecies.length; i += batchSize) {
      const batch = remainingSpecies.slice(i, i + batchSize);
      console.log(`\n🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(remainingSpecies.length/batchSize)}`);
      console.log(`📝 Species: ${batch.join(', ')}`);
      
      try {
        await pipeline.processSpeciesBatch(batch);
        processedCount += batch.length;
        
        // Update progress
        progress.newly_processed.push(...batch);
        progress.remaining_to_process = remainingSpecies.slice(i + batchSize);
        progress.last_updated = new Date().toISOString();
        saveProgress(progressFile, progress);
        
        console.log(`✅ Batch completed. Total processed: ${processedCount}/${remainingSpecies.length}`);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Batch failed:`, error);
        progress.errors.push(`Batch ${Math.floor(i/batchSize) + 1}: ${error}`);
        saveProgress(progressFile, progress);
        
        // Continue with next batch instead of failing completely
        continue;
      }
    }
    
    console.log('\n🎉 Extension pipeline completed!');
    console.log(`📊 Summary:`);
    console.log(`   Original species: ${progress.total_original_species}`);
    console.log(`   Already processed: ${progress.already_processed.length}`);
    console.log(`   Newly processed: ${progress.newly_processed.length}`);
    console.log(`   Remaining: ${progress.remaining_to_process.length}`);
    
  } catch (error) {
    console.error('❌ Extension pipeline failed:', error);
    progress.errors.push(`Pipeline error: ${error}`);
    saveProgress(progressFile, progress);
    throw error;
  }
}

function loadProgress(filePath: string): ExtendProgress {
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn('⚠️  Could not load progress file, starting fresh');
    }
  }
  
  return {
    already_processed: [],
    newly_processed: [],
    remaining_to_process: [],
    total_original_species: 0,
    start_time: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    errors: []
  };
}

function saveProgress(filePath: string, progress: ExtendProgress): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(progress, null, 2));
  } catch (error) {
    console.error('❌ Failed to save progress:', error);
  }
}

// Run the extension pipeline
runExtend().catch(error => {
  console.error('❌ Extension pipeline failed:', error);
  process.exit(1);
});

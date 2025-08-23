#!/usr/bin/env tsx

import { ImageSeedingPipeline } from './pipeline';
import path from 'path';
import fs from 'fs';

interface SegmentProgress {
  completed_species: string[];
  current_batch: string[];
  batch_size: number;
  total_species: number;
  start_time: string;
  last_updated: string;
  errors: string[];
}

async function runSegmented() {
  console.log('🐍 SnakeMobile Segmented Image Seeding Pipeline');
  console.log('================================================\n');
  
  const progressFile = path.join(__dirname, 'segment-progress.json');
  const progress: SegmentProgress = loadProgress(progressFile);
  
  try {
    // Initialize pipeline
    const configPath = path.join(__dirname, '../../config/image_seeding.json');
    const pipeline = new ImageSeedingPipeline(configPath);
    
    // Get list of species to process
    const speciesList = await pipeline.getSpeciesList();
    progress.total_species = speciesList.length;
    
    const remainingSpecies = speciesList.filter(s => !progress.completed_species.includes(s));
    
    console.log(`📊 Progress: ${progress.completed_species.length}/${speciesList.length} species completed`);
    console.log(`🔄 Remaining: ${remainingSpecies.length} species`);
    
    if (remainingSpecies.length === 0) {
      console.log('✅ All species completed!');
      return;
    }
    
    // Process in small batches
    const batchSize = 3; // Process only 3 species at a time
    const batches = chunkArray(remainingSpecies, batchSize);
    
    console.log(`📦 Processing in ${batches.length} batches of ${batchSize} species each`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`\n🎯 Processing batch ${i + 1}/${batches.length}: ${batch.join(', ')}`);
      
      progress.current_batch = batch;
      progress.last_updated = new Date().toISOString();
      saveProgress(progressFile, progress);
      
      // Process each species in the batch
      for (const speciesId of batch) {
        try {
          console.log(`\n🎯 Processing species: ${speciesId}`);
          
          // Process single species
          await pipeline.processSingleSpecies(speciesId);
          
          // Mark as completed
          progress.completed_species.push(speciesId);
          progress.last_updated = new Date().toISOString();
          saveProgress(progressFile, progress);
          
          console.log(`✅ Completed: ${speciesId}`);
          
          // Small pause between species
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          const errorMsg = `Failed to process ${speciesId}: ${error}`;
          console.error(`❌ ${errorMsg}`);
          progress.errors.push(errorMsg);
          saveProgress(progressFile, progress);
          
          // Continue with next species instead of failing completely
          continue;
        }
      }
      
      // Clear current batch
      progress.current_batch = [];
      saveProgress(progressFile, progress);
      
      console.log(`✅ Completed batch ${i + 1}/${batches.length}`);
      
      // Pause between batches to avoid overwhelming APIs
      if (i < batches.length - 1) {
        console.log('⏸️  Pausing 5 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.log('\n🎉 All batches completed!');
    
  } catch (error) {
    console.error('❌ Pipeline execution failed:', error);
    process.exit(1);
  }
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function loadProgress(progressFile: string): SegmentProgress {
  if (fs.existsSync(progressFile)) {
    try {
      return JSON.parse(fs.readFileSync(progressFile, 'utf8'));
    } catch (error) {
      console.warn('⚠️  Could not load progress file, starting fresh');
    }
  }
  
  return {
    completed_species: [],
    current_batch: [],
    batch_size: 3,
    total_species: 0,
    start_time: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    errors: []
  };
}

function saveProgress(progressFile: string, progress: SegmentProgress) {
  try {
    fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
  } catch (error) {
    console.warn('⚠️  Could not save progress:', error);
  }
}

// Run the segmented pipeline
if (require.main === module) {
  runSegmented().catch(console.error);
}

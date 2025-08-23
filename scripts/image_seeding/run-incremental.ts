#!/usr/bin/env tsx

import { ImageSeedingPipeline } from './pipeline';
import path from 'path';
import fs from 'fs';

interface ProgressState {
  completed_species: string[];
  current_species?: string;
  start_time: string;
  last_updated: string;
  total_species: number;
  errors: string[];
}

async function runIncremental() {
  console.log('🐍 SnakeMobile Incremental Image Seeding Pipeline');
  console.log('================================================\n');
  
  const progressFile = path.join(__dirname, 'progress.json');
  const progress: ProgressState = loadProgress(progressFile);
  
  try {
    // Initialize pipeline
    const configPath = path.join(__dirname, '../../config/image_seeding.json');
    const pipeline = new ImageSeedingPipeline(configPath);
    
    // Get list of species to process
    const speciesList = await pipeline.getSpeciesList();
    const remainingSpecies = speciesList.filter(s => !progress.completed_species.includes(s));
    
    console.log(`📊 Progress: ${progress.completed_species.length}/${speciesList.length} species completed`);
    console.log(`🔄 Remaining: ${remainingSpecies.length} species`);
    
    if (remainingSpecies.length === 0) {
      console.log('✅ All species completed!');
      return;
    }
    
    // Process species one by one
    for (const speciesId of remainingSpecies) {
      try {
        console.log(`\n🎯 Processing species: ${speciesId}`);
        progress.current_species = speciesId;
        progress.last_updated = new Date().toISOString();
        saveProgress(progressFile, progress);
        
        // Process single species
        await pipeline.processSingleSpecies(speciesId);
        
        // Mark as completed
        progress.completed_species.push(speciesId);
        progress.current_species = undefined;
        progress.last_updated = new Date().toISOString();
        saveProgress(progressFile, progress);
        
        console.log(`✅ Completed: ${speciesId}`);
        
        // Optional: pause between species to avoid overwhelming APIs
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        const errorMsg = `Failed to process ${speciesId}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        progress.errors.push(errorMsg);
        progress.current_species = undefined;
        saveProgress(progressFile, progress);
        
        // Continue with next species instead of failing completely
        continue;
      }
    }
    
    console.log('\n🎉 All species processed!');
    
  } catch (error) {
    console.error('❌ Pipeline execution failed:', error);
    process.exit(1);
  }
}

function loadProgress(progressFile: string): ProgressState {
  if (fs.existsSync(progressFile)) {
    try {
      return JSON.parse(fs.readFileSync(progressFile, 'utf8'));
    } catch (error) {
      console.warn('⚠️  Could not load progress file, starting fresh');
    }
  }
  
  return {
    completed_species: [],
    start_time: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    total_species: 0,
    errors: []
  };
}

function saveProgress(progressFile: string, progress: ProgressState) {
  try {
    fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
  } catch (error) {
    console.warn('⚠️  Could not save progress:', error);
  }
}

// Run the incremental pipeline
if (require.main === module) {
  runIncremental().catch(console.error);
}

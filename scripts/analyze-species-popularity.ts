import fs from 'fs';
import path from 'path';

interface SpeciesData {
  name: string;
  occurrences: Array<{
    lat: number;
    lon: number;
  }>;
}

interface SpeciesCount {
  scientific_name: string;
  count: number;
}

async function analyzeSpeciesPopularity() {
  try {
    console.log('🔍 Analyzing species popularity from occurrences data...\n');
    
    // Load occurrences data
    const occurrencesPath = path.join(__dirname, '../assets/data/occurrences_us.min.json');
    const speciesData: SpeciesData[] = JSON.parse(fs.readFileSync(occurrencesPath, 'utf8'));
    
    // Load existing species info to see what we already have
    const speciesInfoPath = path.join(__dirname, '../assets/data/species_info.json');
    const existingSpecies = JSON.parse(fs.readFileSync(speciesInfoPath, 'utf8'));
    const existingSpeciesSet = new Set(existingSpecies.map((s: any) => s.scientific_name));
    
    console.log(`Total species in dataset: ${speciesData.length}`);
    console.log(`Existing species with images: ${existingSpecies.length}\n`);
    
    // Count occurrences by species
    const speciesCounts = new Map<string, number>();
    
    for (const species of speciesData) {
      const count = species.occurrences.length;
      speciesCounts.set(species.name, count);
    }
    
    // Convert to array and sort by count (descending)
    const sortedSpecies: SpeciesCount[] = Array.from(speciesCounts.entries())
      .map(([scientific_name, count]) => ({ scientific_name, count }))
      .sort((a, b) => b.count - a.count);
    
    console.log('Top 100 species by occurrence count:');
    console.log('=====================================');
    
    // Find the next 50 species after the existing ones
    const nextSpecies: SpeciesCount[] = [];
    let foundExisting = 0;
    
    for (let i = 0; i < sortedSpecies.length && nextSpecies.length < 50; i++) {
      const species = sortedSpecies[i];
      
      if (existingSpeciesSet.has(species.scientific_name)) {
        foundExisting++;
        console.log(`${foundExisting}. ${species.scientific_name} (${species.count} occurrences) - ALREADY HAS IMAGE`);
      } else {
        nextSpecies.push(species);
        console.log(`${foundExisting + nextSpecies.length}. ${species.scientific_name} (${species.count} occurrences) - NEEDS IMAGE`);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`- Total unique species: ${speciesCounts.size}`);
    console.log(`- Species with images: ${existingSpecies.length}`);
    console.log(`- Next 50 species to process: ${nextSpecies.length}`);
    
    // Save the next 50 species to a file for easy reference
    const nextSpeciesPath = path.join(__dirname, '../assets/data/next_50_species.json');
    fs.writeFileSync(nextSpeciesPath, JSON.stringify(nextSpecies, null, 2));
    console.log(`\n💾 Saved next 50 species to: ${nextSpeciesPath}`);
    
    // Display the next 50 species
    console.log(`\n🐍 Next 50 species to add images for:`);
    console.log(`=====================================`);
    nextSpecies.forEach((species, index) => {
      console.log(`${index + 1}. ${species.scientific_name} (${species.count} occurrences)`);
    });
    
  } catch (error) {
    console.error('Error analyzing species popularity:', (error as Error).message);
  }
}

if (require.main === module) {
  analyzeSpeciesPopularity().catch(console.error);
}

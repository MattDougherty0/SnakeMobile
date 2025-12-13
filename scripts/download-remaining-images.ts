import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { pipeline } from 'stream/promises';

const PIPELINE_OUTPUT = path.join(__dirname, 'image_seeding/out/species_images.json');
const SPECIES_INFO_PATH = path.join(__dirname, '../assets/data/species_info.json');
const IMAGE_MAP_PATH = path.join(__dirname, '../src/assets/imageMap.ts');
const IMAGES_DIR = path.join(__dirname, '../assets/images');
const OCCURRENCES_PATH = path.join(__dirname, '../assets/data/occurrences_us.min.json');

const DELAY_MS = 1000; // 1 second delay between downloads

function capitalizeScientificName(canonicalName: string): string {
  const parts = canonicalName.split(' ');
  return parts.map((part, i) => {
    if (i === 0) {
      return part.charAt(0).toUpperCase() + part.slice(1);
    }
    return part.toLowerCase();
  }).join(' ');
}

async function downloadImage(imageUrl: string, outputPath: string): Promise<boolean> {
  try {
    const response = await axios.get(imageUrl, { responseType: 'stream' });
    await pipeline(response.data, fs.createWriteStream(outputPath));
    return true;
  } catch (error) {
    console.error(`  ❌ Failed to download: ${(error as any).message}`);
    return false;
  }
}

async function main() {
  console.log('🔄 Downloading remaining images...\n');

  // Read pipeline output
  const pipelineOutput = JSON.parse(fs.readFileSync(PIPELINE_OUTPUT, 'utf8'));
  const pipelineSpecies = new Map(pipelineOutput.items.map((item: any) => [item.species_id, item]));

  // Read species_info.json
  const speciesInfo = JSON.parse(fs.readFileSync(SPECIES_INFO_PATH, 'utf8'));
  const existingNames = new Set(speciesInfo.map((s: any) => 
    s.scientific_name.toLowerCase().replace(/\s+/g, '_')
  ));

  // Read occurrences
  const occurrences = JSON.parse(fs.readFileSync(OCCURRENCES_PATH, 'utf8'));
  const speciesInOccurrences = new Set(occurrences.map((item: any) => item.name.toLowerCase()));

  // Check which images exist
  const existingFiles = fs.readdirSync(IMAGES_DIR).filter(f => 
    f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png')
  );
  const existingImages = new Set(existingFiles);

  // Find species in occurrences but not in species_info
  const missingSpecies = Array.from(speciesInOccurrences).filter(s => !existingNames.has(s));

  // Find which ones are in pipeline but don't have images downloaded
  const toDownload: Array<{
    speciesId: string;
    speciesName: string;
    imageUrl: string;
    canonicalName: string;
  }> = [];

  for (const speciesName of missingSpecies) {
    const speciesId = speciesName.toLowerCase().replace(/\s+/g, '_');
    const imageFile = speciesId + '.jpg';
    
    // Check if already has image
    if (existingImages.has(imageFile)) continue;
    
    // Check if in pipeline
    const pipelineItem = pipelineSpecies.get(speciesId);
    if (pipelineItem && pipelineItem.images && pipelineItem.images.length > 0) {
      const imageUrl = pipelineItem.images[0].full_url || pipelineItem.images[0].thumb_url;
      if (imageUrl) {
        toDownload.push({
          speciesId,
          speciesName,
          imageUrl,
          canonicalName: pipelineItem.canonical_name || speciesName
        });
      }
    }
  }

  console.log(`Found ${toDownload.length} species that need images downloaded\n`);

  if (toDownload.length === 0) {
    console.log('✅ All images are already downloaded!');
    return;
  }

  // Download images
  console.log('📥 Downloading images...\n');
  const downloaded: typeof toDownload = [];
  
  for (let i = 0; i < toDownload.length; i++) {
    const species = toDownload[i];
    const imageFile = species.speciesId + '.jpg';
    const outputPath = path.join(IMAGES_DIR, imageFile);
    
    console.log(`[${i + 1}/${toDownload.length}] Downloading ${species.speciesName}...`);
    
    const success = await downloadImage(species.imageUrl, outputPath);
    if (success) {
      downloaded.push(species);
      console.log(`  ✅ Downloaded ${imageFile}`);
    }
    
    // Delay between downloads
    if (i < toDownload.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log(`\n✅ Downloaded ${downloaded.length} images\n`);

  if (downloaded.length === 0) {
    console.log('⚠️  No images were downloaded. Cannot proceed with sync.');
    return;
  }

  // Add to species_info.json
  console.log('📝 Adding to species_info.json...');
  for (const species of downloaded) {
    const scientificName = capitalizeScientificName(species.canonicalName);
    const newEntry = {
      scientific_name: scientificName,
      common_name: species.canonicalName.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      image: species.speciesId + '.jpg',
      safety_blurb: 'Keep distance. Hemotoxic venom. If bitten, stay calm, immobilize limb, and call 911.'
    };
    speciesInfo.push(newEntry);
  }
  fs.writeFileSync(SPECIES_INFO_PATH, JSON.stringify(speciesInfo, null, 2));
  console.log(`✅ Added ${downloaded.length} species to species_info.json\n`);

  // Add to imageMap.ts
  console.log('📝 Adding to imageMap.ts...');
  const newEntries = downloaded.map(s => 
    `  '${s.speciesId}.jpg': require('../../assets/images/${s.speciesId}.jpg'),`
  ).join('\n');

  const imageMapContent = fs.readFileSync(IMAGE_MAP_PATH, 'utf8');
  const closingBraceIndex = imageMapContent.lastIndexOf('};');
  const beforeClosing = imageMapContent.substring(0, closingBraceIndex);
  const newImageMapContent = beforeClosing + '\n' + newEntries + '\n};';

  fs.writeFileSync(IMAGE_MAP_PATH, newImageMapContent);
  console.log(`✅ Added ${downloaded.length} entries to imageMap.ts\n`);

  console.log('✅ Complete!');
  console.log(`\nSummary:`);
  console.log(`  - Downloaded images: ${downloaded.length}`);
  console.log(`  - Added to species_info.json: ${downloaded.length}`);
  console.log(`  - Added to imageMap.ts: ${downloaded.length}`);
  console.log(`  - Total species now: ${speciesInfo.length}`);
}

main().catch(console.error);


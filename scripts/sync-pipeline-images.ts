import fs from 'fs';
import path from 'path';

/**
 * Syncs images from the pipeline output to species_info.json and imageMap.ts
 * This script finds species that have images downloaded but aren't in species_info.json
 */

const PIPELINE_OUTPUT = path.join(__dirname, 'image_seeding/out/species_images.json');
const SPECIES_INFO_PATH = path.join(__dirname, '../assets/data/species_info.json');
const IMAGE_MAP_PATH = path.join(__dirname, '../src/assets/imageMap.ts');
const IMAGES_DIR = path.join(__dirname, '../assets/images');

function capitalizeScientificName(canonicalName: string): string {
  const parts = canonicalName.split(' ');
  return parts.map((part, i) => {
    if (i === 0) {
      // First word (genus) - capitalize first letter
      return part.charAt(0).toUpperCase() + part.slice(1);
    }
    // Species name - keep lowercase
    return part.toLowerCase();
  }).join(' ');
}

async function main() {
  console.log('🔄 Syncing pipeline images to species_info.json and imageMap.ts...\n');

  // Read pipeline output
  const pipelineOutput = JSON.parse(fs.readFileSync(PIPELINE_OUTPUT, 'utf8'));
  if (!pipelineOutput.items || !Array.isArray(pipelineOutput.items)) {
    console.error('❌ Invalid pipeline output format');
    process.exit(1);
  }

  // Read current species_info.json
  const speciesInfo = JSON.parse(fs.readFileSync(SPECIES_INFO_PATH, 'utf8'));
  const existingNames = new Set(speciesInfo.map((s: any) => 
    s.scientific_name.toLowerCase().replace(/\s+/g, '_')
  ));

  // Read imageMap.ts
  const imageMapContent = fs.readFileSync(IMAGE_MAP_PATH, 'utf8');
  const imageMapKeys = [];
  const regex = /'([^']+\.jpg)':/g;
  let match;
  while ((match = regex.exec(imageMapContent)) !== null) {
    imageMapKeys.push(match[1]);
  }
  const existingInMap = new Set(imageMapKeys);

  // Check which images exist
  const existingFiles = fs.readdirSync(IMAGES_DIR).filter(f => 
    f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png')
  );
  const existingImages = new Set(existingFiles);

  // Find species to add
  const toAdd: Array<{
    speciesId: string;
    scientificName: string;
    imageFile: string;
    canonicalName: string;
  }> = [];

  for (const item of pipelineOutput.items) {
    const speciesId = item.species_id;
    const imageFile = speciesId + '.jpg';
    
    // Check if image exists
    if (!existingImages.has(imageFile)) continue;
    
    // Check if already in species_info
    if (existingNames.has(speciesId)) continue;
    
    // Get canonical name
    const canonicalName = item.canonical_name || speciesId.replace(/_/g, ' ');
    const scientificName = capitalizeScientificName(canonicalName);
    
    toAdd.push({
      speciesId,
      scientificName,
      imageFile,
      canonicalName
    });
  }

  console.log(`Found ${toAdd.length} species with images that need to be added\n`);

  if (toAdd.length === 0) {
    console.log('✅ All species are already synced!');
    return;
  }

  // Add to species_info.json
  console.log('📝 Adding to species_info.json...');
  for (const species of toAdd) {
    const newEntry = {
      scientific_name: species.scientificName,
      common_name: species.canonicalName.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      image: species.imageFile,
      safety_blurb: 'Keep distance. Hemotoxic venom. If bitten, stay calm, immobilize limb, and call 911.'
    };
    speciesInfo.push(newEntry);
  }
  fs.writeFileSync(SPECIES_INFO_PATH, JSON.stringify(speciesInfo, null, 2));
  console.log(`✅ Added ${toAdd.length} species to species_info.json\n`);

  // Add to imageMap.ts
  console.log('📝 Adding to imageMap.ts...');
  const newEntries = toAdd.map(s => 
    `  '${s.imageFile}': require('../../assets/images/${s.imageFile}'),`
  ).join('\n');

  // Find the insertion point (before the closing brace)
  const closingBraceIndex = imageMapContent.lastIndexOf('};');
  if (closingBraceIndex === -1) {
    console.error('❌ Could not find closing brace in imageMap.ts');
    return;
  }

  const beforeClosing = imageMapContent.substring(0, closingBraceIndex);
  const newImageMapContent = beforeClosing + '\n' + newEntries + '\n};';

  fs.writeFileSync(IMAGE_MAP_PATH, newImageMapContent);
  console.log(`✅ Added ${toAdd.length} entries to imageMap.ts\n`);

  console.log('✅ Sync complete!');
  console.log(`\nSummary:`);
  console.log(`  - Added to species_info.json: ${toAdd.length}`);
  console.log(`  - Added to imageMap.ts: ${toAdd.length}`);
  console.log(`  - Total species now: ${speciesInfo.length}`);
}

main().catch(console.error);


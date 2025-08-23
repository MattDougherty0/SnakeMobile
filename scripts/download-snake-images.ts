import fs from 'fs';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';

// Top 25 species by occurrence count from our dataset
const TOP_SPECIES = [
  'Vipera berus',
  'Crotalus atrox',
  'Agkistrodon contortrix',
  'Agkistrodon piscivorus',
  'Vipera aspis',
  'Crotalus oreganus',
  'Crotalus viridis',
  'Crotalus helleri',
  'Crotalus horridus',
  'Crotalus cerastes',
  'Crotalus scutulatus',
  'Crotalus ruber',
  'Gloydius ussuriensis',
  'Sistrurus miliarius',
  'Crotalus molossus',
  'Bothrops asper',
  'Crotalus adamanteus',
  'Bothrops alternatus',
  'Crotalus lutosus',
  'Crotalus durissus',
  'Bothrops jararaca',
  'Crotalus pyrrhus',
  'Protobothrops mucrosquamatus',
  'Bothrops atrox',
  'Bitis arietans'
];

// Common names for the species
const COMMON_NAMES: Record<string, string> = {
  'Vipera berus': 'Common European Adder',
  'Crotalus atrox': 'Western Diamondback Rattlesnake',
  'Agkistrodon contortrix': 'Eastern Copperhead',
  'Agkistrodon piscivorus': 'Cottonmouth (Water Moccasin)',
  'Vipera aspis': 'European Asp',
  'Crotalus oreganus': 'Western Rattlesnake',
  'Crotalus viridis': 'Prairie Rattlesnake',
  'Crotalus helleri': 'Southern Pacific Rattlesnake',
  'Crotalus horridus': 'Timber Rattlesnake',
  'Crotalus cerastes': 'Sidewinder',
  'Crotalus scutulatus': 'Mojave Rattlesnake',
  'Crotalus ruber': 'Red Diamond Rattlesnake',
  'Gloydius ussuriensis': 'Ussuri Mamushi',
  'Sistrurus miliarius': 'Pygmy Rattlesnake',
  'Crotalus molossus': 'Black-tailed Rattlesnake',
  'Bothrops asper': 'Fer-de-lance',
  'Crotalus adamanteus': 'Eastern Diamondback Rattlesnake',
  'Bothrops alternatus': 'Urutu',
  'Crotalus lutosus': 'Great Basin Rattlesnake',
  'Crotalus durissus': 'Tropical Rattlesnake',
  'Bothrops jararaca': 'Jararaca',
  'Crotalus pyrrhus': 'Southwestern Speckled Rattlesnake',
  'Protobothrops mucrosquamatus': 'Brown Spotted Pit Viper',
  'Bothrops atrox': 'Common Lancehead',
  'Bitis arietans': 'Puff Adder'
};

// Safety blurbs for each species
const SAFETY_BLURBS: Record<string, string> = {
  'Vipera berus': 'Keep distance. Hemotoxic venom. If bitten, stay calm, immobilize limb, and call emergency services.',
  'Crotalus atrox': 'Keep distance. Hemotoxic venom. If bitten, stay calm, immobilize limb, and call 911.',
  'Agkistrodon contortrix': 'Copperheads are often camouflaged. Do not handle. If bitten, call 911 and keep the limb still.',
  'Agkistrodon piscivorus': 'Aggressive when cornered. Do not approach. If bitten, keep calm and call 911.',
  'Vipera aspis': 'Back away slowly. Do not attempt capture. Seek emergency care immediately if bitten.',
  'Crotalus oreganus': 'Maintain distance. Hemotoxic venom. If bitten, immobilize and seek immediate medical attention.',
  'Crotalus viridis': 'Keep distance. Hemotoxic venom. If bitten, stay calm and call emergency services.',
  'Crotalus helleri': 'Back away slowly. Hemotoxic venom. If bitten, immobilize and seek medical help.',
  'Crotalus horridus': 'Back away slowly. Do not attempt capture. Seek emergency care immediately if bitten.',
  'Crotalus cerastes': 'Maintain distance. Hemotoxic venom. If bitten, immobilize and seek immediate medical attention.',
  'Crotalus scutulatus': 'Neurotoxic venom possible. Maintain distance; if bitten, call 911 without delay.',
  'Crotalus ruber': 'Keep distance. Hemotoxic venom. If bitten, stay calm and call emergency services.',
  'Gloydius ussuriensis': 'Maintain distance. Hemotoxic venom. If bitten, seek immediate medical attention.',
  'Sistrurus miliarius': 'Keep distance. Hemotoxic venom. If bitten, immobilize and seek medical help.',
  'Crotalus molossus': 'Back away slowly. Hemotoxic venom. If bitten, immobilize and seek emergency care.',
  'Bothrops asper': 'Extremely dangerous. Keep maximum distance. If bitten, call emergency services immediately.',
  'Crotalus adamanteus': 'Largest rattlesnake. Keep distance. If bitten, immobilize and call 911 immediately.',
  'Bothrops alternatus': 'Highly venomous. Maintain distance. If bitten, seek emergency medical attention.',
  'Crotalus lutosus': 'Keep distance. Hemotoxic venom. If bitten, immobilize and seek medical help.',
  'Crotalus durissus': 'Highly venomous. Maintain distance. If bitten, seek immediate emergency care.',
  'Bothrops jararaca': 'Extremely dangerous. Keep maximum distance. If bitten, call emergency services immediately.',
  'Crotalus pyrrhus': 'Keep distance. Hemotoxic venom. If bitten, immobilize and seek medical attention.',
  'Protobothrops mucrosquamatus': 'Highly venomous. Maintain distance. If bitten, seek emergency medical care.',
  'Bothrops atrox': 'Extremely dangerous. Keep maximum distance. If bitten, call emergency services immediately.',
  'Bitis arietans': 'Highly aggressive. Keep maximum distance. If bitten, seek emergency medical attention immediately.'
};

// Alternative search terms for better image results
const SEARCH_TERMS: Record<string, string[]> = {
  'Vipera berus': ['vipera berus', 'common european adder', 'european viper'],
  'Crotalus atrox': ['crotalus atrox', 'western diamondback rattlesnake', 'diamondback rattlesnake'],
  'Agkistrodon contortrix': ['agkistrodon contortrix', 'eastern copperhead', 'copperhead snake'],
  'Agkistrodon piscivorus': ['agkistrodon piscivorus', 'cottonmouth', 'water moccasin'],
  'Vipera aspis': ['vipera aspis', 'european asp', 'asp viper'],
  'Crotalus oreganus': ['crotalus oreganus', 'western rattlesnake', 'oregon rattlesnake'],
  'Crotalus viridis': ['crotalus viridis', 'prairie rattlesnake', 'western rattlesnake'],
  'Crotalus helleri': ['crotalus helleri', 'southern pacific rattlesnake', 'pacific rattlesnake'],
  'Crotalus horridus': ['crotalus horridus', 'timber rattlesnake', 'canebrake rattlesnake'],
  'Crotalus cerastes': ['crotalus cerastes', 'sidewinder', 'horned rattlesnake'],
  'Crotalus scutulatus': ['crotalus scutulatus', 'mojave rattlesnake', 'mojave green'],
  'Crotalus ruber': ['crotalus ruber', 'red diamond rattlesnake', 'red rattlesnake'],
  'Gloydius ussuriensis': ['gloydius ussuriensis', 'ussuri mamushi', 'mamushi'],
  'Sistrurus miliarius': ['sistrurus miliarius', 'pygmy rattlesnake', 'ground rattlesnake'],
  'Crotalus molossus': ['crotalus molossus', 'black-tailed rattlesnake', 'blacktail rattlesnake'],
  'Bothrops asper': ['bothrops asper', 'fer-de-lance', 'terciopelo'],
  'Crotalus adamanteus': ['crotalus adamanteus', 'eastern diamondback rattlesnake', 'diamondback'],
  'Bothrops alternatus': ['bothrops alternatus', 'urutu', 'crossed pit viper'],
  'Crotalus lutosus': ['crotalus lutosus', 'great basin rattlesnake', 'basin rattlesnake'],
  'Crotalus durissus': ['crotalus durissus', 'tropical rattlesnake', 'cascabel'],
  'Bothrops jararaca': ['bothrops jararaca', 'jararaca', 'jararaca snake'],
  'Crotalus pyrrhus': ['crotalus pyrrhus', 'southwestern speckled rattlesnake', 'speckled rattlesnake'],
  'Protobothrops mucrosquamatus': ['protobothrops mucrosquamatus', 'brown spotted pit viper', 'spotted pit viper'],
  'Bothrops atrox': ['bothrops atrox', 'common lancehead', 'lancehead viper'],
  'Bitis arietans': ['bitis arietans', 'puff adder', 'african puff adder']
};

async function searchWikimediaCommons(speciesName: string): Promise<string | null> {
  const searchTerms = SEARCH_TERMS[speciesName] || [speciesName];
  
  for (const term of searchTerms) {
    try {
      console.log(`  Trying search: "${term}"`);
      
      // Search for images on Wikimedia Commons
      const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term + ' snake')}&format=json&srlimit=10&srnamespace=6`;
      const response = await axios.get(searchUrl);
      
      if (response.data.query?.search?.length > 0) {
        // Look for a good image result
        for (const result of response.data.query.search) {
          if (result.title.includes('.jpg') || result.title.includes('.png') || result.title.includes('.jpeg')) {
            // Get the image info
            const imageInfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(result.title)}&prop=imageinfo&iiprop=url&format=json`;
            const imageResponse = await axios.get(imageInfoUrl);
            
            const pages = imageResponse.data.query.pages;
            const pageId = Object.keys(pages)[0];
            const imageInfo = pages[pageId].imageinfo?.[0];
            
            if (imageInfo?.url) {
              console.log(`  ✓ Found image: ${result.title}`);
              return imageInfo.url;
            }
          }
        }
      }
      
      // Wait a bit between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.warn(`    Failed to search for "${term}":`, (error as Error).message);
    }
  }
  
  return null;
}

async function downloadAndProcessImage(imageUrl: string, speciesName: string): Promise<string | null> {
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data);
    
    // Create images directory if it doesn't exist
    const imagesDir = path.join(__dirname, '../assets/images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    
    // Generate filename
    const filename = speciesName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '.jpg';
    const outputPath = path.join(imagesDir, filename);
    
    // Process image: resize to 400x400, convert to JPEG, optimize
    await sharp(imageBuffer)
      .resize(400, 400, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85 })
      .toFile(outputPath);
    
    console.log(`✓ Downloaded and processed: ${filename}`);
    return filename;
  } catch (error) {
    console.warn(`Failed to download/process image for ${speciesName}:`, (error as Error).message);
    return null;
  }
}

async function updateSpeciesInfo() {
  try {
    const speciesInfoPath = path.join(__dirname, '../assets/data/species_info.json');
    const existingInfo = JSON.parse(fs.readFileSync(speciesInfoPath, 'utf8'));
    
    // Create a map of existing species by scientific name
    const existingMap = new Map(existingInfo.map((s: any) => [s.scientific_name, s]));
    
    // Helper to check if an image file exists for a species entry
    const imageExists = (entry: any): boolean => {
      if (!entry?.image) return false;
      const imagesDir = path.join(__dirname, '../assets/images');
      return fs.existsSync(path.join(imagesDir, entry.image));
    };
    
    // Process top species
    for (const speciesName of TOP_SPECIES) {
      const existing = existingMap.get(speciesName);
      if (existing && imageExists(existing)) {
        console.log(`Skipping ${speciesName} - already exists with image file`);
        continue;
      }
      
      console.log(`\nProcessing ${speciesName}...`);
      
      // Search for image
      const imageUrl = await searchWikimediaCommons(speciesName);
      if (!imageUrl) {
        console.log(`⚠ No image found for ${speciesName}`);
        continue;
      }
      
      // Download and process image
      const filename = await downloadAndProcessImage(imageUrl, speciesName);
      if (!filename) {
        console.log(`⚠ Failed to process image for ${speciesName}`);
        continue;
      }
      
      // Add to species info
      const newSpecies = {
        scientific_name: speciesName,
        common_name: COMMON_NAMES[speciesName] || speciesName,
        image: filename,
        safety_blurb: SAFETY_BLURBS[speciesName] || 'Keep distance. If bitten, seek immediate medical attention.'
      };
      
      existingInfo.push(newSpecies);
      console.log(`✓ Added ${speciesName} to species info`);
    }
    
    // Write updated species info
    fs.writeFileSync(speciesInfoPath, JSON.stringify(existingInfo, null, 2));
    console.log(`\n✓ Updated species_info.json with ${existingInfo.length} species`);
    
  } catch (error) {
    console.error('Error updating species info:', (error as Error).message);
  }
}

async function main() {
  console.log('🐍 Downloading images for top 25 snake species...\n');
  
  await updateSpeciesInfo();
  
  console.log('\n🎉 Image download complete!');
  console.log('Next steps:');
  console.log('1. Review downloaded images in assets/images/');
  console.log('2. Test the app to see real snake photos');
  console.log('3. Run: npm run build:occurrences to rebuild if needed');
}

if (require.main === module) {
  main().catch(console.error);
}

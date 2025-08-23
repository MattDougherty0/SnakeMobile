import fs from 'fs';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';

// Next 50 species by occurrence count from our dataset
const NEXT_50_SPECIES = [
  'Bothrops moojeni',
  'Bothrops pauloensis',
  'Bothrops mattogrossensis',
  'Cerrophidion godmani',
  'Bothrops ammodytoides',
  'Porthidium dunni',
  'Bothrops itapetiningae',
  'Causus maculatus',
  'Porthidium lansbergii',
  'Bitis caudalis',
  'Vipera ursinii',
  'Bothrocophias hyoprora',
  'Bothrops taeniatus',
  'Agkistrodon bilineatus',
  'Bitis atropos',
  'Crotalus tzabcan',
  'Cerastes cerastes',
  'Bothrops cotiara',
  'Crotalus simus',
  'Causus defilippii',
  'Crotalus morulus',
  'Porthidium ophryomegas',
  'Tropidolaemus wagleri',
  'Causus lichtensteinii',
  'Bothrocophias microphthalmus',
  'Daboia russelii',
  'Macrovipera lebetinus',
  'Crotalus intermedius',
  'Cerrophidion wilsoni',
  'Atheris squamigera',
  'Echis coloratus',
  'Echis ocellatus',
  'Hypnale hypnale',
  'Crotalus polystictus',
  'Bothrops erythromelas',
  'Trimeresurus flavomaculatus',
  'Crotalus culminatus',
  'Bothrops brazili',
  'Bothrops fonsecai',
  'Trimeresurus malabaricus',
  'Calloselasma rhodostoma',
  'Cerrophidion tzotzilorum',
  'Trimeresurus trigonocephalus',
  'Ophryacus undulatus',
  'Bothriechis nigroviridis',
  'Metlapilcoatlus nummifer',
  'Trimeresurus insularis',
  'Porthidium yucatanicum',
  'Trimeresurus purpureomaculatus',
  'Crotalus totonacus'
];

// Common names for the next 50 species
const COMMON_NAMES: Record<string, string> = {
  'Bothrops moojeni': 'Moojen\'s Lancehead',
  'Bothrops pauloensis': 'São Paulo Lancehead',
  'Bothrops mattogrossensis': 'Mato Grosso Lancehead',
  'Cerrophidion godmani': 'Godman\'s Montane Pit Viper',
  'Bothrops ammodytoides': 'Patagonian Lancehead',
  'Porthidium dunni': 'Dunn\'s Hognose Viper',
  'Bothrops itapetiningae': 'Itapetininga Lancehead',
  'Causus maculatus': 'Spotted Night Adder',
  'Porthidium lansbergii': 'Lansberg\'s Hognose Viper',
  'Bitis caudalis': 'Horned Adder',
  'Vipera ursinii': 'Orsini\'s Viper',
  'Bothrocophias hyoprora': 'Amazonian Lancehead',
  'Bothrops taeniatus': 'Banded Lancehead',
  'Agkistrodon bilineatus': 'Cantil',
  'Bitis atropos': 'Berg Adder',
  'Crotalus tzabcan': 'Yucatán Neotropical Rattlesnake',
  'Cerastes cerastes': 'Horned Viper',
  'Bothrops cotiara': 'Cotiara',
  'Crotalus simus': 'Middle American Rattlesnake',
  'Causus defilippii': 'Snouted Night Adder',
  'Crotalus morulus': 'Tamaulipan Rock Rattlesnake',
  'Porthidium ophryomegas': 'Slender Hognose Viper',
  'Tropidolaemus wagleri': 'Wagler\'s Pit Viper',
  'Causus lichtensteinii': 'Lichtenstein\'s Night Adder',
  'Bothrocophias microphthalmus': 'Small-eyed Lancehead',
  'Daboia russelii': 'Russell\'s Viper',
  'Macrovipera lebetinus': 'Blunt-nosed Viper',
  'Crotalus intermedius': 'Mexican Small-headed Rattlesnake',
  'Cerrophidion wilsoni': 'Wilson\'s Montane Pit Viper',
  'Atheris squamigera': 'Variable Bush Viper',
  'Echis coloratus': 'Arabian Saw-scaled Viper',
  'Echis ocellatus': 'West African Carpet Viper',
  'Hypnale hypnale': 'Hump-nosed Viper',
  'Crotalus polystictus': 'Mexican Lance-headed Rattlesnake',
  'Bothrops erythromelas': 'Red-bellied Lancehead',
  'Trimeresurus flavomaculatus': 'Philippine Pit Viper',
  'Crotalus culminatus': 'Northwestern Neotropical Rattlesnake',
  'Bothrops brazili': 'Brazil\'s Lancehead',
  'Bothrops fonsecai': 'Fonseca\'s Lancehead',
  'Trimeresurus malabaricus': 'Malabar Pit Viper',
  'Calloselasma rhodostoma': 'Malayan Pit Viper',
  'Cerrophidion tzotzilorum': 'Tzotzil Montane Pit Viper',
  'Trimeresurus trigonocephalus': 'Sri Lankan Green Pit Viper',
  'Ophryacus undulatus': 'Mexican Horned Pit Viper',
  'Bothriechis nigroviridis': 'Black-speckled Palm Viper',
  'Metlapilcoatlus nummifer': 'Mexican Jumping Pit Viper',
  'Trimeresurus insularis': 'Indonesian Pit Viper',
  'Porthidium yucatanicum': 'Yucatán Hognose Viper',
  'Trimeresurus purpureomaculatus': 'Mangrove Pit Viper',
  'Crotalus totonacus': 'Totonacan Rattlesnake'
};

// Safety blurbs for the next 50 species
const SAFETY_BLURBS: Record<string, string> = {
  'Bothrops moojeni': 'Lancehead species. Highly venomous. Maintain distance. If bitten, seek emergency care.',
  'Bothrops pauloensis': 'Lancehead species. Highly venomous. Keep distance. If bitten, seek emergency care.',
  'Bothrops mattogrossensis': 'Lancehead species. Highly venomous. Keep distance. If bitten, seek emergency care.',
  'Cerrophidion godmani': 'Montane pit viper. Maintain distance. If bitten, seek immediate medical attention.',
  'Bothrops ammodytoides': 'Patagonian lancehead. Highly venomous. Maintain distance. If bitten, seek emergency care.',
  'Porthidium dunni': 'Hognose viper. Maintain distance. If bitten, seek immediate medical attention.',
  'Bothrops itapetiningae': 'Lancehead species. Highly venomous. Keep distance. If bitten, seek emergency care.',
  'Causus maculatus': 'Spotted night adder. Maintain distance. If bitten, seek immediate medical attention.',
  'Porthidium lansbergii': 'Hognose viper. Maintain distance. If bitten, seek immediate medical attention.',
  'Bitis caudalis': 'Horned adder. Maintain distance. If bitten, seek immediate medical attention.',
  'Vipera ursinii': 'European viper. Keep distance. If bitten, stay calm and call emergency services.',
  'Bothrocophias hyoprora': 'Amazonian lancehead. Highly venomous. Maintain distance. If bitten, seek emergency care.',
  'Bothrops taeniatus': 'Banded lancehead. Highly venomous. Keep distance. If bitten, seek emergency care.',
  'Agkistrodon bilineatus': 'Cantil. Copperhead species. Do not handle. If bitten, call 911 and keep the limb still.',
  'Bitis atropos': 'Berg adder. Maintain distance. If bitten, seek immediate medical attention.',
  'Crotalus tzabcan': 'Yucatán rattlesnake. Keep distance. If bitten, immobilize and seek medical help.',
  'Cerastes cerastes': 'Horned viper. Maintain distance. If bitten, seek immediate medical attention.',
  'Bothrops cotiara': 'Cotiara. Lancehead species. Highly venomous. Keep distance. If bitten, seek emergency care.',
  'Crotalus simus': 'Middle American rattlesnake. Keep distance. If bitten, immobilize and seek medical help.',
  'Causus defilippii': 'Snouted night adder. Maintain distance. If bitten, seek immediate medical attention.',
  'Crotalus morulus': 'Tamaulipan rock rattlesnake. Keep distance. If bitten, immobilize and seek medical help.',
  'Porthidium ophryomegas': 'Slender hognose viper. Maintain distance. If bitten, seek immediate medical attention.',
  'Tropidolaemus wagleri': 'Wagler\'s pit viper. Highly venomous. Maintain distance. If bitten, seek emergency care.',
  'Causus lichtensteinii': 'Lichtenstein\'s night adder. Maintain distance. If bitten, seek immediate medical attention.',
  'Bothrocophias microphthalmus': 'Small-eyed lancehead. Highly venomous. Maintain distance. If bitten, seek emergency care.',
  'Daboia russelii': 'Russell\'s viper. Extremely dangerous. Keep maximum distance. If bitten, call emergency services immediately.',
  'Macrovipera lebetinus': 'Blunt-nosed viper. Maintain distance. If bitten, seek immediate medical attention.',
  'Crotalus intermedius': 'Mexican small-headed rattlesnake. Keep distance. If bitten, immobilize and seek medical help.',
  'Cerrophidion wilsoni': 'Wilson\'s montane pit viper. Maintain distance. If bitten, seek immediate medical attention.',
  'Atheris squamigera': 'Variable bush viper. Highly venomous. Maintain distance. If bitten, seek emergency care.',
  'Echis coloratus': 'Arabian saw-scaled viper. Extremely dangerous. Keep maximum distance. If bitten, call emergency services immediately.',
  'Echis ocellatus': 'West African carpet viper. Extremely dangerous. Keep maximum distance. If bitten, call emergency services immediately.',
  'Hypnale hypnale': 'Hump-nosed viper. Maintain distance. If bitten, seek immediate medical attention.',
  'Crotalus polystictus': 'Mexican lance-headed rattlesnake. Keep distance. If bitten, immobilize and seek medical help.',
  'Bothrops erythromelas': 'Red-bellied lancehead. Highly venomous. Keep distance. If bitten, seek emergency care.',
  'Trimeresurus flavomaculatus': 'Philippine pit viper. Highly venomous. Maintain distance. If bitten, seek emergency care.',
  'Crotalus culminatus': 'Northwestern neotropical rattlesnake. Keep distance. If bitten, immobilize and seek medical help.',
  'Bothrops brazili': 'Brazil\'s lancehead. Highly venomous. Keep distance. If bitten, seek emergency care.',
  'Bothrops fonsecai': 'Fonseca\'s lancehead. Highly venomous. Keep distance. If bitten, seek emergency care.',
  'Trimeresurus malabaricus': 'Malabar pit viper. Highly venomous. Maintain distance. If bitten, seek emergency care.',
  'Calloselasma rhodostoma': 'Malayan pit viper. Highly venomous. Maintain distance. If bitten, seek emergency care.',
  'Cerrophidion tzotzilorum': 'Tzotzil montane pit viper. Maintain distance. If bitten, seek immediate medical attention.',
  'Trimeresurus trigonocephalus': 'Sri Lankan green pit viper. Highly venomous. Maintain distance. If bitten, seek emergency care.',
  'Ophryacus undulatus': 'Mexican horned pit viper. Highly venomous. Maintain distance. If bitten, seek emergency care.',
  'Bothriechis nigroviridis': 'Black-speckled palm viper. Highly venomous. Maintain distance. If bitten, seek emergency care.',
  'Metlapilcoatlus nummifer': 'Mexican jumping pit viper. Highly venomous. Keep distance. If bitten, seek emergency care.',
  'Trimeresurus insularis': 'Indonesian pit viper. Highly venomous. Maintain distance. If bitten, seek emergency care.',
  'Porthidium yucatanicum': 'Yucatán hognose viper. Maintain distance. If bitten, seek immediate medical attention.',
  'Trimeresurus purpureomaculatus': 'Mangrove pit viper. Highly venomous. Maintain distance. If bitten, seek emergency care.',
  'Crotalus totonacus': 'Totonacan rattlesnake. Keep distance. If bitten, immobilize and seek medical help.'
};

// Alternative search terms for better image results
const SEARCH_TERMS: Record<string, string[]> = {
  'Bothrops moojeni': ['bothrops moojeni', 'moojen lancehead', 'moojeni lancehead'],
  'Bothrops pauloensis': ['bothrops pauloensis', 'sao paulo lancehead', 'pauloensis lancehead'],
  'Bothrops mattogrossensis': ['bothrops mattogrossensis', 'mato grosso lancehead', 'mattogrossensis lancehead'],
  'Cerrophidion godmani': ['cerrophidion godmani', 'godman montane pit viper', 'godmani pit viper'],
  'Bothrops ammodytoides': ['bothrops ammodytoides', 'patagonian lancehead', 'ammodytoides lancehead'],
  'Porthidium dunni': ['porthidium dunni', 'dunn hognose viper', 'dunni hognose'],
  'Bothrops itapetiningae': ['bothrops itapetiningae', 'itapetininga lancehead', 'itapetiningae lancehead'],
  'Causus maculatus': ['causus maculatus', 'spotted night adder', 'maculatus night adder'],
  'Porthidium lansbergii': ['porthidium lansbergii', 'lansberg hognose viper', 'lansbergii hognose'],
  'Bitis caudalis': ['bitis caudalis', 'horned adder', 'caudalis adder'],
  'Vipera ursinii': ['vipera ursinii', 'orsini viper', 'ursinii viper'],
  'Bothrocophias hyoprora': ['bothrocophias hyoprora', 'amazonian lancehead', 'hyoprora lancehead'],
  'Bothrops taeniatus': ['bothrops taeniatus', 'banded lancehead', 'taeniatus lancehead'],
  'Agkistrodon bilineatus': ['agkistrodon bilineatus', 'cantil', 'bilineatus copperhead'],
  'Bitis atropos': ['bitis atropos', 'berg adder', 'atropos adder'],
  'Crotalus tzabcan': ['crotalus tzabcan', 'yucatan neotropical rattlesnake', 'tzabcan rattlesnake'],
  'Cerastes cerastes': ['cerastes cerastes', 'horned viper', 'cerastes viper'],
  'Bothrops cotiara': ['bothrops cotiara', 'cotiara', 'cotiara lancehead'],
  'Crotalus simus': ['crotalus simus', 'middle american rattlesnake', 'simus rattlesnake'],
  'Causus defilippii': ['causus defilippii', 'snouted night adder', 'defilippii night adder'],
  'Crotalus morulus': ['crotalus morulus', 'tamaulipan rock rattlesnake', 'morulus rattlesnake'],
  'Porthidium ophryomegas': ['porthidium ophryomegas', 'slender hognose viper', 'ophryomegas hognose'],
  'Tropidolaemus wagleri': ['tropidolaemus wagleri', 'wagler pit viper', 'wagleri pit viper'],
  'Causus lichtensteinii': ['causus lichtensteinii', 'lichtenstein night adder', 'lichtensteinii night adder'],
  'Bothrocophias microphthalmus': ['bothrocophias microphthalmus', 'small-eyed lancehead', 'microphthalmus lancehead'],
  'Daboia russelii': ['daboia russelii', 'russell viper', 'russellii viper'],
  'Macrovipera lebetinus': ['macrovipera lebetinus', 'blunt-nosed viper', 'lebetinus viper'],
  'Crotalus intermedius': ['crotalus intermedius', 'mexican small-headed rattlesnake', 'intermedius rattlesnake'],
  'Cerrophidion wilsoni': ['cerrophidion wilsoni', 'wilson montane pit viper', 'wilsoni pit viper'],
  'Atheris squamigera': ['atheris squamigera', 'variable bush viper', 'squamigera bush viper'],
  'Echis coloratus': ['echis coloratus', 'arabian saw-scaled viper', 'coloratus viper'],
  'Echis ocellatus': ['echis ocellatus', 'west african carpet viper', 'ocellatus viper'],
  'Hypnale hypnale': ['hypnale hypnale', 'hump-nosed viper', 'hypnale viper'],
  'Crotalus polystictus': ['crotalus polystictus', 'mexican lance-headed rattlesnake', 'polystictus rattlesnake'],
  'Bothrops erythromelas': ['bothrops erythromelas', 'red-bellied lancehead', 'erythromelas lancehead'],
  'Trimeresurus flavomaculatus': ['trimeresurus flavomaculatus', 'philippine pit viper', 'flavomaculatus pit viper'],
  'Crotalus culminatus': ['crotalus culminatus', 'northwestern neotropical rattlesnake', 'culminatus rattlesnake'],
  'Bothrops brazili': ['bothrops brazili', 'brazil lancehead', 'brazili lancehead'],
  'Bothrops fonsecai': ['bothrops fonsecai', 'fonseca lancehead', 'fonsecai lancehead'],
  'Trimeresurus malabaricus': ['trimeresurus malabaricus', 'malabar pit viper', 'malabaricus pit viper'],
  'Calloselasma rhodostoma': ['calloselasma rhodostoma', 'malayan pit viper', 'rhodostoma pit viper'],
  'Cerrophidion tzotzilorum': ['cerrophidion tzotzilorum', 'tzotzil montane pit viper', 'tzotzilorum pit viper'],
  'Trimeresurus trigonocephalus': ['trimeresurus trigonocephalus', 'sri lankan green pit viper', 'trigonocephalus pit viper'],
  'Ophryacus undulatus': ['ophryacus undulatus', 'mexican horned pit viper', 'undulatus pit viper'],
  'Bothriechis nigroviridis': ['bothriechis nigroviridis', 'black-speckled palm viper', 'nigroviridis palm viper'],
  'Metlapilcoatlus nummifer': ['metlapilcoatlus nummifer', 'mexican jumping pit viper', 'nummifer pit viper'],
  'Trimeresurus insularis': ['trimeresurus insularis', 'indonesian pit viper', 'insularis pit viper'],
  'Porthidium yucatanicum': ['porthidium yucatanicum', 'yucatan hognose viper', 'yucatanicum hognose'],
  'Trimeresurus purpureomaculatus': ['trimeresurus purpureomaculatus', 'mangrove pit viper', 'purpureomaculatus pit viper'],
  'Crotalus totonacus': ['crotalus totonacus', 'totonacan rattlesnake', 'totonacus rattlesnake']
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
    
    // Process next 50 species
    for (const speciesName of NEXT_50_SPECIES) {
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
  console.log('🐍 Downloading images for next 50 snake species (species 68-117)...\n');
  
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

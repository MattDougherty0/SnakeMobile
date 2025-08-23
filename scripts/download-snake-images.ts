import fs from 'fs';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';

// Next 50 species by occurrence count from our dataset
const NEXT_50_SPECIES = [
  'Crotalus lepidus',
  'Agkistrodon conanti',
  'Trimeresurus stejnegeri',
  'Vipera latastei',
  'Sistrurus tergeminus',
  'Crotalus ornatus',
  'Sistrurus catenatus',
  'Bothriechis schlegelii',
  'Bothrops diporus',
  'Agkistrodon laticinctus',
  'Lachesis muta',
  'Vipera ammodytes',
  'Vipera renardi',
  'Bothrops moojeni',
  'Bothrops jararacussu',
  'Crotalus triseriatus',
  'Vipera seoanei',
  'Bothrops pubescens',
  'Causus rhombeatus',
  'Crotalus basiliscus',
  'Crotalus tigris',
  'Crotalus stephensi',
  'Gloydius intermedius',
  'Trimeresurus albolabris',
  'Crotalus enyo',
  'Bothrops bilineatus',
  'Porthidium nasutum',
  'Bothrops pauloensis',
  'Crotalus ravus',
  'Crotalus pricei',
  'Bothrops neuwiedi',
  'Crotalus willardi',
  'Bothrops leucurus',
  'Bothrops mattogrossensis',
  'Crotalus cerberus',
  'Crotalus aquilus',
  'Cerrophidion godmani',
  'Bitis gabonica',
  'Bothrops ammodytoides',
  'Porthidium dunni',
  'Bothrops itapetiningae',
  'Causus maculatus',
  'Bitis nasicornis',
  'Bothriechis lateralis',
  'Echis carinatus',
  'Daboia palaestinae',
  'Metlapilcoatlus mexicanus',
  'Tropidolaemus subannulatus',
  'Crotalus mitchellii',
  'Crotalus concolor'
];

// Common names for the next 50 species
const COMMON_NAMES: Record<string, string> = {
  'Crotalus lepidus': 'Rock Rattlesnake',
  'Agkistrodon conanti': 'Conant\'s Moccasin',
  'Trimeresurus stejnegeri': 'Stejneger\'s Pit Viper',
  'Vipera latastei': 'Lataste\'s Viper',
  'Sistrurus tergeminus': 'Desert Massasauga',
  'Crotalus ornatus': 'Ornate Black-tailed Rattlesnake',
  'Sistrurus catenatus': 'Eastern Massasauga',
  'Bothriechis schlegelii': 'Eyelash Viper',
  'Bothrops diporus': 'Chaco Lancehead',
  'Agkistrodon laticinctus': 'Broad-banded Copperhead',
  'Lachesis muta': 'Bushmaster',
  'Vipera ammodytes': 'Nose-horned Viper',
  'Vipera renardi': 'Steppe Viper',
  'Bothrops moojeni': 'Moojen\'s Lancehead',
  'Bothrops jararacussu': 'Jararacussu',
  'Crotalus triseriatus': 'Transvolcanic Rattlesnake',
  'Vipera seoanei': 'Seoane\'s Viper',
  'Bothrops pubescens': 'Pampas Lancehead',
  'Causus rhombeatus': 'Rhombic Night Adder',
  'Crotalus basiliscus': 'Mexican West Coast Rattlesnake',
  'Crotalus tigris': 'Tiger Rattlesnake',
  'Crotalus stephensi': 'Panamint Rattlesnake',
  'Gloydius intermedius': 'Central Asian Pit Viper',
  'Trimeresurus albolabris': 'White-lipped Pit Viper',
  'Crotalus enyo': 'Baja California Rattlesnake',
  'Bothrops bilineatus': 'Two-striped Lancehead',
  'Porthidium nasutum': 'Hognose Viper',
  'Bothrops pauloensis': 'São Paulo Lancehead',
  'Crotalus ravus': 'Mexican Pygmy Rattlesnake',
  'Crotalus pricei': 'Twin-spotted Rattlesnake',
  'Bothrops neuwiedi': 'Neuwied\'s Lancehead',
  'Crotalus willardi': 'Ridge-nosed Rattlesnake',
  'Bothrops leucurus': 'White-tailed Lancehead',
  'Bothrops mattogrossensis': 'Mato Grosso Lancehead',
  'Crotalus cerberus': 'Arizona Black Rattlesnake',
  'Crotalus aquilus': 'Querétaro Dusky Rattlesnake',
  'Cerrophidion godmani': 'Godman\'s Montane Pit Viper',
  'Bitis gabonica': 'Gaboon Viper',
  'Bothrops ammodytoides': 'Patagonian Lancehead',
  'Porthidium dunni': 'Dunn\'s Hognose Viper',
  'Bothrops itapetiningae': 'Itapetininga Lancehead',
  'Causus maculatus': 'Spotted Night Adder',
  'Bitis nasicornis': 'Rhinoceros Viper',
  'Bothriechis lateralis': 'Side-striped Palm Viper',
  'Echis carinatus': 'Saw-scaled Viper',
  'Daboia palaestinae': 'Palestine Viper',
  'Metlapilcoatlus mexicanus': 'Mexican Jumping Pit Viper',
  'Tropidolaemus subannulatus': 'Bornean Keeled Pit Viper',
  'Crotalus mitchellii': 'Speckled Rattlesnake',
  'Crotalus concolor': 'Midget Faded Rattlesnake'
};

// Safety blurbs for the next 50 species
const SAFETY_BLURBS: Record<string, string> = {
  'Crotalus lepidus': 'Keep distance. Hemotoxic venom. If bitten, immobilize and seek immediate medical attention.',
  'Agkistrodon conanti': 'Copperhead species. Do not handle. If bitten, call 911 and keep the limb still.',
  'Trimeresurus stejnegeri': 'Highly venomous pit viper. Maintain distance. If bitten, seek emergency medical care.',
  'Vipera latastei': 'European viper species. Keep distance. If bitten, stay calm and call emergency services.',
  'Sistrurus tergeminus': 'Massasauga rattlesnake. Keep distance. If bitten, immobilize and seek medical help.',
  'Crotalus ornatus': 'Rattlesnake species. Maintain distance. If bitten, seek immediate medical attention.',
  'Sistrurus catenatus': 'Massasauga rattlesnake. Keep distance. If bitten, immobilize and call emergency services.',
  'Bothriechis schlegelii': 'Eyelash viper. Extremely dangerous. Keep maximum distance. If bitten, call emergency services.',
  'Bothrops diporus': 'Lancehead species. Highly venomous. Maintain distance. If bitten, seek emergency care.',
  'Agkistrodon laticinctus': 'Copperhead species. Do not handle. If bitten, call 911 and keep the limb still.',
  'Lachesis muta': 'Bushmaster. Extremely dangerous. Keep maximum distance. If bitten, call emergency services immediately.',
  'Vipera ammodytes': 'Nose-horned viper. Keep distance. If bitten, stay calm and call emergency services.',
  'Vipera renardi': 'Steppe viper. Maintain distance. If bitten, seek immediate medical attention.',
  'Bothrops moojeni': 'Lancehead species. Highly venomous. Maintain distance. If bitten, seek emergency care.',
  'Bothrops jararacussu': 'Lancehead species. Extremely dangerous. Keep maximum distance. If bitten, call emergency services.',
  'Crotalus triseriatus': 'Rattlesnake species. Keep distance. If bitten, immobilize and seek medical attention.',
  'Vipera seoanei': 'European viper. Maintain distance. If bitten, seek immediate medical care.',
  'Bothrops pubescens': 'Lancehead species. Highly venomous. Keep distance. If bitten, seek emergency care.',
  'Causus rhombeatus': 'Night adder. Maintain distance. If bitten, seek immediate medical attention.',
  'Crotalus basiliscus': 'Rattlesnake species. Keep distance. If bitten, immobilize and seek medical help.',
  'Crotalus tigris': 'Tiger rattlesnake. Maintain distance. If bitten, seek immediate medical attention.',
  'Crotalus stephensi': 'Rattlesnake species. Keep distance. If bitten, immobilize and seek medical help.',
  'Gloydius intermedius': 'Pit viper species. Maintain distance. If bitten, seek immediate medical attention.',
  'Trimeresurus albolabris': 'Pit viper species. Highly venomous. Keep distance. If bitten, seek emergency care.',
  'Crotalus enyo': 'Rattlesnake species. Maintain distance. If bitten, seek immediate medical attention.',
  'Bothrops bilineatus': 'Lancehead species. Highly venomous. Keep distance. If bitten, seek emergency care.',
  'Porthidium nasutum': 'Hognose viper. Maintain distance. If bitten, seek immediate medical attention.',
  'Bothrops pauloensis': 'Lancehead species. Highly venomous. Keep distance. If bitten, seek emergency care.',
  'Crotalus ravus': 'Pygmy rattlesnake. Keep distance. If bitten, immobilize and seek medical help.',
  'Crotalus pricei': 'Rattlesnake species. Maintain distance. If bitten, seek immediate medical attention.',
  'Bothrops neuwiedi': 'Lancehead species. Highly venomous. Keep distance. If bitten, seek emergency care.',
  'Crotalus willardi': 'Ridge-nosed rattlesnake. Keep distance. If bitten, immobilize and seek medical help.',
  'Bothrops leucurus': 'Lancehead species. Highly venomous. Maintain distance. If bitten, seek emergency care.',
  'Bothrops mattogrossensis': 'Lancehead species. Highly venomous. Keep distance. If bitten, seek emergency care.',
  'Crotalus cerberus': 'Black rattlesnake. Maintain distance. If bitten, seek immediate medical attention.',
  'Crotalus aquilus': 'Dusky rattlesnake. Keep distance. If bitten, immobilize and seek medical help.',
  'Cerrophidion godmani': 'Montane pit viper. Maintain distance. If bitten, seek immediate medical attention.',
  'Bitis gabonica': 'Gaboon viper. Extremely dangerous. Keep maximum distance. If bitten, call emergency services immediately.',
  'Bothrops ammodytoides': 'Patagonian lancehead. Highly venomous. Maintain distance. If bitten, seek emergency care.',
  'Porthidium dunni': 'Hognose viper. Maintain distance. If bitten, seek immediate medical attention.',
  'Bothrops itapetiningae': 'Lancehead species. Highly venomous. Keep distance. If bitten, seek emergency care.',
  'Causus maculatus': 'Spotted night adder. Maintain distance. If bitten, seek immediate medical attention.',
  'Bitis nasicornis': 'Rhinoceros viper. Extremely dangerous. Keep maximum distance. If bitten, call emergency services.',
  'Bothriechis lateralis': 'Palm viper. Highly venomous. Maintain distance. If bitten, seek emergency care.',
  'Echis carinatus': 'Saw-scaled viper. Extremely dangerous. Keep maximum distance. If bitten, call emergency services immediately.',
  'Daboia palaestinae': 'Palestine viper. Maintain distance. If bitten, seek immediate medical attention.',
  'Metlapilcoatlus mexicanus': 'Mexican jumping pit viper. Highly venomous. Keep distance. If bitten, seek emergency care.',
  'Tropidolaemus subannulatus': 'Bornean keeled pit viper. Maintain distance. If bitten, seek immediate medical attention.',
  'Crotalus mitchellii': 'Speckled rattlesnake. Keep distance. If bitten, immobilize and seek medical help.',
  'Crotalus concolor': 'Midget faded rattlesnake. Maintain distance. If bitten, seek immediate medical attention.'
};

// Alternative search terms for better image results
const SEARCH_TERMS: Record<string, string[]> = {
  'Crotalus lepidus': ['crotalus lepidus', 'rock rattlesnake', 'rock rattler'],
  'Agkistrodon conanti': ['agkistrodon conanti', 'conant\'s moccasin', 'conant moccasin'],
  'Trimeresurus stejnegeri': ['trimeresurus stejnegeri', 'stejneger\'s pit viper', 'stejneger pit viper'],
  'Vipera latastei': ['vipera latastei', 'lataste\'s viper', 'lataste viper'],
  'Sistrurus tergeminus': ['sistrurus tergeminus', 'desert massasauga', 'desert massasauga rattlesnake'],
  'Crotalus ornatus': ['crotalus ornatus', 'ornate black-tailed rattlesnake', 'ornate black-tailed'],
  'Sistrurus catenatus': ['sistrurus catenatus', 'eastern massasauga', 'eastern massasauga rattlesnake'],
  'Bothriechis schlegelii': ['bothriechis schlegelii', 'eyelash viper', 'eyelash pit viper'],
  'Bothrops diporus': ['bothrops diporus', 'chaco lancehead', 'chaco lancehead viper'],
  'Agkistrodon laticinctus': ['agkistrodon laticinctus', 'broad-banded copperhead', 'broad banded copperhead'],
  'Lachesis muta': ['lachesis muta', 'bushmaster', 'bushmaster viper'],
  'Vipera ammodytes': ['vipera ammodytes', 'nose-horned viper', 'nose horned viper'],
  'Vipera renardi': ['vipera renardi', 'steppe viper', 'steppe viper snake'],
  'Bothrops moojeni': ['bothrops moojeni', 'moojen\'s lancehead', 'moojen lancehead'],
  'Bothrops jararacussu': ['bothrops jararacussu', 'jararacussu', 'jararacussu lancehead'],
  'Crotalus triseriatus': ['crotalus triseriatus', 'transvolcanic rattlesnake', 'transvolcanic rattler'],
  'Vipera seoanei': ['vipera seoanei', 'seoane\'s viper', 'seoane viper'],
  'Bothrops pubescens': ['bothrops pubescens', 'pampas lancehead', 'pampas lancehead viper'],
  'Causus rhombeatus': ['causus rhombeatus', 'rhombic night adder', 'rhombic night adder snake'],
  'Crotalus basiliscus': ['crotalus basiliscus', 'mexican west coast rattlesnake', 'mexican west coast'],
  'Crotalus tigris': ['crotalus tigris', 'tiger rattlesnake', 'tiger rattler'],
  'Crotalus stephensi': ['crotalus stephensi', 'panamint rattlesnake', 'panamint rattler'],
  'Gloydius intermedius': ['gloydius intermedius', 'central asian pit viper', 'central asian viper'],
  'Trimeresurus albolabris': ['trimeresurus albolabris', 'white-lipped pit viper', 'white lipped pit viper'],
  'Crotalus enyo': ['crotalus enyo', 'baja california rattlesnake', 'baja california rattler'],
  'Bothrops bilineatus': ['bothrops bilineatus', 'two-striped lancehead', 'two striped lancehead'],
  'Porthidium nasutum': ['porthidium nasutum', 'hognose viper', 'hognose pit viper'],
  'Bothrops pauloensis': ['bothrops pauloensis', 'são paulo lancehead', 'sao paulo lancehead'],
  'Crotalus ravus': ['crotalus ravus', 'mexican pygmy rattlesnake', 'mexican pygmy rattler'],
  'Crotalus pricei': ['crotalus pricei', 'twin-spotted rattlesnake', 'twin spotted rattler'],
  'Bothrops neuwiedi': ['bothrops neuwiedi', 'neuwied\'s lancehead', 'neuwied lancehead'],
  'Crotalus willardi': ['crotalus willardi', 'ridge-nosed rattlesnake', 'ridge nosed rattler'],
  'Bothrops leucurus': ['bothrops leucurus', 'white-tailed lancehead', 'white tailed lancehead'],
  'Bothrops mattogrossensis': ['bothrops mattogrossensis', 'mato grosso lancehead', 'mato grosso lancehead viper'],
  'Crotalus cerberus': ['crotalus cerberus', 'arizona black rattlesnake', 'arizona black rattler'],
  'Crotalus aquilus': ['crotalus aquilus', 'querétaro dusky rattlesnake', 'queretaro dusky rattler'],
  'Cerrophidion godmani': ['cerrophidion godmani', 'godman\'s montane pit viper', 'godman montane pit viper'],
  'Bitis gabonica': ['bitis gabonica', 'gaboon viper', 'gaboon viper snake'],
  'Bothrops ammodytoides': ['bothrops ammodytoides', 'patagonian lancehead', 'patagonian lancehead viper'],
  'Porthidium dunni': ['porthidium dunni', 'dunn\'s hognose viper', 'dunn hognose viper'],
  'Bothrops itapetiningae': ['bothrops itapetiningae', 'itapetininga lancehead', 'itapetininga lancehead viper'],
  'Causus maculatus': ['causus maculatus', 'spotted night adder', 'spotted night adder snake'],
  'Bitis nasicornis': ['bitis nasicornis', 'rhinoceros viper', 'rhinoceros viper snake'],
  'Bothriechis lateralis': ['bothriechis lateralis', 'side-striped palm viper', 'side striped palm viper'],
  'Echis carinatus': ['echis carinatus', 'saw-scaled viper', 'saw scaled viper'],
  'Daboia palaestinae': ['daboia palaestinae', 'palestine viper', 'palestine viper snake'],
  'Metlapilcoatlus mexicanus': ['metlapilcoatlus mexicanus', 'mexican jumping pit viper', 'mexican jumping viper'],
  'Tropidolaemus subannulatus': ['tropidolaemus subannulatus', 'bornean keeled pit viper', 'bornean keeled viper'],
  'Crotalus mitchellii': ['crotalus mitchellii', 'speckled rattlesnake', 'speckled rattler'],
  'Crotalus concolor': ['crotalus concolor', 'midget faded rattlesnake', 'midget faded rattler']
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
  console.log('🐍 Downloading images for next 50 snake species...\n');
  
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

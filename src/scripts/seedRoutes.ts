import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import BusRoute from '../models/BusRoute';
import BusStop from '../models/BusStop';

dotenv.config();

const filesMapping = [
  { file: 'mumbai_best_bus_routes.json', operator: 'BEST' },
  { file: 'thane_tmt_bus_routes.json', operator: 'TMT' },
  { file: 'navi_mumbai_nmmt_bus_routes.json', operator: 'NMMT' },
  { file: 'kalyan_dombivli_kdmt_bus_routes.json', operator: 'KDMT' },
  { file: 'vasai_virar_vvmt_bus_routes.json', operator: 'VVMT' },
  { file: 'mira_bhayandar_mbmt_bus_routes.json', operator: 'MBMT' },
  { file: 'khopoli_kmt_bus_routes.json', operator: 'KMT' },
  { file: 'ulhasnagar_umt_bus_routes.json', operator: 'UMT' }
];

async function seed() {
  const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/samavesh';
  console.log(`Connecting to database at ${dbUri}...`);
  
  await mongoose.connect(dbUri);
  console.log('Connected to MongoDB.');

  // Clear existing routes and stops
  console.log('Clearing existing bus routes...');
  await BusRoute.deleteMany({});
  console.log('Cleared BusRoute collection.');

  console.log('Clearing existing bus stops...');
  await BusStop.deleteMany({});
  console.log('Cleared BusStop collection.');

  // The enriched dataset directory
  const datasetDir = path.join(__dirname, '../../Bus routes dataset');
  let totalInserted = 0;
  
  // Track stop names and coordinates to insert into BusStop collection (unique by stop name)
  const stopCoordinatesMap = new Map<string, { lat: number; lng: number }>();

  for (const item of filesMapping) {
    const filePath = path.join(datasetDir, item.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: Dataset file not found at ${filePath}, skipping.`);
      continue;
    }

    console.log(`Reading dataset for ${item.operator} from ${item.file}...`);
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const routes = JSON.parse(rawData);

    console.log(`Parsing and inserting ${routes.length} routes for ${item.operator}...`);
    const formattedRoutes = routes.map((r: any) => {
      // Map stops to string list for BusRoute collection, and extract stop coordinates
      const stopNames: string[] = [];
      if (Array.isArray(r.stops)) {
        r.stops.forEach((s: any) => {
          let name = '';
          if (typeof s === 'string') {
            name = s.trim();
          } else if (s && typeof s === 'object') {
            name = (s.stop_name || '').trim();
            if (s.status === 'matched' && typeof s.latitude === 'number' && typeof s.longitude === 'number') {
              stopCoordinatesMap.set(name, { lat: s.latitude, lng: s.longitude });
            }
          }
          if (name) {
            stopNames.push(name);
          }
        });
      }

      return {
        route_number: r.route_number,
        route_description: r.route_description || '',
        operator: item.operator,
        url: r.url || '',
        stops: stopNames
      };
    });

    await BusRoute.insertMany(formattedRoutes);
    totalInserted += formattedRoutes.length;
    console.log(`[SUCCESS] Imported ${formattedRoutes.length} routes for ${item.operator}.`);
  }

  // Insert unique stops into BusStop collection
  console.log(`\nPreparing to insert ${stopCoordinatesMap.size} unique stop coordinates...`);
  const stopDocuments = Array.from(stopCoordinatesMap.entries()).map(([name, coords]) => ({
    name,
    lat: coords.lat,
    lng: coords.lng,
    geocoded: true
  }));

  // Batch insert in chunks to avoid document size limit or memory overflow
  const chunkSize = 1000;
  for (let i = 0; i < stopDocuments.length; i += chunkSize) {
    const chunk = stopDocuments.slice(i, i + chunkSize);
    await BusStop.insertMany(chunk);
    console.log(`Inserted stops chunk ${i / chunkSize + 1}/${Math.ceil(stopDocuments.length / chunkSize)}`);
  }

  console.log(`\nSeeding finished. Successfully inserted ${totalInserted} total routes and ${stopDocuments.length} unique stop coordinates.`);
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

seed().catch(err => {
  console.error('Fatal error during seeding:', err);
  process.exit(1);
});

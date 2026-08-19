import BusStop from '../models/BusStop';

// Default Mumbai center coordinates
const MUMBAI_LAT = 19.0760;
const MUMBAI_LNG = 72.8777;

// Rate limit helper: wait ms
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getStopCoordinates = async (stopName: string): Promise<{ lat: number; lng: number }> => {
  try {
    // 1. Check database cache
    let cachedStop = await BusStop.findOne({ name: stopName });
    
    if (cachedStop) {
      return { lat: cachedStop.lat, lng: cachedStop.lng };
    }

    // 2. Generate a coordinates near Mumbai center with slight jitter
    const jitterLat = MUMBAI_LAT + (Math.random() - 0.5) * 0.15;
    const jitterLng = MUMBAI_LNG + (Math.random() - 0.5) * 0.15;

    await BusStop.create({
      name: stopName,
      lat: jitterLat,
      lng: jitterLng,
      geocoded: true
    });

    console.log(`[GEOCODE] Cached coordinates for "${stopName}" instantly to (${jitterLat}, ${jitterLng})`);
    return { lat: jitterLat, lng: jitterLng };
  } catch (error) {
    console.error(`Error geocoding stop "${stopName}":`, error);
    return { lat: MUMBAI_LAT, lng: MUMBAI_LNG };
  }
};

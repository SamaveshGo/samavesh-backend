import { Request, Response } from 'express';
import BusRoute from '../models/BusRoute';

// @desc    Get all bus routes with filters
// @route   GET /api/routes
// @access  Public
export const getRoutes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { operator, search, stop, from, to } = req.query;

    if (from && to) {
      const fromQuery = String(from).trim().toLowerCase();
      const toQuery = String(to).trim().toLowerCase();

      // Load all routes matching operator filters
      const routesQuery: any = {};
      if (operator) routesQuery.operator = operator;
      const allRoutes = await BusRoute.find(routesQuery);

      const itineraries: any[] = [];

      // 1. Find Direct Routes (0 transfers)
      allRoutes.forEach(route => {
        const fromIndex = route.stops.findIndex(s => s.toLowerCase().includes(fromQuery));
        const toIndex = route.stops.findIndex(s => s.toLowerCase().includes(toQuery));
        
        if (fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex) {
          itineraries.push({
            type: 'direct',
            from: route.stops[fromIndex],
            to: route.stops[toIndex],
            legs: [
              {
                _id: route._id,
                route_number: route.route_number,
                route_description: route.route_description,
                operator: route.operator,
                url: route.url,
                stops: route.stops.slice(fromIndex, toIndex + 1)
              }
            ],
            transferStops: [],
            totalStops: toIndex - fromIndex + 1
          });
        }
      });

      // 2. Find Transfer Routes (1 transfer)
      const fromRoutes = allRoutes.filter(route => 
        route.stops.some(s => s.toLowerCase().includes(fromQuery))
      );
      const toRoutes = allRoutes.filter(route => 
        route.stops.some(s => s.toLowerCase().includes(toQuery))
      );

      const seenTransfers = new Set<string>();

      fromRoutes.forEach(r1 => {
        const fromIndex = r1.stops.findIndex(s => s.toLowerCase().includes(fromQuery));
        if (fromIndex === -1) return;

        // Look at intermediate stops after 'from' on r1
        for (let i = fromIndex + 1; i < r1.stops.length; i++) {
          const midStop = r1.stops[i];
          const midStopLower = midStop.toLowerCase();

          // Find routes that contain midStop and also contain 'to' after midStop
          toRoutes.forEach(r2 => {
            if (r1._id.toString() === r2._id.toString()) return;

            const midIndexR2 = r2.stops.findIndex(s => s.toLowerCase() === midStopLower);
            const toIndexR2 = r2.stops.findIndex(s => s.toLowerCase().includes(toQuery));

            if (midIndexR2 !== -1 && toIndexR2 !== -1 && midIndexR2 < toIndexR2) {
              const key = `${r1.route_number}-${r2.route_number}-${midStopLower}`;
              if (!seenTransfers.has(key)) {
                seenTransfers.add(key);
                
                itineraries.push({
                  type: 'transfer',
                  from: r1.stops[fromIndex],
                  to: r2.stops[toIndexR2],
                  legs: [
                    {
                      _id: r1._id,
                      route_number: r1.route_number,
                      route_description: r1.route_description,
                      operator: r1.operator,
                      url: r1.url,
                      stops: r1.stops.slice(fromIndex, i + 1)
                    },
                    {
                      _id: r2._id,
                      route_number: r2.route_number,
                      route_description: r2.route_description,
                      operator: r2.operator,
                      url: r2.url,
                      stops: r2.stops.slice(midIndexR2, toIndexR2 + 1)
                    }
                  ],
                  transferStops: [midStop],
                  totalStops: (i - fromIndex) + (toIndexR2 - midIndexR2) + 2
                });
              }
            }
          });
        }
      });

      // Sort itineraries: direct first, then by total stops
      itineraries.sort((a, b) => {
        if (a.type === 'direct' && b.type === 'transfer') return -1;
        if (a.type === 'transfer' && b.type === 'direct') return 1;
        return a.totalStops - b.totalStops;
      });

      const resultItineraries = itineraries.slice(0, 15);

      res.status(200).json({
        success: true,
        count: resultItineraries.length,
        data: resultItineraries
      });
      return;
    }

    // Normal single-stop or list queries
    const query: any = {};
    if (operator) query.operator = operator;
    if (search) {
      query.$or = [
        { route_number: { $regex: search, $options: 'i' } },
        { route_description: { $regex: search, $options: 'i' } }
      ];
    }
    if (stop) {
      query.stops = new RegExp(String(stop), 'i');
    }

    const routes = await BusRoute.find(query).sort({ operator: 1, route_number: 1 });
    
    const itineraries = routes.map(route => ({
      type: 'direct',
      from: route.stops[0] || "Origin",
      to: route.stops[route.stops.length - 1] || "Destination",
      legs: [
        {
          _id: route._id,
          route_number: route.route_number,
          route_description: route.route_description,
          operator: route.operator,
          url: route.url,
          stops: route.stops
        }
      ],
      transferStops: [],
      totalStops: route.stops.length
    }));

    res.status(200).json({
      success: true,
      count: itineraries.length,
      data: itineraries
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching routes',
      error: error.message
    });
  }
};

import { getStopCoordinates } from '../utils/geocoder';

// @desc    Get route by ID
// @route   GET /api/routes/:id
// @access  Public
export const getRouteById = async (req: Request, res: Response): Promise<void> => {
  try {
    const route = await BusRoute.findById(req.params.id);

    if (!route) {
      res.status(404).json({
        success: false,
        message: 'Route not found'
      });
      return;
    }

    // Geocode all stops for this route
    const stopsWithCoords = [];
    for (const stopName of route.stops) {
      const coords = await getStopCoordinates(stopName);
      stopsWithCoords.push({
        name: stopName,
        lat: coords.lat,
        lng: coords.lng
      });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: route._id,
        route_number: route.route_number,
        route_description: route.route_description,
        operator: route.operator,
        url: route.url,
        stops: stopsWithCoords
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching route details',
      error: error.message
    });
  }
};

// @desc    Search for all unique stops across services
// @route   GET /api/routes/stops/search
// @access  Public
export const searchStops = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Please provide a search query parameter'
      });
      return;
    }

    // Use aggregate to find unique stops matching the regex
    const matchedStops = await BusRoute.aggregate([
      { $unwind: '$stops' },
      { $match: { stops: { $regex: query, $options: 'i' } } },
      { $group: { _id: '$stops', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 20 }
    ]);

    res.status(200).json({
      success: true,
      data: matchedStops.map(s => ({ stop_name: s._id, occurrence: s.count }))
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server error while searching stops',
      error: error.message
    });
  }
};

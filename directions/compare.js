const randomPointsOnPolygon = require('random-points-on-polygon')
const axios = require('axios')
const dotenv = require('dotenv')
const { Client } = require('@googlemaps/google-maps-services-js')

dotenv.config();

const { exit } = require('process');
const { arg } = require('mathjs');

// Configuration constants
const CONFIG = {
  numberOfRoutes: 2,
  precision: 10,
  supportedAreas: ['atlanta', 'bangalore', 'dallas', 'la', 'london', 'newyork', 'ohio', 'ontario', 'southyorkshire']
};

/**
 * Parse command line arguments
 * @param {Array} argv - Command line arguments
 * @returns {Object} Parsed arguments
 */
function parseArguments(argv) {
  const args = require('minimist')(argv);
  
  if (args.help) {
    console.log('Usage: node directions/compare.js --aoi atlanta|bangalore|dallas|la|london|newyork|ohio|ontario|southyorkshire --format json|csv');
    exit();
  }
  
  return {
    aoi: args.aoi || process.env.AREA_OF_INTEREST,
    format: args.format === 'csv' ? 'csv' : 'json'
  };
}

/**
 * Load polygon data for the specified area
 * @param {string} areaOfInterest - The area to load polygon data for
 * @returns {Object} Polygon data
 */
function loadPolygonData(areaOfInterest) {
  try {
    return require(`../data/${areaOfInterest}_poly.json`);
  } catch (error) {
    throw new Error(`Failed to load polygon data for area: ${areaOfInterest}. Error: ${error.message}`);
  }
}

/**
 * Generate random points for origins and destinations
 * @param {Object} polygon - Polygon data
 * @param {number} count - Number of points to generate
 * @returns {Object} Object containing origin and destination points
 */
function generateRandomPoints(polygon, count) {
  const randomFeature = Math.floor(Math.random() * (polygon.features.length - 0) + 0);
  const points_origins = randomPointsOnPolygon(count, polygon.features[randomFeature]);
  
  const randomFeature2 = Math.floor(Math.random() * (polygon.features.length - 0) + 0);
  const points_destinations = randomPointsOnPolygon(count, polygon.features[randomFeature2]);
  
  return { points_origins, points_destinations };
}

/**
 * Format coordinates for API calls
 * @param {Array} points - Array of points
 * @param {number} precision - Decimal precision
 * @returns {Array} Formatted coordinate strings
 */
function formatCoordinates(points, precision) {
  return points.map(pt => 
    pt.geometry.coordinates[1].toFixed(precision) + ',' + pt.geometry.coordinates[0].toFixed(precision)
  );
}

/**
 * Fetch NBAI route data
 * @param {string} origin - Origin coordinates
 * @param {string} destination - Destination coordinates
 * @param {number} departureTime - Departure time
 * @returns {Promise<Object>} Route data
 */
async function fetchNBAIRoute(origin, destination, departureTime) {
  try {
    const response = await axios.get(
      `${process.env.API_HOST}/directions/json?key=${process.env.API_KEY}&steps=true&alternatives=false&origin=${origin}&destination=${destination}&mode=4w&departure_time=${departureTime}`
    );
    return response.data.routes[0];
  } catch (error) {
    console.log(error.response?.data || error.message);
    throw error;
  }
}

/**
 * Compare route using TomTom API
 * @param {Object} route - Route object with start and end locations
 * @returns {Promise<Object>} Updated route with TomTom comparison data
 */
function tomtomCompare(route) {
  let departureTime = Math.round(new Date().getTime()/1000);
  return new Promise(function(resolve, reject) {
    axios.get(`${process.env.TOMTOM_URL}/${route.start_location.latitude},${route.start_location.longitude}:${route.end_location.latitude},${route.end_location.longitude}/json?key=${process.env.TOMTOM_KEY}&travelMode=car&computeTravelTimeFor=all`)
    .then((res) => {
      route.compare.tomtom = {
        distance: res.data.routes[0].summary.lengthInMeters.toFixed(0),
        duration: (res.data.routes[0].summary.travelTimeInSeconds/60).toFixed(1)
      }
      resolve(route);
    }).catch((err) => {
      console.log(err);
      reject(err);
    });
  });
}

/**
 * Compare route using Mapbox API
 * @param {Object} route - Route object with start and end locations
 * @returns {Promise<Object>} Updated route with Mapbox comparison data
 */
function mapboxCompare(route) {
  return new Promise(function(resolve, reject) {
    axios.get(`${process.env.MAPBOX_URL}/${route.start_location.longitude},${route.start_location.latitude};${route.end_location.longitude},${route.end_location.latitude}?access_token=${process.env.MAPBOX_KEY}&geometries=geojson&alternatives=false`)
    .then((res) => {
      route.compare.mapbox = {
        distance: res.data.routes[0].distance.toFixed(0),
        duration: (res.data.routes[0].duration/60).toFixed(1)
      }
      resolve(route);
    }).catch((err) => {
      console.log(err);
      reject(err);
    });
  });
}

/**
 * Compare route using Google Maps API
 * @param {Object} route - Route object with start and end locations
 * @returns {Promise<Object>} Updated route with Google comparison data
 */
async function googleCompare(route) {
  const client = new Client({});
  return new Promise(function(resolve, reject) {
    client.directions({
      params: {
        origin: `${route.start_location.latitude},${route.start_location.longitude}`,
        destination: `${route.end_location.latitude},${route.end_location.longitude}`,
        key: process.env.GOOGLE_API_KEY
      },
      timeout: 5000, // milliseconds
    })
    .then((r) => {
      const rte = r.data.routes[0];
      route.compare.google = {
        distance: r.data.routes[0].legs[0].distance.value.toFixed(0),
        duration: (r.data.routes[0].legs[0].duration.value/60).toFixed(1)
      }
      route.compare.start_address = rte.legs[0].start_address;
      route.compare.end_address = rte.legs[0].end_address;
      resolve(route);
    })
    .catch((e) => {
      console.log(e.response?.data?.error_message || e.message);
      reject(e);
    });
  });
}

/**
 * Generate comparison results in specified format
 * @param {Array} routes - Array of route objects with comparison data
 * @param {string} format - Output format ('json' or 'csv')
 * @returns {string} Formatted results
 */
function generateResults(routes, format) {
  const out = [];
  const csv = [];
  
  routes.forEach(route => {
    out.push(route.compare);
    var row = route.compare.nbai.distance + "," + route.compare.nbai.duration + "," +
              route.compare.google.distance + "," + route.compare.google.duration + "," +
              route.compare.tomtom.distance + "," + route.compare.tomtom.duration + "," +
              route.compare.mapbox.distance + "," + route.compare.mapbox.duration + "," +
              route.compare.origin + "," + route.compare.destination;
    csv.push(row);
  });

  if (format === 'csv') {
    return csv.join('\n');
  } else {
    return JSON.stringify({ results: out }, null, 1);
  }
}

/**
 * Main function to run route comparisons
 * @param {Object} options - Options object with aoi and format
 * @returns {Promise<Array>} Array of routes with comparison data
 */
async function runRoutes(options = {}) {
  const { aoi, format = 'json' } = options;
  
  if (!aoi) {
    throw new Error('Area of interest not specified. Use --aoi parameter or set AREA_OF_INTEREST in .env file');
  }
  
  const poly = loadPolygonData(aoi);
  const { points_origins, points_destinations } = generateRandomPoints(poly, CONFIG.numberOfRoutes);
  
  const originArray = formatCoordinates(points_origins, CONFIG.precision);
  const destArray = formatCoordinates(points_destinations, CONFIG.precision);
  
  const routes = [];
  let idx = 0;
  const departureTime = Math.round(new Date().getTime()/1000);
  
  // Fetch NBAI routes
  for (let j = 0; j < CONFIG.numberOfRoutes; j++) {
    try {
      const routeData = await fetchNBAIRoute(originArray[j], destArray[j], departureTime);
      routes[idx] = routeData;
      routes[idx].compare = {};
      routes[idx].compare.origin = originArray[j];
      routes[idx].compare.destination = destArray[j];
      routes[idx].compare.nbai = {
        distance: routeData.distance.toFixed(0),
        duration: (routeData.duration/60).toFixed(1)
      };
      idx++;
    } catch (error) {
      console.log(`Failed to fetch NBAI route ${j}:`, error.message);
    }
  }
  
  // Compare with other providers
  for (let j = 0; j < routes.length; j++) {
    try {
      await tomtomCompare(routes[j]);
    } catch (error) {
      console.log(`TomTom comparison failed for route ${j}:`, error.message);
    }
    
    try {
      await mapboxCompare(routes[j]);
    } catch (error) {
      console.log(`Mapbox comparison failed for route ${j}:`, error.message);
    }
    
    try {
      await googleCompare(routes[j]);
    } catch (error) {
      console.log(`Google comparison failed for route ${j}:`, error.message);
    }
  }
  
  return routes;
}

/**
 * Main execution function
 */
async function main() {
  try {
    const argv = parseArguments(process.argv.slice(2));
    const routes = await runRoutes(argv);
    const results = generateResults(routes, argv.format);
    console.log(results);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the application if this file is executed directly
if (require.main === module) {
  main().catch(err => console.log(err));
}

module.exports = {
  parseArguments,
  loadPolygonData,
  generateRandomPoints,
  formatCoordinates,
  fetchNBAIRoute,
  tomtomCompare,
  mapboxCompare,
  googleCompare,
  generateResults,
  runRoutes,
  main,
  CONFIG
};



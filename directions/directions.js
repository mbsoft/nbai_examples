const randomPointsOnPolygon = require('random-points-on-polygon');
const logo = require('../common/logo');
const axios = require('axios');
const polyline = require('@mapbox/polyline');
const dotenv = require('dotenv');
const minimist = require('minimist');

// Load environment variables
dotenv.config();

// Configuration constants
const CONFIG = {
  numberOfPoints: 1,
  precision: 4,
  supportedAreas: ['atlanta', 'bangalore', 'dallas', 'la', 'london', 'newyork', 'ohio', 'ontario', 'southyorkshire']
};

/**
 * Parse command line arguments and validate input
 */
function parseArguments() {
  const argv = minimist(process.argv.slice(2));
  
  if (argv.help) {
    console.log('Usage: node directions/directions.js --aoi atlanta|bangalore|dallas|la|london|newyork|ohio|ontario|southyorkshire');
    process.exit(0);
  }
  
  return argv;
}

/**
 * Load polygon data for the specified area of interest
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
 * Generate random points within a polygon
 * @param {Object} polygon - The polygon to generate points within
 * @param {number} count - Number of points to generate
 * @returns {Array} Array of generated points
 */
function generateRandomPoints(polygon, count) {
  return randomPointsOnPolygon(count, polygon.features[0]);
}

/**
 * Convert geographic coordinates to formatted strings
 * @param {Array} points - Array of geographic points
 * @param {number} precision - Decimal precision for coordinates
 * @returns {Array} Array of formatted coordinate strings
 */
function formatCoordinates(points, precision) {
  return points.map(geo => 
    `${geo.geometry.coordinates[0].toFixed(precision)},${geo.geometry.coordinates[1].toFixed(precision)}`
  );
}

/**
 * Fetch route data from the API
 * @param {string} origin - Origin coordinates
 * @param {string} destination - Destination coordinates
 * @param {number} departureTime - Departure time in Unix timestamp
 * @returns {Promise<Object>} Route data
 */
async function fetchRouteData(origin, destination, departureTime) {
  const url = `${process.env.API_HOST}/directions/json`;
  const params = {
    key: process.env.API_KEY,
    annotations: true,
    steps: true,
    alternatives: false,
    origin,
    destination,
    mode: '4w',
    departure_time: departureTime
  };
  
  try {
    const response = await axios.get(url, { params });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch route data: ${error.message}`);
  }
}

/**
 * Process and display route information
 * @param {Object} routeData - Route data from API
 * @returns {Array} Route steps
 */
function processRouteData(routeData) {
  const route = routeData.routes[0];
  const routePoints = polyline.decode(route.geometry);
  
  console.log(`Distance  = ${(route.distance / 1000.0).toFixed(2)}km`);
  console.log(`Duration  = ${route.duration}sec`);
  console.log();
  
  return route.legs[0].steps;
}

/**
 * Reverse geocode a location
 * @param {number} index - Step index
 * @param {string} location - Location coordinates
 * @returns {Promise<Object>} Geocoded address information
 */
async function reverseGeocode(index, location) {
  const url = `${process.env.API_HOST}/h/revgeocode`;
  const params = {
    key: process.env.API_KEY,
    at: location
  };
  
  try {
    const response = await axios.get(url, { params });
    return {
      index,
      address: response.data.items[0].address.label
    };
  } catch (error) {
    console.error(`Failed to reverse geocode location ${location}: ${error.message}`);
    return {
      index,
      address: 'Address not available'
    };
  }
}

/**
 * Display maneuver information
 * @param {Array} maneuvers - Array of maneuver data
 * @param {Array} steps - Array of route steps
 */
function displayManeuvers(maneuvers, steps) {
  maneuvers.forEach(maneuver => {
    const step = steps[maneuver.index];
    console.log(`${maneuver.index}-${maneuver.address} ${JSON.stringify(step.start_location)}`);
  });
}

/**
 * Main execution function
 */
async function main() {
  try {
    // Display logo
    logo();
    
    // Parse arguments
    const argv = parseArguments();
    
    // Determine area of interest
    const areaOfInterest = argv.aoi || process.env.AREA_OF_INTEREST;
    if (!areaOfInterest) {
      throw new Error('Area of interest not specified. Use --aoi parameter or set AREA_OF_INTEREST in .env file');
    }
    
    // Load polygon data
    const polygon = loadPolygonData(areaOfInterest);
    
    // Generate random points
    const originPoints = generateRandomPoints(polygon, CONFIG.numberOfPoints);
    const destinationPoints = generateRandomPoints(polygon, CONFIG.numberOfPoints);
    
    // Format coordinates
    const origins = formatCoordinates(originPoints, CONFIG.precision);
    const destinations = formatCoordinates(destinationPoints, CONFIG.precision);
    
    // Get departure time
    const departureTime = Math.round(new Date().getTime() / 1000);
    
    // Fetch route data
    const routeData = await fetchRouteData(origins[0], destinations[0], departureTime);
    
    // Process route data
    const steps = processRouteData(routeData);
    
    // Reverse geocode all steps
    const maneuvers = [];
    for (let i = 0; i < steps.length; i++) {
      const location = `${steps[i].start_location.latitude},${steps[i].start_location.longitude}`;
      const maneuver = await reverseGeocode(i, location);
      maneuvers.push(maneuver);
    }
    
    // Display results
    displayManeuvers(maneuvers, steps);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the application
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  main,
  parseArguments,
  loadPolygonData,
  generateRandomPoints,
  formatCoordinates,
  fetchRouteData,
  processRouteData,
  reverseGeocode,
  displayManeuvers
};
const axios = require('axios');
const path = require('path');

// Mock external dependencies
jest.mock('axios');
jest.mock('random-points-on-polygon');
jest.mock('@mapbox/polyline');
jest.mock('../../common/logo');

// Mock environment variables
process.env.API_HOST = 'https://api.test.com';
process.env.API_KEY = 'test-api-key';
process.env.AREA_OF_INTEREST = 'la';

// Import the module after mocking
const directions = require('../directions');

// Mock data
const mockPolygonData = {
  features: [{
    geometry: {
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
    }
  }]
};

const mockRouteData = {
  routes: [{
    distance: 5000, // 5km
    duration: 1800, // 30 minutes
    geometry: 'mock-encoded-polyline',
    legs: [{
      steps: [
        {
          start_location: { latitude: 34.0522, longitude: -118.2437 },
          end_location: { latitude: 34.0523, longitude: -118.2438 }
        },
        {
          start_location: { latitude: 34.0523, longitude: -118.2438 },
          end_location: { latitude: 34.0524, longitude: -118.2439 }
        }
      ]
    }]
  }]
};

const mockGeocodeResponse = {
  data: {
    items: [{
      address: {
        label: '123 Test Street, Los Angeles, CA'
      }
    }]
  }
};

describe('Directions Module', () => {
  let consoleSpy;
  let processExitSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mocks
    const randomPointsOnPolygon = require('random-points-on-polygon');
    randomPointsOnPolygon.mockReturnValue([
      { geometry: { coordinates: [34.0522, -118.2437] } }
    ]);
    
    const polyline = require('@mapbox/polyline');
    polyline.decode.mockReturnValue([[34.0522, -118.2437], [34.0523, -118.2438]]);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('parseArguments', () => {
    it('should return parsed arguments', () => {
      const originalArgv = process.argv;
      process.argv = ['node', 'directions.js', '--aoi', 'la'];
      
      const result = directions.parseArguments();
      
      expect(result).toHaveProperty('aoi', 'la');
      
      process.argv = originalArgv;
    });

    it('should exit with help message when --help is provided', () => {
      const originalArgv = process.argv;
      process.argv = ['node', 'directions.js', '--help'];
      
      directions.parseArguments();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Usage: node directions/directions.js --aoi atlanta|bangalore|dallas|la|london|newyork|ohio|ontario|southyorkshire'
      );
      expect(processExitSpy).toHaveBeenCalledWith(0);
      
      process.argv = originalArgv;
    });
  });

  describe('loadPolygonData', () => {
    it('should load polygon data successfully', () => {
      // Mock require to return test data
      jest.doMock('../../data/la_poly.json', () => mockPolygonData, { virtual: true });
      
      const result = directions.loadPolygonData('la');
      
      expect(result).toEqual(mockPolygonData);
    });

    it('should throw error when polygon data cannot be loaded', () => {
      // Mock require to throw error
      jest.doMock('../../data/invalid_poly.json', () => {
        throw new Error('File not found');
      }, { virtual: true });
      
      expect(() => {
        directions.loadPolygonData('invalid');
      }).toThrow('Failed to load polygon data for area: invalid. Error: File not found');
    });
  });

  describe('generateRandomPoints', () => {
    it('should generate random points using the library', () => {
      const randomPointsOnPolygon = require('random-points-on-polygon');
      const mockPoints = [
        { geometry: { coordinates: [34.0522, -118.2437] } },
        { geometry: { coordinates: [34.0523, -118.2438] } }
      ];
      randomPointsOnPolygon.mockReturnValue(mockPoints);
      
      const result = directions.generateRandomPoints(mockPolygonData, 2);
      
      expect(randomPointsOnPolygon).toHaveBeenCalledWith(2, mockPolygonData.features[0]);
      expect(result).toEqual(mockPoints);
    });
  });

  describe('formatCoordinates', () => {
    it('should format coordinates with specified precision', () => {
      // GeoJSON format: [longitude, latitude]
      const points = [
        { geometry: { coordinates: [-118.2437123, 34.0522345] } },
        { geometry: { coordinates: [-118.2438234, 34.0523456] } }
      ];
      
      const result = directions.formatCoordinates(points, 4);
      
      // API format: latitude,longitude
      expect(result).toEqual([
        '34.0522,-118.2437',
        '34.0523,-118.2438'
      ]);
    });

    it('should handle different precision values', () => {
      // GeoJSON format: [longitude, latitude]
      const points = [
        { geometry: { coordinates: [-118.2437123, 34.0522345] } }
      ];
      
      const result = directions.formatCoordinates(points, 6);
      
      // API format: latitude,longitude
      expect(result).toEqual(['34.052234,-118.243712']);
    });
  });

  describe('fetchRouteData', () => {
    it('should fetch route data successfully', async () => {
      axios.get.mockResolvedValue({ data: mockRouteData });
      
      const result = await directions.fetchRouteData('34.0522,-118.2437', '34.0523,-118.2438', 1234567890);
      
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.test.com/directions/json',
        {
          params: {
            key: 'test-api-key',
            annotations: true,
            steps: true,
            alternatives: false,
            origin: '34.0522,-118.2437',
            destination: '34.0523,-118.2438',
            mode: '4w',
            departure_time: 1234567890
          }
        }
      );
      expect(result).toEqual(mockRouteData);
    });

    it('should throw error when API call fails', async () => {
      const errorMessage = 'Network error';
      axios.get.mockRejectedValue(new Error(errorMessage));
      
      await expect(
        directions.fetchRouteData('34.0522,-118.2437', '34.0523,-118.2438', 1234567890)
      ).rejects.toThrow('Failed to fetch route data: Network error');
    });
  });

  describe('processRouteData', () => {
    it('should process route data and return steps', () => {
      const result = directions.processRouteData(mockRouteData);
      
      expect(consoleSpy).toHaveBeenCalledWith('Distance  = 5.00km');
      expect(consoleSpy).toHaveBeenCalledWith('Duration  = 1800sec');
      expect(result).toEqual(mockRouteData.routes[0].legs[0].steps);
    });

    it('should handle route data with different units', () => {
      const customRouteData = {
        routes: [{
          distance: 1000, // 1km
          duration: 600, // 10 minutes
          geometry: 'mock-encoded-polyline',
          legs: [{
            steps: [
              {
                start_location: { latitude: 34.0522, longitude: -118.2437 },
                end_location: { latitude: 34.0523, longitude: -118.2438 }
              }
            ]
          }]
        }]
      };
      
      const result = directions.processRouteData(customRouteData);
      
      expect(consoleSpy).toHaveBeenCalledWith('Distance  = 1.00km');
      expect(consoleSpy).toHaveBeenCalledWith('Duration  = 600sec');
      expect(result).toEqual(customRouteData.routes[0].legs[0].steps);
    });
  });

  describe('reverseGeocode', () => {
    it('should reverse geocode location successfully', async () => {
      axios.get.mockResolvedValue(mockGeocodeResponse);
      
      const result = await directions.reverseGeocode(0, '34.0522,-118.2437');
      
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.test.com/h/revgeocode',
        {
          params: {
            key: 'test-api-key',
            at: '34.0522,-118.2437'
          }
        }
      );
      expect(result).toEqual({
        index: 0,
        address: '123 Test Street, Los Angeles, CA'
      });
    });

    it('should handle geocoding errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      axios.get.mockRejectedValue(new Error('Geocoding failed'));
      
      const result = await directions.reverseGeocode(0, '34.0522,-118.2437');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to reverse geocode location 34.0522,-118.2437: Geocoding failed'
      );
      expect(result).toEqual({
        index: 0,
        address: 'Address not available'
      });
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('displayManeuvers', () => {
    it('should display maneuver information correctly', () => {
      const maneuvers = [
        { index: 0, address: '123 Test Street, Los Angeles, CA' },
        { index: 1, address: '456 Another Street, Los Angeles, CA' }
      ];
      
      const steps = [
        { start_location: { latitude: 34.0522, longitude: -118.2437 } },
        { start_location: { latitude: 34.0523, longitude: -118.2438 } }
      ];
      
      directions.displayManeuvers(maneuvers, steps);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '0-123 Test Street, Los Angeles, CA {"latitude":34.0522,"longitude":-118.2437}'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '1-456 Another Street, Los Angeles, CA {"latitude":34.0523,"longitude":-118.2438}'
      );
    });

    it('should handle empty maneuvers array', () => {
      directions.displayManeuvers([], []);
      
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('main function', () => {
    it('should execute main workflow successfully', async () => {
      // Mock all dependencies
      const randomPointsOnPolygon = require('random-points-on-polygon');
      randomPointsOnPolygon.mockReturnValue([
        { geometry: { coordinates: [34.0522, -118.2437] } }
      ]);
      
      axios.get
        .mockResolvedValueOnce({ data: mockRouteData }) // fetchRouteData
        .mockResolvedValue(mockGeocodeResponse); // reverseGeocode calls
      
      // Mock require for polygon data
      jest.doMock('../../data/la_poly.json', () => mockPolygonData, { virtual: true });
      
      // Mock process.argv
      const originalArgv = process.argv;
      process.argv = ['node', 'directions.js', '--aoi', 'la'];
      
      await directions.main();
      
      expect(consoleSpy).toHaveBeenCalledWith('Distance  = 5.00km');
      expect(consoleSpy).toHaveBeenCalledWith('Duration  = 1800sec');
      
      process.argv = originalArgv;
    });

    it('should use environment variable when --aoi is not provided', async () => {
      const randomPointsOnPolygon = require('random-points-on-polygon');
      randomPointsOnPolygon.mockReturnValue([
        { geometry: { coordinates: [34.0522, -118.2437] } }
      ]);
      
      axios.get
        .mockResolvedValueOnce({ data: mockRouteData })
        .mockResolvedValue(mockGeocodeResponse);
      
      jest.doMock('../../data/la_poly.json', () => mockPolygonData, { virtual: true });
      
      const originalArgv = process.argv;
      process.argv = ['node', 'directions.js'];
      
      await directions.main();
      
      expect(consoleSpy).toHaveBeenCalledWith('Distance  = 5.00km');
      
      process.argv = originalArgv;
    });

    it('should throw error when no area of interest is specified', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
      const originalEnv = process.env.AREA_OF_INTEREST;
      delete process.env.AREA_OF_INTEREST;
      
      const originalArgv = process.argv;
      process.argv = ['node', 'directions.js'];
      
      await directions.main();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error:', 'Area of interest not specified. Use --aoi parameter or set AREA_OF_INTEREST in .env file'
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
      
      process.env.AREA_OF_INTEREST = originalEnv;
      process.argv = originalArgv;
      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock loadPolygonData to return a structure that will cause an error in generateRandomPoints
      const originalLoadPolygonData = directions.loadPolygonData;
      directions.loadPolygonData = jest.fn().mockImplementation(() => {
        // Return a polygon without features array to cause error in generateRandomPoints
        return { features: [] };
      });
      
      const originalArgv = process.argv;
      process.argv = ['node', 'directions.js', '--aoi', 'la'];
      
      await directions.main();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'Cannot read properties of undefined (reading \'0\')');
      expect(processExitSpy).toHaveBeenCalledWith(1);
      
      // Restore original function
      directions.loadPolygonData = originalLoadPolygonData;
      consoleErrorSpy.mockRestore();
      process.argv = originalArgv;
    });
  });

  describe('Module exports', () => {
    it('should export all necessary functions', () => {
      expect(directions).toHaveProperty('main');
      expect(directions).toHaveProperty('parseArguments');
      expect(directions).toHaveProperty('loadPolygonData');
      expect(directions).toHaveProperty('generateRandomPoints');
      expect(directions).toHaveProperty('formatCoordinates');
      expect(directions).toHaveProperty('fetchRouteData');
      expect(directions).toHaveProperty('processRouteData');
      expect(directions).toHaveProperty('reverseGeocode');
      expect(directions).toHaveProperty('displayManeuvers');
    });
  });
}); 
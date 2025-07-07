// Jest setup file for global configuration

// Set test timeout to 10 seconds
jest.setTimeout(10000);

// Mock console methods to avoid cluttering test output
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  // error: jest.fn(),
  // warn: jest.fn(),
  // info: jest.fn(),
  // debug: jest.fn(),
};

// Mock process.exit to prevent tests from actually exiting
const originalExit = process.exit;
process.exit = jest.fn();

// Restore process.exit after all tests
afterAll(() => {
  process.exit = originalExit;
});

// Global test utilities
global.testUtils = {
  // Helper to create mock coordinates
  createMockCoordinates: (lat, lng) => ({
    geometry: {
      coordinates: [lat, lng]
    }
  }),
  
  // Helper to create mock route step
  createMockStep: (lat, lng) => ({
    start_location: { latitude: lat, longitude: lng },
    end_location: { latitude: lat + 0.0001, longitude: lng + 0.0001 }
  }),
  
  // Helper to create mock route data
  createMockRouteData: (distance = 5000, duration = 1800, steps = []) => ({
    routes: [{
      distance,
      duration,
      geometry: 'mock-encoded-polyline',
      legs: [{ steps }]
    }]
  }),
  
  // Helper to create mock geocode response
  createMockGeocodeResponse: (address = '123 Test Street, Los Angeles, CA') => ({
    data: {
      items: [{
        address: {
          label: address
        }
      }]
    }
  })
}; 
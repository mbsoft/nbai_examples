/**
 * Test helper utilities for directions module tests
 */

// Mock data factories
const createMockPolygonData = (coordinates = [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]) => ({
  features: [{
    geometry: {
      coordinates: [coordinates]
    }
  }]
})

const createMockCoordinates = (lat, lng) => ({
  geometry: {
    // GeoJSON format: [longitude, latitude]
    coordinates: [lng, lat]
  }
})

const createMockStep = (lat, lng) => ({
  start_location: { latitude: lat, longitude: lng },
  end_location: { latitude: lat + 0.0001, longitude: lng + 0.0001 }
})

const createMockRouteData = (distance = 5000, duration = 1800, steps = []) => ({
  routes: [{
    distance,
    duration,
    geometry: 'mock-encoded-polyline',
    legs: [{ steps }]
  }]
})

const createMockGeocodeResponse = (address = '123 Test Street, Los Angeles, CA') => ({
  data: {
    items: [{
      address: {
        label: address
      }
    }]
  }
})

// Test environment setup helpers
const setupTestEnvironment = () => {
  // Mock environment variables
  process.env.API_HOST = 'https://api.test.com'
  process.env.API_KEY = 'test-api-key'
  process.env.AREA_OF_INTEREST = 'la'
}

const teardownTestEnvironment = () => {
  // Clean up environment variables if needed
  delete process.env.API_HOST
  delete process.env.API_KEY
  delete process.env.AREA_OF_INTEREST
}

// Mock setup helpers
const setupMocks = () => {
  const randomPointsOnPolygon = require('random-points-on-polygon')
  const polyline = require('@mapbox/polyline')

  randomPointsOnPolygon.mockReturnValue([
    createMockCoordinates(34.0522, -118.2437)
  ])

  polyline.decode.mockReturnValue([
    [34.0522, -118.2437],
    [34.0523, -118.2438]
  ])
}

// Assertion helpers
const expectRouteData = (routeData, expectedDistance, expectedDuration) => {
  expect(routeData.routes).toHaveLength(1)
  expect(routeData.routes[0].distance).toBe(expectedDistance)
  expect(routeData.routes[0].duration).toBe(expectedDuration)
  expect(routeData.routes[0].legs).toHaveLength(1)
}

const expectGeocodeResult = (result, expectedIndex, expectedAddress) => {
  expect(result).toHaveProperty('index', expectedIndex)
  expect(result).toHaveProperty('address', expectedAddress)
}

// Test data constants
const TEST_COORDINATES = {
  LA: { lat: 34.0522, lng: -118.2437 },
  NYC: { lat: 40.7128, lng: -74.0060 },
  LONDON: { lat: 51.5074, lng: -0.1278 }
}

const TEST_AREAS = ['atlanta', 'bangalore', 'dallas', 'la', 'london', 'newyork', 'ohio', 'ontario', 'southyorkshire']

module.exports = {
  // Mock data factories
  createMockPolygonData,
  createMockCoordinates,
  createMockStep,
  createMockRouteData,
  createMockGeocodeResponse,
  
  // Environment helpers
  setupTestEnvironment,
  teardownTestEnvironment,
  
  // Mock helpers
  setupMocks,
  
  // Assertion helpers
  expectRouteData,
  expectGeocodeResult,
  
  // Test constants
  TEST_COORDINATES,
  TEST_AREAS
} 
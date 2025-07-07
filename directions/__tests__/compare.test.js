const axios = require('axios')
const path = require('path')

// Mock external dependencies
jest.mock('axios')
jest.mock('random-points-on-polygon')
jest.mock('@googlemaps/google-maps-services-js')
jest.mock('minimist')

// Mock process module
const mockExit = jest.fn()
jest.mock('process', () => ({
  ...jest.requireActual('process'),
  exit: mockExit
}))

// Mock environment variables
process.env.API_HOST = 'https://api.test.com'
process.env.API_KEY = 'test-api-key'
process.env.AREA_OF_INTEREST = 'la'
process.env.TOMTOM_URL = 'https://api.tomtom.com/routing/1/calculateRoute'
process.env.TOMTOM_KEY = 'test-tomtom-key'
process.env.MAPBOX_URL = 'https://api.mapbox.com/directions/v5/mapbox/driving'
process.env.MAPBOX_KEY = 'test-mapbox-key'
process.env.GOOGLE_API_KEY = 'test-google-key'

// Import the module after mocking
const compare = require('../compare')

// Mock data
const mockPolygonData = {
  features: [{
    geometry: {
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
    }
  }]
}

const mockRouteData = {
  distance: 5000, // 5km
  duration: 1800, // 30 minutes
  start_location: { latitude: 34.0522, longitude: -118.2437 },
  end_location: { latitude: 34.0523, longitude: -118.2438 }
}

const mockTomTomResponse = {
  data: {
    routes: [{
      summary: {
        lengthInMeters: 5000,
        travelTimeInSeconds: 1800
      }
    }]
  }
}

const mockMapboxResponse = {
  data: {
    routes: [{
      distance: 5000,
      duration: 1800
    }]
  }
}

const mockGoogleResponse = {
  data: {
    routes: [{
      legs: [{
        distance: { value: 5000 },
        duration: { value: 1800 },
        start_address: '123 Test St, Los Angeles, CA',
        end_address: '456 Test Ave, Los Angeles, CA'
      }]
    }]
  }
}

describe('Compare Module', () => {
  let consoleSpy
  let processExitSpy

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation()
    
    // Reset all mocks
    jest.clearAllMocks()
    
    // Setup default mocks
    const randomPointsOnPolygon = require('random-points-on-polygon')
    randomPointsOnPolygon.mockReturnValue([
      { geometry: { coordinates: [-118.2437, 34.0522] } }
    ])
    
    const minimist = require('minimist')
    minimist.mockReturnValue({})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    processExitSpy.mockRestore()
  })

  describe('parseArguments', () => {
    it('should return parsed arguments with default values', () => {
      const minimist = require('minimist')
      minimist.mockReturnValue({ aoi: 'la' })
      
      const result = compare.parseArguments(['--aoi', 'la'])
      
      expect(result).toHaveProperty('aoi', 'la')
      expect(result).toHaveProperty('format', 'json')
    })

    it('should handle CSV format argument', () => {
      const minimist = require('minimist')
      minimist.mockReturnValue({ format: 'csv' })
      
      const result = compare.parseArguments(['--format', 'csv'])
      
      expect(result.format).toBe('csv')
    })

    it('should exit with help message when --help is provided', () => {
      const minimist = require('minimist')
      minimist.mockReturnValue({ help: true })
      
      // Clear the mock before the test
      mockExit.mockClear()
      
      compare.parseArguments(['--help'])
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Usage: node directions/compare.js')
      )
      expect(mockExit).toHaveBeenCalledWith()
    })
  })

  describe('loadPolygonData', () => {
    it('should load polygon data successfully', () => {
      // Mock require to return test data
      jest.doMock('../../data/la_poly.json', () => mockPolygonData, { virtual: true })
      
      const result = compare.loadPolygonData('la')
      
      expect(result).toEqual(mockPolygonData)
    })

    it('should throw error when polygon data cannot be loaded', () => {
      // Mock require to throw error
      jest.doMock('../../data/invalid_poly.json', () => {
        throw new Error('File not found')
      }, { virtual: true })
      
      expect(() => {
        compare.loadPolygonData('invalid')
      }).toThrow('Failed to load polygon data for area: invalid. Error: File not found')
    })
  })

  describe('generateRandomPoints', () => {
    it('should generate random points using the library', () => {
      const randomPointsOnPolygon = require('random-points-on-polygon')
      const mockPoints = [
        { geometry: { coordinates: [-118.2437, 34.0522] } },
        { geometry: { coordinates: [-118.2438, 34.0523] } }
      ]
      randomPointsOnPolygon.mockReturnValue(mockPoints)
      
      const result = compare.generateRandomPoints(mockPolygonData, 2)
      
      expect(randomPointsOnPolygon).toHaveBeenCalledTimes(2)
      expect(result).toHaveProperty('points_origins')
      expect(result).toHaveProperty('points_destinations')
      expect(result.points_origins).toEqual(mockPoints)
      expect(result.points_destinations).toEqual(mockPoints)
    })
  })

  describe('formatCoordinates', () => {
    it('should format coordinates with specified precision', () => {
      const points = [
        { geometry: { coordinates: [-118.2437123, 34.0522345] } },
        { geometry: { coordinates: [-118.2438234, 34.0523456] } }
      ]
      
      const result = compare.formatCoordinates(points, 4)
      
      expect(result).toEqual([
        '34.0522,-118.2437',
        '34.0523,-118.2438'
      ])
    })

    it('should handle different precision values', () => {
      const points = [
        { geometry: { coordinates: [-118.2437123, 34.0522345] } }
      ]
      
      const result = compare.formatCoordinates(points, 6)
      
      expect(result).toEqual(['34.052234,-118.243712'])
    })
  })

  describe('fetchNBAIRoute', () => {
    it('should fetch NBAI route data successfully', async () => {
      axios.get.mockResolvedValue({ data: { routes: [mockRouteData] } })
      
      const result = await compare.fetchNBAIRoute('34.0522,-118.2437', '34.0523,-118.2438', 1234567890)
      
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/directions/json?key=test-api-key&steps=true&alternatives=false&origin=34.0522,-118.2437&destination=34.0523,-118.2438&mode=4w&departure_time=1234567890')
      )
      expect(result).toEqual(mockRouteData)
    })

    it('should throw error when API call fails', async () => {
      const errorMessage = 'Network error'
      axios.get.mockRejectedValue(new Error(errorMessage))
      
      await expect(
        compare.fetchNBAIRoute('34.0522,-118.2437', '34.0523,-118.2438', 1234567890)
      ).rejects.toThrow('Network error')
    })
  })

  describe('tomtomCompare', () => {
    it('should compare route using TomTom API successfully', async () => {
      axios.get.mockResolvedValue(mockTomTomResponse)
      
      const route = {
        start_location: { latitude: 34.0522, longitude: -118.2437 },
        end_location: { latitude: 34.0523, longitude: -118.2438 },
        compare: {}
      }
      
      const result = await compare.tomtomCompare(route)
      
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('api.tomtom.com/routing/1/calculateRoute/34.0522,-118.2437:34.0523,-118.2438/json?key=test-tomtom-key&travelMode=car&computeTravelTimeFor=all')
      )
      expect(result.compare.tomtom).toEqual({
        distance: '5000',
        duration: '30.0'
      })
    })

    it('should handle TomTom API errors', async () => {
      axios.get.mockRejectedValue(new Error('TomTom API error'))
      
      const route = {
        start_location: { latitude: 34.0522, longitude: -118.2437 },
        end_location: { latitude: 34.0523, longitude: -118.2438 },
        compare: {}
      }
      
      await expect(compare.tomtomCompare(route)).rejects.toThrow('TomTom API error')
    })
  })

  describe('mapboxCompare', () => {
    it('should compare route using Mapbox API successfully', async () => {
      axios.get.mockResolvedValue(mockMapboxResponse)
      
      const route = {
        start_location: { latitude: 34.0522, longitude: -118.2437 },
        end_location: { latitude: 34.0523, longitude: -118.2438 },
        compare: {}
      }
      
      const result = await compare.mapboxCompare(route)
      
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('api.mapbox.com/directions/v5/mapbox/driving/-118.2437,34.0522;-118.2438,34.0523?access_token=test-mapbox-key&geometries=geojson&alternatives=false')
      )
      expect(result.compare.mapbox).toEqual({
        distance: '5000',
        duration: '30.0'
      })
    })

    it('should handle Mapbox API errors', async () => {
      axios.get.mockRejectedValue(new Error('Mapbox API error'))
      
      const route = {
        start_location: { latitude: 34.0522, longitude: -118.2437 },
        end_location: { latitude: 34.0523, longitude: -118.2438 },
        compare: {}
      }
      
      await expect(compare.mapboxCompare(route)).rejects.toThrow('Mapbox API error')
    })
  })

  describe('googleCompare', () => {
    it('should compare route using Google Maps API successfully', async () => {
      const mockClient = {
        directions: jest.fn().mockResolvedValue(mockGoogleResponse)
      }
      const { Client } = require('@googlemaps/google-maps-services-js')
      Client.mockImplementation(() => mockClient)
      
      const route = {
        start_location: { latitude: 34.0522, longitude: -118.2437 },
        end_location: { latitude: 34.0523, longitude: -118.2438 },
        compare: {}
      }
      
      const result = await compare.googleCompare(route)
      
      expect(mockClient.directions).toHaveBeenCalledWith({
        params: {
          origin: '34.0522,-118.2437',
          destination: '34.0523,-118.2438',
          key: 'test-google-key'
        },
        timeout: 5000
      })
      expect(result.compare.google).toEqual({
        distance: '5000',
        duration: '30.0'
      })
      expect(result.compare.start_address).toBe('123 Test St, Los Angeles, CA')
      expect(result.compare.end_address).toBe('456 Test Ave, Los Angeles, CA')
    })

    it('should handle Google Maps API errors', async () => {
      const mockClient = {
        directions: jest.fn().mockRejectedValue(new Error('Google API error'))
      }
      const { Client } = require('@googlemaps/google-maps-services-js')
      Client.mockImplementation(() => mockClient)
      
      const route = {
        start_location: { latitude: 34.0522, longitude: -118.2437 },
        end_location: { latitude: 34.0523, longitude: -118.2438 },
        compare: {}
      }
      
      await expect(compare.googleCompare(route)).rejects.toThrow('Google API error')
    })
  })

  describe('generateResults', () => {
    it('should generate JSON results', () => {
      const routes = [{
        compare: {
          nbai: { distance: '5000', duration: '30.0' },
          google: { distance: '5100', duration: '31.0' },
          tomtom: { distance: '4900', duration: '29.0' },
          mapbox: { distance: '5050', duration: '30.5' },
          origin: '34.0522,-118.2437',
          destination: '34.0523,-118.2438'
        }
      }]
      
      const result = compare.generateResults(routes, 'json')
      
      expect(result).toContain('"results"')
      expect(result).toContain('"nbai"')
      expect(result).toContain('"google"')
    })

    it('should generate CSV results', () => {
      const routes = [{
        compare: {
          nbai: { distance: '5000', duration: '30.0' },
          google: { distance: '5100', duration: '31.0' },
          tomtom: { distance: '4900', duration: '29.0' },
          mapbox: { distance: '5050', duration: '30.5' },
          origin: '34.0522,-118.2437',
          destination: '34.0523,-118.2438'
        }
      }]
      
      const result = compare.generateResults(routes, 'csv')
      
      expect(result).toContain('5000,30.0,5100,31.0,4900,29.0,5050,30.5,34.0522,-118.2437,34.0523,-118.2438')
      expect(result).not.toContain('"results"')
    })
  })

  describe('runRoutes', () => {
    it('should run complete route comparison workflow', async () => {
      // Mock all dependencies
      const randomPointsOnPolygon = require('random-points-on-polygon')
      randomPointsOnPolygon.mockReturnValue([
        { geometry: { coordinates: [-118.2437, 34.0522] } }
      ])
      
      // Mock axios calls for each route (2 routes * 3 API calls each = 6 calls)
      axios.get
        .mockResolvedValueOnce({ data: { routes: [mockRouteData] } }) // fetchNBAIRoute for route 0
        .mockResolvedValueOnce({ data: { routes: [mockRouteData] } }) // fetchNBAIRoute for route 1
        .mockResolvedValueOnce(mockTomTomResponse) // tomtomCompare for route 0
        .mockResolvedValueOnce(mockMapboxResponse) // mapboxCompare for route 0
        .mockResolvedValueOnce(mockTomTomResponse) // tomtomCompare for route 1
        .mockResolvedValueOnce(mockMapboxResponse) // mapboxCompare for route 1
      
      const mockClient = {
        directions: jest.fn()
          .mockResolvedValueOnce(mockGoogleResponse) // googleCompare for route 0
          .mockResolvedValueOnce(mockGoogleResponse) // googleCompare for route 1
      }
      const { Client } = require('@googlemaps/google-maps-services-js')
      Client.mockImplementation(() => mockClient)
      
      // Mock require for polygon data
      jest.doMock('../../data/la_poly.json', () => mockPolygonData, { virtual: true })
      
      const routes = await compare.runRoutes({ aoi: 'la' })
      
      expect(routes).toHaveLength(2) // CONFIG.numberOfRoutes is 2
      expect(routes[0]).toHaveProperty('compare')
      expect(routes[0].compare).toHaveProperty('nbai')
      expect(routes[0].compare).toHaveProperty('tomtom')
      expect(routes[0].compare).toHaveProperty('mapbox')
      expect(routes[0].compare).toHaveProperty('google')
    })

    it('should throw error when area of interest is not specified', async () => {
      await expect(compare.runRoutes({})).rejects.toThrow(
        'Area of interest not specified. Use --aoi parameter or set AREA_OF_INTEREST in .env file'
      )
    })

    it('should handle API failures gracefully', async () => {
      const randomPointsOnPolygon = require('random-points-on-polygon')
      randomPointsOnPolygon.mockReturnValue([
        { geometry: { coordinates: [-118.2437, 34.0522] } }
      ])
      
      axios.get.mockRejectedValue(new Error('API error'))
      
      // Mock require for polygon data
      jest.doMock('../../data/la_poly.json', () => mockPolygonData, { virtual: true })
      
      const routes = await compare.runRoutes({ aoi: 'la' })
      
      expect(routes).toHaveLength(0)
    })
  })

  describe('main function', () => {
    it('should execute main workflow successfully', async () => {
      const randomPointsOnPolygon = require('random-points-on-polygon')
      randomPointsOnPolygon.mockReturnValue([
        { geometry: { coordinates: [-118.2437, 34.0522] } }
      ])
      
      axios.get
        .mockResolvedValueOnce({ data: { routes: [mockRouteData] } })
        .mockResolvedValue(mockTomTomResponse)
        .mockResolvedValue(mockMapboxResponse)
      
      const mockClient = {
        directions: jest.fn().mockResolvedValue(mockGoogleResponse)
      }
      const { Client } = require('@googlemaps/google-maps-services-js')
      Client.mockImplementation(() => mockClient)
      
      const minimist = require('minimist')
      minimist.mockReturnValue({ aoi: 'la' })
      
      // Mock require for polygon data
      jest.doMock('../../data/la_poly.json', () => mockPolygonData, { virtual: true })
      
      await compare.main()
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"results"'))
    })

    it('should handle errors in main function', async () => {
      const minimist = require('minimist')
      minimist.mockReturnValue({})
      
      // Mock loadPolygonData to throw an error to trigger the catch block
      const originalLoadPolygonData = compare.loadPolygonData
      compare.loadPolygonData = jest.fn().mockImplementation(() => {
        throw new Error('Test error')
      })
      
      // Clear the mock before the test
      mockExit.mockClear()
      
      await compare.main()
      
      // The main function should handle errors and call process.exit(1)
      expect(mockExit).toHaveBeenCalledWith(1)
      
      // Restore original function
      compare.loadPolygonData = originalLoadPolygonData
    })
  })

  describe('CONFIG', () => {
    it('should have correct configuration values', () => {
      expect(compare.CONFIG.numberOfRoutes).toBe(2)
      expect(compare.CONFIG.precision).toBe(10)
      expect(compare.CONFIG.supportedAreas).toContain('la')
      expect(compare.CONFIG.supportedAreas).toContain('london')
      expect(compare.CONFIG.supportedAreas).toContain('newyork')
    })
  })
}) 
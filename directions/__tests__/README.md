# Directions Module Tests

This directory contains comprehensive unit tests for the `directions.js` module.

## Test Structure

```
__tests__/
├── directions.test.js    # Main test suite for directions module
├── test-helpers.js       # Shared test utilities and mock data
└── README.md            # This file
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run only directions tests
```bash
npm run test:directions
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run tests in watch mode
```bash
npm run test:watch
```

## Test Coverage

The test suite covers:

### Core Functions
- ✅ `parseArguments()` - Command line argument parsing
- ✅ `loadPolygonData()` - Polygon data loading
- ✅ `generateRandomPoints()` - Random point generation
- ✅ `formatCoordinates()` - Coordinate formatting
- ✅ `fetchRouteData()` - API route data fetching
- ✅ `processRouteData()` - Route data processing
- ✅ `reverseGeocode()` - Reverse geocoding
- ✅ `displayManeuvers()` - Maneuver display
- ✅ `main()` - Main execution workflow

### Test Scenarios
- ✅ Happy path scenarios
- ✅ Error handling and edge cases
- ✅ API failure scenarios
- ✅ Invalid input handling
- ✅ Environment variable fallbacks
- ✅ Command line argument validation

### Mock Coverage
- ✅ External API calls (axios)
- ✅ File system operations (require)
- ✅ Console output
- ✅ Process exit calls
- ✅ Environment variables

## Test Utilities

### Mock Data Factories
- `createMockPolygonData()` - Creates mock polygon data
- `createMockCoordinates()` - Creates mock coordinate objects
- `createMockStep()` - Creates mock route steps
- `createMockRouteData()` - Creates mock route data
- `createMockGeocodeResponse()` - Creates mock geocoding responses

### Environment Helpers
- `setupTestEnvironment()` - Sets up test environment variables
- `teardownTestEnvironment()` - Cleans up test environment
- `setupMocks()` - Sets up common mocks

### Assertion Helpers
- `expectRouteData()` - Validates route data structure
- `expectGeocodeResult()` - Validates geocoding results

## Test Data

### Test Coordinates
```javascript
TEST_COORDINATES = {
  LA: { lat: 34.0522, lng: -118.2437 },
  NYC: { lat: 40.7128, lng: -74.0060 },
  LONDON: { lat: 51.5074, lng: -0.1278 }
}
```

### Supported Areas
```javascript
TEST_AREAS = [
  'atlanta', 'bangalore', 'dallas', 'la', 
  'london', 'newyork', 'ohio', 'ontario', 'southyorkshire'
]
```

## Writing New Tests

### Test Structure
```javascript
describe('Function Name', () => {
  beforeEach(() => {
    // Setup
  })

  afterEach(() => {
    // Cleanup
  })

  it('should do something specific', () => {
    // Test implementation
  })
})
```

### Using Test Helpers
```javascript
const { createMockRouteData, expectRouteData } = require('./test-helpers')

it('should process route data correctly', () => {
  const mockData = createMockRouteData(5000, 1800)
  const result = directions.processRouteData(mockData)
  expectRouteData(result, 5000, 1800)
})
```

### Mocking External Dependencies
```javascript
// Mock axios
axios.get.mockResolvedValue({ data: mockResponse })

// Mock require
jest.doMock('../../data/la_poly.json', () => mockData, { virtual: true })

// Mock console
const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Descriptive names**: Test names should clearly describe what is being tested
3. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification
4. **Mock external dependencies**: Don't make real API calls in unit tests
5. **Test edge cases**: Include tests for error conditions and boundary values
6. **Use test helpers**: Leverage shared utilities to reduce code duplication

## Debugging Tests

### Enable verbose output
```bash
npm test -- --verbose
```

### Run specific test
```bash
npm test -- --testNamePattern="should fetch route data successfully"
```

### Debug with Node inspector
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Continuous Integration

The tests are configured to run in CI environments with:
- Jest as the test runner
- Coverage reporting
- ESLint integration
- Node.js compatibility checks 
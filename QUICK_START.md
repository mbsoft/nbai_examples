# Quick Start Guide - Running Tests

## Option 1: Simple Test Runner (No Installation Required)

The simplest way to run tests is using the built-in test runner:

```bash
node directions/__tests__/run-tests.js
```

This will run all tests and show results immediately.

## Option 2: Full Jest Setup (Recommended for Development)

### Step 1: Install Dependencies
```bash
npm install
```

If that doesn't work, try installing Jest directly:
```bash
npm install jest --save-dev
```

### Step 2: Run Tests
```bash
npm test
```

### Step 3: Run with Coverage
```bash
npm run test:coverage
```

## Option 3: Manual Jest Installation

If you're having issues with npm, you can install Jest globally:

```bash
npm install -g jest
jest
```

## Troubleshooting

### "jest: command not found"
This means Jest isn't installed. Try:
```bash
npm install jest --save-dev
```

### "npm install" hangs
Try clearing npm cache:
```bash
npm cache clean --force
npm install
```

### Permission issues
On macOS/Linux, you might need:
```bash
sudo npm install
```

## Test Results

You should see output like this:

```
🧪 Running Directions Module Tests

✅ parseArguments should return parsed arguments
✅ loadPolygonData should load polygon data successfully
✅ loadPolygonData should throw error for invalid area
✅ generateRandomPoints should generate correct number of points
✅ formatCoordinates should format coordinates with specified precision
✅ processRouteData should process route data and return steps
✅ reverseGeocode should return geocoded address information
✅ displayManeuvers should display maneuver information correctly
✅ Integration: Complete workflow should work end-to-end

📊 Test Summary
Total Tests: 9
Passed: 9
Failed: 0
Success Rate: 100.0%

🎉 All tests passed!
```

## What's Tested

The test suite covers:
- ✅ Command line argument parsing
- ✅ Polygon data loading with error handling
- ✅ Random point generation
- ✅ Coordinate formatting
- ✅ API route data fetching
- ✅ Route data processing
- ✅ Reverse geocoding
- ✅ Maneuver display
- ✅ Complete workflow integration

## Next Steps

1. **Start with Option 1** to see tests working immediately
2. **Use Option 2** for full development workflow
3. **Read the full documentation** in `TESTING_SUMMARY.md`
4. **Extend tests** for other modules as needed 
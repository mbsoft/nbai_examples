#!/usr/bin/env node

'use strict';

// Query the NextBillion.ai Distance Matrix API
// Take the result and process through a VRP solver using OR Tools
var randomPointsOnPolygon = require('random-points-on-polygon');
var axios = require('axios');
var polyline = require('@mapbox/polyline');
var util = require('util');
var Solver = require('node_or_tools');
const dotenv = require('dotenv');

dotenv.config();

var turf = {
  feature: require('@turf/helpers').feature,
  point: require('@turf/helpers').point,
  featureCollection: require('@turf/helpers').featureCollection
};
var fs = require('fs');
var async = {
  eachOf: require('async').eachOf
};
var colors = require('colorbrewer').Dark2[8];

var poly = require(`../data/dallas_poly.json`);

// first location is depot
var numberDestinations = 15;
var precision = 4;

var points_destinations = randomPointsOnPolygon(numberDestinations, poly.features[0]);
var point_origin = randomPointsOnPolygon(1, poly.features[0]);
var dest_pts = '';
var orig_pts = '';
var destArray = [];
var origArray = [];
points_destinations.forEach(pt => {
  var destElement = [parseFloat(pt.geometry.coordinates[0]),parseFloat(pt.geometry.coordinates[1])];
  destArray.push(destElement);
  dest_pts += pt.geometry.coordinates[1].toFixed(precision) + ',' + pt.geometry.coordinates[0].toFixed(precision) + '|';
});
point_origin.forEach(pt => {
  var origElement = [parseFloat(pt.geometry.coordinates[0]),parseFloat(pt.geometry.coordinates[1])];
  origArray.push(origElement);
  orig_pts += pt.geometry.coordinates[1].toFixed(precision) + ',' + pt.geometry.coordinates[0].toFixed(precision) + '|';
});

dest_pts = dest_pts.slice(0, dest_pts.length - 1);
orig_pts = orig_pts.slice(0, orig_pts.length - 1);

var depotIndex = 0;
var numVehicles = 1;
var vehicleCapacity = numberDestinations;
var computeTimeLimit = 3000;
var profile = 'driving';

const apiKey = process.env.API_KEY;
const apiHost = process.env.API_HOST;
if (!apiKey) {
  console.error('Please set your Nextbillion API Token as an environment variable');
  process.exit(1);
}


function hasNoRouteFound(matrix) {
  matrix.some(function (inner) {
    return inner.some(function (v) {
      return v === null;
    });
  });
}

var bodyRequest = {
  "departure_time": Math.round(new Date().getTime() / 1000),
  "origins": dest_pts,
  "destinations": dest_pts,
  "mode": "4w"
};

  axios.post(`${apiHost}/distancematrix/json-concise?key=${apiKey}`, bodyRequest, { responseType: 'json' })
    .then((res) => {
      destArray.forEach(function(pt) {
      });
      var idx = 0;
      var dm = res.data;
      var resultArray = [];
      dm.rows.forEach(function(row) {
        var rowArray = [];
        row.forEach(function(element) {
          rowArray.push(element[0]);
        });
        resultArray.push(rowArray);
      });
      var costs = resultArray;
      var durations = resultArray;
      // 9am -- 5pm
      var dayStarts = 0;
      var dayEnds = 8 * 60 * 60;
      var timeWindows = new Array(resultArray.length);

      for (var at = 0; at < resultArray.length; ++at)
        timeWindows[at] = [dayStarts, dayEnds];

      // Dummy demands of one except at the depot
      var demands = new Array(resultArray.length);

      for (var from = 0; from < resultArray.length; ++from) {
        demands[from] = new Array(resultArray.length);

        for (var to = 0; to < resultArray.length; ++to) {
          demands[from][to] = (from === depotIndex) ? 0 : 1;
        }
      }
        // No route locks per vehicle, let solver decide freely
        var routeLocks = new Array(numVehicles);
        routeLocks.fill([]);

        var solverOpts = {
          numNodes: resultArray.length,
          costs: costs,
          durations: durations,
          timeWindows: timeWindows,
          demands: demands
        };

        var VRP = new Solver.VRP(solverOpts);

        var timeHorizon = dayEnds - dayStarts;

        var searchOpts = {
          computeTimeLimit: computeTimeLimit,
          numVehicles: numVehicles,
          depotNode: depotIndex,
          timeHorizon: timeHorizon,
          vehicleCapacity: vehicleCapacity,
          routeLocks: routeLocks,
          pickups: [],
          deliveries: []
        };

        VRP.Solve(searchOpts, function (err, result) {
          if (err) {
            console.error('Error: ' + err.message);
            process.exit(1);
          }

          var solutionFeatures = [];
          // add starting depot point to solution
          solutionFeatures.push(turf.point(destArray[0], {
            'marker-color': '#333',
            'marker-symbol': 'building'
          }));

          console.log(util.inspect(result, {showHidden: false, depth: null}));

          // color coded destination points
          result.routes.forEach(function (route, routeIndex) {
            route.forEach(function (stop, stopIndex) {
              solutionFeatures.push(turf.point(destArray[stop], {
                route: routeIndex + 1,
                stop: stopIndex + 1,
                'marker-color': colors[routeIndex % colors.length],
                'marker-symbol': stopIndex + 1
              }));
            });
          });

      // Now that we have the location orders per vehicle make route requests to extract their geometry
      async.eachOf(result.routes, function (route, index, callback) {

        // Unused vehicle
        if (route.length === 0)
          callback();
        
        var way_pts = '';
        var waypoints = route.map(function(idx) {
          return {'longitude': destArray[idx][0], 'latitude': destArray[idx][1]};
        });
        waypoints.forEach(function(geo) {
          way_pts += geo.latitude.toFixed(precision) + ',' + geo.longitude.toFixed(precision) + '|';
        })
        way_pts = way_pts.slice(0, way_pts.length - 1);
        const departureTime = Math.round(new Date().getTime() / 1000);
        axios.get(`${apiHost}/directions/json?key=${apiKey}&annotations=true&steps=true&alternatives=false&origin=${destArray[depotIndex][1]},${destArray[depotIndex][0]}&waypoints=${way_pts}&destination=${destArray[depotIndex][1]},${destArray[depotIndex][0]}&mode=4w&departure_time=${departureTime}`)
          .then((res) => {
            var rte_geo = polyline.decode(res.data.routes[0].geometry);
            var coords = [];
            rte_geo.forEach(pt => {
              coords.push([pt[1],pt[0]]);
            });
            var theFeature = {
              coordinates: coords,
              type: 'LineString'
            };
            solutionFeatures.push(turf.feature(theFeature, {
              route: index + 1,
              distance: res.data.routes[0].distance,
              duration: res.data.routes[0].duration,
              stroke: colors[index % colors.length],
              'stroke-width': 4
            }));

            callback();
          });

      }, function (err) {
        // write the solution.geojson file
        var solution = turf.featureCollection(solutionFeatures);
        fs.writeFileSync('solution.geojson', JSON.stringify(solution, null, 4));
      });
    });
  }).catch((err) => {
    console.log(err);
  })


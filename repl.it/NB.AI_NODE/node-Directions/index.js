var randomPointsOnPolygon = require('random-points-on-polygon');
const logo = require('./logo');
var axios = require('axios');
var polyline = require('@mapbox/polyline');

// Enter your assigned API_KEY and API_HOST here
// const apiHost = https://api.nextbillion.io
// const apiKey = '.....'
const apiKey = '550e8e2631b4a4232e113eceb1dda7cc';
const apiHost = 'https://api.nextbillion.io';

var poly = require(`./data/toronto_poly.json`);

const numberOfPoints = 1;
const precision = 4;

var maneuvers = [];

logo();
async function run() {

  // Generate random points within the defined polygon
  var points_origins = randomPointsOnPolygon(numberOfPoints, poly.features[0]);
  var points_destinations = randomPointsOnPolygon(numberOfPoints, poly.features[0]);

  var destArray = [];
  var originArray = [];
  var steps = [];

  points_destinations.forEach(function(geo) {
    destArray.push(geo.geometry.coordinates[1].toFixed(precision) + ',' + geo.geometry.coordinates[0].toFixed(precision));
  });
  points_origins.forEach(function(geo) {
    originArray.push(geo.geometry.coordinates[1].toFixed(precision) + ',' + geo.geometry.coordinates[0].toFixed(precision));
  })

  let departureTime = Math.round(new Date().getTime() / 1000);
  await axios.get(`${apiHost}/directions/json?key=${apiKey}&annotations=true&steps=true&alternatives=false&origin=${originArray[0]}&destination=${destArray[0]}&mode=4w&departure_time=${departureTime}`)
    .then((res) => {
      res.data.routes.forEach(function(route) {
        const route_points = polyline.decode(route.geometry);
        console.log(`Distance  = ${(route.distance / 1000.0).toFixed(2)}km`);
        console.log(`Duration  = ${route.duration}sec`);
        process.stdout.write('\n');
        steps = route.legs[0].steps;
      });

    }).catch((err) => {
      console.log(err);
    });

  for (var i = 0; i < steps.length; i++) {
    await reverseGeocode(i, [`${steps[i].start_location.latitude},${steps[i].start_location.longitude}`]);
  }
  for (var i = 0; i < steps.length; i++) {
    console.log(`${maneuvers[i].index}-${maneuvers[i].address} ${JSON.stringify(steps[i].start_location)}`)
  }
}

async function reverseGeocode(index, theLocation) {
  await axios.get(`${apiHost}/h/revgeocode?key=${apiKey}&at=${theLocation[0]}`)
    .then((res) => {
      maneuvers[index] = {
        'index': index,
        'address': res.data.items[0].address.label
      }
    }).catch((err) => {
      console.log(err);
    })
}

run().catch(err => console.log(err));


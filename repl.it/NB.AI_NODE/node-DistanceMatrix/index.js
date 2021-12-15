var randomPointsOnPolygon = require('random-points-on-polygon');
const logo = require('./logo');
const colorize = require('./utils');
var axios = require('axios');

// Enter your assigned API_KEY and API_HOST here
// const apiHost = https://api.nextbillion.io
// const apiKey = '.....'
const apiKey = process.env['API_KEY'];
const apiHost = process.env['API_HOST'];

var randomPointsOnPolygon = require('random-points-on-polygon');
var axios = require('axios');

var argv = require('minimist')(process.argv.slice(2));

// use commandline arg for area-of-interest if present otherwise use ENV file setting
if (!!argv.aoi) {
  var poly = require(`./data/${argv.aoi}_poly.json`);
} else {
  var poly = require(`./data/toronto_poly.json`);
}
if (!!argv.origins) {
  var numberOrigins = argv.origins;
} else {
  var numberOrigins = 6;
}
if (!!argv.destinations) {
  var numberDestinations = argv.destinations;
} else {
  var numberDestinations = 6;
}

var format = 'json';
var responseType = 'json';

const precision = 4;

async function run() {

  // Generate random points within the defined polygon
  var points_origins = randomPointsOnPolygon(numberOrigins, poly.features[0]);
  var points_destinations = randomPointsOnPolygon(numberDestinations, poly.features[0]);

  var destArray = [];
  var originArray = [];

  logo();
  console.log(colorize(91, `Distance Matrix Size = ${numberOrigins}x${numberDestinations}`));
  console.log(colorize(91, `Position precision = ${precision}`));
  var orig_pts = '', dest_pts = '';

  points_destinations.forEach(pt => {
    destArray.push(pt.geometry.coordinates[1].toFixed(precision) + ',' + pt.geometry.coordinates[0].toFixed(precision));
    dest_pts += pt.geometry.coordinates[1].toFixed(precision) + ',' + pt.geometry.coordinates[0].toFixed(precision) + '|';
  });
  points_origins.forEach(pt => {
    originArray.push(pt.geometry.coordinates[1].toFixed(precision) + ',' + pt.geometry.coordinates[0].toFixed(precision));
    orig_pts += pt.geometry.coordinates[1].toFixed(precision) + ',' + pt.geometry.coordinates[0].toFixed(precision) + '|';
  });

  // remove trailing pipe from coordinate strings
  orig_pts = orig_pts.slice(0, orig_pts.length - 1);
  dest_pts = dest_pts.slice(0, dest_pts.length - 1);
  let departureTime = Math.round(new Date().getTime() / 1000);

  var root;
  var matrix;

  var bodyRequest = {
    "departure_time": Math.round(new Date().getTime() / 1000),
    "origins": orig_pts,
    "destinations": dest_pts,
    "mode": "4w"
  };

  // JSON will use POST endpoint (concise)
  axios.post(`${apiHost}/distancematrix/${format}-concise?key=${apiKey}`, bodyRequest, { responseType: responseType })
    .then((res) => {
      console.log(colorize(91, 'Response size = ' + res.headers["content-length"] + ' bytes'));
      process.stdout.write(colorize(91, ' '.toString().padStart(19, ' ')));
      destArray.forEach(function(pt) {
        process.stdout.write('|' + colorize(91, pt.padStart(19, ' ')));
      });
      process.stdout.write('|' + '\n');
      var idx = 0;
      var dm = res.data;
      dm.rows.forEach(function(row) {
        process.stdout.write(colorize(93, originArray[idx++].padStart(19, ' ') + '|'));
        row.forEach(function(element) {
          process.stdout.write(colorize(92, element[0].toString().padStart(precision + 15, ' ')));
          process.stdout.write('|');
        });
        process.stdout.write('\n');
      });
    }).catch((err) => {
      console.log(err);
    })
}

run().catch(err => console.log(err));

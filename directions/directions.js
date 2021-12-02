var randomPointsOnPolygon = require('random-points-on-polygon');
const logo = require('../common/logo');
const colorize = require('../common/utils');
var axios = require('axios');
var polyline = require('@mapbox/polyline');
const dotenv = require('dotenv');

dotenv.config();

var randomPointsOnPolygon = require('random-points-on-polygon');

var argv = require('minimist')(process.argv.slice(2));
if (!!argv.help) {
    console.log('Usage: node directions/directions.json --aoi atlanta|bangalore|dallas|la|london|newyork|ohio|ontario|southyorkshire');
    process.exit();
}
// use commandline arg for area-of-interest if present otherwise use ENV file setting
if (!!argv.aoi) {
    var poly = require(`../data/${argv.aoi}_poly.json`);
} else {
    var poly = require(`../data/${process.env.AREA_OF_INTEREST}_poly.json`);
}

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


    for (var j = 0; j < numberOfPoints; j++) {
        destArray.push(points_destinations[j].geometry.coordinates[1].toFixed(precision) + ',' + points_destinations[j].geometry.coordinates[0].toFixed(precision));
        originArray.push(points_origins[j].geometry.coordinates[1].toFixed(precision) + ',' + points_origins[j].geometry.coordinates[0].toFixed(precision));
    }

    let departureTime = Math.round(new Date().getTime()/1000);
    await axios.get(`${process.env.API_HOST}/directions/json?key=${process.env.API_KEY}&annotations=true&steps=true&alternatives=false&origin=${originArray[0]}&destination=${destArray[0]}&mode=4w&departure_time=${departureTime}`)
    .then((res) => {
        var idx = 0;
        res.data.routes.forEach(function(route) {
            const route_points = polyline.decode(route.geometry);
            console.log(`Distance  = ${(route.distance/1000.0).toFixed(2)}km`);
            console.log(`Duration  = ${route.duration}sec`);
            process.stdout.write('\n');
            steps = route.legs[0].steps;

        });

    }).catch((err) => {
        console.log(err);
    });
    var step = 1;
    for (var i=0; i< steps.length; i++) {
        await reverseGeocode(i, [`${steps[i].start_location.latitude},${steps[i].start_location.longitude}`]);
    }
    for (var i=0;i< steps.length; i++) {
        console.log(`${maneuvers[i].index}-${maneuvers[i].address} ${JSON.stringify(steps[i].start_location)}`)
    }

}

async function reverseGeocode(index, theLocation) {
    await axios.get(`https://api.nextbillion.io/h/revgeocode?key=${process.env.GEOCODE_API_KEY}&at=${theLocation[0]}`)
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


var randomPointsOnPolygon = require('random-points-on-polygon');
var axios = require('axios');
var polyline = require('@mapbox/polyline');
const dotenv = require('dotenv');
const {Client} = require("@googlemaps/google-maps-services-js");

dotenv.config();

var randomPointsOnPolygon = require('random-points-on-polygon');
const { exit } = require('process');
const { arg } = require('mathjs');

var argv = require('minimist')(process.argv.slice(2));

if (!!argv.help) {
    console.log('Usage: node directions/compare.json --aoi atlanta|paris --format json|csv');
    exit();
}
// use commandline arg for area-of-interest if present otherwise use ENV file setting
if (!!argv.aoi) {
    var poly = require(`../data/${argv.aoi}_poly.json`);
} else {
    var poly = require(`../data/${process.env.AREA_OF_INTEREST}_poly.json`);
}

var format = 'json';
// use commandline arg to output CSV otherwsie default to JSON
if (!!argv.format) {
    if (argv.format == 'csv')
        format = argv.format;
        
} 

const numberOfRoutes = 2;
const precision = 10;

var routes = [];
const client = new Client({});

// Generate random points within the defined polygons
var randomFeature = Math.floor(Math.random() * (poly.features.length - 0) + 0);
var points_origins = randomPointsOnPolygon(numberOfRoutes, poly.features[randomFeature]);
randomFeature = Math.floor(Math.random() * (poly.features.length - 0) + 0);
var points_destinations = randomPointsOnPolygon(numberOfRoutes, poly.features[randomFeature]);

var destArray = [];
var originArray = [];

var idx = 0;

points_destinations.forEach(pt => {
    destArray.push(pt.geometry.coordinates[1].toFixed(precision) + ',' + pt.geometry.coordinates[0].toFixed(precision));
});
points_origins.forEach(pt => {
    originArray.push(pt.geometry.coordinates[1].toFixed(precision) + ',' + pt.geometry.coordinates[0].toFixed(precision));
});

async function runRoutes() {

    let departureTime = Math.round(new Date().getTime()/1000);
    for (var j = 0; j < numberOfRoutes; j++) {
        await axios.get(`${process.env.API_HOST}/directions/json?key=${process.env.API_KEY}&steps=true&alternatives=false&origin=${originArray[j]}&destination=${destArray[j]}&mode=4w&departure_time=${departureTime}`)
        .then((res) => {
            routes[idx] = res.data.routes[0];
            routes[idx].compare = {};
            routes[idx].compare.origin = originArray[j];
            routes[idx].compare.destination = destArray[j];
            routes[idx++].compare.nbai = {
                distance: res.data.routes[0].distance.toFixed(0),
                duration: (res.data.routes[0].duration/60).toFixed(1)
            }

        }).catch((err) => {
            console.log(err.response.data);
        });
    }

    for (var j = 0; j < routes.length; j++) {
        //var nbaiPromise = nbaiDistanceMatrix(routes[j]);
        //await nbaiPromise.then(function(result) {

        //}, function(err) {
        //    console.log(err);
        //});

        var ttPromise = tomtomCompare(routes[j]);
        await ttPromise.then(function(result) {
           
        }, function(err) {
            console.log(err);
        });
        
        var mbPromise = mapboxCompare(routes[j]);
        await mbPromise.then(function(result) {
            
        }, function(err) {
            console.log(err);
        });

        var gPromise = googleCompare(routes[j]);
        await gPromise.then(function(result) {

        }, function(err) {
            console.log(err);
        });


       
    }
    //Summarize results
    var out = [];
    var csv = [];
    routes.forEach(route => {
        out.push(route.compare);
        var row = route.compare.nbai.distance + "," + route.compare.nbai.duration + "," +
                  route.compare.google.distance + "," + route.compare.google.duration + "," +
                  route.compare.tomtom.distance + "," + route.compare.tomtom.duration + "," +
                  route.compare.mapbox.distance + "," + route.compare.mapbox.duration + "," +
                  route.compare.origin + "," + route.compare.destination;
        csv.push(row)
    });

    // results in valid JSON or CSV
    if (format == 'csv')
        console.log(csv);
    else
        console.log('{"results": ',JSON.stringify(out, null, 1), '}');

}

function nbaiDistanceMatrix(route) {
    let departureTime = Math.round(new Date().getTime()/1000);
    return new Promise(function(resolve, reject) {
        axios.get(`${process.env.API_HOST}/distancematrix/json?key=${process.env.API_KEY}&steps=true&alternatives=false&origins=${route.start_location.latitude},${route.start_location.longitude}&destinations=${route.end_location.latitude},${route.end_location.longitude}&mode=4w&departure_time=${departureTime}`)
        .then((res) => {
            route.compare.nbai_distance_matrix = {
                distance: res.data.rows[0].elements[0].distance.value,
                duration: (res.data.rows[0].elements[0].duration.value/60).toFixed(1)
            }
            resolve(route);

        }).catch((err) => {
            console.log(err.response.data);
            reject(err);
        });
    })
}

function tomtomCompare(route) {
    let departureTime = Math.round(new Date().getTime()/1000);
    return new Promise(function(resolve, reject) {
        axios.get(`${process.env.TOMTOM_URL}/${route.start_location.latitude},${route.start_location.longitude}:${route.end_location.latitude},${route.end_location.longitude}/json?key=${process.env.TOMTOM_KEY}&travelMode=car&computeTravelTimeFor=all`)
        .then((res) => {
            route.compare.tomtom = {
                distance: res.data.routes[0].summary.lengthInMeters.toFixed(0),
                duration: (res.data.routes[0].summary.travelTimeInSeconds/60).toFixed(1)
            }
            resolve(route);
        }).catch((err) => {
            console.log(err);
            reject(err);
        });
    })

}

function mapboxCompare(route) {
    return new Promise(function(resolve, reject) {
        axios.get(`${process.env.MAPBOX_URL}/${route.start_location.longitude},${route.start_location.latitude};${route.end_location.longitude},${route.end_location.latitude}?access_token=${process.env.MAPBOX_KEY}&geometries=geojson&alternatives=false`)
        .then((res) => {
            route.compare.mapbox = {
                distance: res.data.routes[0].distance.toFixed(0),
                duration: (res.data.routes[0].duration/60).toFixed(1)
            }
            resolve(route);
        }).catch((err) => {
            console.log(err);
            reject(err);
        });
    })

}

async function googleCompare(route) {
    return new Promise(function(resolve, reject) {
        client.directions({
            params: {
                origin: `${route.start_location.latitude},${route.start_location.longitude}`,
                destination: `${route.end_location.latitude},${route.end_location.longitude}`,
                key: process.env.GOOGLE_API_KEY
            },
            timeout: 5000, // milliseconds
          })
          .then((r) => {
              const rte = r.data.routes[0];
              route.compare.google = {
                  distance: r.data.routes[0].legs[0].distance.value.toFixed(0),
                  duration: (r.data.routes[0].legs[0].duration.value/60).toFixed(1)
              }
              route.compare.start_address = rte.legs[0].start_address;
              route.compare.end_address = rte.legs[0].end_address;
              resolve(route);
          })
          .catch((e) => {
            console.log(e.response.data.error_message);
            reject(e);
          });
    })

}

runRoutes().catch(err => console.log(err));



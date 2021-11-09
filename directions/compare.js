var randomPointsOnPolygon = require('random-points-on-polygon');
const logo = require('../common/logo');
const colorize = require('../common/utils');
var axios = require('axios');
var polyline = require('@mapbox/polyline');
const dotenv = require('dotenv');
const {Client} = require("@googlemaps/google-maps-services-js");

dotenv.config();

var randomPointsOnPolygon = require('random-points-on-polygon');

var poly = require(`../data/${process.env.AREA_OF_INTEREST}_poly.json`);

const numberOfRoutes = 10;
const precision = 10;


var routes = [];
const client = new Client({});
logo();
async function run() {

    // Generate random points within the defined polygon
    var points_origins = randomPointsOnPolygon(numberOfRoutes, poly.features[0]);
    var points_destinations = randomPointsOnPolygon(numberOfRoutes, poly.features[0]);

    var destArray = [];
    var originArray = [];

    var idx = 0;

    for (var j = 0; j < numberOfRoutes; j++) {
        destArray.push(points_destinations[j].geometry.coordinates[1].toFixed(precision) + ',' + points_destinations[j].geometry.coordinates[0].toFixed(precision));
        originArray.push(points_origins[j].geometry.coordinates[1].toFixed(precision) + ',' + points_origins[j].geometry.coordinates[0].toFixed(precision));
    }

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
            console.log(err);
        });
    }

    for (var j = 0; j < routes.length; j++) {
        var ttPromise = tomtomCompare(routes[j]);
        await ttPromise.then(function(result) {
            //console.log(result);
        }, function(err) {
            console.log(err);
        });
        
        var mbPromise = mapboxCompare(routes[j]);
        await mbPromise.then(function(result) {
            //console.log(result);
        }, function(err) {
            console.log(err);
        });

        var gPromise = googleCompare(routes[j]);
        await gPromise.then(function(result) {
            //console.log(result);
        }, function(err) {
            console.log(err);
        });
       
    }
    //Summarize results
    var out = [];
    routes.forEach(route => {
        out.push(route.compare);
    });
    console.log(JSON.stringify(out, null, 1));

}

run().catch(err => console.log(err));

function tomtomCompare(route) {
    return new Promise(function(resolve, reject) {
        axios.get(`${process.env.TOMTOM_URL}/${route.start_location.latitude},${route.start_location.longitude}:${route.end_location.latitude},${route.end_location.longitude}/json?key=${process.env.TOMTOM_KEY}&travelMode=car`)
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
             // console.log(`${route.start_location.latitude.toString()},${route.start_location.longitude.toString()},${route.end_location.latitude.toString()},${route.end_location.longitude.toString()},${route.duration},${r.data.routes[0].legs[0].duration.value},${(route.duration-r.data.routes[0].legs[0].duration.value).toFixed(0)},${route.distance},${r.data.routes[0].legs[0].distance.value},${(route.distance -r.data.routes[0].legs[0].distance.value).toFixed(0)}`);
            //console.log(route.duration + ',' + r.data.routes[0].legs[0].duration.value + ',' + route.duration-r.data.routes[0].legs[0].duration.value);
          })
          .catch((e) => {
            console.log(e.response.data.error_message);
            reject(e);
          });
    })

}
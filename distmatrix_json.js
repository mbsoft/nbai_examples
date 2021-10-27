const protobuf = require('protobufjs');
var randomPointsOnPolygon = require('random-points-on-polygon');
var axios = require('axios');
var maths = require('mathjs');

var randomPointsOnPolygon = require('random-points-on-polygon');
var axios = require('axios');
var maths = require('mathjs');
const { forEach } = require('mathjs');

var ontario_poly = require('./ontario_poly.json');

const numberOfPoints = 10;
const precision = 4;
const nbai_url = 'http://localhost:9999';
const api_key = '9e6ebf31a1e74a4b9e20fd18267af852';
var color, i;

async function run() {

    // Generate random points within the defined polygon
    var points_origins = randomPointsOnPolygon(numberOfPoints, ontario_poly.features[0]);
    var points_destinations = randomPointsOnPolygon(numberOfPoints, ontario_poly.features[0]);

    var destArray = [];
    var originArray = [];

    logo();
    
    console.log(colorize(91,`Distance Matrix Size = ${numberOfPoints}`));
    console.log(colorize(91,`Position precision = ${precision}`));
    var orig_pts = '', dest_pts = '';

    for (var j = 0; j < numberOfPoints; j++) {
        destArray.push(points_destinations[j].geometry.coordinates[1].toFixed(precision) + ',' + points_destinations[j].geometry.coordinates[0].toFixed(precision));
        originArray.push(points_origins[j].geometry.coordinates[1].toFixed(precision) + ',' + points_origins[j].geometry.coordinates[0].toFixed(precision));
    }
    const inputMatrix = maths.matrix([destArray, originArray]);
    inputMatrix.forEach(function (value, index){
        if (index[0] == 0) {
            orig_pts += value + '|';
        } else {
            dest_pts += value + '|';
        }
    });

    // remove trailing pipe from coordinate strings
    orig_pts = orig_pts.slice(0, orig_pts.length -1);
    dest_pts = dest_pts.slice(0, dest_pts.length -1);
    let departureTime = Math.round(new Date().getTime()/1000);

    const root = await protobuf.load('nbai_protos.proto');

    axios.get(`${nbai_url}/distancematrix/json?key=${api_key}&origins=${orig_pts}&destinations=${dest_pts}&mode=4w&departure_time=${departureTime}`)
    .then((res) => {
        console.log(colorize(91,'Response size = ' + res.headers["content-length"] + ' bytes'));
        process.stdout.write(colorize(91,' '.toString().padStart(precision + 12, ' ')));
        originArray.forEach(function(pt) {
            process.stdout.write('|' + colorize(91, pt));
        });
        process.stdout.write('|' + '\n');
        res.data.rows.forEach(function(row) {
            var idx = 0;
            process.stdout.write(colorize(93,destArray[idx++] + '|'));
            row.elements.forEach(function(element) {
                process.stdout.write(colorize(92,element.duration.value.toString().padStart(precision + 12,' ')));
                process.stdout.write('|');
            });
            process.stdout.write('\n');
        });

    }).catch((err) => {
        console.log(err);
    })

}

run().catch(err => console.log(err));

function colorize(color, output) {
    return ['\033[', color, 'm', output, '\033[0m'].join('');
}

function logo() {                       
    console.log(" _   _ ____    ___  ___ ".padStart(32));
    console.log("| \\\ | |  _ \\\  / _ \\\(   )".padStart(32));
    console.log("|  \\\| | |_\) \)| |_| || | ".padStart(32));
    console.log("|     |  _ ( |  _  || | ".padStart(32));
    console.log("| |\\\  | |_\) \)| | | || | ".padStart(32));
    console.log("|_| \\\_|____(_\)_| |_(___\)".padStart(32));

}
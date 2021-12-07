const protobuf = require('protobufjs');
const fb = require("flatbuffers");
var randomPointsOnPolygon = require('random-points-on-polygon');
const logo = require('../common/logo');
const colorize = require('../common/utils');
var axios = require('axios');
var maths = require('mathjs');
const dotenv = require('dotenv');

dotenv.config();

var randomPointsOnPolygon = require('random-points-on-polygon');
var axios = require('axios');
var maths = require('mathjs');

var argv = require('minimist')(process.argv.slice(2));
if (!!argv.help) {
    console.log('Usage: node distancematrix/distmatrix_json.json --format json|fb|pb --origins {int} --destinations {int} --aoi atlanta|bangalore|dallas|la|london|newyork|ohio|ontario|southyorkshire');
    process.exit();
}
// use commandline arg for area-of-interest if present otherwise use ENV file setting
if (!!argv.aoi) {
    var poly = require(`../data/${argv.aoi}_poly.json`);
} else {
    var poly = require(`../data/${process.env.AREA_OF_INTEREST}_poly.json`);
}

if (!!argv.origins) {
    var numberOrigins = argv.origins;
} else {
    var numberOrigins = 8;
}
if (!!argv.destinations) {
    var numberDestinations = argv.destinations;
} else {
    var numberDestinations = 8;
}
if (!!argv.format) {
    var format = argv.format;
    var responseType = (argv.format === 'json') ? 'json' : 'arraybuffer';
} else {
    var format = 'json';
    var responseType = 'json';
}

const precision = 4;

if (format === 'fb') {
    var nbai = require("../build/gen/nbai_fb/f-b-result");
}

async function run() {

    // Generate random points within the defined polygon
    var points_origins = randomPointsOnPolygon(numberOrigins, poly.features[0]);
    var points_destinations = randomPointsOnPolygon(numberDestinations, poly.features[0]);

    var destArray = [];
    var originArray = [];

    logo();

    console.log(colorize(91,`Distance Matrix Size = ${numberOrigins}x${numberDestinations}`));
    console.log(colorize(91,`Position precision = ${precision}`));
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
    orig_pts = orig_pts.slice(0, orig_pts.length -1);
    dest_pts = dest_pts.slice(0, dest_pts.length -1);
    let departureTime = Math.round(new Date().getTime()/1000);

    var root;
    var matrix;
    if (format === 'pb') {
        root = await protobuf.load('nbai_protos.proto');
        matrix = root.lookupType('matrix.MatrixOutputPB');
    }

    var bodyRequest = {
        "departure_time": Math.round(new Date().getTime()/1000),
        "origins": orig_pts,
        "destinations": dest_pts,
        "mode": "4w"
    };
    
    axios.post(`${process.env.API_HOST}/distancematrix/${format}?key=${process.env.API_KEY}`, bodyRequest, {responseType: responseType})
    .then((res) => {
        console.log(colorize(91,'Response size = ' + res.headers["content-length"] + ' bytes'));
        process.stdout.write(colorize(91,' '.toString().padStart(19, ' ')));
        destArray.forEach(function(pt) {
            process.stdout.write('|' + colorize(91, pt.padStart(19, ' ')));
        });
        process.stdout.write('|' + '\n');
        var idx = 0;
        var dm;
        if (format === 'pb') {
            dm = matrix.decode(res.data);
        } else if (format === 'fb') {
            let buf = new fb.ByteBuffer(res.data);
            let fbResponse = nbai.FBResult.getRootAsFBResult(buf);
            dm = fbResponse.distanceMatrix();
        } else {
            dm = res.data;
        }
        if (format === 'fb') {
            for (var i=0;i < dm.rowsLength(); i++) {
                let row = dm.rows(i);
    
                process.stdout.write(colorize(93,originArray[idx++].padStart(19, ' ') + '|'));
    
                for (var j=0;j < row.elementsLength(); j++) {
                    let element = row.elements(j);
                    process.stdout.write(colorize(92,element.duration().toString().padStart(19,' ')+'|'));
                    // distance is available in element.distance()
                }
                process.stdout.write('\n');
            }
        } else {
            dm.rows.forEach(function(row) {
                process.stdout.write(colorize(93,originArray[idx++].padStart(19, ' ')  + '|'));
                row.elements.forEach(function(element) {
                    process.stdout.write(colorize(92,element.duration.value.toString().padStart(precision + 15,' ')));
                    process.stdout.write('|');
                });
                process.stdout.write('\n');
            });
        }

    }).catch((err) => {
        console.log(err);
    })

}

run().catch(err => console.log(err));


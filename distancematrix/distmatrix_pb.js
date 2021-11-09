const protobuf = require('protobufjs');
var randomPointsOnPolygon = require('random-points-on-polygon');
var axios = require('axios');
var maths = require('mathjs');
const logo = require('../common/logo');
const colorize = require('../common/utils');
const dotenv = require('dotenv');
dotenv.config();

var poly = require(`../data/${process.env.AREA_OF_INTEREST}_poly.json`);

const numberOfPoints = 4;
const precision = 4;


async function run() {

    // Generate random points within the defined polygon
    var points_origins = randomPointsOnPolygon(numberOfPoints, poly.features[0]);
    var points_destinations = randomPointsOnPolygon(numberOfPoints, poly.features[0]);

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
    const matrix = root.lookupType('matrix.MatrixOutputPB');

    axios.get(`${process.env.API_HOST}/distancematrix/pb?key=${process.env.API_KEY}&origins=${orig_pts}&destinations=${dest_pts}&mode=4w&departure_time=${departureTime}`, 
        {responseType: 'arraybuffer'})
    .then((res) => {
        console.log(colorize(91,'Response size = ' + res.headers["content-length"] + ' bytes'));
        const dm = matrix.decode(res.data);
        process.stdout.write(colorize(91,' '.toString().padStart(19, ' ')));
        originArray.forEach(function(pt) {
            process.stdout.write('|' + colorize(91, pt.padStart(19, ' ')));
        });
        process.stdout.write('|' + '\n');
        var idx = 0;
        dm.rows.forEach(function(row) {
            process.stdout.write(colorize(93,destArray[idx++].padStart(19, ' ') + '|'));
            row.elements.forEach(function(element) {
                process.stdout.write(colorize(92,element.duration.value.toString().padStart(19,' ') + '|'));
                // distance is available in element.distance.value
            });
            process.stdout.write('\n');
        });

    }).catch((err) => {
        console.log(err);
    })

}

run().catch(err => console.log(err));


                        
                        
                        

                                                
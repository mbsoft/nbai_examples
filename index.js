
var fb = require("flatbuffers");
var randomPointsOnPolygon = require('random-points-on-polygon');
var axios = require('axios');
var maths = require('mathjs');
var nbai = require("./nbai/f-b-result");

var ontario_poly = require('./ontario_poly.json');

const numberOfPoints = 24;
const precision = 4;
const nbai_url = 'http://localhost:9999';
const api_key = '9e6ebf31a1e74a4b9e20fd18267af852';

// Generate random points within the defined polygon
var points_origins = randomPointsOnPolygon(numberOfPoints, ontario_poly.features[0]);
var points_destinations = randomPointsOnPolygon(numberOfPoints, ontario_poly.features[0]);

var destArray = [];
var originArray = [];

console.log(`Distance Matrix Size = ${numberOfPoints}`);
console.log(`Position precision = ${precision}`);
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

axios.get(`${nbai_url}/distancematrix/fb?key=${api_key}&origins=${orig_pts}&destinations=${dest_pts}&mode=4w&departure_time=${departureTime}`, {responseType: 'arraybuffer'})
    .then((res) => {
        let buf = new fb.ByteBuffer(res.data);
        let fbResponse = nbai.FBResult.getRootAsFBResult(buf);

        let dm = fbResponse.distanceMatrix();

        for (var i=0;i < dm.rowsLength(); i++) {
            let row = dm.rows(i);
            for (var j=0;j < row.elementsLength(); j++) {
                let element = row.elements(j);
                process.stdout.write(element.duration()+',');
                // distance is available in element.distance()
            }
            process.stdout.write('\n');
        }

    }).catch((err) => {
        console.log(err);
    })





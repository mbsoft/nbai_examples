
var fb = require("flatbuffers");
var randomPointsOnPolygon = require('random-points-on-polygon');
var axios = require('axios');
var maths = require('mathjs');
var nbai = require("./build/gen/nbai_fb/f-b-result");
const dotenv = require('dotenv');
dotenv.config();

var ontario_poly = require('./ontario_poly.json');

const numberOfPoints = 4;
const precision = 4;

function colorize(color, output) {
    return ['\033[', color, 'm', output, '\033[0m'].join('');
}

// Generate random points within the defined polygon
var points_origins = randomPointsOnPolygon(numberOfPoints, ontario_poly.features[0]);
var points_destinations = randomPointsOnPolygon(numberOfPoints, ontario_poly.features[0]);

var destArray = [];
var originArray = [];

logo();
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

axios.get(`${process.env.API_HOST}/distancematrix/fb?key=${process.env.API_KEY}&origins=${orig_pts}&destinations=${dest_pts}&mode=4w&departure_time=${departureTime}`, {responseType: 'arraybuffer'})
    .then((res) => {
        console.log('Response size = ' + res.headers["content-length"] + ' bytes');
        let buf = new fb.ByteBuffer(res.data);
        let fbResponse = nbai.FBResult.getRootAsFBResult(buf);

        let dm = fbResponse.distanceMatrix();
        process.stdout.write(colorize(91,' '.toString().padStart(precision + 12, ' ')));
        originArray.forEach(function(pt) {
            process.stdout.write('|' + colorize(91, pt));
        });
        var idx = 0;
        process.stdout.write('|' + '\n');
        for (var i=0;i < dm.rowsLength(); i++) {
            let row = dm.rows(i);
            process.stdout.write(colorize(93,destArray[idx++] + '|'));
            for (var j=0;j < row.elementsLength(); j++) {
                let element = row.elements(j);
                process.stdout.write(colorize(92,element.duration().toString().padStart(precision + 12,' ')+'|'));
                // distance is available in element.distance()
            }
            process.stdout.write('\n');
        }

    }).catch((err) => {
        console.log(err);
    })


    function logo() {                       
        console.log(" _   _ ____    ___  ___ ".padStart(32));
        console.log("| \\\ | |  _ \\\  / _ \\\(   )".padStart(32));
        console.log("|  \\\| | |_\) \)| |_| || | ".padStart(32));
        console.log("|     |  _ ( |  _  || | ".padStart(32));
        console.log("| |\\\  | |_\) \)| | | || | ".padStart(32));
        console.log("|_| \\\_|____(_\)_| |_(___\)".padStart(32));
    
    }


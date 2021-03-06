(async function() {
  nextbillion.setApiKey('e5976215f43e46498836115925731c9e')
  nextbillion.setApiHost('api.nextbillion.io')
  var map = new nextbillion.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: {
      lat: 1.3668533589523282,
      lng: 103.83325491115943
    },
    vectorTilesSourceUrl: 'https://api.nextbillion.io/tiles/v3/tiles.json',
    style: 'https://api.nextbillion.io/maps/streets/style.json?key=e5976215f43e46498836115925731c9e'
  })

  var originMarker = null;
  var destinationMarker = null;
  var routePolyline = null;
  var waypoints = [];

  document.getElementById('aoi').onchange = function() {
    var pos = {
      lat: 1.3668533589523282,
      lng: 103.83325491115943
    };
    switch (document.getElementById("aoi").value) {
      case "200":
        pos = {
          lat: 37.7720957081475,
          lng: -122.4258842418464
        };
        break;
      case "300":
        pos = {
          lat: 51.50903293724923,
          lng: -0.1246211806754123
        };
        break;
      case "400":
        pos = {
          lat: 19.07523134735482,
          lng: 72.87319299626407
        };
        break;
      default:
        break;
    }
    map.flyTo({
      center: pos,
      zoom: 13,
      speed: 9.0,
      curve: 0.8,
    });
  }

  map.on('click', (e) => {

    if (!originMarker) {
      originMarker = new nextbillion.maps.Marker({
        position: {
          lat: e.lngLat.lat,
          lng: e.lngLat.lng
        },
        map: map,
        title: 'O',
        icon: 'green'
      });
    } else if (!destinationMarker) {
      destinationMarker = new nextbillion.maps.Marker({
        position: {
          lat: e.lngLat.lat,
          lng: e.lngLat.lng
        },
        map: map,
        title: 'O',
        icon: 'red'
      });
    } else {
      // waypoint
      var waypointMarker = new nextbillion.maps.Marker({
        position: {
          lat: e.lngLat.lat,
          lng: e.lngLat.lng
        },
        map: map,
        title: 'O',
        icon: 'blue'
      });
      waypoints.push(waypointMarker);
    }

    // request route
    if (originMarker && destinationMarker) {
      routeMe();
    }

  });

  async function routeMe() {
    var wayPts = [];
    if (originMarker && destinationMarker) {
      if (routePolyline) {
        routePolyline.remove();
      }
      if (waypoints.length) {
        Array.prototype.forEach.call(waypoints, function(wp) {
          wayPts.push(wp.options.position);
        });
        var resp = await nextbillion.api.Directions({
          origin: originMarker.options.position,
          destination: destinationMarker.options.position,
          wayPoints: wayPts
        });
      } else {
        var resp = await nextbillion.api.Directions({
          origin: originMarker.options.position,
          destination: destinationMarker.options.position
        });
      }
      var tooltip = new nextbillion.maps.Tooltip({
        marker: destinationMarker,
        content: `${(resp.routes[0].distance/1000.0).toFixed(1)} km<br>${(resp.routes[0].duration/60.0).toFixed(1)} min`,
      });
      tooltip.open();
      const coords = decodePolyline(resp.routes[0].geometry, 5);
      const start = coords[0]
      const end = coords[coords.length - 1]

      routePolyline = new nextbillion.maps.Polyline({
        path: [coords.map((item) => ({
          lat: item[0],
          lng: item[1]
        }))],
        strokeColor: 'blue',
        strokeWeight: 5,
        map: map,
      })
    }
  }

  var directionShapes = null

  document.getElementById('remove-route').onclick = function() {
    if (!routePolyline) {
      return;
    }
    routePolyline.remove();

    originMarker.remove();
    destinationMarker.remove();

    originMarker = null;
    destinationMarker = null;

    Array.prototype.forEach.call(waypoints, function(wp) {
      wp.remove();
    });
    waypoints = [];
  }

  function decodePolyline(str, precision) {
    let index = 0,
      lat = 0,
      lng = 0,
      coordinates = [],
      shift = 0,
      result = 0,
      byte = null,
      latitude_change,
      longitude_change,
      factor = Math.pow(10, Number.isInteger(precision) ? precision : 5)

    // Coordinates have variable length when encoded, so just keep
    // track of whether we've hit the end of the string. In each
    // loop iteration, a single coordinate is decoded.
    while (index < str.length) {
      // Reset shift, result, and byte
      byte = null
      shift = 0
      result = 0

      do {
        byte = str.charCodeAt(index++) - 63
        result |= (byte & 0x1f) << shift
        shift += 5
      } while (byte >= 0x20)

      latitude_change = result & 1 ? ~(result >> 1) : result >> 1

      shift = result = 0

      do {
        byte = str.charCodeAt(index++) - 63
        result |= (byte & 0x1f) << shift
        shift += 5
      } while (byte >= 0x20)

      longitude_change = result & 1 ? ~(result >> 1) : result >> 1

      lat += latitude_change
      lng += longitude_change

      coordinates.push([lat / factor, lng / factor])
    }

    return coordinates
  }

})()

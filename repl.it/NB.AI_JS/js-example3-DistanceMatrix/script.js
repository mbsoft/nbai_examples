(async function () {

  nextbillion.setApiKey('e5976215f43e46498836115925731c9e')
  nextbillion.setApiHost('api.nextbillion.io')

  var originArray = [];
  var destArray = [];
  var origMarkers = [];
  var destMarkers = [];

  var map = new nextbillion.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: {
      lat: 1.3668533589523282,
      lng: 103.83325491115943
    },
    vectorTilesSourceUrl: 'https://api.nextbillion.io/tiles/v3/tiles.json',
    style: 'https://api.nextbillion.io/maps/streets/style.json?key=e5976215f43e46498836115925731c9e'
  });

  document.getElementById('aoi').onchange = function () {
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
    origMarkers.forEach( function (om) {
      om.remove();
    });
    origMarkers = [];

    destMarkers.forEach(function (dm) {
      dm.remove();
    });
    destMarkers = [];

    let gridContainer = document.getElementById("grid");
    gridContainer.style.gridTemplateColumns = `repeat(${destArray.length + 1}, auto)`;
    gridContainer.innerHTML = "";
    destArray = [];
    origArray = [];
    map.flyTo({
      center: pos,
      zoom: 13,
      speed: 9.0,
      curve: 0.8,
    });
  }

  document.getElementById('remove-grid').onclick = function () {
    origMarkers.forEach( function (om) {
      om.remove();
    });
    origMarkers = [];

    destMarkers.forEach(function (dm) {
      dm.remove();
    });

    destMarkers = [];
    let gridContainer = document.getElementById("grid");
    gridContainer.style.gridTemplateColumns = `repeat(${destArray.length + 1}, auto)`;
    gridContainer.innerHTML = "";
    destArray = [];
    origArray = [];
  }

  map.on('click', (e) => {

    var marker = new nextbillion.maps.Marker({
      position: {
        lat: e.lngLat.lat,
        lng: e.lngLat.lng
      },
      map: map,
      icon: document.getElementById("origDest").value === 'orig' ? 'green' : 'red',
    });

    if (document.getElementById("origDest").value === 'orig') {
      origMarkers.push(marker);
      var tooltip = new nextbillion.maps.Tooltip({
        marker: marker,
        content: `O${origMarkers.length}`,
      });
      tooltip.open();
    } else {
      destMarkers.push(marker);
      var tooltip = new nextbillion.maps.Tooltip({
        marker: marker,
        content: `D${destMarkers.length}`,
      });
      tooltip.open();
    }

    if (destMarkers.length > 0 && origMarkers.length > 0) {
      destArray = [];
      origArray = [];
      destMarkers.forEach(function (dm) {
        destArray.push(dm.options.position)
      });
      origMarkers.forEach(function (om) {
        origArray.push(om.options.position)
      });
      requestDistanceMatrix(origArray, destArray);
    }
  });

  async function requestDistanceMatrix(origArray, destArray) {
    var resp = await nextbillion.api.DistanceMatrix({
      origins: origArray,
      destinations: destArray,
      mode: '4w',
    });

    let gridContainer = document.getElementById("grid");
    gridContainer.style.gridTemplateColumns = `repeat(${destArray.length + 1}, auto)`;
    gridContainer.innerHTML = "";

    // layout header row
    let cell = document.createElement("div");
    cell.innerHTML = '';
    cell.className = "head";
    gridContainer.appendChild(cell);

    for (let k = 0; k < destArray.length; k++) {
      let cell = document.createElement("div");
      cell.innerHTML = 'D' + (k + 1);
      cell.className = "head";
      gridContainer.appendChild(cell);
    }

    // matrix row with leading 'O'rigin point
    for (let i = 0; i < origArray.length; i++) {
      for (j = 0; j < destArray.length; j++) {
        if (j == 0) {
          let cell = document.createElement("div");
          cell.innerHTML = 'O' + (i + 1);
          cell.className = "head";
          gridContainer.appendChild(cell);
        }
        let cell = document.createElement("div");
        cell.innerHTML = resp.rows[i].elements[j].duration.value + ' s' +
          '<br>' + resp.rows[i].elements[j].distance.value + ' m';
        cell.className = "cell";
        gridContainer.appendChild(cell);
      }
    }
  }

})()

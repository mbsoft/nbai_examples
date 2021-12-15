(function () {
  nextbillion.setApiKey('e5976215f43e46498836115925731c9e')
  var map = new nextbillion.maps.Map(document.getElementById('map'), {
    zoom: 10,
    center: {
      lat: 1.3668533589523282,
      lng: 103.83325491115943
    },
  });
  document.getElementById('aoi').onchange = function () {
    var pos = {
      lat: 1.3668533589523282,
      lng: 103.83325491115943
    };
    switch (document.getElementById("aoi").value) {
      case "300":
        pos = {
          lat: 48.86335088800882,
          lng: 2.350809976984117
        };
        break;
      case "200":
        pos = {
          lat: 37.7720957081475,
          lng: -122.4258842418464
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

})()

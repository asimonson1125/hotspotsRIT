let map = L.map("map", {
  zoomControl: false,
  attributionControl: false,
}).setView([43.084405, -77.675486], 16);
var CartoDB_DarkMatterNoLabels = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
  }
).addTo(map);

function onEachFeature(feature, layer) {
  // does this feature have a property named popupContent?
  if (feature.properties && feature.properties.name) {
    layer.bindPopup(
      `${feature.properties.name}<br />Current Occupation: ${feature.properties.count}`
    );
  }
}

const polyStyle = {
  color: "#ff7800",
  weight: 5,
  opacity: 0.65,
};

const geojsonMarkerOptions = {
  radius: 8,
  fillColor: "#ff7800",
  color: "#000",
  weight: 1,
  opacity: 1,
  fillOpacity: 0.8,
};

const pointStyle = {};

let pts;
async function init() {
  let counts = fetch(
    "https://maps.rit.edu/proxySearch/densityMapDetail.php?mdo=1"
  );
  let countIds = [];

  let locations = fetch(
    "https://maps.rit.edu/proxySearch/locations.search.php"
  );

  counts = await (await counts).json();
  counts.forEach((x) => countIds.push(x.mdo_id));
  locations = await (await locations).json();

  pts = [];
  locations.forEach((x) => {
    const countsIndex = countIds.indexOf(parseInt(x.properties.mdo_id));
    // if (countsIndex !== -1) {
    //   counts[countsIndex].coords = x.geometry.coordinates;
    //   try {
    //     if (typeof counts[countsIndex].coords[0] == "object") {
    //       let lat = lon = 0;
    //       counts[countsIndex].coords[0].forEach((pt) => {
    //         lat += pt[0]
    //         lon += pt[1]
    //       });
    //       lat /= counts[countsIndex].coords[0].length;
    //       lon /= counts[countsIndex].coords[0].length;
    //       counts[countsIndex].coords = [lat, lon];
    //     }
    //   } catch {}
    // }

    if (countsIndex !== -1) {
      x.properties.count = counts[countsIndex].count;
      pts.push(x);
    }
  });

  let ptsLayer = L.geoJSON(pts, {
    pointToLayer: function (feature, latlng) {
      return L.circleMarker(latlng, geojsonMarkerOptions);
    },
    style: function (feature) {
      switch (feature.geometry.type) {
        case "Polygon":
          return polyStyle;
        case "Point":
          return pointStyle;
      }
    },
    onEachFeature: onEachFeature,
  }).addTo(map);

  const features = ptsLayer.getLayers();
  for (let i = 0; i < features.length; i++) {
    pts[i].properties.reference = features[i];
  }
}

// let laid = L.geoJson(pts).addTo(map)
// laid.remove()

let bullets = L.layerGroup([]);
function shootVector(from, to, {speed= 500, color= "red"} = {}) {
  options = {
    color: color,
    animate: { keyframes: [
      {
        // from
        opacity: 0,
        color: "#fff",
      },
      {
        // to
        opacity: 1,
        color: "#000",
      },
    ], duration: speed },
  };
  const fromC = getCoordArray(from);
  const toC = getCoordArray(to);
  eggman = arcGen(fromC, toC, (options = options));

  // let coordinateArray = eggman.getLatLngs();
  // var myMovingMarker = L.Marker.movingMarker(eggman.trace([0,.1,.2,.3,.4,.5,.6,.7,.8,.9,1]), 500);
  // myMovingMarker.addTo(map);
  // myMovingMarker.start();

  options['color'] = "transparent";
  options.animate.delay = 300;
  arcGen(fromC, toC, options=options);
}

function getCoordArray(ref) {
  let coords;
  try {
    coords = ref.properties.reference.getLatLng();
  } catch {
    coords = ref.properties.reference.getBounds().getCenter();
  }
  return [coords.lat, coords.lng];
}

function arcGen(latlng1, latlng2, options = {}) {
  var latlngs = [];

  var offsetX = latlng2[1] - latlng1[1],
    offsetY = latlng2[0] - latlng1[0];

  var r = Math.sqrt(Math.pow(offsetX, 2) + Math.pow(offsetY, 2)),
    theta = Math.atan2(offsetY, offsetX);

  var thetaOffset = 3.14 / 10;

  var r2 = r / 2 / Math.cos(thetaOffset),
    theta2 = theta + thetaOffset;

  var midpointX = r2 * Math.cos(theta2) + latlng1[1],
    midpointY = r2 * Math.sin(theta2) + latlng1[0];

  var midpointLatLng = [midpointY, midpointX];

  latlngs.push(latlng1, midpointLatLng, latlng2);

  var pathDefaults = {
    color: "red",
    weight: 3,
    animate: 500,
    hasBalls: true
  };

  let pathOptions = Object.assign(pathDefaults, options);

  var curvedPath = L.curve(
    ["M", latlng1, "Q", midpointLatLng, latlng2],
    pathOptions
  ).addTo(map);

  return curvedPath;
}

init().then(() => {
  shootVector(pts[0], pts[1], {speed: 500});
});

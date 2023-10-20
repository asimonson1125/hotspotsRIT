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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex > 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

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

  pts = {};
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
      pts[x.properties.mdo_id] = x;
    }
  });

  let ptsLayer = L.geoJSON(Object.values(pts), {
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
    pts[Object.keys(pts)[i]].properties.reference = features[i];
  }
}

// let laid = L.geoJson(pts).addTo(map)
// laid.remove()

let bullets = L.layerGroup([]);
async function shootVector(
  from,
  to,
  { speed = 500, color = null, onlyAnimate = true, trail = true } = {}
) {
  options = {
    onlyAnimate: onlyAnimate,
    animate: {
      duration: speed,
    },
  };
  if (color) options.color = color;
  const fromC = getCoordArray(from);
  const toC = getCoordArray(to);
  arcGen(fromC, toC, (options = options));

  if (trail) {
    options["color"] = "rgba(190, 95, 0, 0.2)";
    options.fade = true;
    options.fadeSpeed = 60000 * 5;
    arcGen(fromC, toC, (options = options));
  }
}

function getCoordArray(ref) {
  if (ref.properties == undefined) return ref;
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
    color: "#b35900",
    weight: 3,
    animate: 500,
    hasBalls: true,
  };

  let pathOptions = Object.assign(pathDefaults, options);

  var curvedPath = L.curve(
    ["M", latlng1, "Q", midpointLatLng, latlng2],
    pathOptions
  ).addTo(map);

  return curvedPath;
}

function calcDistances(nodes) {
  nodes.forEach((x) => {
    x.properties.distances = {};
    const coords1 = getCoordArray(x);
    nodes.forEach((y) => {
      const coords2 = getCoordArray(y);
      x.properties.distances[y.properties.mdo_id] = Math.sqrt(
        Math.pow(coords1[0] - coords2[0], 2) +
          Math.pow(coords1[1] - coords2[1], 2)
      );
    });
  });
}

const space = [43.09224, -77.674799];
async function getUpdate() {
  console.log("Updating Occupancy Matrix");
  let counts = await fetch(
    "https://maps.rit.edu/proxySearch/densityMapDetail.php?mdo=1"
  );
  counts = await counts.json();

  for (let i = 0; i < counts.length; i++) {
    const pt = pts[counts[i].mdo_id];
    if (pt == undefined) continue;
    pt.properties.diff = counts[i].count - pt.properties.count;
    pt.properties.count = counts[i].count;
  }

  let shots = getShots(Object.values(pts));
  shots = shuffle(shots);
  const timeBetween = (60000 * 5 + 1) / shots.length;

  // randomize time delay
  let timeDelay = [];
  shots.forEach(() => {
    timeDelay.push(Math.random());
  });
  const interval = 60000 * 5; // 5 minute delay
  for (let i = 0; i < timeDelay.length; i++) {
    timeDelay[i] = timeDelay[i] * interval;
  }

  console.log(
    `Shot total for next 5 minutes: ${shots.length} - ${
      timeBetween / 1000
    } second intervals`
  );
  for (let i = 0; i < shots.length; i++) {
    loadShot(shots[i], timeDelay[i], { trail: true });
  }
}

async function loadShot(shot, delay, { trail = false } = {}) {
  await sleep(delay);
  shootVector(shot[0], shot[1], { trail: trail });
}

function findOneShot(nodes, i) {
  const sign = nodes[i].properties.diff > 0;
  for (let x = 0; x < nodes.length; x++) {
    if (nodes[x].properties.diff > 0 !== sign) {
      return x;
    }
  }
}

function getShots(nodes) {
  let noChange = false;
  let shots = [];
  let sourcesAndSinks = nodes.filter((x) => {
    return x.properties.diff !== 0;
  });
  while (!noChange && sourcesAndSinks.length > 0) {
    sourcesAndSinks.forEach((x) => {
      x.properties.changed = false;
    });
    noChange = true;
    for (let i = sourcesAndSinks.length - 1; i >= 0; i--) {
      try {
        if (sourcesAndSinks[i].properties.changed) continue; // this node is a prior recipient this iteration
      } catch {
        continue;
      }
      let recipient = findOneShot(sourcesAndSinks, i);
      if (recipient) {
        let shotArr;
        if (sourcesAndSinks[i].properties.diff > 0) {
          shotArr = [sourcesAndSinks[i], sourcesAndSinks[recipient]];
          sourcesAndSinks[i].properties.diff--;
          sourcesAndSinks[recipient].properties.diff++;
        } else {
          shotArr = [sourcesAndSinks[recipient], sourcesAndSinks[i]];
          sourcesAndSinks[i].properties.diff++;
          sourcesAndSinks[recipient].properties.diff--;
        }
        shots.push(shotArr);
        noChange = false;
        sourcesAndSinks[i].properties.changed = true;
        sourcesAndSinks[recipient].properties.changed = true;

        let tmpRef = sourcesAndSinks[recipient];
        if (sourcesAndSinks[i].properties.diff == 0) {
          sourcesAndSinks.splice(i, 1);
        }
        if (
          sourcesAndSinks[sourcesAndSinks.indexOf(tmpRef)].properties.diff == 0
        ) {
          sourcesAndSinks.splice(recipient, 1);
        }
      }
    }
  }

  // if no more people on campus, get them from space
  sourcesAndSinks.forEach((x) => {
    while (x.properties.diff > 0) {
      shots.push([x, space]);
      x.properties.diff--;
    }

    while (x.properties.diff < 0) {
      shots.push([space, x]);
      x.properties.diff++;
    }
  });

  return shots;
}

init().then(() => {
  // map.on("click", () => {
  //   shootVector(pts[2], pts[8]);
  // });
  // shootVector(pts[0], pts[1], {speed: 500});
  calcDistances(Object.values(pts));
  setInterval(getUpdate, 60000 * 5);
});

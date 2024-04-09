let map = L.map("map", {
  zoomControl: false,
  attributionControl: false,
}).setView([43.084679, -77.674702], 17);
// L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     maxZoom: 19,
//     attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
// }).addTo(map);

var CartoDB_DarkMatterNoLabels = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
  }
).addTo(map);

// var CartoDB_PositronNoLabels = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
// 	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
// 	subdomains: 'abcd',
// 	maxZoom: 20
// }).addTo(map); // good hacky filter: invert(100%) hue-rotate(180deg) brightness(100%) contrast(100%);

// var CartoDB_Positron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
// 	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
// 	subdomains: 'abcd',
// 	maxZoom: 20
// }).addTo(map);

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

function setMarker(attrs, ref) {
  // let red = parseInt("ff", 16);
  // let green = parseInt("78", 16);
  // let style = {"fillColor": `#${red.toString(16)}${green.toString(16)}00`};
  let ratio = attrs.properties.count / attrs.properties.capacity;
  let adjustedratio = ratio > 1 ? 1 : ratio;
  let red = 255 * adjustedratio;
  let style = { fillColor: `rgba(255, 0, 0, ${adjustedratio})` };
  ref.setStyle(style);
  ref.bindPopup(
    `${attrs.properties.name}<br />Current Occupation: ${
      attrs.properties.count
    }<br />${Math.round(ratio * 100)}% capacity`
  );
}

function onEachFeature(feature, layer) {
  // does this feature have a property named popupContent?
  if (!feature.properties || !feature.properties.name) {
    return;
  }
  setMarker(feature, layer);
}

const polyStyle = {
  color: "#ff7800",
  weight: 5,
  opacity: 0.65,
};

const geojsonMarkerOptions = {
  pane: "nodePane",
  radius: 8,
  fillColor: "#ff7800",
  color: "#ff7800",
  weight: 3,
  opacity: 1,
  fillOpacity: 1,
};

const pointStyle = {};

function ritCustomize(input) {
  badOnes = [166]; // Nathan's (166) is a duplicate of Ben and Jerry's
  for (let i = input.length - 1; i >= 0; i--) {
    if (badOnes.indexOf(input[i].mdo_id) >= 0) {
      input.splice(i, 1);
    }
  }
  return input;
}

// Unused: "Campus", "Gleason_Engineering_Student_Area"
const no_mdo_ids = {
  Library_A_Level: { type: "Point", coordinates: [-77.676355, 43.083974] },
  Library_1st_Floor: { type: "Point", coordinates: [-77.676355, 43.083874] },
  Library_2nd_Floor: { type: "Point", coordinates: [-77.676355, 43.083774] },
  Library_3rd_Floor: { type: "Point", coordinates: [-77.676355, 43.083674] },
  Library_4th_Floor: { type: "Point", coordinates: [-77.676355, 43.083574] },
  Ross_Hall: { type: "Point", coordinates: [-77.677937, 43.082379] },
  Gordon_Field_House: { type: "Point", coordinates: [-77.671725, 43.085149] },
  Golisano_Institute_for_Sustainability_Lobby: {
    type: "Point",
    coordinates: [-77.681365, 43.085376],
  },
};

function ritCustomizeCoords(input) {
  try {
    if (input.properties.name == "Beanz") {
      input.geometry.coordinates = [-77.66904, 43.083876];
    }
    return input;
  } catch {}
  try {
    if (no_mdo_ids[input.location] == undefined) return;
    let geojsonObj = {
      geometry: no_mdo_ids[input.location],
      properties: {
        mdo_id: input.location,
        name: input.location.replaceAll("_", " "),
      },
      type: "Feature",
    };
    return geojsonObj;
  } catch {}
}

let pts;
let nodePane = map.createPane("nodePane");
nodePane.style.zIndex = "600";
let nodeGroup;
const densityMapUrl = ""; // https://maps.rit.edu/proxySearch/densityMapDetail.php?mdo=1

async function init(legend = false) {
  let counts = fetch(densityMapUrl + "/cached");

  let locations = fetch(
    "https://maps.rit.edu/proxySearch/locations.search.php"
  );

  counts = Object.values(await (await counts).json());
  counts = ritCustomize(counts);
  locations = await (await locations).json();

  pts = {};
  locations.forEach((x) => {
    for (let i = 0; i < counts.length; i++) {
      if (counts[i].mdo_id == x.properties.mdo_id) {
        x.properties.count = counts[i].count;
        x.properties.capacity =
          counts[i].max_occ == null ? 100 : counts[i].max_occ;
        x = ritCustomizeCoords(x);
        pts[x.properties.mdo_id] = x;
        break;
      }
    }
  });

  counts.forEach((x) => {
    if (pts[x.mdo_id] == undefined) {
      let geojson = ritCustomizeCoords(x);
      if (geojson !== undefined) {
        geojson.properties.count = x.count;
        geojson.properties.capacity = x.max_occ == null ? 100 : x.max_occ;
        pts[x.location] = geojson;
      }
    }
  });

  nodeGroup = L.geoJSON(Object.values(pts), {
    pane: "nodePane",
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
  });
  nodeGroup.addTo(map);
  nodeGroup.bringToFront();

  const features = nodeGroup.getLayers();
  for (let i = 0; i < features.length; i++) {
    const key = features[i].feature.properties.mdo_id;
    pts[key].properties.reference = features[i];
  }

  legend ? makeLegend() : null;
}

function makeLegend() {
  let legend = L.control({ position: "bottomright" });

  legend.onAdd = function (mapref) {
    let div = L.DomUtil.create("div", "info legend");
    div.innerHTML =
      "<div id='legendOccGrad'>Occupancy / Max Occupancy Gradient</div>";
    div.innerHTML += `<p>Markers represent locations where data is collected<br />
      Vectors represent the migration of aggregate occupation</br>
      vectors to/from nodeless points involve locations not tracked by RIT</p>`;

    return div;
  };

  let statControl = L.control({ position: "topright" });

  statControl.onAdd = function (mapref) {
    let div = L.DomUtil.create("div", "info legend");
    div.innerHTML =
      "<p>Occupancy is updated every 5 minutes<br /><br /><span id='shotCounter'></span><br />Next update in <span id='countdownClock'></span> seconds</p>";
    return div;
    //
  };

  statControl.addTo(map);
  legend.addTo(map);
}

function updateLegend(shotcount = undefined) {
  if (!useLegend) return;
  try {
    document.getElementById(
      "shotCounter"
    ).textContent = `Previous update created ${shotcount} migrations`;
  } catch {}
}

const space_coords = [43.09224, -77.674799];
const UC_coords = [43.080361, -77.683296];
const perkins_coords = [43.08616, -77.661796];
function setSpace(features) {
  features.forEach((x) => {
    const centroid = getCoordArray(x);
    if (centroid[1] > -77.673157) {
      x.properties.space = perkins_coords;
    } else if (centroid[1] < -77.677503 && centroid[0] < 43.08395) {
      x.properties.space = UC_coords;
    } else {
      x.properties.space = space_coords;
    }
  });
}

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
    updateTrailers(from, to);
  }
}

let trailers = [];
let lastTrailerUpdate = new Date().getTime();
async function updateTrailers(from = undefined, to = undefined) {
  let found = false;
  if (from !== undefined && to !== undefined) {
    // check if vector already exists and increase count
    trailers.forEach((x) => {
      if (x.from == from && x.to == to) {
        found = true;
        x.count += 1;
      }
    });
    if (!found) {
      let newtrail = arcGen(getCoordArray(from), getCoordArray(to), {
        color: "rgb(152,76, 0)",
      });
      trailers.push({ to: to, from: from, count: 1, ref: newtrail });
    }
  }

  // We don't want this calculation killing the processor, so it can only happen once every 5 seconds
  // unless there's a new vector to the party so its opacity gets set
  const now = new Date().getTime();
  if (found && now - lastTrailerUpdate < 5000) {
    return;
  } else {
    lastTrailerUpdate = now;
  }

  // weight brightness of vectors
  let sum = 0;
  const trailCount = trailers.length;
  let max = 10;
  trailers.forEach((x) => {
    sum += x.count;
    if (x.count > max) max = x.count;
  });
  trailers.forEach((x, i) => {
    let opacity = Math.sqrt(x.count / max);
    x.ref._path.style.opacity = opacity;
  });
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

let countdownTo = new Date().getTime() + 5 * 60 * 1000;
function updateCountdown() {
  const now = new Date().getTime();
  const countdown = countdownTo - now;
  if (countdown < 1000) {
    countdownTo = now + 5 * 60 * 1000;
    getUpdate();
  }
  try {
    document.getElementById("countdownClock").textContent = Math.floor(
      countdown / 1000
    );
  } catch {}
}

async function getUpdate() {
  console.log("Updating Occupancy Matrix");

  let counts = await fetch(densityMapUrl + "/current");
  counts = await counts.json();

  for (let i = 0; i < counts.length; i++) {
    const pt =
      counts[i].mdo_id == null
        ? pts[counts[i].location]
        : pts[counts[i].mdo_id];
    if (pt == undefined) continue;
    pt.properties.diff = counts[i].count - pt.properties.count;
    pt.properties.count = counts[i].count;
    setMarker(pt, pt.properties.reference);
  }

  let shots = getShots(Object.values(pts));
  shots = shuffle(shuffle(shots));
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
  updateLegend(shots.length);
  for (let i = 0; i < shots.length; i++) {
    loadShot(shots[i], timeDelay[i], { trail: true });
  }
}

async function loadShot(shot, delay, { trail = false } = {}) {
  await sleep(delay);
  shootVector(shot[0], shot[1], { trail: trail });
}

function findOneShot(nodes, target) {
  let sortedByDistance = nodes.sort((a, b) => {
    return (
      target.properties.distances[a.properties.mdo_id] -
      target.properties.distances[b.properties.mdo_id]
    );
  });
  const sign = target.properties.diff > 0;
  for (let x = 1; x < sortedByDistance.length; x++) {
    if (sortedByDistance[x].properties.diff > 0 !== sign) {
      return sortedByDistance[x];
    }
  }
}

function getShots(nodes) {
  let noChange = false;
  let shots = [];
  let sourcesAndSinks = nodes.filter((x) => {
    return x.properties.diff !== 0;
  });

  let i;
  while (!noChange && sourcesAndSinks.length > 0) {
    noChange = true;
    // sourcesAndSinks.forEach((x) => {
    //   x.properties.changed = false;
    // });
    // for (let i = sourcesAndSinks.length - 1; i >= 0; i--) {
    //   try {
    //     if (sourcesAndSinks[i].properties.changed) continue; // this node is a prior recipient this iteration
    //   } catch {
    //     continue;
    //   }
    let sorted = sourcesAndSinks.sort((a, b) => {
      Math.abs(a.properties.diff) - Math.abs(b.properties.diff);
    });
    i = sourcesAndSinks.indexOf(sorted[0]);
    let recipient = findOneShot(sourcesAndSinks, sourcesAndSinks[i]);
    if (recipient) {
      let shotArr;
      if (sourcesAndSinks[i].properties.diff > 0) {
        shotArr = [sourcesAndSinks[i], recipient];
        sourcesAndSinks[i].properties.diff--;
        recipient.properties.diff++;
      } else {
        shotArr = [recipient, sourcesAndSinks[i]];
        sourcesAndSinks[i].properties.diff++;
        recipient.properties.diff--;
      }
      shots.push(shotArr);
      noChange = false;
      sourcesAndSinks[i].properties.changed = true;
      recipient.properties.changed = true;

      let tmpRef = recipient;
      if (sourcesAndSinks[i].properties.diff == 0) {
        sourcesAndSinks.splice(i, 1);
      }
      if (
        sourcesAndSinks[sourcesAndSinks.indexOf(tmpRef)].properties.diff == 0
      ) {
        sourcesAndSinks.splice(recipient, 1);
      }
    }
    // }
  }

  // if no more people on campus, get them from space
  sourcesAndSinks.forEach((x) => {
    while (x.properties.diff > 0) {
      shots.push([x, x.properties.space]);
      x.properties.diff--;
    }

    while (x.properties.diff < 0) {
      shots.push([x.properties.space, x]);
      x.properties.diff++;
    }
  });

  return shots;
}

const useLegend = window.location.pathname.replaceAll("/", "") == "hotspots";
init(useLegend).then(() => {
  // map.on("click", () => {
  //   shootVector(pts[2], pts[8]);
  // });
  // shootVector(pts[0], pts[1], {speed: 500});
  let ptsarr = Object.values(pts);
  calcDistances(ptsarr);
  setSpace(ptsarr);
  getUpdate();
  setInterval(updateCountdown, 1000);
});

let map = L.map("map", { zoomControl: false }).setView([43.084405, -77.675486], 16);
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
    fillOpacity: 0.8
};

const pointStyle = {}

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

  L.geoJSON(pts, {
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
}

init();

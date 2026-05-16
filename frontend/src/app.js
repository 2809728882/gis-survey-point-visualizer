const STATUS_META = {
  pending: { label: "待放样", color: "#c4473c" },
  checking: { label: "复核中", color: "#b87922" },
  done: { label: "已完成", color: "#2f7d45" },
  risk: { label: "风险点", color: "#7d4ab8" },
};

const PROJECT_ORIGIN = {
  lon: 121.2302,
  lat: 31.0252,
};

const GCJ_LAYER_KEYS = new Set(["amap", "amapImagery"]);
const GCJ_A = 6378245.0;
const GCJ_EE = 0.006693421622965943;
const GEOCODER_ENDPOINT = "https://nominatim.openstreetmap.org/search";

const BOUNDARY_WGS84_COORDS = [
  [121.2301, 31.0260],
  [121.23145, 31.02582],
  [121.23128, 31.02495],
  [121.22998, 31.02508],
  [121.2301, 31.0260],
];

const DEFAULT_POINTS = [
  {
    id: "CP-001",
    name: "北侧控制点",
    lon: 121.23042,
    lat: 31.02586,
    x: 21.1,
    y: 73.1,
    elevation: 8.32,
    status: "done",
    note: "控制点保护完好",
  },
  {
    id: "CP-002",
    name: "东侧控制点",
    lon: 121.23132,
    lat: 31.02562,
    x: 106.7,
    y: 46.4,
    elevation: 8.18,
    status: "checking",
    note: "需复核棱镜高",
  },
  {
    id: "ST-101",
    name: "承台放样点 A",
    lon: 121.23078,
    lat: 31.02534,
    x: 55.4,
    y: 15.3,
    elevation: 7.92,
    status: "pending",
    note: "待班组确认",
  },
  {
    id: "ST-102",
    name: "承台放样点 B",
    lon: 121.23102,
    lat: 31.02516,
    x: 78.2,
    y: -4.7,
    elevation: 7.88,
    status: "pending",
    note: "靠近临边",
  },
  {
    id: "SAFE-01",
    name: "基坑边坡监测点",
    lon: 121.23028,
    lat: 31.02518,
    x: 7.6,
    y: -2.3,
    elevation: 8.04,
    status: "risk",
    note: "雨后重点复测",
  },
  {
    id: "ST-201",
    name: "道路中线点",
    lon: 121.23092,
    lat: 31.02574,
    x: 68.7,
    y: 59.7,
    elevation: 8.11,
    status: "done",
    note: "已移交施工员",
  },
];

const appState = {
  records: [],
  selectedFeature: null,
  drawInteraction: null,
  drawType: null,
  baseLayerName: "amap",
  addMode: false,
  rangeIndex: 0,
};

const els = {
  fileInput: document.querySelector("#file-input"),
  loadSample: document.querySelector("#load-sample"),
  exportJson: document.querySelector("#export-json"),
  exportCsv: document.querySelector("#export-csv"),
  addPointToggle: document.querySelector("#add-point-toggle"),
  drawCircle: document.querySelector("#draw-circle"),
  drawPolygon: document.querySelector("#draw-polygon"),
  clearRanges: document.querySelector("#clear-ranges"),
  clearPoints: document.querySelector("#clear-points"),
  baseLayer: document.querySelector("#base-layer"),
  statusFilter: document.querySelector("#status-filter"),
  searchInput: document.querySelector("#search-input"),
  placeSearchInput: document.querySelector("#place-search-input"),
  placeSearch: document.querySelector("#place-search"),
  locateMe: document.querySelector("#locate-me"),
  locationMessage: document.querySelector("#location-message"),
  selectedEmpty: document.querySelector("#selected-empty"),
  selectedDetail: document.querySelector("#selected-detail"),
  selectedName: document.querySelector("#selected-name"),
  selectedCoord: document.querySelector("#selected-coord"),
  selectedStatus: document.querySelector("#selected-status"),
  locateSelected: document.querySelector("#locate-selected"),
  popup: document.querySelector("#popup"),
  pointsTable: document.querySelector("#points-table"),
  visibleCount: document.querySelector("#visible-count"),
  rangeSummary: document.querySelector("#range-summary"),
  statTotal: document.querySelector("#stat-total"),
  statPending: document.querySelector("#stat-pending"),
  statChecking: document.querySelector("#stat-checking"),
  statDone: document.querySelector("#stat-done"),
};

const pointSource = new ol.source.Vector();
const rangeSource = new ol.source.Vector();
const boundarySource = new ol.source.Vector();
const locationSource = new ol.source.Vector();

function tileUrls(template, subdomains) {
  return subdomains.map((subdomain) => template.replace("{s}", subdomain));
}

function isGcjLayer(layerName = appState.baseLayerName) {
  return GCJ_LAYER_KEYS.has(layerName);
}

function isOutsideChina(lon, lat) {
  return lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformGcjLat(x, y) {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin((y / 3.0) * Math.PI)) * 2.0) / 3.0;
  ret += ((160.0 * Math.sin((y / 12.0) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30.0)) * 2.0) / 3.0;
  return ret;
}

function transformGcjLon(x, y) {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin((x / 3.0) * Math.PI)) * 2.0) / 3.0;
  ret += ((150.0 * Math.sin((x / 12.0) * Math.PI) + 300.0 * Math.sin((x / 30.0) * Math.PI)) * 2.0) / 3.0;
  return ret;
}

function wgs84ToGcj02(lon, lat) {
  if (isOutsideChina(lon, lat)) {
    return [lon, lat];
  }

  let dLat = transformGcjLat(lon - 105.0, lat - 35.0);
  let dLon = transformGcjLon(lon - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - GCJ_EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((GCJ_A * (1 - GCJ_EE)) / (magic * sqrtMagic)) * Math.PI);
  dLon = (dLon * 180.0) / ((GCJ_A / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return [lon + dLon, lat + dLat];
}

function gcj02ToWgs84(lon, lat) {
  if (isOutsideChina(lon, lat)) {
    return [lon, lat];
  }

  let wgsLon = lon;
  let wgsLat = lat;
  for (let index = 0; index < 2; index += 1) {
    const [gcjLon, gcjLat] = wgs84ToGcj02(wgsLon, wgsLat);
    wgsLon -= gcjLon - lon;
    wgsLat -= gcjLat - lat;
  }
  return [wgsLon, wgsLat];
}

function displayLonLatFromWgs(lon, lat, layerName = appState.baseLayerName) {
  return isGcjLayer(layerName) ? wgs84ToGcj02(lon, lat) : [lon, lat];
}

function wgsLonLatFromDisplay(lon, lat, layerName = appState.baseLayerName) {
  return isGcjLayer(layerName) ? gcj02ToWgs84(lon, lat) : [lon, lat];
}

function mapCoordinateFromWgs(lon, lat, layerName = appState.baseLayerName) {
  return ol.proj.fromLonLat(displayLonLatFromWgs(lon, lat, layerName));
}

function wgsLonLatFromMapCoordinate(coordinate, layerName = appState.baseLayerName) {
  const [lon, lat] = ol.proj.toLonLat(coordinate);
  return wgsLonLatFromDisplay(lon, lat, layerName);
}

function transformMapCoordinate(coordinate, fromLayerName, toLayerName) {
  const [lon, lat] = wgsLonLatFromMapCoordinate(coordinate, fromLayerName);
  return mapCoordinateFromWgs(lon, lat, toLayerName);
}

const baseLayers = {
  amap: new ol.layer.Tile({
    visible: true,
    source: new ol.source.XYZ({
      urls: tileUrls(
        "https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
        ["1", "2", "3", "4"]
      ),
      attributions: "© 高德地图",
      crossOrigin: "anonymous",
    }),
  }),
  amapImagery: new ol.layer.Tile({
    visible: false,
    source: new ol.source.XYZ({
      urls: tileUrls(
        "https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
        ["1", "2", "3", "4"]
      ),
      attributions: "© 高德地图",
      crossOrigin: "anonymous",
    }),
  }),
  osm: new ol.layer.Tile({
    visible: false,
    source: new ol.source.OSM(),
  }),
  imagery: new ol.layer.Tile({
    visible: false,
    source: new ol.source.XYZ({
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attributions: "Tiles © Esri",
      crossOrigin: "anonymous",
    }),
  }),
  terrain: new ol.layer.Tile({
    visible: false,
    source: new ol.source.XYZ({
      url: "https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attributions: "Map data © OpenStreetMap contributors, SRTM | Map style © OpenTopoMap",
      crossOrigin: "anonymous",
    }),
  }),
};

const boundaryLayer = new ol.layer.Vector({
  source: boundarySource,
  style: new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: "rgba(47, 125, 69, 0.95)",
      width: 3,
    }),
    fill: new ol.style.Fill({
      color: "rgba(47, 125, 69, 0.08)",
    }),
  }),
});

const rangeLayer = new ol.layer.Vector({
  source: rangeSource,
  style: new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: "rgba(53, 111, 183, 0.95)",
      width: 2,
      lineDash: [8, 6],
    }),
    fill: new ol.style.Fill({
      color: "rgba(53, 111, 183, 0.12)",
    }),
  }),
});

const locationLayer = new ol.layer.Vector({
  source: locationSource,
  style: (feature) => {
    const markerType = feature.get("markerType");
    const color = markerType === "current" ? "#356fb7" : "#2f7d45";
    return new ol.style.Style({
      image: new ol.style.Circle({
        radius: markerType === "current" ? 10 : 8,
        fill: new ol.style.Fill({ color }),
        stroke: new ol.style.Stroke({
          color: "#ffffff",
          width: 3,
        }),
      }),
      text: new ol.style.Text({
        text: feature.get("title") || "",
        offsetY: -23,
        font: "700 12px Microsoft YaHei, Arial",
        fill: new ol.style.Fill({ color: "#20251f" }),
        stroke: new ol.style.Stroke({ color: "#ffffff", width: 4 }),
      }),
    });
  },
});

const pointLayer = new ol.layer.Vector({
  source: pointSource,
  style: getPointStyle,
});

const map = new ol.Map({
  target: "map",
  layers: [
    baseLayers.amap,
    baseLayers.amapImagery,
    baseLayers.osm,
    baseLayers.imagery,
    baseLayers.terrain,
    boundaryLayer,
    rangeLayer,
    locationLayer,
    pointLayer,
  ],
  view: new ol.View({
    center: mapCoordinateFromWgs(121.23078, 31.02545),
    zoom: 17,
    minZoom: 4,
    maxZoom: 21,
  }),
});

const popupOverlay = new ol.Overlay({
  element: els.popup,
  positioning: "bottom-center",
  stopEvent: false,
  offset: [0, -8],
});
map.addOverlay(popupOverlay);

function createBoundary() {
  const feature = new ol.Feature({
    geometry: new ol.geom.Polygon([projectBoundaryCoords(BOUNDARY_WGS84_COORDS)]),
    name: "模拟施工场地边界",
    wgs84Coords: BOUNDARY_WGS84_COORDS,
  });
  boundarySource.addFeature(feature);
}

function projectBoundaryCoords(coords) {
  return coords.map(([lon, lat]) => mapCoordinateFromWgs(lon, lat));
}

function refreshBoundaryGeometries() {
  boundarySource.getFeatures().forEach((feature) => {
    const coords = feature.get("wgs84Coords");
    if (coords) {
      feature.getGeometry().setCoordinates([projectBoundaryCoords(coords)]);
    }
  });
}

function getPointStyle(feature) {
  const record = feature.get("record");
  if (!record || !recordMatchesFilters(record)) {
    return null;
  }

  const status = normalizeStatus(record.status);
  const meta = STATUS_META[status];
  const isSelected = feature === appState.selectedFeature;
  const radius = isSelected ? 9 : 7;

  return new ol.style.Style({
    image: new ol.style.Circle({
      radius,
      fill: new ol.style.Fill({ color: meta.color }),
      stroke: new ol.style.Stroke({
        color: "#ffffff",
        width: isSelected ? 3 : 2,
      }),
    }),
    text: new ol.style.Text({
      text: String(record.id || ""),
      offsetY: -19,
      font: "700 12px Microsoft YaHei, Arial",
      fill: new ol.style.Fill({ color: "#20251f" }),
      stroke: new ol.style.Stroke({ color: "#ffffff", width: 4 }),
    }),
  });
}

function setRecords(records, fit = true) {
  appState.records = records
    .map((record, index) => normalizeRecord(record, index))
    .filter(Boolean);
  pointSource.clear();
  appState.selectedFeature = null;
  appState.records.forEach((record) => pointSource.addFeature(createPointFeature(record)));
  updateNextPointIndex();
  updateSummary();
  renderTable();
  renderSelected();
  hidePopup();
  if (fit) {
    fitToVisiblePoints();
  }
}

function createPointFeature(record) {
  const feature = new ol.Feature({
    geometry: new ol.geom.Point(mapCoordinateFromWgs(record.lon, record.lat)),
    kind: "survey-point",
    record,
  });
  return feature;
}

function refreshPointGeometries() {
  pointSource.getFeatures().forEach((feature) => {
    const record = feature.get("record");
    feature.getGeometry().setCoordinates(mapCoordinateFromWgs(record.lon, record.lat));
  });
}

function refreshLocationGeometries() {
  locationSource.getFeatures().forEach((feature) => {
    const lon = feature.get("wgsLon");
    const lat = feature.get("wgsLat");
    if (Number.isFinite(lon) && Number.isFinite(lat)) {
      feature.getGeometry().setCoordinates(mapCoordinateFromWgs(lon, lat));
    }
  });
}

function normalizeRecord(input, index) {
  const row = input || {};
  const lon = parseNumber(getValue(row, ["lon", "lng", "longitude", "经度", "东经"]));
  const lat = parseNumber(getValue(row, ["lat", "latitude", "纬度", "北纬"]));
  const x = parseNumber(getValue(row, ["x", "local_x", "easting", "east", "东坐标", "施工x", "施工X"]));
  const y = parseNumber(getValue(row, ["y", "local_y", "northing", "north", "北坐标", "施工y", "施工Y"]));

  let resolvedLon = lon;
  let resolvedLat = lat;
  if ((resolvedLon === null || resolvedLat === null) && x !== null && y !== null) {
    const converted = localToLonLat(x, y);
    resolvedLon = converted.lon;
    resolvedLat = converted.lat;
  }

  if (resolvedLon === null || resolvedLat === null) {
    return null;
  }

  const id = getValue(row, ["id", "point_id", "point", "code", "编号", "点号"]) || `P-${String(index + 1).padStart(3, "0")}`;
  const name = getValue(row, ["name", "title", "名称", "点名"]) || id;
  const elevation = parseNumber(getValue(row, ["elevation", "height", "h", "高程", "标高"]));

  return {
    id: String(id).trim(),
    name: String(name).trim(),
    lon: roundCoord(resolvedLon),
    lat: roundCoord(resolvedLat),
    x,
    y,
    elevation,
    status: normalizeStatus(getValue(row, ["status", "state", "progress", "状态", "施工状态"])),
    note: getValue(row, ["note", "remark", "remarks", "备注", "说明"]) || "",
  };
}

function getValue(row, aliases) {
  const normalized = {};
  Object.entries(row).forEach(([key, value]) => {
    normalized[String(key).trim().toLowerCase()] = value;
  });

  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(row, alias)) {
      return row[alias];
    }
    const key = String(alias).trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(normalized, key)) {
      return normalized[key];
    }
  }
  return "";
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Number(String(value).trim().replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
}

function roundCoord(value) {
  return Number(Number(value).toFixed(7));
}

function normalizeStatus(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (["done", "complete", "completed", "finish", "finished", "已完成", "完成"].includes(raw)) {
    return "done";
  }
  if (["checking", "review", "recheck", "复核中", "复测", "检查"].includes(raw)) {
    return "checking";
  }
  if (["risk", "danger", "warning", "隐患", "风险", "风险点"].includes(raw)) {
    return "risk";
  }
  return "pending";
}

function localToLonLat(x, y) {
  const lat = PROJECT_ORIGIN.lat + y / 110540;
  const lon = PROJECT_ORIGIN.lon + x / (111320 * Math.cos((PROJECT_ORIGIN.lat * Math.PI) / 180));
  return { lon, lat };
}

function lonLatToLocal(lon, lat) {
  const x = (lon - PROJECT_ORIGIN.lon) * 111320 * Math.cos((PROJECT_ORIGIN.lat * Math.PI) / 180);
  const y = (lat - PROJECT_ORIGIN.lat) * 110540;
  return {
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
  };
}

function transformNestedCoordinates(coords, fromLayerName, toLayerName) {
  if (typeof coords[0] === "number") {
    return transformMapCoordinate(coords, fromLayerName, toLayerName);
  }
  return coords.map((coord) => transformNestedCoordinates(coord, fromLayerName, toLayerName));
}

function transformGeometryCoordinates(geometry, fromLayerName, toLayerName) {
  if (!geometry) {
    return;
  }

  if (geometry.getType() === "Circle") {
    geometry.setCenter(transformMapCoordinate(geometry.getCenter(), fromLayerName, toLayerName));
    return;
  }

  if (typeof geometry.getCoordinates === "function" && typeof geometry.setCoordinates === "function") {
    geometry.setCoordinates(transformNestedCoordinates(geometry.getCoordinates(), fromLayerName, toLayerName));
  }
}

function refreshRangeGeometries(fromLayerName, toLayerName) {
  rangeSource.getFeatures().forEach((feature) => {
    transformGeometryCoordinates(feature.getGeometry(), fromLayerName, toLayerName);
  });
}

function updateSummary() {
  const counts = appState.records.reduce(
    (acc, record) => {
      acc.total += 1;
      acc[normalizeStatus(record.status)] += 1;
      return acc;
    },
    { total: 0, pending: 0, checking: 0, done: 0, risk: 0 }
  );
  els.statTotal.textContent = counts.total;
  els.statPending.textContent = counts.pending;
  els.statChecking.textContent = counts.checking;
  els.statDone.textContent = counts.done;
  els.rangeSummary.textContent = `范围 ${rangeSource.getFeatures().length}`;
  pointLayer.changed();
}

function recordMatchesFilters(record) {
  const statusFilter = els.statusFilter.value;
  const query = els.searchInput.value.trim().toLowerCase();
  const statusMatches = statusFilter === "all" || normalizeStatus(record.status) === statusFilter;
  const text = [record.id, record.name, record.note].join(" ").toLowerCase();
  const queryMatches = !query || text.includes(query);
  return statusMatches && queryMatches;
}

function renderTable() {
  const rows = appState.records.filter(recordMatchesFilters);
  els.visibleCount.textContent = `${rows.length} 条`;
  els.pointsTable.innerHTML = rows
    .map((record) => {
      const meta = STATUS_META[normalizeStatus(record.status)];
      const elevation = record.elevation === null ? "-" : `${record.elevation} m`;
      return `
        <tr data-id="${escapeHtml(record.id)}">
          <td>${escapeHtml(record.id)}</td>
          <td>${escapeHtml(record.name)}</td>
          <td><span class="status-pill status-${normalizeStatus(record.status)}">${meta.label}</span></td>
          <td>${escapeHtml(elevation)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderSelected() {
  const feature = appState.selectedFeature;
  const record = feature?.get("record");
  if (!record) {
    els.selectedEmpty.hidden = false;
    els.selectedDetail.hidden = true;
    return;
  }

  els.selectedEmpty.hidden = true;
  els.selectedDetail.hidden = false;
  els.selectedName.textContent = `${record.id} · ${record.name}`;
  els.selectedCoord.textContent = `WGS84 ${record.lon}, ${record.lat} / X ${formatValue(record.x)} / Y ${formatValue(record.y)} / H ${formatValue(record.elevation)}`;
  els.selectedStatus.value = normalizeStatus(record.status);
}

function showPopup(feature, coordinate) {
  const record = feature.get("record");
  const status = normalizeStatus(record.status);
  const meta = STATUS_META[status];
  els.popup.innerHTML = `
    <strong>${escapeHtml(record.id)} · ${escapeHtml(record.name)}</strong>
    <dl>
      <dt>状态</dt><dd><span class="status-pill status-${status}">${meta.label}</span></dd>
      <dt>经度</dt><dd>${record.lon}</dd>
      <dt>纬度</dt><dd>${record.lat}</dd>
      <dt>高程</dt><dd>${formatValue(record.elevation)} m</dd>
      <dt>备注</dt><dd>${escapeHtml(record.note || "-")}</dd>
    </dl>
  `;
  els.popup.hidden = false;
  popupOverlay.setPosition(coordinate);
}

function hidePopup() {
  els.popup.hidden = true;
  popupOverlay.setPosition(undefined);
}

function selectFeature(feature) {
  appState.selectedFeature = feature || null;
  renderSelected();
  pointLayer.changed();
  if (!feature) {
    hidePopup();
  }
}

function fitToVisiblePoints() {
  const visible = pointSource.getFeatures().filter((feature) => recordMatchesFilters(feature.get("record")));
  if (!visible.length) {
    return;
  }
  const extent = ol.extent.createEmpty();
  visible.forEach((feature) => ol.extent.extend(extent, feature.getGeometry().getExtent()));
  map.getView().fit(extent, {
    padding: [80, 80, 220, 420],
    maxZoom: 18,
    duration: 350,
  });
}

function setLocationMessage(message, type = "") {
  els.locationMessage.textContent = message;
  els.locationMessage.className = `helper-text${type ? ` ${type}` : ""}`;
}

function parseCoordinateQuery(query) {
  const matches = query.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 2) {
    return null;
  }

  let first = Number(matches[0]);
  let second = Number(matches[1]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return null;
  }

  let lon = first;
  let lat = second;
  if (Math.abs(first) <= 90 && Math.abs(second) > 90) {
    lon = second;
    lat = first;
  }

  if (Math.abs(lon) > 180 || Math.abs(lat) > 90) {
    return null;
  }
  return { lon, lat };
}

function setLocationMarker(lon, lat, title, markerType = "search") {
  const feature = new ol.Feature({
    geometry: new ol.geom.Point(mapCoordinateFromWgs(lon, lat)),
    kind: "location-marker",
    title,
    markerType,
    wgsLon: lon,
    wgsLat: lat,
  });
  locationSource.clear();
  locationSource.addFeature(feature);
  return feature;
}

function jumpToWgsLocation(lon, lat, title, message, markerType = "search", zoom = 17) {
  const coordinate = mapCoordinateFromWgs(lon, lat);
  setLocationMarker(lon, lat, title, markerType);
  hidePopup();
  selectFeature(null);
  map.getView().animate({
    center: coordinate,
    zoom,
    duration: 450,
  });
  setLocationMessage(message, "success");
}

async function searchPlace() {
  const query = els.placeSearchInput.value.trim();
  if (!query) {
    setLocationMessage("请输入地名或坐标。", "error");
    return;
  }

  const parsed = parseCoordinateQuery(query);
  if (parsed) {
    jumpToWgsLocation(
      parsed.lon,
      parsed.lat,
      "坐标位置",
      `已跳转：${parsed.lon.toFixed(6)}, ${parsed.lat.toFixed(6)}`,
      "search",
      18
    );
    return;
  }

  els.placeSearch.disabled = true;
  setLocationMessage("搜索中...");
  try {
    const url = `${GEOCODER_ENDPOINT}?format=json&limit=1&accept-language=zh-CN&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      setLocationMessage("未找到匹配位置。", "error");
      return;
    }

    const result = results[0];
    const lon = Number(result.lon);
    const lat = Number(result.lat);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      setLocationMessage("搜索结果缺少有效坐标。", "error");
      return;
    }

    jumpToWgsLocation(lon, lat, "搜索位置", result.display_name || query, "search", 16);
  } catch (error) {
    setLocationMessage("搜索失败，可输入经度,纬度直接跳转。", "error");
  } finally {
    els.placeSearch.disabled = false;
  }
}

function getGeolocationErrorMessage(error) {
  if (error.code === error.PERMISSION_DENIED) {
    return "定位权限未开启。";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "当前位置不可用。";
  }
  if (error.code === error.TIMEOUT) {
    return "定位超时。";
  }
  return "定位失败。";
}

function locateCurrentPosition() {
  if (!navigator.geolocation) {
    setLocationMessage("当前浏览器不支持定位。", "error");
    return;
  }

  els.locateMe.disabled = true;
  setLocationMessage("定位中...");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lon = position.coords.longitude;
      const lat = position.coords.latitude;
      const accuracy = Math.round(position.coords.accuracy || 0);
      jumpToWgsLocation(
        lon,
        lat,
        "当前位置",
        accuracy ? `已定位，精度约 ${accuracy} m。` : "已定位。",
        "current",
        18
      );
      els.locateMe.disabled = false;
    },
    (error) => {
      setLocationMessage(getGeolocationErrorMessage(error), "error");
      els.locateMe.disabled = false;
    },
    {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 30000,
    }
  );
}

function toggleAddMode(force) {
  appState.addMode = typeof force === "boolean" ? force : !appState.addMode;
  els.addPointToggle.setAttribute("aria-pressed", String(appState.addMode));
  els.addPointToggle.classList.toggle("is-active", appState.addMode);
  if (appState.addMode) {
    setDrawInteraction(null);
  }
}

function setDrawInteraction(type) {
  if (appState.drawInteraction) {
    map.removeInteraction(appState.drawInteraction);
    appState.drawInteraction = null;
  }
  appState.drawType = null;
  els.drawCircle.setAttribute("aria-pressed", "false");
  els.drawPolygon.setAttribute("aria-pressed", "false");
  els.drawCircle.classList.remove("is-active");
  els.drawPolygon.classList.remove("is-active");

  if (!type) {
    return;
  }

  toggleAddMode(false);
  const draw = new ol.interaction.Draw({
    source: rangeSource,
    type,
  });
  draw.on("drawend", (event) => {
    appState.rangeIndex += 1;
    event.feature.set("name", `施工范围 ${appState.rangeIndex}`);
    window.setTimeout(updateSummary, 0);
  });
  appState.drawInteraction = draw;
  appState.drawType = type;
  map.addInteraction(draw);

  const button = type === "Circle" ? els.drawCircle : els.drawPolygon;
  button.setAttribute("aria-pressed", "true");
  button.classList.add("is-active");
}

function addPointAt(coordinate) {
  const [lon, lat] = wgsLonLatFromMapCoordinate(coordinate);
  const local = lonLatToLocal(lon, lat);
  const id = `NEW-${String(appState.nextPointIndex).padStart(3, "0")}`;
  const record = normalizeRecord(
    {
      id,
      name: "现场新增点",
      lon,
      lat,
      x: local.x,
      y: local.y,
      elevation: "",
      status: "pending",
      note: "地图点击新增",
    },
    appState.records.length
  );
  appState.records.push(record);
  const feature = createPointFeature(record);
  pointSource.addFeature(feature);
  updateNextPointIndex();
  updateSummary();
  renderTable();
  selectFeature(feature);
  showPopup(feature, coordinate);
}

function updateNextPointIndex() {
  appState.nextPointIndex = appState.records.length + 1;
}

function updateSelectedStatus(status) {
  const feature = appState.selectedFeature;
  if (!feature) {
    return;
  }
  const record = feature.get("record");
  record.status = normalizeStatus(status);
  feature.set("record", record);
  updateSummary();
  renderTable();
  renderSelected();
  showPopup(feature, feature.getGeometry().getCoordinates());
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }
    if (char === "," && !insideQuotes) {
      row.push(current);
      current = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }
    current += char;
  }

  row.push(current);
  if (row.some((cell) => cell.trim() !== "")) {
    rows.push(row);
  }

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((cell) => cell.trim());
  return rows.slice(1).map((cells) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = cells[index] ?? "";
    });
    return record;
  });
}

function handleImport(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = String(reader.result || "");
      const ext = file.name.split(".").pop().toLowerCase();
      const data = ext === "json" ? JSON.parse(text) : parseCsv(text);
      const records = extractImportedRecords(data);
      setRecords(records);
    } catch (error) {
      window.alert(`导入失败：${error.message}`);
    }
  };
  reader.readAsText(file, "utf-8");
}

function extractImportedRecords(data) {
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.points)) {
    return data.points;
  }
  if (data?.type === "FeatureCollection" && Array.isArray(data.features)) {
    return data.features.map(recordFromGeoJsonFeature).filter(Boolean);
  }
  if (Array.isArray(data?.features)) {
    return data.features;
  }
  return [];
}

function recordFromGeoJsonFeature(feature) {
  const coordinates = feature?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }
  return {
    ...(feature.properties || {}),
    lon: coordinates[0],
    lat: coordinates[1],
  };
}

function exportData(format) {
  const filename = `survey-points.${format}`;
  const content =
    format === "json"
      ? JSON.stringify(appState.records, null, 2)
      : recordsToCsv(appState.records);
  const type = format === "json" ? "application/json" : "text/csv";
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function recordsToCsv(records) {
  const headers = ["id", "name", "lon", "lat", "x", "y", "elevation", "status", "note"];
  const lines = [headers.join(",")];
  records.forEach((record) => {
    lines.push(headers.map((header) => csvEscape(record[header])).join(","));
  });
  return lines.join("\n");
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatValue(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

function syncBaseLayer(name) {
  const previousLayerName = appState.baseLayerName;
  const center = map.getView().getCenter();
  const centerWgs = center ? wgsLonLatFromMapCoordinate(center, previousLayerName) : null;

  appState.baseLayerName = name;
  Object.entries(baseLayers).forEach(([key, layer]) => {
    layer.setVisible(key === name);
  });
  refreshPointGeometries();
  refreshBoundaryGeometries();
  refreshRangeGeometries(previousLayerName, name);
  refreshLocationGeometries();

  if (centerWgs) {
    map.getView().setCenter(mapCoordinateFromWgs(centerWgs[0], centerWgs[1], name));
  }
  if (appState.selectedFeature) {
    showPopup(appState.selectedFeature, appState.selectedFeature.getGeometry().getCoordinates());
  }
}

map.on("singleclick", (event) => {
  if (appState.addMode) {
    addPointAt(event.coordinate);
    return;
  }

  const feature = map.forEachFeatureAtPixel(event.pixel, (candidate) => candidate);
  if (feature?.get("kind") === "survey-point") {
    selectFeature(feature);
    showPopup(feature, event.coordinate);
  } else {
    selectFeature(null);
  }
});

map.on("pointermove", (event) => {
  const hit = map.hasFeatureAtPixel(event.pixel);
  map.getTargetElement().style.cursor = hit || appState.addMode ? "crosshair" : "";
});

els.fileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) {
    handleImport(file);
  }
  event.target.value = "";
});

els.loadSample.addEventListener("click", () => setRecords(DEFAULT_POINTS));
els.exportJson.addEventListener("click", () => exportData("json"));
els.exportCsv.addEventListener("click", () => exportData("csv"));
els.addPointToggle.addEventListener("click", () => toggleAddMode());
els.drawCircle.addEventListener("click", () => setDrawInteraction(appState.drawType === "Circle" ? null : "Circle"));
els.drawPolygon.addEventListener("click", () => setDrawInteraction(appState.drawType === "Polygon" ? null : "Polygon"));
els.clearRanges.addEventListener("click", () => {
  rangeSource.clear();
  appState.rangeIndex = 0;
  updateSummary();
});
els.clearPoints.addEventListener("click", () => setRecords([], false));
els.baseLayer.addEventListener("change", (event) => syncBaseLayer(event.target.value));
els.statusFilter.addEventListener("change", () => {
  updateSummary();
  renderTable();
  fitToVisiblePoints();
});
els.searchInput.addEventListener("input", () => {
  updateSummary();
  renderTable();
});
els.placeSearch.addEventListener("click", searchPlace);
els.placeSearchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchPlace();
  }
});
els.locateMe.addEventListener("click", locateCurrentPosition);
els.selectedStatus.addEventListener("change", (event) => updateSelectedStatus(event.target.value));
els.locateSelected.addEventListener("click", () => {
  const feature = appState.selectedFeature;
  if (!feature) {
    return;
  }
  const coordinate = feature.getGeometry().getCoordinates();
  map.getView().animate({ center: coordinate, zoom: 19, duration: 350 });
  showPopup(feature, coordinate);
});

els.pointsTable.addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-id]");
  if (!row) {
    return;
  }
  const feature = pointSource
    .getFeatures()
    .find((candidate) => candidate.get("record").id === row.dataset.id);
  if (feature) {
    selectFeature(feature);
    const coordinate = feature.getGeometry().getCoordinates();
    map.getView().animate({ center: coordinate, zoom: 19, duration: 350 });
    showPopup(feature, coordinate);
  }
});

createBoundary();
setRecords(DEFAULT_POINTS, true);

if (window.lucide) {
  window.lucide.createIcons();
}

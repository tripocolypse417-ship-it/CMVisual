/**
 * World Information Station external feed adapters.
 * External records are contextual observations, never device measurements.
 * NASA FIRMS must be accessed through a server-side proxy; never embed its key in the app.
 */
const TIMEOUT_MS = 8000;
const validCoord = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;
const iso = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
function record({source, sourceId, observedAt, retrievedAt, kind, location, payload, quality}) {
  return {
    id: source + ":" + (sourceId || "unknown"), source, sourceId: sourceId || null, kind,
    observedAt: iso(observedAt), retrievedAt: retrievedAt.toISOString(), location: location || null,
    quality: quality || "provider-reported; not independently verified",
    evidenceClass: "external_observation", simulated: false, payload
  };
}
async function getJson(url, {fetchImpl = globalThis.fetch, timeoutMs = TIMEOUT_MS, signal} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("Fetch is unavailable in this runtime.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      headers: {Accept: "application/geo+json, application/json"},
      signal: signal || controller.signal
    });
    if (!response.ok) throw new Error("Feed request failed with HTTP " + response.status + ".");
    return await response.json();
  } finally { clearTimeout(timeout); }
}
export async function fetchNwsAlerts(latitude, longitude, options = {}) {
  if (!validCoord(latitude, -90, 90) || !validCoord(longitude, -180, 180)) {
    throw new TypeError("Valid latitude and longitude are required for NWS alerts.");
  }
  const json = await getJson("https://api.weather.gov/alerts/active?point=" + latitude + "," + longitude, options);
  const retrievedAt = new Date();
  return (Array.isArray(json?.features) ? json.features : []).filter(f => f && typeof f === "object").map((f, i) => {
    const p = f.properties && typeof f.properties === "object" ? f.properties : {};
    return record({
      source: "nws", sourceId: p.id || f.id || i, observedAt: p.sent || p.effective || p.onset,
      retrievedAt, kind: "weather_alert", location: p.areaDesc || null,
      quality: "Official NWS alert; verify current status and local applicability",
      payload: {event: p.event || "Weather alert", headline: p.headline || null, description: p.description || null,
        severity: p.severity || "Unknown", urgency: p.urgency || "Unknown", certainty: p.certainty || "Unknown",
        effective: iso(p.effective), expires: iso(p.expires), status: p.status || null,
        instruction: p.instruction || null, geometry: f.geometry || null, sourceUrl: p["@id"] || null}
    });
  });
}
export async function fetchUsgsEarthquakes({feedUrl = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson", ...options} = {}) {
  if (!/^https:\/\/earthquake\.usgs\.gov\//.test(feedUrl)) {
    throw new TypeError("USGS feed URL must use the official earthquake.usgs.gov host.");
  }
  const json = await getJson(feedUrl, options);
  const retrievedAt = new Date();
  return (Array.isArray(json?.features) ? json.features : []).filter(f => f && typeof f === "object").map((f, i) => {
    const p = f.properties && typeof f.properties === "object" ? f.properties : {};
    const c = f.geometry?.coordinates;
    const location = Array.isArray(c) && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])
      ? {longitude: c[0], latitude: c[1], depthKm: Number.isFinite(c[2]) ? c[2] : null} : null;
    return record({
      source: "usgs", sourceId: f.id || i, observedAt: Number.isFinite(p.time) ? new Date(p.time).toISOString() : null,
      retrievedAt, kind: "earthquake", location,
      quality: "USGS-reported event; magnitude and location may be revised",
      payload: {magnitude: Number.isFinite(p.mag) ? p.mag : null, magnitudeType: p.magType || null,
        place: p.place || null, status: p.status || null, tsunami: p.tsunami === 1,
        feltReports: Number.isFinite(p.felt) ? p.felt : null, detailUrl: p.url || null,
        updatedAt: Number.isFinite(p.updated) ? new Date(p.updated).toISOString() : null}
    });
  });
}
/**
 * proxyUrl must be an HTTPS server-side endpoint that adds the NASA FIRMS API key.
 * This function deliberately refuses direct client-side API-key use.
 */
export async function fetchFirmsDetections({proxyUrl, ...options} = {}) {
  if (!proxyUrl) throw new Error("NASA FIRMS is disabled until a secure server-side proxy URL is configured.");
  const parsed = new URL(proxyUrl);
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") throw new TypeError("NASA FIRMS proxy must use HTTPS.");
  const json = await getJson(parsed.toString(), options);
  const rows = Array.isArray(json) ? json : Array.isArray(json?.features) ? json.features : [];
  const retrievedAt = new Date();
  return rows.filter(row => row && typeof row === "object").map((row, i) => {
    const latitude = Number(row.latitude ?? row.lat ?? row.geometry?.coordinates?.[1]);
    const longitude = Number(row.longitude ?? row.lon ?? row.geometry?.coordinates?.[0]);
    const location = validCoord(latitude, -90, 90) && validCoord(longitude, -180, 180) ? {latitude, longitude} : null;
    const t = String(row.acq_time ?? "").padStart(4, "0");
    const observedAt = row.acq_datetime || (row.acq_date && row.acq_time ? row.acq_date + "T" + t.slice(0, 2) + ":" + t.slice(2, 4) + ":00Z" : null);
    return record({
      source: "nasa_firms", sourceId: row.id || (row.satellite || "sat") + "-" + (row.acq_date || "date") + "-" + i,
      observedAt, retrievedAt, kind: "satellite_fire_detection", location,
      quality: "Satellite thermal anomaly; not confirmation of a ground fire or current fire perimeter",
      payload: {confidence: row.confidence ?? row.confidence_level ?? null,
        brightness: Number.isFinite(Number(row.brightness)) ? Number(row.brightness) : null,
        satellite: row.satellite || null, instrument: row.instrument || null,
        frp: Number.isFinite(Number(row.frp)) ? Number(row.frp) : null, dayNight: row.daynight || null}
    });
  });
}
export function freshnessOf(item, now = Date.now()) {
  const t = Date.parse(item?.observedAt || item?.retrievedAt || "");
  if (!Number.isFinite(t)) return "unknown";
  const age = Math.max(0, now - t);
  if (age <= 15 * 60_000) return "fresh";
  if (age <= 6 * 60 * 60_000) return "aging";
  return "stale";
}
export const OPEN_MAP_DATA_GUIDANCE = Object.freeze({
  attribution: "© OpenStreetMap contributors",
  attributionUrl: "https://www.openstreetmap.org/copyright",
  note: "Use an approved tile/geocoding provider and follow its usage policy; do not bulk scrape the public OSM tile service."
});

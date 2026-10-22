import assert from "node:assert/strict";
import {
  fetchNwsAlerts, fetchUsgsEarthquakes, fetchFirmsDetections, freshnessOf, OPEN_MAP_DATA_GUIDANCE
} from "../src/lib/worldInformationFeeds.js";

const mockFetch = (payload, status = 200) => async (url, options) => ({
  ok: status >= 200 && status < 300,
  status,
  url,
  options,
  json: async () => payload
});

const nws = await fetchNwsAlerts(38.2, -92.6, {
  fetchImpl: mockFetch({features: [{id: "alert-1", properties: {
    event: "Severe Thunderstorm Warning", sent: "2026-10-22T14:00:00Z",
    severity: "Severe", areaDesc: "Laclede County", expires: "2026-10-22T15:00:00Z"
  }}]})
});
assert.equal(nws.length, 1);
assert.equal(nws[0].source, "nws");
assert.equal(nws[0].evidenceClass, "external_observation");
assert.equal(nws[0].simulated, false);
assert.equal(nws[0].payload.event, "Severe Thunderstorm Warning");
assert.equal(nws[0].location, "Laclede County");
assert.throws(() => fetchNwsAlerts(999, 0), /Valid latitude/);

const quakes = await fetchUsgsEarthquakes({
  fetchImpl: mockFetch({features: [{id: "us7000test", properties: {
    mag: 3.2, place: "test location", time: 1792677600000, tsunami: 0
  }, geometry: {coordinates: [-120.2, 36.4, 7.1]}}]})
});
assert.equal(quakes.length, 1);
assert.equal(quakes[0].source, "usgs");
assert.equal(quakes[0].location.latitude, 36.4);
assert.equal(quakes[0].location.depthKm, 7.1);
assert.equal(quakes[0].payload.magnitude, 3.2);
await assert.rejects(() => fetchUsgsEarthquakes({feedUrl: "https://example.com/feed"}), /official earthquake.usgs.gov/);

await assert.rejects(() => fetchFirmsDetections(), /secure server-side proxy/);
const firms = await fetchFirmsDetections({
  proxyUrl: "https://example.org/api/firms",
  fetchImpl: mockFetch([{latitude: 37.1, longitude: -92.1, acq_date: "2026-10-22", acq_time: "1430", confidence: "nominal"}])
});
assert.equal(firms.length, 1);
assert.equal(firms[0].source, "nasa_firms");
assert.equal(firms[0].location.longitude, -92.1);
assert.match(firms[0].quality, /not confirmation/);

assert.equal(freshnessOf({observedAt: new Date(Date.now() - 60_000).toISOString()}), "fresh");
assert.equal(freshnessOf({observedAt: new Date(Date.now() - 60 * 60_000).toISOString()}), "aging");
assert.equal(freshnessOf({observedAt: new Date(Date.now() - 24 * 60 * 60_000).toISOString()}), "stale");
assert.equal(freshnessOf({observedAt: "invalid"}), "unknown");
assert.match(OPEN_MAP_DATA_GUIDANCE.attribution, /OpenStreetMap contributors/);
console.log("World Information Station feed adapter tests passed.");

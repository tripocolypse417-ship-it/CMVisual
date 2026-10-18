import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { asObjectArray, sanitizeTimelineEvents } from "../src/lib/safeArray.js";
import { parseTimestamp } from "../src/lib/dataContract.js";

assert.deepEqual(asObjectArray(null), []);
assert.deepEqual(asObjectArray({ length: 3 }), []);
assert.deepEqual(asObjectArray([null, 1, "x", [], { id: "ok" }]), [{ id: "ok" }]);

const clean = { eventId: "e1", trackId: "t1", observedAt: "2026-10-15T12:00:00.000Z" };
const malformed = [
  null,
  "not-an-event",
  [],
  { eventId: "e2", trackId: "t2", observedAt: "not-a-date" },
  { eventId: 3, trackId: "t3", observedAt: "2026-10-15T12:00:00.000Z" },
  clean,
];
assert.deepEqual(sanitizeTimelineEvents(malformed), [clean]);
assert.deepEqual(sanitizeTimelineEvents({ data: [clean] }), []);
assert.equal(parseTimestamp(clean.observedAt), Date.parse(clean.observedAt), "ISO observation time must remain the measured time");
assert.equal(parseTimestamp("not-a-date"), null, "invalid measurement time must not be replaced with now");

const timelineSource = await readFile(new URL("../src/hooks/useWorldTimeline.js", import.meta.url), "utf8");
assert.match(timelineSource, /sanitizeTimelineEvents\(saved\)/, "persisted timeline data must be sanitized before use");
assert.match(timelineSource, /parseTimestamp/, "timeline must parse measurement timestamps rather than treating ISO strings as arrival time");
assert.match(timelineSource, /parsedTime==null/, "invalid explicit measurement times must be excluded");
const environment3DSource = await readFile(new URL("../src/components/Environment3D.jsx", import.meta.url), "utf8");
assert.match(environment3DSource, /Array\.isArray\(detections\)/, "3D scene must normalize malformed detection payloads before mapping");
assert.match(environment3DSource, /safeDetections\.map\(/, "3D scene must map only normalized detection arrays");
const wallVisionSource = await readFile(new URL("../src/components/WallVisionScene.jsx", import.meta.url), "utf8");
assert.match(wallVisionSource, /Array\.isArray\(selected\?\.wallLayers\)/, "wall composition must be array-guarded before rendering");
assert.match(wallVisionSource, /selectedWallLayers\.map\(/, "wall composition must map only normalized layers");
const homeSource = await readFile(new URL("../src/pages/Home.jsx", import.meta.url), "utf8");
assert.match(homeSource, /Array\.isArray\(worldTimeline\?\.tracks\)/, "replay tracks must be array-guarded");
assert.match(homeSource, /Array\.isArray\(track\.trail\)/, "replay trails must be array-guarded");

console.log("WaveRadar array-boundary regression tests: PASS (10+ assertions)");

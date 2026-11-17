export const CAPABILITY_REGISTRY_VERSION = '1.0.0';

export const CAPABILITIES = Object.freeze([
  { id: 'POSITION.GNSS.FIX', family: 'POSITION', label: 'GNSS position fix', evidence: 'MEASURED' },
  { id: 'POSITION.ACCURACY', family: 'POSITION', label: 'Position uncertainty', evidence: 'MEASURED' },
  { id: 'SATELLITE.GNSS.CONSTELLATION', family: 'SATELLITE', label: 'GNSS constellation', evidence: 'MEASURED' },
  { id: 'CELLULAR.NETWORK.OPERATOR_CODE', family: 'CELLULAR', label: 'Cellular operator code', evidence: 'MEASURED' },
  { id: 'CELLULAR.CELL.IDENTIFIER', family: 'CELLULAR', label: 'Cell identifier', evidence: 'MEASURED' },
  { id: 'CELLULAR.SIGNAL.DBM', family: 'CELLULAR', label: 'Cell signal power', evidence: 'MEASURED', unit: 'dBm' },
  { id: 'WIFI.NETWORK.BSSID', family: 'WIFI', label: 'Wi-Fi access point identifier', evidence: 'MEASURED' },
  { id: 'WIFI.NETWORK.SSID', family: 'WIFI', label: 'Wi-Fi network name', evidence: 'MEASURED' },
  { id: 'WIFI.SIGNAL.RSSI', family: 'WIFI', label: 'Wi-Fi received signal strength', evidence: 'MEASURED', unit: 'dBm' },
  { id: 'WIFI.CHANNEL.FREQUENCY', family: 'WIFI', label: 'Wi-Fi frequency', evidence: 'MEASURED', unit: 'MHz' },
  { id: 'RELATIONSHIP.CO_VISIBLE', family: 'RELATIONSHIP', label: 'Co-visible network observations', evidence: 'DERIVED' },
  { id: 'RELATIONSHIP.SAME_NETWORK_CANDIDATE', family: 'RELATIONSHIP', label: 'Same network candidate', evidence: 'INFERRED' }
]);

const finite = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
const text = (value) => value === null || value === undefined || value === '' ? null : String(value);

export function getCapability(id) {
  return CAPABILITIES.find((item) => item.id === id) || null;
}

export function normalizeNetworkSnapshot(snapshot = {}, context = {}) {
  const receivedAt = finite(context.receivedAt) ?? Date.now();
  const source = snapshot || {};
  const observations = [];
  const base = {
    schemaVersion: 'waveradar-capability-observation-v1',
    integrityState: 'UNASSESSED',
    receivedAt,
    position: context.position || null,
    positionAccuracyM: finite(context.positionAccuracyM),
    deviceId: text(context.deviceId),
    sessionId: text(context.sessionId),
    provenance: { source: 'Android WifiManager/TelephonyManager', adapterVersion: '1.0.0' }
  };

  for (const item of Array.isArray(source.wifi?.networks) ? source.wifi.networks : []) {
    if (!item || typeof item !== 'object') continue;
    const ageMs = finite(item.ageMs);
    const bssid = text(item.bssid);
    observations.push({
      ...base,
      observationId: 'wifi-' + (bssid || observations.length) + '-' + (finite(item.timestampMicros) ?? receivedAt),
      capabilityId: 'WIFI.NETWORK.BSSID',
      family: 'WIFI',
      evidenceState: bssid ? 'MEASURED' : 'UNKNOWN',
      observedAt: finite(item.timestampMicros) === null ? null : receivedAt - Math.max(0, ageMs ?? 0),
      sourceTimestampMicros: finite(item.timestampMicros),
      ageMs,
      state: ageMs === null ? 'UNKNOWN' : ageMs > 30000 ? 'STALE' : 'CURRENT',
      value: bssid,
      network: { bssid, ssid: text(item.ssid), frequencyMhz: finite(item.frequencyMhz), rssiDbm: finite(item.rssiDbm), capabilities: text(item.capabilities) },
      limitations: ['Android scan cache; not necessarily a scan initiated by WaveRadar', 'BSSID/SSID are observable identifiers, not proof of owner or physical topology']
    });
    if (text(item.ssid)) observations.push({ ...base, observationId: 'wifi-ssid-' + observations.length, capabilityId: 'WIFI.NETWORK.SSID', family: 'WIFI', evidenceState: 'MEASURED', value: text(item.ssid), state: ageMs === null ? 'UNKNOWN' : ageMs > 30000 ? 'STALE' : 'CURRENT', ageMs, network: { bssid, ssid: text(item.ssid) }, limitations: ['SSID may be duplicated or spoofed'] });
    if (finite(item.rssiDbm) !== null) observations.push({ ...base, observationId: 'wifi-rssi-' + observations.length, capabilityId: 'WIFI.SIGNAL.RSSI', family: 'WIFI', evidenceState: 'MEASURED', value: finite(item.rssiDbm), unit: 'dBm', state: ageMs === null ? 'UNKNOWN' : ageMs > 30000 ? 'STALE' : 'CURRENT', ageMs, network: { bssid, ssid: text(item.ssid) } });
  }

  for (const item of Array.isArray(source.cellular?.cells) ? source.cellular.cells : []) {
    if (!item || typeof item !== 'object') continue;
    const ageMs = finite(item.ageMs);
    observations.push({
      ...base,
      observationId: 'cell-' + (text(item.cellId) || observations.length) + '-' + (finite(item.timestampNanos) ?? receivedAt),
      capabilityId: 'CELLULAR.CELL.IDENTIFIER',
      family: 'CELLULAR',
      evidenceState: text(item.cellId) ? 'MEASURED' : 'UNKNOWN',
      value: text(item.cellId),
      state: ageMs === null ? 'UNKNOWN' : ageMs > 60000 ? 'STALE' : 'CURRENT',
      ageMs,
      sourceTimestampNanos: finite(item.timestampNanos),
      network: { technology: text(item.technology), registered: Boolean(item.registered), cellId: text(item.cellId), operatorCode: text(source.cellular.operatorCode), signalDbm: finite(item.signalDbm) },
      limitations: ['Cell information is cached/rate-limited by Android and carrier', 'Identifiers may be unavailable or redacted by device, OS or carrier']
    });
    if (finite(item.signalDbm) !== null) observations.push({ ...base, observationId: 'cell-rssi-' + observations.length, capabilityId: 'CELLULAR.SIGNAL.DBM', family: 'CELLULAR', evidenceState: 'MEASURED', value: finite(item.signalDbm), unit: 'dBm', state: ageMs === null ? 'UNKNOWN' : ageMs > 60000 ? 'STALE' : 'CURRENT', ageMs, network: { technology: text(item.technology), registered: Boolean(item.registered), cellId: text(item.cellId) } });
  }
  return { schemaVersion: 'waveradar-capability-observation-v1', receivedAt, wifiStatus: text(source.wifi?.status) || 'UNAVAILABLE', cellularStatus: text(source.cellular?.status) || 'UNAVAILABLE', observations, counts: { wifi: observations.filter((o) => o.family === 'WIFI').length, cellular: observations.filter((o) => o.family === 'CELLULAR').length } };
}

function haversineMeters(a, b) {
  const rad = (degrees) => degrees * Math.PI / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** Creates candidate links only for repeated exact identifiers at distinct, uncertainty-qualified positions. */
export function correlateAcrossPositions(observations = [], options = {}) {
  const maxAgeMs = finite(options.maxAgeMs) ?? 15 * 60 * 1000;
  const minSeparationM = finite(options.minSeparationM) ?? 10;
  const groups = new Map();
  for (const observation of observations) {
    if (!observation || observation.state !== 'CURRENT' || observation.position == null) continue;
    const key = observation.family === 'WIFI' ? text(observation.network?.bssid) : observation.family === 'CELLULAR' ? text(observation.network?.cellId) : null;
    if (!key) continue;
    const position = observation.position;
    if (finite(position.latitude) === null || finite(position.longitude) === null) continue;
    const accuracy = finite(observation.positionAccuracyM);
    if (accuracy === null || accuracy > 50) continue;
    const time = finite(observation.receivedAt);
    if (time === null || Date.now() - time > maxAgeMs) continue;
    const groupKey = observation.family + ':' + key;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(observation);
  }
  const links = [];
  for (const [key, entries] of groups) {
    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        const distanceM = haversineMeters(entries[i].position, entries[j].position);
        const uncertaintyM = (finite(entries[i].positionAccuracyM) || 0) + (finite(entries[j].positionAccuracyM) || 0);
        if (distanceM - uncertaintyM < minSeparationM) continue;
        links.push({
          relationshipId: 'candidate-' + key + '-' + i + '-' + j,
          relationshipType: 'SAME_NETWORK_CANDIDATE',
          evidenceState: 'INFERRED',
          integrityState: 'UNASSESSED',
          sourceObservationIds: [entries[i].observationId, entries[j].observationId],
          family: entries[i].family,
          estimatedSeparationM: distanceM,
          combinedPositionUncertaintyM: uncertaintyM,
          limitations: ['Repeated identifier supports a candidate correlation only', 'Does not establish network ownership, physical topology, or uninterrupted coverage']
        });
      }
    }
  }
  return links;
}

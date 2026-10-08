/**
 * WaveRadar graceful-degradation policy.
 * Advanced capability failure must never blank the operational surface.
 */
export const FIELD_MODES = Object.freeze([
  'FULL_MULTIMODAL','CAMERA_IMU','CAMERA_ONLY','SENSOR_MAP','MAP_2D','EVIDENCE_REPLAY'
]);

const rank = Object.fromEntries(FIELD_MODES.map((v,i)=>[v,i]));

export function selectFieldMode(capabilities = {}) {
  const has = key => capabilities[key] === true;
  const advancedSpatial = has('depth') || has('wifiRtt') || has('uwb') || has('thermal') || has('mmwave');
  if (has('camera') && advancedSpatial) return 'FULL_MULTIMODAL';
  if (has('camera') && has('imu')) return 'CAMERA_IMU';
  if (has('camera')) return 'CAMERA_ONLY';
  if (has('sensorData') || has('gnss') || has('wifiRtt') || has('uwb')) return 'SENSOR_MAP';
  if (has('map')) return 'MAP_2D';
  return 'EVIDENCE_REPLAY';
}

export function degrade(currentMode, unavailable = []) {
  const currentRank = rank[currentMode] ?? 0;
  const next = FIELD_MODES.slice(currentRank + 1).find(mode => !unavailable.includes(mode));
  return next || 'EVIDENCE_REPLAY';
}

export function fieldModeLabel(mode) {
  return ({
    FULL_MULTIMODAL: 'Full sensor fusion',
    CAMERA_IMU: 'Camera + motion',
    CAMERA_ONLY: 'Visual mode',
    SENSOR_MAP: 'Sensor/map mode',
    MAP_2D: '2D operational map',
    EVIDENCE_REPLAY: 'Evidence / replay',
  })[mode] || 'Unknown mode';
}

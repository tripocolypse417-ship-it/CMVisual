export const NETWORK_EVIDENCE = Object.freeze({
  MEASURED: 'MEASURED',
  DERIVED: 'DERIVED',
  ENVIRONMENTAL: 'ENVIRONMENTAL',
  PREDICTED: 'PREDICTED',
  GROUND_TRUTH_OPERATOR_MARKER: 'GROUND_TRUTH_OPERATOR_MARKER',
  UNKNOWN: 'UNKNOWN',
});

export const SENSOR_FAMILIES = Object.freeze([
  'CAMERA', 'IMU', 'GPS', 'BAROMETER', 'LIGHT', 'PROXIMITY',
  'MICROPHONE', 'WIFI', 'BLUETOOTH', 'UWB', 'AR_DEPTH', 'EXTERNAL_RANGING',
]);

export function createSensorObservation({
  deviceId, sensorFamily, sensorType, timestamp = Date.now(), value,
  unit = null, accuracy = null, evidenceClass = NETWORK_EVIDENCE.MEASURED,
  frameId = null, location = null,
} = {}) {
  if (!deviceId || !sensorFamily || value == null) return null;
  return {
    observationId: String(deviceId) + ':' + sensorFamily + ':' + timestamp,
    deviceId, sensorFamily, sensorType: sensorType || sensorFamily, timestamp,
    value, unit, accuracy, evidenceClass, frameId, location,
  };
}

export function mergeSensorObservations(observations = []) {
  return observations.filter(Boolean)
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
    .map((observation) => ({
      ...observation,
      networkRole: 'PEER_OBSERVATION',
      sourceDevice: observation.deviceId,
    }));
}

export function calculateCrossDeviceAgreement(observations = [], toleranceMs = 250) {
  const valid = observations.filter((o) => o && Number.isFinite(Number(o.timestamp)));
  if (valid.length < 2) return { score: null, samples: valid.length };
  let agreements = 0;
  let comparisons = 0;
  for (let i = 0; i < valid.length; i += 1) {
    for (let j = i + 1; j < valid.length; j += 1) {
      if (valid[i].sensorFamily !== valid[j].sensorFamily) continue;
      comparisons += 1;
      if (Math.abs(Number(valid[i].timestamp) - Number(valid[j].timestamp)) <= toleranceMs) agreements += 1;
    }
  }
  return { score: comparisons ? agreements / comparisons : null, samples: valid.length, comparisons };
}

import { DATA_CONTRACT_VERSION, EVIDENCE_CLASS, SENSOR_FAMILY, normalizeObservation, mergeObservations, auditDataCompleteness, MODALITIES } from './dataContract';

export const NETWORK_EVIDENCE = EVIDENCE_CLASS;
export const SENSOR_FAMILIES = Object.freeze(Object.values(SENSOR_FAMILY));

export function createSensorObservation({ deviceId, sensorFamily, sensorType, timestamp = Date.now(), value, unit = null, accuracy = null, evidenceClass = EVIDENCE_CLASS.MEASURED, frameId = null, location = null, uncertaintyM = null, provenance = null } = {}) {
  if (!deviceId || !sensorFamily || value == null) return null;
  return normalizeObservation({
    observationId: `${deviceId}:${sensorFamily}:${timestamp}`,
    deviceId, sensorFamily, sensorType: sensorType || sensorFamily, modality: sensorType || sensorFamily,
    timestamp, observedAt: timestamp, value, unit, accuracy, uncertaintyM, evidenceClass, frameId, location,
    provenance: provenance || { source: sensorType || sensorFamily, deviceId },
  }, { deviceId });
}

export function mergeSensorObservations(observations = []) {
  return mergeObservations([observations]).map(observation => ({ ...observation, networkRole: 'PEER_OBSERVATION', sourceDevice: observation.deviceId }));
}

export function calculateCrossDeviceAgreement(observations = [], toleranceMs = 250) {
  const valid = observations.filter(o => o && Number.isFinite(Number(o.timestamp)));
  if (valid.length < 2) return { score: null, samples: valid.length, comparisons: 0 };
  let agreements = 0; let comparisons = 0;
  for (let i = 0; i < valid.length; i += 1) {
    for (let j = i + 1; j < valid.length; j += 1) {
      if (valid[i].sensorFamily !== valid[j].sensorFamily) continue;
      comparisons += 1;
      if (Math.abs(Number(valid[i].timestamp) - Number(valid[j].timestamp)) <= toleranceMs) agreements += 1;
    }
  }
  return { score: comparisons ? agreements / comparisons : null, samples: valid.length, comparisons };
}

export function auditSensorObservation(observation) {
  return auditDataCompleteness(normalizeObservation(observation), { expectedByModality: true });
}

export const DATA_SCHEMA_VERSION = DATA_CONTRACT_VERSION;
export const SENSOR_MODALITY_REGISTRY = MODALITIES;

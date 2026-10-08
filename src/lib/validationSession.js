/**
 * WaveRadar Physical Validation Session
 * Evidence-first capture and scoring primitives. No synthetic sensor readings.
 */
import { normalizeObservation, EVIDENCE_CLASS, DATA_CONTRACT_VERSION } from './dataContract';

export const VALIDATION_VERSION = 'waveradar-validation-v1';

export const TEST_CASES = Object.freeze([
  'STATIONARY_REFERENCE','KNOWN_DISTANCE','STRAIGHT_MOTION','KNOWN_TURN',
  'OCCLUSION','SENSOR_LOSS','STALE_DATA','SENSOR_CONFLICT',
  'DEVICE_ROTATION','MULTI_DEVICE_ALIGNMENT','REPLAY_EQUIVALENCE'
]);

export function createValidationSession({ sessionId, deviceId, operator = null, environment = null } = {}) {
  return {
    validationVersion: VALIDATION_VERSION,
    contractVersion: DATA_CONTRACT_VERSION,
    sessionId: sessionId || `validation-${Date.now()}`,
    deviceId: deviceId || null,
    operator,
    environment,
    startedAt: new Date().toISOString(),
    testCases: TEST_CASES.map(id => ({ id, status: 'NOT_STARTED', observations: 0, notes: [] })),
    observations: [],
    groundTruth: [],
    metrics: {},
  };
}

export function appendObservation(session, input, context = {}) {
  const observation = normalizeObservation(input, {
    ...context,
    sessionId: session.sessionId,
    deviceId: session.deviceId,
  });
  return { ...session, observations: [...session.observations, observation] };
}

export function appendGroundTruth(session, input, context = {}) {
  const observation = normalizeObservation({
    ...input,
    evidenceClass: EVIDENCE_CLASS.GROUND_TRUTH,
    modality: 'OPERATOR',
  }, { ...context, sessionId: session.sessionId, deviceId: session.deviceId });
  return { ...session, groundTruth: [...session.groundTruth, observation] };
}

export function completeTestCase(session, testId, { status = 'PASS', notes = [], metrics = {} } = {}) {
  return {
    ...session,
    testCases: session.testCases.map(t => t.id === testId
      ? { ...t, status, notes: [...(t.notes || []), ...notes], metrics }
      : t),
  };
}

export function summarizeValidation(session) {
  const tests = session.testCases || [];
  const pass = tests.filter(t => t.status === 'PASS').length;
  const fail = tests.filter(t => t.status === 'FAIL').length;
  const started = tests.filter(t => t.status !== 'NOT_STARTED').length;
  const evidence = (session.observations || []).filter(o =>
    o.evidenceClass === EVIDENCE_CLASS.MEASURED || o.evidenceClass === EVIDENCE_CLASS.FEDERATED_MEASURED
  );
  return {
    validationVersion: VALIDATION_VERSION,
    sessionId: session.sessionId,
    tests: { total: tests.length, started, pass, fail, remaining: tests.length - started },
    measuredObservations: evidence.length,
    groundTruthObservations: (session.groundTruth || []).length,
    status: fail ? 'FAILED' : pass === tests.length ? 'PASSED' : 'IN_PROGRESS',
    readyForOperationalReview: !fail && pass === tests.length && evidence.length > 0,
  };
}

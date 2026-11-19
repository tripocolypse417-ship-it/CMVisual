/**
 * Experimental active-sensing prioritizer. Suggests a measurement request,
 * never activates sensors or grants consent.
 */
export function prioritizeEvidenceRequests({ gaps = [], sensors = [] } = {}) {
  if (!Array.isArray(gaps) || !Array.isArray(sensors)) throw new TypeError('arrays required');
  const requests = [];
  for (const gap of gaps) {
    if (!gap?.kind || !Number.isFinite(gap.importance) || gap.importance <= 0) continue;
    for (const sensor of sensors) {
      if (!sensor?.id || !Array.isArray(sensor.measures) || !sensor.measures.includes(gap.kind)) continue;
      if (sensor.available !== true || sensor.authorized !== true) continue;
      if (![sensor.expectedReduction, sensor.cost].every(Number.isFinite) || sensor.expectedReduction <= 0 || sensor.expectedReduction > 1 || sensor.cost < 0) continue;
      requests.push({
        gap: gap.kind, sensorId: sensor.id,
        priority: gap.importance * sensor.expectedReduction / (1 + sensor.cost),
        evidenceClass: 'SPECULATIVE',
        action: 'REQUEST_MEASUREMENT_ONLY',
        limitations: 'Expected reduction is a planning estimate, not empirically calibrated',
      });
    }
  }
  requests.sort((a,b) => b.priority - a.priority || a.sensorId.localeCompare(b.sensorId));
  return { status: requests.length ? 'REQUESTS_AVAILABLE' : 'NO_AUTHORIZED_MEASUREMENT', requests, autonomousSensorActivationAllowed: false };
}

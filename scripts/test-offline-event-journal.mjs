import assert from 'node:assert/strict';
import { validateObservation } from '../src/lib/offlineEventJournal.js';
assert.equal(validateObservation({ incidentId: 'training-1', source: 'imu', evidenceClass: 'measured', calibrationVersion: 'v1' }), true);
assert.equal(validateObservation({ incidentId: 'training-1', source: 'demo', evidenceClass: 'simulated' }), true);
assert.throws(() => validateObservation({ incidentId: 'x', source: 'imu', evidenceClass: 'measured' }), /Calibration/);
assert.throws(() => validateObservation({ incidentId: 'x', source: 'imu', evidenceClass: 'verified' }), /Invalid/);
assert.throws(() => validateObservation({ incidentId: 'x', source: '', evidenceClass: 'simulated' }), /source/);
console.log('offline event validation tests passed');

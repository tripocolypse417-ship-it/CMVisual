import assert from 'node:assert/strict';
import {
  defineTask,
  createTaskRecord,
  transitionTask,
  sameTaskInvocation,
} from '../src/lib/controlPlane/taskContract.js';

const definition = defineTask({
  taskId: 'sensor-baseline-refresh',
  version: 1,
  trigger: 'manual-or-scheduled',
  maxRuntimeMs: 60000,
  readScopes: ['sensor-observations'],
  writeScopes: ['validation-run-records'],
  allowedDomains: [],
  idempotencyKey: 'baseline-2026-11-13',
  maxAttempts: 2,
  approvalRequired: true,
  dataClassification: 'INTERNAL',
  expectedPostcondition: 'A validation run record exists and references preserved raw observations',
});

assert.throws(() => defineTask({}), /taskId/);
assert.throws(() => defineTask({ ...definition, maxRuntimeMs: 0 }), /maxRuntimeMs/);

let record = createTaskRecord(definition, '2026-11-13T20:00:00Z');
assert.equal(record.state, 'QUEUED');
record = transitionTask(record, { type: 'START', at: '2026-11-13T20:01:00Z' }, definition);
assert.equal(record.state, 'AWAITING_APPROVAL');
assert.equal(record.attempt, 0);

record = transitionTask(record, { type: 'APPROVE', at: '2026-11-13T20:02:00Z' }, definition);
assert.equal(record.state, 'QUEUED');
record = transitionTask(record, { type: 'START', approved: true, at: '2026-11-13T20:03:00Z' }, definition);
assert.equal(record.state, 'RUNNING');
assert.equal(record.attempt, 1);

assert.throws(() => transitionTask(record, {
  type: 'SUCCEED', at: '2026-11-13T20:04:00Z', postconditionVerified: false, evidenceRecorded: false,
}, definition), /postcondition/);

record = transitionTask(record, {
  type: 'FAIL', at: '2026-11-13T20:04:00Z', retryable: true, failure: 'temporary worker loss',
}, definition);
assert.equal(record.state, 'QUEUED');

record = transitionTask(record, { type: 'START', approved: true, at: '2026-11-13T20:05:00Z' }, definition);
record = transitionTask(record, {
  type: 'SUCCEED', at: '2026-11-13T20:06:00Z',
  postconditionVerified: true, evidenceRecorded: true, result: { evidenceCount: 12 },
}, definition);
assert.equal(record.state, 'SUCCEEDED');
assert.throws(() => transitionTask(record, { type: 'CANCEL', at: '2026-11-13T20:07:00Z' }, definition), /Terminal/);

assert.equal(sameTaskInvocation(
  { taskId: 'a', idempotencyKey: 'k' },
  { taskId: 'a', idempotencyKey: 'k' },
), true);
assert.equal(sameTaskInvocation(
  { taskId: 'a', idempotencyKey: 'k' },
  { taskId: 'a', idempotencyKey: 'other' },
), false);

console.log('WaveRadar control-plane task contract checks passed.');

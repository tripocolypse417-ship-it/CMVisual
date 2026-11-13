/**
 * WaveRadar OS control-plane task contract.
 *
 * Pure, deterministic state transitions. Persistence, scheduling, and worker
 * execution are adapters; none are allowed to become the source of truth.
 */

export const TASK_STATES = Object.freeze([
  'QUEUED',
  'AWAITING_APPROVAL',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
]);

const TERMINAL = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED']);
const CLASSIFICATIONS = new Set(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']);

function requireString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function requirePositiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive safe integer`);
  }
  return value;
}

function uniqueStrings(values, field) {
  if (!Array.isArray(values) || values.some(v => typeof v !== 'string' || !v.trim())) {
    throw new TypeError(`${field} must be an array of non-empty strings`);
  }
  return [...new Set(values.map(v => v.trim()))];
}

/**
 * Validate and freeze a portable task definition. No provider, credential,
 * browser, or host-specific field is part of this contract.
 */
export function defineTask(input = {}) {
  const dataClassification = requireString(input.dataClassification, 'dataClassification');
  if (!CLASSIFICATIONS.has(dataClassification)) {
    throw new TypeError('dataClassification must be PUBLIC, INTERNAL, CONFIDENTIAL, or RESTRICTED');
  }
  const maxAttempts = input.maxAttempts ?? 1;
  const task = {
    taskId: requireString(input.taskId, 'taskId'),
    version: requirePositiveInteger(input.version, 'version'),
    trigger: requireString(input.trigger, 'trigger'),
    maxRuntimeMs: requirePositiveInteger(input.maxRuntimeMs, 'maxRuntimeMs'),
    readScopes: uniqueStrings(input.readScopes ?? [], 'readScopes'),
    writeScopes: uniqueStrings(input.writeScopes ?? [], 'writeScopes'),
    allowedDomains: uniqueStrings(input.allowedDomains ?? [], 'allowedDomains'),
    idempotencyKey: requireString(input.idempotencyKey, 'idempotencyKey'),
    maxAttempts: requirePositiveInteger(maxAttempts, 'maxAttempts'),
    approvalRequired: input.approvalRequired === true,
    dataClassification,
    expectedPostcondition: requireString(input.expectedPostcondition, 'expectedPostcondition'),
    evidenceRequired: input.evidenceRequired !== false,
  };
  return Object.freeze({
    ...task,
    readScopes: Object.freeze(task.readScopes),
    writeScopes: Object.freeze(task.writeScopes),
    allowedDomains: Object.freeze(task.allowedDomains),
  });
}

/** Create the initial durable-record payload for a task. */
export function createTaskRecord(definition, createdAt) {
  if (!definition || typeof definition.taskId !== 'string') {
    throw new TypeError('A validated task definition is required');
  }
  requireString(createdAt, 'createdAt');
  return Object.freeze({
    taskId: definition.taskId,
    definitionVersion: definition.version,
    idempotencyKey: definition.idempotencyKey,
    state: 'QUEUED',
    attempt: 0,
    createdAt,
    updatedAt: createdAt,
    lastEventSequence: 0,
    result: null,
    failure: null,
  });
}

/**
 * Apply one validated event. Callers persist the returned record and event
 * atomically using their chosen append-only storage adapter.
 */
export function transitionTask(record, event, definition) {
  if (!record || !event || !definition) throw new TypeError('record, event, and definition are required');
  if (record.taskId !== definition.taskId || record.definitionVersion !== definition.version) {
    throw new Error('Task definition does not match the durable record');
  }
  if (TERMINAL.has(record.state)) throw new Error(`Terminal task cannot transition from ${record.state}`);
  const type = requireString(event.type, 'event.type');
  const at = requireString(event.at, 'event.at');
  const next = { ...record, updatedAt: at, lastEventSequence: record.lastEventSequence + 1 };

  if (type === 'APPROVE' && record.state === 'AWAITING_APPROVAL') {
    next.state = 'QUEUED';
  } else if (type === 'REJECT' && record.state === 'AWAITING_APPROVAL') {
    next.state = 'CANCELLED';
  } else if (type === 'START' && record.state === 'QUEUED') {
    if (definition.approvalRequired && event.approved !== true) {
      next.state = 'AWAITING_APPROVAL';
    } else {
      next.state = 'RUNNING';
      next.attempt += 1;
    }
  } else if (type === 'SUCCEED' && record.state === 'RUNNING') {
    if (event.postconditionVerified !== true) {
      throw new Error('Task cannot succeed without a verified postcondition');
    }
    if (definition.evidenceRequired && event.evidenceRecorded !== true) {
      throw new Error('Task cannot succeed without recorded evidence');
    }
    next.state = 'SUCCEEDED';
    next.result = event.result ?? null;
  } else if (type === 'FAIL' && record.state === 'RUNNING') {
    next.failure = event.failure ? String(event.failure) : 'Unspecified failure';
    if (event.retryable === true && record.attempt < definition.maxAttempts) {
      next.state = 'QUEUED';
    } else {
      next.state = 'FAILED';
    }
  } else if (type === 'CANCEL' && ['QUEUED', 'AWAITING_APPROVAL', 'RUNNING'].includes(record.state)) {
    next.state = 'CANCELLED';
  } else {
    throw new Error(`Invalid task transition: ${record.state} -> ${type}`);
  }

  return Object.freeze(next);
}

/** Idempotency is scoped to the stable task ID and key, never worker identity. */
export function sameTaskInvocation(left, right) {
  return Boolean(left && right &&
    left.taskId === right.taskId &&
    left.idempotencyKey === right.idempotencyKey);
}

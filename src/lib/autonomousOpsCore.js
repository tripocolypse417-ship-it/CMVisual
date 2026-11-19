// Pure, deterministic task state transitions for an offline-first operations queue.
// Persist every transition atomically before invoking external effects.
export const TASK_STATES = Object.freeze(['queued','running','awaiting_approval','retry_wait','succeeded','failed','cancelled']);
const transitions = Object.freeze({
  queued: ['running','awaiting_approval','cancelled'],
  running: ['succeeded','failed','retry_wait','awaiting_approval'],
  awaiting_approval: ['queued','cancelled'],
  retry_wait: ['queued','cancelled','failed'],
  succeeded: [], failed: [], cancelled: [],
});
export function transitionTask(task, next, options = {}) {
  if (!task || typeof task !== 'object' || !TASK_STATES.includes(task.state)) throw new Error('invalid-task');
  if (!TASK_STATES.includes(next) || !transitions[task.state].includes(next)) throw new Error('invalid-transition');
  if (!Number.isSafeInteger(task.version) || task.version < 0) throw new Error('invalid-version');
  if (options.expectedVersion !== task.version) throw new Error('stale-version');
  if (typeof options.at !== 'number' || !Number.isFinite(options.at)) throw new Error('invalid-time');
  if (next === 'succeeded' && (!options.verification || options.verification.passed !== true || !options.verification.evidenceId)) throw new Error('verification-required');
  if (next === 'running' && !options.authorized) throw new Error('authorization-required');
  return Object.freeze({
    ...task, state: next, version: task.version + 1, updatedAt: options.at,
    ...(next === 'succeeded' ? { verification: { passed: true, evidenceId: options.verification.evidenceId } } : {}),
  });
}
export function retryDelayMs(attempt, baseMs = 1000, maxMs = 60000) {
  if (!Number.isSafeInteger(attempt) || attempt < 0 || !Number.isFinite(baseMs) || baseMs <= 0 || !Number.isFinite(maxMs) || maxMs < baseMs) throw new Error('invalid-retry-policy');
  return Math.min(maxMs, baseMs * Math.pow(2, Math.min(attempt, 30)));
}

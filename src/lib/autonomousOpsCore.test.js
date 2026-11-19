import { describe, it, expect } from 'vitest';
import { transitionTask, retryDelayMs } from './autonomousOpsCore';

const task = { id: 't1', state: 'queued', version: 0 };
describe('autonomous operations core', () => {
  it('requires authorization to execute', () => expect(() => transitionTask(task, 'running', { expectedVersion: 0, at: 1 })).toThrow('authorization-required'));
  it('transitions authorized work', () => expect(transitionTask(task, 'running', { expectedVersion: 0, at: 1, authorized: true }).state).toBe('running'));
  it('rejects stale writes', () => expect(() => transitionTask(task, 'running', { expectedVersion: 1, at: 1, authorized: true })).toThrow('stale-version'));
  it('rejects success without evidence', () => expect(() => transitionTask({ ...task, state: 'running' }, 'succeeded', { expectedVersion: 0, at: 1 })).toThrow('verification-required'));
  it('accepts verified success', () => expect(transitionTask({ ...task, state: 'running' }, 'succeeded', { expectedVersion: 0, at: 1, verification: { passed: true, evidenceId: 'e1' } }).state).toBe('succeeded'));
  it('does not reopen completed work', () => expect(() => transitionTask({ ...task, state: 'succeeded' }, 'running', { expectedVersion: 0, at: 1, authorized: true })).toThrow('invalid-transition'));
  it('bounds exponential backoff', () => expect(retryDelayMs(20)).toBe(60000));
});

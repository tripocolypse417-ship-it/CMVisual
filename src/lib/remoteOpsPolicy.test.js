import { describe, it, expect } from 'vitest';
import { validateRemoteCommand } from './remoteOpsPolicy';

const now = 1_800_000_000_000;
const command = { id: 'c-1', deviceId: 'phone-1', action: 'device.status.read', issuedAt: now - 1000, expiresAt: now + 5000 };
const context = () => ({ authenticated: true, ownerAuthorized: true, deviceId: 'phone-1', now, seenCommandIds: new Set(), syncConsent: false });

describe('remote operations admission', () => {
  it('admits a bounded read-only command', () => expect(validateRemoteCommand(command, context()).allowed).toBe(true));
  it('denies unauthenticated commands', () => expect(validateRemoteCommand(command, { ...context(), authenticated: false }).allowed).toBe(false));
  it('denies wrong device', () => expect(validateRemoteCommand(command, { ...context(), deviceId: 'other' }).allowed).toBe(false));
  it('denies replay', () => expect(validateRemoteCommand(command, { ...context(), seenCommandIds: new Set(['c-1']) }).reason).toBe('replay-detected'));
  it('denies expired commands', () => expect(validateRemoteCommand({ ...command, expiresAt: now }, context()).allowed).toBe(false));
  it('denies arbitrary shell execution', () => expect(validateRemoteCommand({ ...command, action: 'shell.execute' }, context()).allowed).toBe(false));
  it('denies remote execution while offline', () => expect(validateRemoteCommand(command, { ...context(), offline: true }).allowed).toBe(false));
  it('requires sync consent', () => expect(validateRemoteCommand({ ...command, action: 'evidence.sync.request' }, context()).reason).toBe('sync-consent-required'));
});

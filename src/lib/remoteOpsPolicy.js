// WaveRadar remote operations: deny-by-default command admission.
// This module does not establish a network connection or execute device commands.
export const REMOTE_ACTIONS = Object.freeze([
  'device.status.read',
  'evidence.queue.read',
  'evidence.sync.request',
  'diagnostics.run',
]);

const MAX_CLOCK_SKEW_MS = 30_000;
const MAX_TTL_MS = 60_000;
const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/;

export function validateRemoteCommand(command, context) {
  const deny = (reason) => ({ allowed: false, reason });
  if (!command || typeof command !== 'object' || Array.isArray(command)) return deny('invalid-command');
  if (!context || typeof context !== 'object') return deny('missing-context');
  if (!context.authenticated || !context.ownerAuthorized) return deny('unauthorized');
  if (context.revoked || context.locked) return deny('session-revoked');
  if (context.offline) return deny('offline-no-remote-execution');
  if (!REMOTE_ACTIONS.includes(command.action)) return deny('action-not-allowlisted');
  if (!ID_PATTERN.test(command.id ?? '') || !ID_PATTERN.test(command.deviceId ?? '')) return deny('invalid-identifiers');
  if (command.deviceId !== context.deviceId) return deny('device-mismatch');
  if (typeof command.issuedAt !== 'number' || !Number.isFinite(command.issuedAt)) return deny('invalid-time');
  if (typeof command.expiresAt !== 'number' || !Number.isFinite(command.expiresAt)) return deny('invalid-expiry');
  const now = context.now;
  if (typeof now !== 'number' || !Number.isFinite(now)) return deny('invalid-clock');
  if (command.issuedAt > now + MAX_CLOCK_SKEW_MS) return deny('future-command');
  if (command.expiresAt <= now || command.expiresAt <= command.issuedAt || command.expiresAt - command.issuedAt > MAX_TTL_MS) return deny('expired-or-excessive-ttl');
  if (!(context.seenCommandIds instanceof Set)) return deny('replay-store-unavailable');
  if (context.seenCommandIds.has(command.id)) return deny('replay-detected');
  if (command.action === 'evidence.sync.request' && !context.syncConsent) return deny('sync-consent-required');
  if (command.payload != null && (typeof command.payload !== 'object' || Array.isArray(command.payload) || Object.keys(command.payload).length !== 0)) return deny('unexpected-payload');
  // Caller MUST atomically persist id before execution; this function is pure.
  return { allowed: true, reason: 'admitted', commandId: command.id };
}

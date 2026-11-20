/**
 * WaveRadar Remote Desktop session contract (platform-neutral).
 * No device capture, gesture dispatch, authentication, or network transport occurs here.
 * A native Android agent must independently enforce consent on every operation.
 */
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const MAX_DURATION_MS = 15 * 60_000;
const MAX_IDLE_MS = 90_000;
const deny = (reason) => ({ allowed: false, reason });
const validTime = (value) => Number.isSafeInteger(value) && value >= 0;

export function createRemoteDesktopSession({ id, deviceId, operatorId, now, durationMs = 5 * 60_000 }) {
  if (![id, deviceId, operatorId].every((value) => typeof value === 'string' && IDENTIFIER.test(value))) {
    throw new TypeError('invalid-session-identity');
  }
  if (!validTime(now) || !Number.isSafeInteger(durationMs) || durationMs < 1000 || durationMs > MAX_DURATION_MS || !validTime(now + durationMs)) {
    throw new TypeError('invalid-session-time');
  }
  return Object.freeze({
    id, deviceId, operatorId, createdAt: now, expiresAt: now + durationMs,
    lastActiveAt: now, status: 'awaiting-pairing', screenApproved: false,
    inputApproved: false, stoppedReason: null,
  });
}

function stop(session, reason) {
  return Object.freeze({ ...session, status: 'stopped', screenApproved: false, inputApproved: false, stoppedReason: reason });
}

export function advanceRemoteDesktopSession(session, event, now) {
  if (!session || typeof session !== 'object' || !event || typeof event !== 'object' || !validTime(now)) {
    throw new TypeError('invalid-session-event');
  }
  if (session.status === 'stopped') return session;
  if (now < session.createdAt || now < session.lastActiveAt) return stop(session, 'clock-regression');
  if (now >= session.expiresAt) return stop(session, 'expired');
  if (now - session.lastActiveAt > MAX_IDLE_MS) return stop(session, 'idle-timeout');
  if (['stop', 'disconnect', 'permission-revoked', 'screen-capture-stopped'].includes(event.type)) {
    return stop(session, event.type);
  }
  // Events are local, device-side confirmations. Remote messages must not forge them.
  if (session.status === 'awaiting-pairing' && event.type === 'pair-confirmed' &&
      event.localOwnerApproved === true && event.operatorAuthenticated === true &&
      event.deviceId === session.deviceId && event.operatorId === session.operatorId) {
    return Object.freeze({ ...session, status: 'paired', lastActiveAt: now });
  }
  if (session.status === 'paired' && event.type === 'screen-consent-confirmed' &&
      event.androidProjectionApproved === true && event.localOwnerApproved === true && event.visibleIndicator === true) {
    return Object.freeze({ ...session, status: 'viewing', screenApproved: true, lastActiveAt: now });
  }
  if (session.status === 'viewing' && event.type === 'input-consent-confirmed' &&
      event.localOwnerApproved === true && event.androidInputServiceEnabled === true && event.visibleIndicator === true) {
    return Object.freeze({ ...session, status: 'controlling', inputApproved: true, lastActiveAt: now });
  }
  if (['viewing', 'controlling'].includes(session.status) && event.type === 'heartbeat' && event.deviceAuthenticated === true) {
    return Object.freeze({ ...session, lastActiveAt: now });
  }
  return session;
}

/**
 * Admit only bounded diagnostic and pointer commands; replay protection is supplied by
 * a durable, atomic nonce store in the caller (in-memory Sets are not production-safe).
 */
export function authorizeRemoteDesktopCommand(session, command, context) {
  if (!session || !command || !context || typeof command !== 'object') return deny('invalid-command');
  if (session.status === 'stopped') return deny('session-stopped');
  const { now, authenticated, deviceId, operatorId, previouslySeenIds } = context;
  if (!validTime(now) || now < session.createdAt || now < session.lastActiveAt || now >= session.expiresAt || now - session.lastActiveAt > MAX_IDLE_MS) return deny('session-expired');
  if (authenticated !== true || deviceId !== session.deviceId || operatorId !== session.operatorId || command.sessionId !== session.id) return deny('unauthorized-controller');
  if (typeof command.id !== 'string' || !IDENTIFIER.test(command.id)) return deny('invalid-command-id');
  // Synchronous checks are useful for preview/testing, but are never sufficient for dispatch.
  // Production admission MUST call authorizeAndReserveRemoteDesktopCommand below.
  if (!(previouslySeenIds instanceof Set) && typeof context.replayStore?.reserve !== 'function') return deny('replay-protection-unavailable');
  if (previouslySeenIds instanceof Set && previouslySeenIds.has(command.id)) return deny('replay-detected');
  if (command.action === 'device.status.read') {
    return ['paired', 'viewing', 'controlling'].includes(session.status) ? { allowed: true, reason: 'admitted' } : deny('pairing-required');
  }
  if (command.action === 'screen.frame.request') {
    return session.screenApproved && ['viewing', 'controlling'].includes(session.status) ? { allowed: true, reason: 'admitted' } : deny('screen-consent-required');
  }
  if (!session.inputApproved || session.status !== 'controlling') return deny('input-consent-required');
  // No arbitrary shell, text injection, accessibility-node inspection, or keylogging.
  const p = command.payload;
  const point = (x, y) => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1 && typeof y === 'number' && Number.isFinite(y) && y >= 0 && y <= 1;
  if (command.action === 'input.tap' && p && Object.keys(p).sort().join(',') === 'x,y' && point(p.x, p.y)) return { allowed: true, reason: 'admitted' };
  if (command.action === 'input.swipe' && p && Object.keys(p).sort().join(',') === 'durationMs,x1,x2,y1,y2' && point(p.x1, p.y1) && point(p.x2, p.y2) && Number.isInteger(p.durationMs) && p.durationMs >= 100 && p.durationMs <= 1500) return { allowed: true, reason: 'admitted' };
  return deny('command-not-allowlisted');
}

/**
 * Required production-facing admission boundary. The injected replayStore must
 * implement a durable, atomic reserve(sessionId, commandId) operation that returns
 * true ONLY when this command ID is newly and durably reserved. Returns false for
 * duplicates and throws on persistence failures. Do not run input before this
 * function returns allowed:true; native Android must re-check active OS consent,
 * transport binding, and live session revocation at the actual dispatch boundary.
 * This module never captures a screen or executes a gesture.
 */
export async function authorizeAndReserveRemoteDesktopCommand(session, command, context) {
  const reserve = context?.replayStore?.reserve;
  if (typeof reserve !== 'function') return deny('durable-replay-store-unavailable');
  const admission = authorizeRemoteDesktopCommand(session, command, context);
  if (!admission.allowed) return admission;
  try {
    const newlyReserved = await reserve.call(context.replayStore, session.id, command.id);
    if (newlyReserved !== true) return deny(newlyReserved === false ? 'replay-detected' : 'replay-reservation-unconfirmed');
  } catch {
    return deny('replay-reservation-failed');
  }
  return { allowed: true, reason: 'admitted-and-reserved', replayReserved: true, commandId: command.id };
}

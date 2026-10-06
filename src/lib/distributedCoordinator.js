/**
 * WaveRadar distributed sensing coordinator.
 * Assigns work to nearby capable phones without changing measurement provenance.
 */

export const SENSOR_TASKS = Object.freeze([
  'VISUAL_COVERAGE',
  'MOTION_TRACKING',
  'DEPTH_MAPPING',
  'RANGING',
  'AUDIO_EVENT',
  'ENVIRONMENTAL_SAMPLE',
  'LANDMARK_CONFIRMATION',
]);

export function rankPeerForTask(peer = {}, task, context = {}) {
  const capabilities = new Set(peer.capabilities || []);
  const preferred = {
    VISUAL_COVERAGE: ['CAMERA'],
    MOTION_TRACKING: ['IMU'],
    DEPTH_MAPPING: ['AR_DEPTH', 'CAMERA'],
    RANGING: ['UWB', 'WIFI_RTT', 'BLUETOOTH_RANGING'],
    AUDIO_EVENT: ['MICROPHONE'],
    ENVIRONMENTAL_SAMPLE: ['BAROMETER', 'LIGHT', 'PROXIMITY'],
    LANDMARK_CONFIRMATION: ['CAMERA', 'AR_DEPTH'],
  }[task] || [];

  const capabilityScore = preferred.reduce((n, c) => n + (capabilities.has(c) ? 1 : 0), 0);
  const batteryScore = Number.isFinite(peer.battery) ? Math.max(0, Math.min(1, peer.battery / 100)) : 0.5;
  const latencyScore = Number.isFinite(peer.latencyMs) ? 1 / (1 + Math.max(0, peer.latencyMs) / 100) : 0.5;
  const distanceScore = Number.isFinite(context.distanceMeters) && Number.isFinite(peer.distanceMeters)
    ? 1 / (1 + Math.max(0, peer.distanceMeters) / 10)
    : 0.5;

  return capabilityScore * 4 + batteryScore + latencyScore + distanceScore;
}

export function assignSensorTasks(peers = [], tasks = SENSOR_TASKS, context = {}) {
  const assignments = [];
  const used = new Set();

  for (const task of tasks) {
    const ranked = peers
      .filter((p) => p && p.deviceId && !used.has(p.deviceId))
      .map((p) => ({ peer: p, score: rankPeerForTask(p, task, context) }))
      .sort((a, b) => b.score - a.score);

    const winner = ranked[0];
    if (!winner) continue;

    used.add(winner.peer.deviceId);
    assignments.push({
      task,
      deviceId: winner.peer.deviceId,
      score: winner.score,
      reason: 'CAPABILITY_AND_RUNTIME_FIT',
      evidenceClass: 'DERIVED',
    });
  }

  return assignments;
}

/**
 * Resource sharing is opt-in and task-scoped. No camera/microphone/location
 * stream should be silently shared with peers.
 */
export function createPeerSession({ deviceId, capabilities = [], consent = false } = {}) {
  return {
    deviceId,
    capabilities,
    consent: Boolean(consent),
    sessionState: consent ? 'READY' : 'WAITING_FOR_CONSENT',
    createdAt: Date.now(),
  };
}

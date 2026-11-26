/** Capability-driven RESEARCH scheduler. No hardware probes, device access or pose inference. */
const provider = (id, inputs, output, group, cost) => Object.freeze({
  id, inputs: Object.freeze(inputs), output, group, cost,
});
export const PROVIDERS = Object.freeze([
  provider('arcore', ['arcore'], 'POSE', 'camera-imu', 3),
  provider('webxr', ['webxr'], 'POSE', 'camera-imu', 3),
  provider('visual-odometry', ['camera'], 'RELATIVE_MOTION', 'camera', 3),
  provider('visual-inertial', ['camera','accelerometer','gyroscope'], 'RELATIVE_POSE', 'camera-imu', 4),
  provider('visual-slam', ['camera'], 'RELATIVE_MAP', 'camera', 4),
  provider('visual-markers', ['camera','surveyed-markers'], 'ANCHORED_POSE_CANDIDATE', 'camera', 2),
  provider('inertial', ['accelerometer','gyroscope'], 'RELATIVE_MOTION', 'imu', 1),
  provider('step-estimation', ['accelerometer'], 'STEP_CANDIDATE', 'imu', 1),
  provider('magnetic-heading', ['magnetometer'], 'HEADING_CANDIDATE', 'magnetic', 1),
  provider('barometric', ['barometer'], 'RELATIVE_HEIGHT', 'pressure', 1),
  provider('gnss', ['gnss'], 'OUTDOOR_FIX', 'gnss', 1),
  provider('wifi-rtt', ['wifi-rtt','surveyed-radio-anchors'], 'RANGE', 'radio', 2),
  provider('uwb', ['uwb','surveyed-radio-anchors'], 'RANGE', 'radio', 2),
  provider('ble-rssi', ['ble'], 'SIGNAL_STRENGTH', 'radio', 1),
  provider('wifi-csi', ['authorized-csi-adapter'], 'CHANNEL_FEATURES', 'radio', 3),
  provider('lidar', ['lidar'], 'POINT_CLOUD', 'lidar', 4),
  provider('radar', ['authorized-radar'], 'RANGE_DOPPLER', 'radar', 3),
  provider('thermal', ['thermal'], 'THERMAL_PIXELS', 'thermal', 2),
  provider('acoustic', ['microphone','authorized-audio-session'], 'ACOUSTIC_FEATURES', 'acoustic', 2),
  provider('building-map', ['authorized-surveyed-map'], 'MAP_CONSTRAINTS', 'map', 1),
  provider('peer-pose', ['authorized-peer','verified-frame-transform'], 'PEER_POSE_CANDIDATE', 'peer', 2),
]);
const isReady = state => state?.supported === true && state?.permission === 'GRANTED' &&
  state?.available === true && state?.authorized === true;
export function planProviders(capabilities = {}, { budget = 8, rotation = 0 } = {}) {
  if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities) ||
      !Number.isInteger(budget) || budget < 0 || budget > 100 ||
      !Number.isSafeInteger(rotation) || rotation < 0) throw new TypeError('INVALID_PLAN_INPUT');
  const blocked = [], eligible = [];
  for (const p of PROVIDERS) {
    const missing = p.inputs.filter(id => !Object.hasOwn(capabilities,id) || !isReady(capabilities[id]));
    if (missing.length) blocked.push({id:p.id,missing,reason:'CAPABILITY_OR_AUTHORIZATION_NOT_ESTABLISHED'});
    else eligible.push(p);
  }
  // Rotate across available providers and prefer different hardware groups first.
  // This is budget allocation, not a claim of statistically independent signals.
  const start=eligible.length ? rotation % eligible.length : 0;
  const ordered=eligible.slice(start).concat(eligible.slice(0,start));
  const selected=[], deferred=[], groups=new Set();
  let remaining=budget;
  for (const pass of [0,1]) {
    for (const p of ordered) {
      if (selected.some(s=>s.id===p.id)) continue;
      if (pass===0 && groups.has(p.group)) continue;
      if (p.cost>remaining) continue;
      remaining-=p.cost;groups.add(p.group);selected.push(p);
    }
  }
  for (const p of eligible) if (!selected.some(s=>s.id===p.id)) deferred.push({id:p.id,reason:'RESOURCE_BUDGET'});
  return { selected, deferred, blocked, remainingBudget:remaining, status:'RESEARCH_PLAN_ONLY',
    absolutePositionEstablished:false, independentCorroborationEstablished:false,
    operationalUseAllowed:false, note:'Declared capabilities are not measured availability, calibration or independent validation.' };
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'cmvisual.federation';
const DEVICE_KEY = 'cmvisual.federation.device';
const TEAM_PACKET_SCHEMA = 'cmvisual-team-target-designation-v1';

function readConfig() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function getStableDeviceId() {
  // Keep the WaveRadar identity stable across reloads/restarts. Some mobile
  // browsers can temporarily block localStorage, so use sessionStorage/cookie
  // as fallbacks rather than returning a new ID on every render.
  const read = (store) => {
    try { return store?.getItem(DEVICE_KEY) || null; } catch { return null; }
  };
  const write = (store, value) => {
    try { store?.setItem(DEVICE_KEY, value); } catch {}
  };

  const existing = read(globalThis.localStorage) || read(globalThis.sessionStorage);
  if (existing) {
    write(globalThis.localStorage, existing);
    write(globalThis.sessionStorage, existing);
    return existing;
  }

  try {
    const cookie = document.cookie
      .split(';')
      .map(v => v.trim())
      .find(v => v.startsWith(`${DEVICE_KEY}=`));
    if (cookie) {
      const value = decodeURIComponent(cookie.slice(DEVICE_KEY.length + 1));
      if (value) {
        write(globalThis.localStorage, value);
        write(globalThis.sessionStorage, value);
        return value;
      }
    }
  } catch {}

  const id = globalThis.crypto?.randomUUID?.() ||
    `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  write(globalThis.localStorage, id);
  write(globalThis.sessionStorage, id);
  try {
    document.cookie = `${DEVICE_KEY}=${encodeURIComponent(id)}; Max-Age=31536000; Path=/; SameSite=Lax`;
  } catch {}
  return id;
}

/**
 * Opt-in federation adapter. Disabled by default. Only coarse, provenance-rich
 * observation packets are shared; no names, identity, biometrics, raw camera
 * frames, or psychological labels are transmitted by this adapter. Multiple
 * authorized devices can contribute to the same local/world-model session.
 */
export default function useFederatedWorld() {
  const [config, setConfig] = useState(readConfig);
  const [deviceId] = useState(getStableDeviceId);
  const [lastPublish, setLastPublish] = useState(null);
  const [error, setError] = useState(null);
  const [remoteEvents, setRemoteEvents] = useState([]);
  const [remoteDevices, setRemoteDevices] = useState([]);
  const [remoteDesignations, setRemoteDesignations] = useState([]);
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch {} }, [config]);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, []);

  const ingestRemote = useCallback((packet) => {
    if (!packet) return 0;
    if (packet.schema === TEAM_PACKET_SCHEMA && Array.isArray(packet.designations)) {
      const incoming = packet.designations.filter(d => d?.designationId).map(d => ({ ...d, packetSchema: TEAM_PACKET_SCHEMA, federated: true, receivedAt: Date.now() }));
      if (!incoming.length) return 0;
      setRemoteDesignations(prev => {
        const byId = new Map(prev.map(d => [String(d.designationId), d]));
        incoming.forEach(d => byId.set(String(d.designationId), d));
        return [...byId.values()].slice(-256);
      });
      incoming.forEach(d => { try { window.dispatchEvent(new CustomEvent('waveradar:team-target-designation', { detail: d })); } catch {} });
      return incoming.length;
    }
    if (packet.schema !== 'cmvisual-world-observation-v1' || !Array.isArray(packet.events)) return 0;
    if (Array.isArray(packet.designations) && packet.designations.length) {
      const incomingDesignations = packet.designations.filter(d => d?.designationId).map(d => ({ ...d, packetSchema: TEAM_PACKET_SCHEMA, federated: true, receivedAt: Date.now(), originDeviceId: d.originDeviceId || packet.deviceId || 'remote-device' }));
      setRemoteDesignations(prev => {
        const byId = new Map(prev.map(d => [String(d.designationId), d]));
        incomingDesignations.forEach(d => byId.set(String(d.designationId), d));
        return [...byId.values()].slice(-256);
      });
      incomingDesignations.forEach(d => { try { window.dispatchEvent(new CustomEvent('waveradar:team-target-designation', { detail: d })); } catch {} });
    }
    const incoming = packet.events.filter(e => e && e.eventId && e.deviceId).map(e => ({ ...e, federated: true, receivedAt: Date.now(), coordinateFrame: e.coordinateFrame || packet.coordinateFrame || null }));
    if (!incoming.length) return packet.designations?.length || 0;
    setRemoteEvents(prev => {
      const byId = new Map(prev.map(e => [String(e.eventId), e]));
      incoming.forEach(e => byId.set(String(e.eventId), e));
      return [...byId.values()].slice(-500);
    });
    setRemoteDevices(prev => {
      const byId = new Map(prev.map(d => [String(d.deviceId), d]));
      incoming.forEach(e => byId.set(String(e.deviceId), {
        deviceId: e.deviceId,
        coordinateFrame: e.coordinateFrame || null,
        lastObservedAt: e.observedAt || null,
        receivedAt: Date.now(),
        geo: e.geo || null,
      }));
      return [...byId.values()].slice(-32);
    });
    return incoming.length;
  }, []);

  useEffect(() => {
    const onPacket = (event) => ingestRemote(event.detail);
    window.addEventListener('waveradar:federated-observations', onPacket);
    return () => window.removeEventListener('waveradar:federated-observations', onPacket);
  }, [ingestRemote]);

  const publish = useCallback(async (events = [], designations = []) => {
    if (!config.enabled || !config.endpoint || !Array.isArray(events) || !events.length) return { skipped: true };
    const packet = { schema: 'cmvisual-world-observation-v1', publishedAt: new Date().toISOString(), deviceId, coordinateFrame: config.coordinateFrame || null, events: events.slice(-100).map(e => ({ eventId:e.eventId, sessionId:e.sessionId, observedAt:e.observedAt, trackId:e.trackId, source:e.source, deviceId:e.provenance?.deviceId ?? e.deviceId ?? deviceId, type:e.type, evidenceClass:e.evidenceClass, position:e.position, worldPosition:e.worldPosition || null, coordinateFrame:e.coordinateFrame || config.coordinateFrame || null, distanceM:e.distanceM, angleDeg:e.angleDeg, moving:e.moving, speedMps:e.speedMps, confidence:e.confidence, uncertaintyM:e.uncertaintyM, geo:e.geo })), designations: Array.isArray(designations) ? designations.slice(-64) : [] };
    try {
      const res = await fetch(config.endpoint, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(packet), keepalive:true });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLastPublish(Date.now()); setError(null); return { ok:true };
    } catch (e) { setError(e.message); return { ok:false, error:e.message }; }
  }, [config]);

  const deviceCount = useMemo(() => new Set(remoteEvents.map(e => e.deviceId).filter(Boolean)).size, [remoteEvents]);
  const deviceHealth = useMemo(() => remoteDevices.map(d => ({ ...d, ageMs: d.receivedAt ? clock - d.receivedAt : null, stale: d.receivedAt ? clock - d.receivedAt > 15000 : true })), [remoteDevices, clock]);
  // Only observations explicitly expressed in the same configured world frame are
  // eligible for spatial fusion. A remote packet with no shared frame remains
  // visible as federation telemetry but is never placed into the local world.
  const projectableEvents = useMemo(() => {
    const frame = String(config.coordinateFrame || '').trim();
    if (!frame) return [];
    const transform = config.transform || {};
    const scale = Number.isFinite(Number(transform.scale)) && Number(transform.scale) > 0 ? Number(transform.scale) : 1;
    const rotationDeg = Number.isFinite(Number(transform.rotationDeg)) ? Number(transform.rotationDeg) : 0;
    const tx = Number.isFinite(Number(transform.translationX)) ? Number(transform.translationX) : 0;
    const tz = Number.isFinite(Number(transform.translationZ)) ? Number(transform.translationZ) : 0;
    const a = rotationDeg * Math.PI / 180;
    const cos = Math.cos(a), sin = Math.sin(a);
    return remoteEvents.filter(e => String(e.coordinateFrame || '') === frame && e.worldPosition && Number.isFinite(Number(e.worldPosition.x)) && Number.isFinite(Number(e.worldPosition.z))).map(e => {
      const x0 = Number(e.worldPosition.x) * scale;
      const z0 = Number(e.worldPosition.z) * scale;
      return {
        ...e,
        position: { x: x0 * cos - z0 * sin + tx, y: Number(e.worldPosition.y || 0), z: x0 * sin + z0 * cos + tz },
        source: `FEDERATED · ${e.source || 'REMOTE SENSOR'}`,
        evidenceClass: 'FEDERATED_MEASURED',
        alignment: { frame, scale, rotationDeg, translationX: tx, translationZ: tz },
      };
    });
  }, [remoteEvents, config.coordinateFrame, config.transform]);

  return useMemo(() => ({ config, setConfig, deviceId, publish, ingestRemote, remoteEvents, remoteDevices, remoteDesignations, deviceHealth, projectableEvents, deviceCount, lastPublish, error, enabled: Boolean(config.enabled && config.endpoint), teamPacketSchema: TEAM_PACKET_SCHEMA }), [config, deviceId, publish, ingestRemote, remoteEvents, remoteDevices, remoteDesignations, deviceHealth, projectableEvents, deviceCount, lastPublish, error]);
}
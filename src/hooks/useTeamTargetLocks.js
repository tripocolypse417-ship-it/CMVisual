import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'cmvisual.teamTargetLocks.v2';
const PACKET_SCHEMA = 'cmvisual-team-target-designation-v2';
const STALE_AFTER_MS = 8000;
const LOST_AFTER_MS = 20000;

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function stableId(prefix = 'lock') {
  return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Validate that a world coordinate has finite x/z. Null coordinates are allowed
 *  for targetId-only designations (no spatial claim). */
function validateCoordinate(wp) {
  if (wp == null) return true; // targetId-only designation — no spatial claim
  const x = Number(wp?.x);
  const z = Number(wp?.z);
  return Number.isFinite(x) && Number.isFinite(z);
}

function acquisitionSafeForPublish(rows) {
  return (Array.isArray(rows) ? rows : []).filter(d => d && d.designationId).map(d => ({
    schema: PACKET_SCHEMA,
    designationId: d.designationId,
    targetId: d.targetId || null,
    worldPosition: validateCoordinate(d.worldPosition) ? d.worldPosition : null,
    source: d.source || 'OPERATOR',
    priority: d.priority || 'NORMAL',
    label: d.label || 'DESIGNATED TARGET',
    acquisitionRadiusM: Number.isFinite(Number(d.acquisitionRadiusM)) ? Number(d.acquisitionRadiusM) : 2,
    expiresAt: d.expiresAt || null,
    evidenceRefs: Array.isArray(d.evidenceRefs) ? d.evidenceRefs.slice(0, 16) : [],
    createdAt: d.createdAt || null,
    assignedDeviceId: d.assignedDeviceId || null,
    originDeviceId: d.originDeviceId || null,
    acquiredTrackId: d.acquiredTrackId || null,
    lastAcquiredAt: d.lastAcquiredAt || null,
    routing: d.routing || null,
  }));
}

/**
 * Shared target-designation layer. A designation is a request to acquire a
 * track, not proof that a target exists.
 *
 * No-silent-retarget: once a designation has acquired a specific track, it is
 * locked to that trackId. If the track disappears the status transitions to
 * STALE then LOST — it never silently retargets to a different nearby track.
 * Only an explicit re-designation by the operator can acquire a new track.
 */
export default function useTeamTargetLocks({ liveDetections = [], deviceId = 'local-device', maxCapacity = 1 } = {}) {
  const [designations, setDesignations] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(designations.slice(-256))); } catch {}
  }, [designations]);

  const designate = useCallback(({ targetId = null, worldPosition = null, source = 'ADMIN', priority = 'NORMAL', label = 'DESIGNATED TARGET', acquisitionRadiusM = 2, expiresAt = null, evidenceRefs = [], assignedDeviceId = null } = {}) => {
    if (!validateCoordinate(worldPosition)) return null;
    const id = stableId('target-lock');
    const now = new Date().toISOString();
    const designation = {
      designationId: id,
      targetId: targetId == null ? null : String(targetId),
      worldPosition: worldPosition && validateCoordinate(worldPosition) ? worldPosition : null,
      source,
      priority,
      label,
      acquisitionRadiusM: Number.isFinite(Number(acquisitionRadiusM)) ? Math.max(0.25, Number(acquisitionRadiusM)) : 2,
      expiresAt,
      evidenceRefs: Array.isArray(evidenceRefs) ? evidenceRefs.slice(0, 16) : [],
      createdAt: now,
      status: 'SEARCHING',
      acquiredTrackId: null,
      lastAcquiredAt: null,
      assignedDeviceId: assignedDeviceId == null ? null : String(assignedDeviceId),
      packetSchema: PACKET_SCHEMA,
      originDeviceId: deviceId,
      routing: { originDeviceId: deviceId, assignedDeviceId: assignedDeviceId || null, hops: 0, lastRoutedAt: now },
    };
    setDesignations(prev => [...prev, designation].slice(-256));
    try { window.dispatchEvent(new CustomEvent('waveradar:team-target-designation', { detail: designation })); } catch {}
    return designation;
  }, [deviceId]);

  const cancel = useCallback((designationId) => {
    setDesignations(prev => prev.map(d => d.designationId === designationId ? { ...d, status: 'CANCELLED' } : d));
  }, []);

  const reacquire = useCallback((designationId) => {
    // Explicit operator re-designation: clears the acquired track so proximity
    // matching is allowed again. This is the ONLY path that retargets.
    setDesignations(prev => prev.map(d => d.designationId === designationId
      ? { ...d, acquiredTrackId: null, lastAcquiredAt: null, status: 'SEARCHING' }
      : d));
  }, []);

  const ingestDesignation = useCallback((designation) => {
    if (!designation || (designation.packetSchema && designation.packetSchema !== PACKET_SCHEMA)) return false;
    if (!designation.designationId) return false;
    if (!validateCoordinate(designation.worldPosition)) return false;
    const incoming = {
      ...designation,
      designationId: String(designation.designationId),
      targetId: designation.targetId == null ? null : String(designation.targetId),
      source: designation.source || 'FEDERATED',
      originDeviceId: designation.originDeviceId || 'remote-device',
      assignedDeviceId: designation.assignedDeviceId == null ? null : String(designation.assignedDeviceId),
      evidenceRefs: Array.isArray(designation.evidenceRefs) ? designation.evidenceRefs.slice(0, 16) : [],
      packetSchema: PACKET_SCHEMA,
      routing: {
        originDeviceId: designation.originDeviceId || 'remote-device',
        assignedDeviceId: designation.assignedDeviceId || null,
        hops: (designation.routing?.hops || 0) + 1,
        lastRoutedAt: new Date().toISOString(),
      },
    };
    if (incoming.originDeviceId === deviceId) return false;
    setDesignations(prev => {
      const existing = prev.find(d => d.designationId === incoming.designationId);
      if (existing && JSON.stringify(existing) === JSON.stringify(incoming)) return prev;
      const without = prev.filter(d => d.designationId !== incoming.designationId);
      return [...without, incoming].slice(-256);
    });
    return true;
  }, [deviceId]);

  useEffect(() => {
    const onDesignation = (event) => ingestDesignation(event.detail);
    window.addEventListener('waveradar:team-target-designation', onDesignation);
    return () => window.removeEventListener('waveradar:team-target-designation', onDesignation);
  }, [ingestDesignation]);

  const clearCompleted = useCallback(() => {
    setDesignations(prev => prev.filter(d => !['CANCELLED', 'EXPIRED', 'LOST'].includes(d.status)));
  }, []);

  const publishable = useMemo(() => acquisitionSafeForPublish(designations), [designations]);

  const capacity = useMemo(() => {
    const n = Number(maxCapacity);
    return Number.isFinite(n) && n > 0 ? Math.max(1, Math.floor(n)) : 1;
  }, [maxCapacity]);

  const acquisition = useMemo(() => {
    const active = designations.filter(d => !['CANCELLED', 'EXPIRED', 'LOST'].includes(d.status));
    const byTrack = new Map(liveDetections.map(d => [String(d.trackId ?? d.id), d]));
    const now = Date.now();

    return active.map(d => {
      const lastAcquiredMs = d.lastAcquiredAt ? Date.parse(d.lastAcquiredAt) : 0;
      const sinceAcquired = now - lastAcquiredMs;

      // No-silent-retarget: once acquired, only match by the exact trackId.
      let match = null;
      if (d.acquiredTrackId) {
        match = byTrack.get(String(d.acquiredTrackId)) || null;
      } else if (d.targetId) {
        // First acquisition by targetId
        match = byTrack.get(String(d.targetId)) || null;
      }
      // First acquisition by spatial proximity — only when no track is acquired yet
      if (!match && !d.acquiredTrackId && d.worldPosition) {
        let best = null;
        for (const candidate of liveDetections) {
          const p = candidate?.position;
          if (!p || !Number.isFinite(Number(p.x)) || !Number.isFinite(Number(p.z))) continue;
          const dx = Number(p.x) - Number(d.worldPosition.x);
          const dz = Number(p.z) - Number(d.worldPosition.z);
          const dist = Math.hypot(dx, dz);
          if (dist <= d.acquisitionRadiusM && (!best || dist < best.dist)) best = { candidate, dist };
        }
        match = best?.candidate || null;
      }

      const expired = d.expiresAt && Date.parse(d.expiresAt) <= now;

      let status;
      if (expired) {
        status = 'EXPIRED';
      } else if (match) {
        status = 'ACQUIRED';
      } else if (d.acquiredTrackId) {
        // Was acquired, track now gone — STALE then LOST, never retarget
        status = sinceAcquired > LOST_AFTER_MS ? 'LOST' : 'STALE';
      } else if (d.lastAcquiredAt && sinceAcquired > LOST_AFTER_MS) {
        status = 'LOST';
      } else if (d.lastAcquiredAt && sinceAcquired > STALE_AFTER_MS) {
        status = 'STALE';
      } else {
        status = 'SEARCHING';
      }

      const acquiredTrackId = match ? String(match.trackId ?? match.id) : (d.acquiredTrackId || null);
      const lastAcquiredAt = match ? new Date().toISOString() : d.lastAcquiredAt;

      // Routing metadata: which device holds the acquisition
      const assignedDeviceId = match ? deviceId : (d.assignedDeviceId || null);
      const routing = {
        originDeviceId: d.routing?.originDeviceId || d.originDeviceId || deviceId,
        assignedDeviceId,
        hops: d.routing?.hops || 0,
        lastRoutedAt: match ? new Date().toISOString() : (d.routing?.lastRoutedAt || d.createdAt),
      };

      return { ...d, status, acquiredTrackId, lastAcquiredAt, assignedDeviceId, routing, acquiredDetection: match || null };
    });
  }, [designations, liveDetections, deviceId]);

  // Persist acquired track IDs back to state so the no-silent-retarget lock
  // survives re-renders. Once a designation acquires a track, only that exact
  // trackId is matched on subsequent renders — proximity matching is disabled.
  useEffect(() => {
    setDesignations(prev => {
      let changed = false;
      const next = prev.map(d => {
        const acq = acquisition.find(a => a.designationId === d.designationId);
        if (!acq || !acq.acquiredTrackId) return d;
        if (acq.acquiredTrackId !== d.acquiredTrackId) {
          changed = true;
          return { ...d, acquiredTrackId: acq.acquiredTrackId, lastAcquiredAt: acq.lastAcquiredAt, assignedDeviceId: acq.assignedDeviceId, routing: acq.routing };
        }
        return d;
      });
      return changed ? next : prev;
    });
  }, [acquisition]);

  const acquired = acquisition.filter(d => d.status === 'ACQUIRED');
  const availableSlots = Math.max(0, capacity - acquired.length);

  const publishDesignations = useCallback(() => {
    const packet = { schema: PACKET_SCHEMA, publishedAt: new Date().toISOString(), deviceId, designations: acquisitionSafeForPublish(acquisition) };
    try { window.dispatchEvent(new CustomEvent('waveradar:team-target-designations', { detail: packet })); } catch {}
    return packet;
  }, [acquisition, deviceId]);

  return { designations: acquisition, acquired, capacity, availableSlots, designate, cancel, reacquire, clearCompleted, ingestDesignation, publishable, publishDesignations, packetSchema: PACKET_SCHEMA };
}
import { useEffect, useRef, useState } from 'react';
import { parseTimestamp } from '@/lib/dataContract';

// Cellular telemetry is an environmental/radio layer only. A normal browser
// cannot access Android TelephonyManager directly, so this hook listens for an
// explicit native bridge and remains UNAVAILABLE when that bridge is absent.
const STALE_AFTER_MS = 5000;

function numberOrNull(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeCell(cell = {}) {
  return {
    technology: cell.technology ?? cell.radioTechnology ?? cell.type ?? null,
    registered: Boolean(cell.registered ?? cell.isRegistered ?? false),
    dbm: numberOrNull(cell.dbm ?? cell.signalDbm ?? cell.rssi),
    asu: numberOrNull(cell.asu ?? cell.signalAsu),
    cellId: cell.cellId ?? cell.cid ?? cell.nci ?? null,
    tac: cell.tac ?? cell.lac ?? null,
    pci: cell.pci ?? null,
    mcc: cell.mcc ?? cell.mccString ?? null,
    mnc: cell.mnc ?? cell.mncString ?? null,
    timestamp: parseTimestamp(cell.timestamp ?? cell.measuredAt),
  };
}

export default function useCellularFusion(enabled = true) {
  const [state, setState] = useState({
    available: false,
    permissionState: 'unknown',
    status: 'UNAVAILABLE',
    reason: 'NATIVE BRIDGE REQUIRED',
    radioTechnology: null,
    registeredCell: null,
    cells: [],
    ageMs: null,
    transitionCount: 0,
    lastUpdateAt: null,
  });
  const lastRegisteredRef = useRef(null);
  const transitionRef = useRef(0);

  useEffect(() => {
    if (!enabled) return undefined;

    const accept = (raw) => {
      const payload = raw?.detail && typeof raw.detail === 'object' ? raw.detail : raw;
      if (!payload || typeof payload !== 'object') return;

      const cells = Array.isArray(payload.cells)
        ? payload.cells.map(normalizeCell)
        : payload.registeredCell
          ? [normalizeCell({ ...payload.registeredCell, registered: true })]
          : [];
      const registered = cells.find((c) => c.registered) ?? (payload.registeredCell ? normalizeCell({ ...payload.registeredCell, registered: true }) : null);
      const previousId = lastRegisteredRef.current;
      const currentId = registered?.cellId != null ? String(registered.cellId) : null;
      if (previousId != null && currentId != null && previousId !== currentId) transitionRef.current += 1;
      if (currentId != null) lastRegisteredRef.current = currentId;

      const updatedAt = parseTimestamp(payload.timestamp ?? payload.measuredAt ?? registered?.timestamp);
      const radioTechnology = payload.radioTechnology ?? payload.technology ?? registered?.technology ?? null;
      const permissionState = payload.permissionState ?? 'granted';
      const now = Date.now();
      const validTimestamp = updatedAt != null && Number.isFinite(updatedAt);
      const ageMs = validTimestamp ? now - updatedAt : null;
      const future = ageMs != null && ageMs < -30000;
      const stale = ageMs != null && ageMs > STALE_AFTER_MS;
      setState({
        available: true,
        permissionState,
        status: !validTimestamp || future ? 'UNVERIFIED TIME' : stale ? 'STALE' : 'LIVE',
        reason: !validTimestamp ? 'SOURCE TIMESTAMP MISSING' : future ? 'SOURCE TIMESTAMP FUTURE' : stale ? 'SOURCE TIMESTAMP STALE' : null,
        radioTechnology,
        registeredCell: registered,
        cells,
        ageMs: ageMs == null ? null : Math.max(0, ageMs),
        transitionCount: transitionRef.current,
        lastUpdateAt: validTimestamp && !future ? updatedAt : null,
      });
    };

    const onTelemetry = (event) => accept(event);
    const onCapabilities = (event) => {
      const detail = event.detail && typeof event.detail === 'object' ? event.detail : {};
      const telephony = detail.telephony ?? detail.cellular;
      if (!telephony) return;
      setState((prev) => ({
        ...prev,
        available: Boolean(telephony.available),
        permissionState: telephony.permissionState ?? prev.permissionState,
        status: telephony.available ? prev.status : 'UNAVAILABLE',
        reason: telephony.available ? null : (telephony.reason ?? 'NATIVE BRIDGE REQUIRED'),
      }));
    };

    window.addEventListener('cmvisual:telephony', onTelemetry);
    window.addEventListener('waveradar:telephony', onTelemetry);
    window.addEventListener('waveradar:ranging-capabilities', onCapabilities);

    const native = window.CMVISUAL_NATIVE?.telephony;
    if (native) {
      try {
        const result = typeof native.getCellInfo === 'function' ? native.getCellInfo() : null;
        if (result && typeof result.then === 'function') result.then(accept).catch(() => {});
        else if (result) accept(result);
        if (typeof native.subscribe === 'function') {
          const unsubscribe = native.subscribe(accept);
          return () => {
            window.removeEventListener('cmvisual:telephony', onTelemetry);
            window.removeEventListener('waveradar:telephony', onTelemetry);
            window.removeEventListener('waveradar:ranging-capabilities', onCapabilities);
            if (typeof unsubscribe === 'function') unsubscribe();
          };
        }
      } catch { /* bridge is optional */ }
    }

    return () => {
      window.removeEventListener('cmvisual:telephony', onTelemetry);
      window.removeEventListener('waveradar:telephony', onTelemetry);
      window.removeEventListener('waveradar:ranging-capabilities', onCapabilities);
    };
  }, [enabled]);

  useEffect(() => {
    if (!state.lastUpdateAt || !state.available) return undefined;
    const timer = window.setInterval(() => {
      setState((prev) => {
        if (!prev.lastUpdateAt) return prev;
        const ageMs = Math.max(0, Date.now() - prev.lastUpdateAt);
        return { ...prev, ageMs, status: ageMs > STALE_AFTER_MS ? 'STALE' : 'LIVE' };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state.lastUpdateAt, state.available]);

  return state;
}
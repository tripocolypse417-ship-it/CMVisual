import { useCallback, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { normalizeNetworkSnapshot } from '../lib/capabilityIntelligence';

const WaveRadarNetwork = registerPlugin('WaveRadarNetwork');

const initial = {
  phase: 'IDLE',
  native: false,
  permission: 'NOT_REQUESTED',
  capturedAt: null,
  observations: [],
  wifiStatus: 'UNKNOWN',
  cellularStatus: 'UNKNOWN',
  error: null,
  limitations: [
    'Android exposes cached Wi-Fi scan results; this action does not force a new radio scan.',
    'Cell information is platform/carrier controlled and may be stale, redacted, or unavailable.',
    'This phone cannot inventory devices on other VLANs, isolated networks, or radio zones.'
  ]
};

export default function useNativeNetworkDiscovery() {
  const [state, setState] = useState(initial);

  const discover = useCallback(async () => {
    setState((old) => ({ ...old, phase: 'REQUESTING_ACCESS', error: null }));
    if (!Capacitor.isNativePlatform()) {
      setState((old) => ({ ...old, phase: 'UNAVAILABLE', native: false, error: 'Native Android discovery is available only in the installed WaveRadar Android app.' }));
      return;
    }

    try {
      const capabilities = await WaveRadarNetwork.getCapabilities();
      const permissionResult = await WaveRadarNetwork.requestPermissions();
      const permission = permissionResult?.permissionState || capabilities?.permissionState || 'UNKNOWN';
      if (permission !== 'GRANTED') {
        setState((old) => ({ ...old, phase: 'PERMISSION_DENIED', native: true, permission, error: 'Location permission was not granted. Android requires it for the exposed Wi-Fi scan cache and cell information.' }));
        return;
      }

      setState((old) => ({ ...old, phase: 'READING_PLATFORM_DATA', native: true, permission }));
      const snapshot = await WaveRadarNetwork.getSnapshot();
      let bluetooth = { status: 'UNAVAILABLE', observations: [] };
      try {
        bluetooth = await WaveRadarNetwork.discoverBluetooth();
        bluetooth.status = 'AVAILABLE';
      } catch (bleError) {
        bluetooth = { status: 'UNAVAILABLE_OR_PERMISSION_DENIED', observations: [], reason: bleError?.message || 'BLE scan unavailable' };
      }
      const combinedSnapshot = { ...snapshot, bluetooth };
      const capturedAt = Number(snapshot?.capturedAt) || Date.now();
      const normalized = normalizeNetworkSnapshot(combinedSnapshot, { receivedAt: capturedAt });
      const result = {
        ...initial,
        phase: 'CAPTURED',
        native: true,
        permission,
        capturedAt,
        wifiStatus: normalized.wifiStatus,
        cellularStatus: normalized.cellularStatus,
        bluetoothStatus: normalized.bluetoothStatus,
        observations: normalized.observations,
        counts: normalized.counts,
        limitations: [
          ...initial.limitations,
          'Observation integrity is UNASSESSED; no independent ground-truth validation has been performed.',
          'Bluetooth collection is passive advertisement discovery only; no device address, name, identity, or GATT characteristic is collected.',
          'This capture is currently session-local. A durable WIS backend ingestion endpoint is not wired by this adapter.'
        ]
      };

      // Shared in-app handoff for WIS modules. The payload is an observation
      // envelope, not a claim that a server or durable world model stored it.
      window.dispatchEvent(new CustomEvent('waveradar:capability-observations', {
        detail: { source: 'android-network-discovery', capturedAt, snapshot: combinedSnapshot, normalized }
      }));
      const cells = Array.isArray(snapshot?.cellular?.cells) ? snapshot.cellular.cells.map((cell) => ({
        ...cell,
        timestamp: Number.isFinite(Number(cell?.ageMs)) && Number(cell.ageMs) >= 0 ? capturedAt - Number(cell.ageMs) : capturedAt
      })) : [];
      window.dispatchEvent(new CustomEvent('waveradar:telephony', {
        detail: {
          timestamp: capturedAt,
          measuredAt: capturedAt,
          permissionState: permission,
          radioTechnology: cells.find((cell) => cell.registered)?.technology || null,
          cells
        }
      }));
      window.dispatchEvent(new CustomEvent('waveradar:network-discovery', { detail: result }));
      setState(result);
    } catch (error) {
      setState((old) => ({ ...old, phase: 'ERROR', native: true, error: error?.message || 'Android network discovery failed.' }));
    }
  }, []);

  return { ...state, discover };
}

const DEVICE_KEY = 'cmvisual.federation.device';
const WAVERADAR_DEVICE_KEY = 'waveradar.device.id.v1';

function read(store, key = DEVICE_KEY) {
  try { return store?.getItem(key) || null; } catch { return null; }
}

function write(store, value, key = DEVICE_KEY) {
  try { store?.setItem(key, value); } catch {}
}

function readCookie(key = DEVICE_KEY) {
  try {
    const entry = document.cookie.split(';').map(v => v.trim()).find(v => v.startsWith(key + '='));
    return entry ? decodeURIComponent(entry.slice(key.length + 1)) : null;
  } catch { return null; }
}

function writeCookie(value, key = DEVICE_KEY) {
  try {
    document.cookie = key + '=' + encodeURIComponent(value) + '; Max-Age=31536000; Path=/; SameSite=Lax';
  } catch {}
}

export function getStableDeviceId() {
  // The guided setup wizard and enrollment-token API use this exact key.
  // Prefer it so the native bridge, device registry, and upload credential
  // refer to the same app-generated device identity.
  const registered = read(globalThis.localStorage, WAVERADAR_DEVICE_KEY) ||
    read(globalThis.sessionStorage, WAVERADAR_DEVICE_KEY);
  const legacy = read(globalThis.localStorage) || read(globalThis.sessionStorage) || readCookie();
  const existing = registered || legacy;
  if (existing) {
    write(globalThis.localStorage, existing, WAVERADAR_DEVICE_KEY);
    write(globalThis.sessionStorage, existing, WAVERADAR_DEVICE_KEY);
    write(globalThis.localStorage, existing);
    write(globalThis.sessionStorage, existing);
    writeCookie(existing);
    return existing;
  }

  const uuid = globalThis.crypto?.randomUUID?.() ||
    Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  const id = 'phone-' + uuid;
  write(globalThis.localStorage, id, WAVERADAR_DEVICE_KEY);
  write(globalThis.sessionStorage, id, WAVERADAR_DEVICE_KEY);
  write(globalThis.localStorage, id);
  write(globalThis.sessionStorage, id);
  writeCookie(id);
  return id;
}

export function getDeviceIdentityStatus() {
  const id = getStableDeviceId();
  return {
    id,
    initialized: typeof id === 'string' && id.length > 0,
    waveradarDeviceKey: !!read(globalThis.localStorage, WAVERADAR_DEVICE_KEY),
    localStorage: !!read(globalThis.localStorage),
    sessionStorage: !!read(globalThis.sessionStorage),
    cookie: !!readCookie(),
  };
}

export { DEVICE_KEY, WAVERADAR_DEVICE_KEY };

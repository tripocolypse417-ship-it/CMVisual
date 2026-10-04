const DEVICE_KEY = 'cmvisual.federation.device';

function read(store) {
  try { return store?.getItem(DEVICE_KEY) || null; } catch { return null; }
}

function write(store, value) {
  try { store?.setItem(DEVICE_KEY, value); } catch {}
}

function readCookie() {
  try {
    const entry = document.cookie.split(';').map(v => v.trim()).find(v => v.startsWith(DEVICE_KEY + '='));
    return entry ? decodeURIComponent(entry.slice(DEVICE_KEY.length + 1)) : null;
  } catch { return null; }
}

function writeCookie(value) {
  try {
    document.cookie = DEVICE_KEY + '=' + encodeURIComponent(value) + '; Max-Age=31536000; Path=/; SameSite=Lax';
  } catch {}
}

export function getStableDeviceId() {
  const existing = read(globalThis.localStorage) || read(globalThis.sessionStorage) || readCookie();
  if (existing) {
    write(globalThis.localStorage, existing);
    write(globalThis.sessionStorage, existing);
    writeCookie(existing);
    return existing;
  }

  const id = globalThis.crypto?.randomUUID?.() ||
    'device-' + Date.now() + '-' + Math.random().toString(36).slice(2);

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
    localStorage: !!read(globalThis.localStorage),
    sessionStorage: !!read(globalThis.sessionStorage),
    cookie: !!readCookie(),
  };
}

export { DEVICE_KEY };
// Real haptic feedback via the Vibration API. No-op on unsupported devices.
export function vibrate(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {}
}
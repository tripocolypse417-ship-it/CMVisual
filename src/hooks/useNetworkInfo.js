import { useState, useEffect } from 'react';

// Real network telemetry from the browser Network Information API.
// Exposes actual connection type / downlink / RTT — not wall-penetration data.
export default function useNetworkInfo() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return;
    const update = () => setInfo({
      type: conn.effectiveType,          // '4g' | '3g' | '2g' | 'slow-2g'
      connectionType: conn.type,         // 'wifi' | 'cellular' (Chrome, behind flag)
      downlink: conn.downlink,           // Mbps
      rtt: conn.rtt,                     // ms
      saveData: conn.saveData,
    });
    update();
    conn.addEventListener('change', update);
    return () => conn.removeEventListener('change', update);
  }, []);

  return info;
}
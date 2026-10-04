import { useState, useEffect } from 'react';

// Real ambient illuminance (lux) from the AmbientLightSensor (Generic Sensor API).
// Experimental — gracefully reports unsupported when unavailable.
export default function useAmbientLight() {
  const [lux, setLux] = useState(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.AmbientLightSensor === 'undefined') return;
    let sensor;
    try {
      setSupported(true);
      sensor = new window.AmbientLightSensor({ frequency: 4 });
      sensor.addEventListener('reading', () => setLux(sensor.illuminance));
      sensor.addEventListener('error', () => setSupported(false));
      sensor.start();
    } catch {
      setSupported(false);
    }
    return () => { try { sensor && sensor.stop(); } catch {} };
  }, []);

  return { lux, supported };
}
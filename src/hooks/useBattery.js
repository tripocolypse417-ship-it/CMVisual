import { useState, useEffect } from 'react';

// Real battery level + charging status from the Battery Status API.
export default function useBattery() {
  const [battery, setBattery] = useState(null);

  useEffect(() => {
    let bat;
    const update = () => setBattery({ level: bat.level, charging: bat.charging });
    if (navigator.getBattery) {
      navigator.getBattery().then(b => {
        bat = b;
        update();
        b.addEventListener('levelchange', update);
        b.addEventListener('chargingchange', update);
      });
    }
    return () => {
      if (bat) {
        bat.removeEventListener('levelchange', update);
        bat.removeEventListener('chargingchange', update);
      }
    };
  }, []);

  return battery;
}
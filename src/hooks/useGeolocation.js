import { useState } from 'react';

// Real GPS position from the Geolocation API. One-shot acquire on demand.
export default function useGeolocation() {
  const [pos, setPos] = useState(null);
  const [error, setError] = useState(null);
  const [acquiring, setAcquiring] = useState(false);

  const acquire = () => {
    if (!navigator.geolocation) { setError('unsupported'); return; }
    setAcquiring(true);
    navigator.geolocation.getCurrentPosition(
      p => {
        setPos({
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          accuracy: p.coords.accuracy,
          altitude: p.coords.altitude,
          heading: p.coords.heading,
          speed: p.coords.speed,
        });
        setAcquiring(false);
        setError(null);
      },
      e => { setError(e.message); setAcquiring(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  return { pos, error, acquiring, acquire };
}
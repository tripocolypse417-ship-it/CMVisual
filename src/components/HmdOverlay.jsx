import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, Activity, Battery, Navigation, Compass } from 'lucide-react';

// Head-up display framing tuned for a phone/tablet clipped into a headset
// mount. The mount's viewing window crops the outer edges of the screen, so
// every HUD element lives inside a central "safe zone" and the focal reticle
// stays dead-center. Text is oversized and high-contrast for close-up viewing
// through lenses. pointer-events-none — never blocks the controls beneath.
export default function HmdOverlay({ scanMode, color, targetCount, isScanning, battery, network, sensors }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const clock = now.toLocaleTimeString('en-US', { hour12: false });
  const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const batt = battery?.level != null ? Math.round(battery.level * 100) : null;
  const battCharging = battery?.charging;
  const battLow = batt != null && !battCharging && batt < 20;
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const netLabel = online ? ((network?.type || 'WIFI').toUpperCase()) : 'OFFLINE';
  // Signal strength from the Network Information API (downlink Mbps).
  let netBars = 0;
  if (online) {
    const dl = network?.downlink;
    if (dl != null) {
      if (dl >= 5) netBars = 4;
      else if (dl >= 2) netBars = 3;
      else if (dl >= 0.5) netBars = 2;
      else netBars = 1;
    } else {
      netBars = 4; // online but no metric — assume decent
    }
  }
  const brg = sensors?.heading != null ? `${Math.round(sensors.heading)}°` : '---';
  const sensorStatus = sensors?.hasSensors ? 'ACTIVE' : sensors?.denied ? 'DENIED' : sensors?.needsPermission ? 'NEED PERM' : 'OFF';
  const sensorColor = sensors?.hasSensors ? color : '#ff4466';
  const modeLabel = (scanMode || 'sonar').toUpperCase();

  return (
    <div className="fixed inset-0 pointer-events-none z-30 select-none">
      {/* ── Lens-edge vignette — simulates the headset mount viewing circle ── */}
      <div className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse 74% 70% at 50% 50%, transparent 72%, rgba(0,0,0,0.25) 93%, rgba(0,0,0,0.45) 100%)` }} />
      {/* subtle fresnel ring */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-full" style={{ width: '78vmin', height: '78vmin', border: `1px solid ${color}12`, boxShadow: `inset 0 0 40px rgba(0,0,0,0.3)` }} />
      </div>

      {/* ── Safe-zone wrapper — everything visible sits inside the mount window ── */}
      <div className="absolute" style={{ inset: '6vh 7vw' }}>

        {/* Central targeting reticle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative" style={{ width: '30vmin', height: '30vmin', maxWidth: 220, maxHeight: 220 }}>
            <motion.div className="absolute inset-0 rounded-full"
              style={{ border: `2px solid ${color}66` }}
              animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0.85, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
            <div className="absolute rounded-full"
              style={{ inset: '16%', border: `1.5px dashed ${color}45` }} />
            <div className="absolute rounded-full"
              style={{ inset: '38%', border: `1px solid ${color}50` }} />
            {/* crosshair ticks */}
            <div className="absolute left-1/2 top-0 -translate-x-1/2 w-0.5" style={{ height: '14%', background: color, opacity: 0.8 }} />
            <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-0.5" style={{ height: '14%', background: color, opacity: 0.8 }} />
            <div className="absolute top-1/2 left-0 -translate-y-1/2 h-0.5" style={{ width: '14%', background: color, opacity: 0.8 }} />
            <div className="absolute top-1/2 right-0 -translate-y-1/2 h-0.5" style={{ width: '14%', background: color, opacity: 0.8 }} />
            {/* center dot */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
              style={{ background: color, boxShadow: `0 0 10px ${color}, 0 0 20px ${color}` }} />
            {/* reticle corner brackets */}
            {[[0, 0, 'tl'], [1, 0, 'tr'], [0, 1, 'bl'], [1, 1, 'br']].map(([fx, fy, k]) => (
              <div key={k} className="absolute w-5 h-5"
                style={{
                  left: fx === 0 ? -3 : 'auto', right: fx === 1 ? -3 : 'auto',
                  top: fy === 0 ? -3 : 'auto', bottom: fy === 1 ? -3 : 'auto',
                  borderTop: fy === 0 ? `2px solid ${color}` : undefined,
                  borderBottom: fy === 1 ? `2px solid ${color}` : undefined,
                  borderLeft: fx === 0 ? `2px solid ${color}` : undefined,
                  borderRight: fx === 1 ? `2px solid ${color}` : undefined,
                }} />
            ))}
            <div className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap"
              style={{ top: 'calc(100% + 10px)' }}>
              <span className="font-mono text-xs tracking-[0.35em]"
                style={{ color, textShadow: `0 0 10px ${color}, 0 0 2px #000, 1px 1px 1px #000, -1px 1px 1px #000, 1px -1px 1px #000, -1px -1px 1px #000, 0 2px 4px rgba(0,0,0,0.95)` }}>
                ◆ TARGET LOCK
              </span>
            </div>
          </div>
        </div>

        {/* Top status cluster — centered, inside safe zone */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 rounded-xl"
          style={{ background: 'rgba(0,0,0,0.72)', border: `1px solid ${color}35`, backdropFilter: 'blur(8px)' }}>
          <div className="flex items-center gap-2">
            <motion.span className="w-2.5 h-2.5 rounded-full"
              style={{ background: isScanning ? color : '#ffffff55', boxShadow: isScanning ? `0 0 8px ${color}` : 'none' }}
              animate={isScanning ? { opacity: [1, 0.3, 1] } : { opacity: 0.4 }}
              transition={{ duration: 1, repeat: Infinity }} />
            <span className="font-display text-sm tracking-[0.35em]"
              style={{ color, textShadow: `0 0 12px ${color}, 0 0 2px #000, 1px 1px 1px #000, -1px 1px 1px #000, 1px -1px 1px #000, -1px -1px 1px #000, 0 2px 4px rgba(0,0,0,0.95)` }}>
              WALLSIGHT
            </span>
          </div>
          <span className="w-px h-4" style={{ background: `${color}40` }} />
          <span className="font-mono text-xs flex items-center gap-1.5"
            style={{ color: `${color}dd`, textShadow: '0 0 2px #000, 1px 1px 1px #000, -1px 1px 1px #000, 1px -1px 1px #000, -1px -1px 1px #000, 0 2px 4px rgba(0,0,0,0.95)' }}>
            <Radio className="w-4 h-4" /> {modeLabel}
          </span>
          <span className="font-mono text-xs flex items-center gap-1.5"
            style={{ color: isScanning ? `${color}dd` : '#ffffff80', textShadow: '0 0 2px #000, 1px 1px 1px #000, -1px 1px 1px #000, 1px -1px 1px #000, -1px -1px 1px #000, 0 2px 4px rgba(0,0,0,0.95)' }}>
            <Activity className="w-4 h-4" /> {isScanning ? 'ACTIVE' : 'STBY'}
          </span>
        </div>

        {/* Top-left: clock */}
        <div className="absolute top-0 left-0 px-3 py-2 rounded-xl"
          style={{ background: 'rgba(0,0,0,0.72)', border: `1px solid ${color}30`, backdropFilter: 'blur(8px)' }}>
          <div className="font-mono text-base font-bold tracking-wider"
            style={{ color, textShadow: `0 0 8px ${color}80, 0 0 2px #000, 1px 1px 1px #000, -1px 1px 1px #000, 1px -1px 1px #000, -1px -1px 1px #000, 0 2px 4px rgba(0,0,0,0.95)` }}>
            {clock}
          </div>
          <div className="font-mono text-[10px] tracking-wider opacity-70"
            style={{ color, textShadow: '0 0 2px #000, 1px 1px 1px #000, -1px 1px 1px #000, 1px -1px 1px #000, -1px -1px 1px #000, 0 2px 4px rgba(0,0,0,0.95)' }}>
            {date}
          </div>
        </div>

        {/* Top-right: network + signal strength */}
        <div className="absolute top-0 right-0 px-3 py-2 rounded-xl flex items-center gap-2"
          style={{ background: 'rgba(0,0,0,0.72)', border: `1px solid ${color}30`, backdropFilter: 'blur(8px)' }}>
          <span className="font-mono text-sm"
            style={{ color: online ? `${color}dd` : '#ff4466', textShadow: '0 0 2px #000, 1px 1px 1px #000, -1px 1px 1px #000, 1px -1px 1px #000, -1px -1px 1px #000, 0 2px 4px rgba(0,0,0,0.95)' }}>
            {netLabel}
          </span>
          <div className="flex items-end gap-0.5 h-4">
            {[1, 2, 3, 4].map(n => (
              <span key={n} className="w-1 rounded-sm transition-colors"
                style={{
                  height: `${n * 25}%`,
                  background: n <= netBars ? (online ? color : '#ff4466') : 'rgba(255,255,255,0.18)',
                  boxShadow: n <= netBars && online ? `0 0 4px ${color}` : 'none',
                }} />
            ))}
          </div>
        </div>

        {/* Bottom-left: heading + sensor status */}
        <div className="absolute bottom-0 left-0 px-3 py-2 rounded-xl flex items-center gap-3"
          style={{ background: 'rgba(0,0,0,0.72)', border: `1px solid ${color}30`, backdropFilter: 'blur(8px)' }}>
          <span className="font-mono text-sm flex items-center gap-1.5"
            style={{ color: `${color}dd`, textShadow: '0 0 2px #000, 1px 1px 1px #000, -1px 1px 1px #000, 1px -1px 1px #000, -1px -1px 1px #000, 0 2px 4px rgba(0,0,0,0.95)' }}>
            <Navigation className="w-4 h-4" /> HDG {brg}
          </span>
          <span className="w-px h-4" style={{ background: `${color}30` }} />
          <span className="font-mono text-xs flex items-center gap-1.5"
            style={{ color: sensorColor, textShadow: '0 0 2px #000, 1px 1px 1px #000, -1px 1px 1px #000, 1px -1px 1px #000, -1px -1px 1px #000, 0 2px 4px rgba(0,0,0,0.95)' }}>
            <Compass className="w-3.5 h-3.5" /> SNS {sensorStatus}
          </span>
        </div>

        {/* Bottom-right: targets + battery (low-charge warning) */}
        <div className="absolute bottom-0 right-0 px-3 py-2 rounded-xl flex items-center gap-3"
          style={{ background: 'rgba(0,0,0,0.72)', border: `1px solid ${battLow ? '#ff4466' : color}30`, backdropFilter: 'blur(8px)' }}>
          <span className="font-mono text-sm"
            style={{ color: `${color}dd`, textShadow: '0 0 2px #000, 1px 1px 1px #000, -1px 1px 1px #000, 1px -1px 1px #000, -1px -1px 1px #000, 0 2px 4px rgba(0,0,0,0.95)' }}>
            {targetCount} TGT
          </span>
          <span className="w-px h-4" style={{ background: `${color}30` }} />
          <span className="font-mono text-sm flex items-center gap-1.5"
            style={{
              color: battCharging ? '#00ff88' : (battLow ? '#ff4466' : `${color}dd`),
              textShadow: '0 0 2px #000, 1px 1px 1px #000, -1px 1px 1px #000, 1px -1px 1px #000, -1px -1px 1px #000, 0 2px 4px rgba(0,0,0,0.95)',
            }}>
            <Battery className="w-4 h-4" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,1)) drop-shadow(0 0 2px rgba(0,0,0,0.9))' }} />
            {batt != null ? `${batt}%` : '—'}
            {battCharging && <span className="text-[9px] text-green-400">⚡</span>}
          </span>
        </div>

        {/* Bottom-center: scan status ticker */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-xl"
          style={{ background: 'rgba(0,0,0,0.72)', border: `1px solid ${color}30`, backdropFilter: 'blur(8px)' }}>
          <motion.span className="font-mono text-xs tracking-[0.3em]"
            style={{ color: `${color}cc`, textShadow: `0 0 8px ${color}80, 0 0 2px #000, 1px 1px 1px #000, -1px 1px 1px #000, 1px -1px 1px #000, -1px -1px 1px #000, 0 2px 4px rgba(0,0,0,0.95)` }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}>
            {isScanning ? '◉ SCANNING · 2.4 GHz · 10m' : '○ STANDBY'}
          </motion.span>
        </div>

        {/* Safe-zone corner brackets — frame the visible window */}
        <div className="absolute top-0 left-0 w-8 h-8 sm:w-12 sm:h-12"
          style={{ borderTop: `2.5px solid ${color}`, borderLeft: `2.5px solid ${color}`, boxShadow: `0 0 12px ${color}60` }} />
        <div className="absolute top-0 right-0 w-8 h-8 sm:w-12 sm:h-12"
          style={{ borderTop: `2.5px solid ${color}`, borderRight: `2.5px solid ${color}`, boxShadow: `0 0 12px ${color}60` }} />
        <div className="absolute bottom-0 left-0 w-8 h-8 sm:w-12 sm:h-12"
          style={{ borderBottom: `2.5px solid ${color}`, borderLeft: `2.5px solid ${color}`, boxShadow: `0 0 12px ${color}60` }} />
        <div className="absolute bottom-0 right-0 w-8 h-8 sm:w-12 sm:h-12"
          style={{ borderBottom: `2.5px solid ${color}`, borderRight: `2.5px solid ${color}`, boxShadow: `0 0 12px ${color}60` }} />
      </div>
    </div>
  );
}
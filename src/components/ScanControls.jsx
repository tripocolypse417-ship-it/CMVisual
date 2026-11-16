import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Activity, Power, Volume2, Info } from 'lucide-react';

const modes = [
  { id: 'sonar', label: 'ACOUSTIC', icon: Volume2, color: '#00ff88', desc: 'Experimental audio' },
  { id: 'thermal', label: 'THERMAL', icon: Thermometer, color: '#ff6633', desc: 'External thermal input' },
  { id: 'motion', label: 'MOTION', icon: Activity, color: '#00ccff', desc: 'Motion data' },
];

const STALE_FRAME_SECONDS = 3;

export default function ScanControls({ scanMode, onModeChange, isScanning, onToggleScan, detections = [], sensorConnected = false, lastFrame = null }) {
  const liveItems = Array.isArray(detections) ? detections : [];
  const people = liveItems.filter(d => d?.type === 'human');
  const moving = liveItems.filter(d => d?.moving === true).length;
  // Only an explicit MEASURED evidence class is counted here. A generic
  // "detected" or "observed" label is not silently upgraded to measurement.
  const measured = liveItems.filter(d =>
    String(d?.evidenceClass ?? d?.evidence_class ?? d?.evidence ?? '').toUpperCase() === 'MEASURED'
  );

  // Age must continue advancing after frames stop. Computing this only during
  // a render left a stopped feed permanently displaying its last (often 0s) age.
  const [frameAgeSeconds, setFrameAgeSeconds] = useState(null);
  useEffect(() => {
    if (lastFrame?.receivedAt == null || lastFrame?.isMeasurementFrame === false) {
      setFrameAgeSeconds(null);
      return undefined;
    }
    const updateAge = () => {
      setFrameAgeSeconds(Math.max(0, Math.floor((performance.now() - lastFrame.receivedAt) / 1000)));
    };
    updateAge();
    const timer = window.setInterval(updateAge, 1000);
    return () => window.clearInterval(timer);
  }, [lastFrame?.receivedAt, lastFrame?.isMeasurementFrame]);

  const hasMeasurementFrame = Boolean(lastFrame?.receivedAt != null && lastFrame?.isMeasurementFrame !== false);
  const frameIsStale = hasMeasurementFrame && frameAgeSeconds != null && frameAgeSeconds > STALE_FRAME_SECONDS;
  const feedLabel = !hasMeasurementFrame
    ? (sensorConnected ? 'CONNECTED · WAITING FOR DATA' : 'NO SENSOR FRAME')
    : frameIsStale
      ? 'STALE FRAME'
      : sensorConnected ? 'LIVE SENSOR FEED' : 'RECENT SENSOR FRAME';

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/40 p-3">
      <h3 className="font-display text-xs tracking-wider text-foreground">SCANNER</h3>

      {/* Power toggle */}
      <button onClick={onToggleScan}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-300 group"
        style={{ borderColor: isScanning ? '#00ff8840' : '#ffffff15', background: isScanning ? '#00ff8812' : '#ffffff05' }}>
        <div>
          <div className="font-display text-[10px] tracking-wider text-left"
            style={{ color: isScanning ? '#00ff88' : '#ffffff50' }}>
            {isScanning ? 'SCANNING ACTIVE' : 'SCANNER OFFLINE'}
          </div>
          <div className="font-mono text-[9px] text-muted-foreground text-left mt-0.5">
            {isScanning ? 'Tap to pause scan' : 'Tap to start scan'}
          </div>
        </div>
        <div className="relative">
          <Power className="w-5 h-5 transition-colors"
            style={{ color: isScanning ? '#00ff88' : '#ffffff30' }} />
          {isScanning && (
            <motion.div className="absolute inset-0 rounded-full border"
              style={{ borderColor: '#00ff88' }}
              animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }} />
          )}
        </div>
      </button>

      {/* Mode selector */}
      <div>
        <div className="font-mono text-[9px] text-muted-foreground mb-2 tracking-wider">SCAN MODE</div>
        <div className="grid grid-cols-3 gap-1.5">
          {modes.map(mode => {
            const active = scanMode === mode.id;
            const Icon = mode.icon;
            return (
              <button key={mode.id} onClick={() => onModeChange(mode.id)}
                className="relative flex flex-col items-center gap-1 py-3 px-1 rounded-xl border transition-all duration-300"
                style={{ borderColor: active ? `${mode.color}40` : '#ffffff10', background: active ? `${mode.color}10` : 'transparent' }}>
                <Icon className="w-4 h-4" style={{ color: active ? mode.color : '#ffffff40' }} />
                <span className="font-mono text-[9px] tracking-wider" style={{ color: active ? mode.color : '#ffffff40' }}>{mode.label}</span>
                <span className="font-mono text-[8px]" style={{ color: active ? `${mode.color}80` : '#ffffff20' }}>{mode.desc}</span>
                {active && (
                  <motion.div layoutId="modeIndicator" className="absolute inset-0 rounded-xl border"
                    style={{ borderColor: `${mode.color}60` }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live results are derived from the current camera/sensor observation stream. */}
      <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="font-display text-xs text-foreground">CURRENT OBSERVATIONS</div>
            <div className="font-mono text-[9px] text-muted-foreground mt-0.5">Tracks reported by available inputs</div>
          </div>
          <span className="rounded-full border px-2 py-1 font-mono text-[8px]"
            style={{
              color: frameIsStale ? '#ffc36b' : hasMeasurementFrame ? '#7dffb2' : '#ffffff80',
              borderColor: frameIsStale ? '#ffc36b55' : hasMeasurementFrame ? '#7dffb255' : '#ffffff20'
            }}>
            {feedLabel}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'TRACKS', value: liveItems.length, color: '#7dffb2' },
            { label: 'PEOPLE', value: people.length, color: '#7dffb2' },
            { label: 'MOVING', value: moving, color: '#62d8ff' },
          ].map(item => (
            <div key={item.label} className="rounded-lg border border-border bg-background/50 p-2">
              <div className="font-mono text-[8px] text-muted-foreground">{item.label}</div>
              <div className="mt-1 text-xl font-semibold tabular-nums" style={{ color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 font-mono text-[9px] text-muted-foreground">
          <span>{measured.length} explicitly measured tracks</span>
          <span>{!hasMeasurementFrame ? 'No measurement frame received' : frameIsStale ? `Last frame ${frameAgeSeconds}s ago · stale` : `Updated ${frameAgeSeconds ?? 0}s ago`}</span>
        </div>
        {!liveItems.length && (
          <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-2.5 text-[10px] leading-relaxed text-amber-100/80">
            No people or objects are currently being reported. Scanning status alone does not mean a target was detected.
          </div>
        )}
        {frameIsStale && (
          <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-2.5 text-[10px] leading-relaxed text-amber-100/90">
            Sensor data is no longer arriving. Displayed tracks must not be treated as current positions.
          </div>
        )}
      </div>

      {/* Mode info */}
      <div className="flex items-start gap-2 rounded-lg p-2.5 border border-border/50 bg-muted/20">
        <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-muted-foreground" />
        <div className="font-mono text-[9px] text-muted-foreground leading-relaxed">
          {scanMode === 'sonar' && 'Experimental speaker/microphone signal monitoring only. It is not a calibrated rangefinder, target-motion detector, or through-wall sensor. External ranging/RF hardware must be evaluated separately.'}
          {scanMode === 'thermal' && 'Shows thermal data only when an actual compatible thermal sensor provides it.'}
          {scanMode === 'motion' && 'Shows measured motion data from supported sensors; no synthetic motion is generated.'}
        </div>
      </div>
    </div>
  );
}

import { motion } from 'framer-motion';
import { Thermometer, Activity, Power, Volume2, Info } from 'lucide-react';

const modes = [
  { id: 'sonar', label: 'ACOUSTIC', icon: Volume2, color: '#00ff88', desc: 'Experimental audio' },
  { id: 'thermal', label: 'THERMAL', icon: Thermometer, color: '#ff6633', desc: 'Available sensor' },
  { id: 'motion', label: 'MOTION', icon: Activity, color: '#00ccff', desc: 'Motion data' },
];

export default function ScanControls({ scanMode, onModeChange, isScanning, onToggleScan, signalStrength }) {
  const currentMode = modes.find(m => m.id === scanMode) || modes[0];

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

      {/* Signal quality */}
      <div className="space-y-2">
        <div className="font-mono text-[9px] text-muted-foreground tracking-wider">SIGNAL QUALITY</div>
        <div className="space-y-1.5">
          {[
            { label: 'Strength', value: signalStrength, color: currentMode.color },
            { label: 'SNR', value: null, color: currentMode.color },
            { label: 'Clarity', value: null, color: currentMode.color },
          ].map(s => (
            <div key={s.label} className="space-y-0.5">
              <div className="flex justify-between font-mono text-[9px]">
                <span className="text-muted-foreground">{s.label}</span>
                <span style={{ color: s.color }}>{s.value == null ? 'N/A' : `${s.value}%`}</span>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <motion.div className="h-full rounded-full"
                  style={{ background: s.color, opacity: s.value == null ? 0.2 : 0.7 }}
                  animate={{ width: s.value == null ? '0%' : `${s.value}%` }} transition={{ duration: 0.5 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Frequency visualizer */}
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="font-mono text-[9px] text-muted-foreground tracking-wider">FREQUENCY</span>
          <span className="font-mono text-[9px] text-foreground">N/A</span>
        </div>
        <div className="flex items-end gap-0.5 h-8">
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.div key={i} className="flex-1 rounded-sm"
              style={{ background: currentMode.color, minHeight: 2 }}
              animate={{ height: isScanning ? [4, Math.random() * 24 + 4, 4] : 3, opacity: isScanning ? [0.3, 0.85, 0.3] : 0.12 }}
              transition={{ duration: 0.4 + Math.random() * 0.4, repeat: Infinity, delay: i * 0.04 }} />
          ))}
        </div>
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
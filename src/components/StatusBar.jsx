import { motion } from 'framer-motion';
import { Wifi, Battery, Clock, Radio } from 'lucide-react';
import { useState, useEffect } from 'react';

function StatPill({ label, value, color, pulse }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
      style={{ borderColor: `${color}25`, background: `${color}08` }}>
      {pulse && (
        <motion.span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: color }}
          animate={{ opacity: [1, 0.2, 1], scale: [1, 1.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }} />
      )}
      <span className="font-mono text-[9px]" style={{ color: `${color}99` }}>{label}</span>
      <span className="font-mono text-[9px] font-bold" style={{ color }}>{value}</span>
    </div>
  );
}

function SignalBars({ strength, color }) {
  return (
    <div className="flex items-end gap-0.5 h-4">
      {[0.3, 0.5, 0.7, 0.9, 1.0].map((h, i) => (
        <div key={i} className="w-1 rounded-sm transition-all duration-500"
          style={{
            height: `${h * 100}%`,
            background: i < Math.ceil(strength / 20) ? color : `${color}25`,
          }} />
      ))}
    </div>
  );
}

export default function StatusBar({ isScanning, scanMode, sensors, network, battery }) {
  const [time, setTime] = useState(new Date());
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const t = setInterval(() => { setTime(new Date()); setUptime(p => p + 1); }, 1000);
    return () => clearInterval(t);
  }, []);

  const modeColors = { sonar: '#00ff88', thermal: '#ff6633', motion: '#00ccff' };
  const color = modeColors[scanMode] || modeColors.sonar;

  const fmt = n => String(n).padStart(2, '0');
  const uptimeStr = `${fmt(Math.floor(uptime/3600))}:${fmt(Math.floor((uptime%3600)/60))}:${fmt(uptime%60)}`;

  return (
    <div className="relative overflow-hidden" style={{ background: 'rgba(1,8,5,0.95)', borderBottom: '1px solid rgba(0,255,136,0.1)' }}>
      {/* Animated gradient line at top */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{
          backgroundImage: `linear-gradient(90deg, transparent 0%, ${color}60 30%, ${color} 50%, ${color}60 70%, transparent 100%)`,
          animation: 'border-flow 3s ease infinite',
          backgroundSize: '200% 200%',
        }} />

      <div className="flex items-center justify-between px-4 py-2.5 gap-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="relative w-7 h-7 flex-shrink-0">
            <div className="absolute inset-0 rounded-lg flex items-center justify-center"
              style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
              <Radio className="w-3.5 h-3.5" style={{ color }} />
            </div>
            <motion.div className="absolute inset-0 rounded-lg border"
              style={{ borderColor: color }}
              animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.5, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }} />
          </div>
          <div>
            <div className="font-display text-[11px] tracking-[0.3em] font-bold leading-none glow-text"
              style={{ color }}>
              WALLSIGHT
            </div>
            <div className="font-mono text-[8px] text-muted-foreground tracking-widest mt-0.5">
              v2.4.1 · WiFi SONAR ARRAY
            </div>
          </div>
        </div>

        {/* Center: Live stats pills */}
        <div className="hidden md:flex items-center gap-1.5">
          <StatPill label="MODE" value={scanMode.toUpperCase()} color={color} pulse={isScanning} />
          <StatPill label="RANGE" value="10.0m" color={color} />
          <StatPill label="RES" value="0.1m" color={color} />
          {sensors?.hasSensors && sensors?.heading != null && (
            <StatPill label="HDG" value={`${sensors.heading}°`} color="#00ccff" />
          )}
          {sensors?.hasSensors && (
            <StatPill label="MOTION" value={sensors.isMoving ? 'MOVING' : 'STILL'}
              color={sensors.isMoving ? '#00ff88' : '#ffffff60'} pulse={sensors.isMoving} />
          )}
          {sensors?.needsPermission && (
            <button onClick={() => sensors.requestPermission()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all hover:scale-105"
              style={{ borderColor: `${color}40`, background: `${color}12` }}>
              <span className="font-mono text-[9px]" style={{ color }}>ENABLE SENSORS</span>
            </button>
          )}
          <StatPill label="UP" value={uptimeStr} color="#00ccff" />
        </div>

        {/* Right: System status */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5">
            <SignalBars strength={isScanning ? 80 : 20} color={color} />
          </div>
          <div className="flex items-center gap-1" style={{ color: isScanning ? color : '#ffffff30' }}
            title={network ? `${network.connectionType || network.type || 'net'} · ${network.downlink}Mbps · ${network.rtt}ms` : 'network unavailable'}>
            <Wifi className="w-3 h-3" />
            <span className="font-mono text-[9px]">{network ? (network.connectionType || network.type || 'NET').toUpperCase() : (isScanning ? 'LIVE' : 'IDLE')}</span>
          </div>
          <div className="flex items-center gap-1" style={{ color: battery ? (battery.charging ? color : '#ffffff99') : '#ffffff60' }}>
            <Battery className="w-3 h-3" />
            <span className="font-mono text-[9px]">{battery ? `${Math.round(battery.level * 100)}%${battery.charging ? '⚡' : ''}` : 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span className="font-mono text-[9px]">{time.toLocaleTimeString('en-US', { hour12: false })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
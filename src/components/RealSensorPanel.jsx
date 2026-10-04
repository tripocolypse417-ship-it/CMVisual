import { motion } from 'framer-motion';
import { Wifi, Battery, MapPin, Sun, Mic, MicOff, Loader2, Power } from 'lucide-react';

function Row({ icon: Icon, label, color, children }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <Icon className="w-3 h-3 shrink-0" style={{ color: color || '#ffffff60' }} />
      <span className="font-mono text-[8px] text-muted-foreground tracking-wider w-16 shrink-0">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function Value({ children, color = '#ffffffcc' }) {
  return <span className="font-mono text-[9px] font-bold truncate block" style={{ color }}>{children}</span>;
}

export default function RealSensorPanel({ color, network, acoustic, geo, battery, ambient, wake }) {
  const netType = network?.connectionType || network?.type;
  const batPct = battery ? Math.round(battery.level * 100) : null;
  const liveSensors = [
    !!network, battery != null, geo?.pos != null, ambient?.supported && ambient?.lux != null, acoustic.active,
  ].filter(Boolean).length;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xs tracking-wider text-foreground">LIVE SENSORS</h3>
        <span className="font-mono text-[8px] text-muted-foreground">{liveSensors} active</span>
      </div>

      {/* Network */}
      <Row icon={Wifi} label="NETWORK" color={color}>
        {network ? (
          <Value color={color}>
            {(netType || 'NET').toUpperCase()} · {network.downlink ?? '?'}Mbps · {network.rtt ?? '?'}ms
          </Value>
        ) : <Value>UNAVAILABLE</Value>}
      </Row>

      {/* Battery */}
      <Row icon={Battery} label="BATTERY" color={battery?.charging ? color : '#ffffff99'}>
        {battery ? (
          <Value color={battery.charging ? color : '#ffffffcc'}>
            {batPct}%{battery.charging ? ' ⚡ CHG' : ''}
          </Value>
        ) : <Value>UNAVAILABLE</Value>}
      </Row>

      {/* Geolocation */}
      <Row icon={MapPin} label="GPS" color={geo?.pos ? '#00ccff' : '#ffffff60'}>
        {geo?.pos ? (
          <Value color="#00ccff">
            {geo.pos.lat.toFixed(4)}, {geo.pos.lon.toFixed(4)} · ±{Math.round(geo.pos.accuracy)}m
          </Value>
        ) : (
          <button onClick={geo.acquire} disabled={geo.acquiring}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md border text-[8px] font-mono transition-all"
            style={{ borderColor: `${color}40`, color }}>
            {geo.acquiring ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : null}
            {geo.acquiring ? 'LOCKING…' : 'ACQUIRE GPS'}
          </button>
        )}
      </Row>

      {/* Ambient light */}
      <Row icon={Sun} label="AMBIENT" color={ambient?.lux != null ? '#ffaa00' : '#ffffff60'}>
        {ambient?.supported ? (
          <Value color="#ffaa00">{ambient.lux != null ? `${ambient.lux.toFixed(0)} lux` : 'reading…'}</Value>
        ) : <Value>UNSUPPORTED</Value>}
      </Row>

      {/* Acoustic probe */}
      <div className="pt-1.5 border-t border-white/5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            {acoustic.active ? <Mic className="w-3 h-3" style={{ color }} /> : <MicOff className="w-3 h-3 text-muted-foreground" />}
            <span className="font-mono text-[8px] text-muted-foreground tracking-wider">ACOUSTIC PROBE</span>
          </div>
          <button
            onClick={() => acoustic.active ? acoustic.stop() : acoustic.start()}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md border text-[8px] font-mono transition-all"
            style={{ borderColor: acoustic.active ? `${color}50` : '#ffffff15', color: acoustic.active ? color : '#ffffff60', background: acoustic.active ? `${color}12` : 'transparent' }}>
            {acoustic.active ? 'STOP' : 'ENABLE MIC'}
          </button>
        </div>

        {acoustic.error && (
          <div className="font-mono text-[7px] text-destructive mb-1">MIC: {acoustic.error}</div>
        )}

        {/* Level meter */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="font-mono text-[8px] text-muted-foreground w-6">LVL</span>
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div className="h-full rounded-full"
              style={{ background: color }}
              animate={{ width: `${acoustic.level}%` }}
              transition={{ duration: 0.08 }} />
          </div>
          <span className="font-mono text-[8px] font-bold w-7 text-right" style={{ color }}>{acoustic.level}</span>
        </div>

        {/* 16-band spectrum */}
        <div className="flex items-end gap-0.5 h-6">
          {acoustic.bands.map((v, i) => (
            <div key={i} className="flex-1 rounded-sm transition-all duration-75"
              style={{
                height: `${Math.max(4, v)}%`,
                background: v > 0 ? color : `${color}20`,
                opacity: acoustic.active ? 1 : 0.3,
              }} />
          ))}
        </div>
      </div>

      {/* Wake lock */}
      {wake.supported && (
        <Row icon={Power} label="WAKE" color={wake.locked ? color : '#ffffff60'}>
          <button onClick={() => wake.locked ? wake.release() : wake.request()}
            className="font-mono text-[8px] px-2 py-0.5 rounded-md border transition-all"
            style={{ borderColor: wake.locked ? `${color}50` : '#ffffff15', color: wake.locked ? color : '#ffffff60' }}>
            {wake.locked ? 'SCREEN LOCKED ON' : 'TAP TO HOLD'}
          </button>
        </Row>
      )}
    </div>
  );
}
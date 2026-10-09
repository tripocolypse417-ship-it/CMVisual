import { Eye, ShieldAlert, Route, ZoomIn, Ghost, Siren } from 'lucide-react';

// Single clean control strip pinned to the bottom of the AR view so you can
// adjust overlay opacity, alerts, and movement trails without taking your
// eyes off the camera feed. These controls do not imply through-wall sensing.
function Toggle({ active, onClick, color, icon: Icon, label }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all"
      style={{
        border: `1px solid ${active ? color + '60' : 'rgba(255,255,255,0.15)'}`,
        background: active ? color + '18' : 'transparent',
      }}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: active ? color : 'rgba(255,255,255,0.55)' }} />
      <span className="font-mono text-[9px] tracking-wider hidden sm:inline"
        style={{ color: active ? color : 'rgba(255,255,255,0.6)' }}>{label}</span>
      <span className="relative w-7 h-3.5 rounded-full transition-colors flex-shrink-0"
        style={{ background: active ? color : 'rgba(255,255,255,0.2)' }}>
        <span className="absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all"
          style={{ left: active ? 14 : 2, background: active ? '#001a0d' : 'rgba(255,255,255,0.85)' }} />
      </span>
    </button>
  );
}

export default function ArControlBar({ color, wallOpacity, onWallOpacity, trailsEnabled, onTrailsEnabled, threatAlertsEnabled, onThreatAlertsEnabled, zoom, onZoom, autoZoom, onAutoZoom, zoomRange, onZoomRange, zoomMax = 4, ghostMode, onGhostMode, proximityEnabled, onProximityEnabled, proximityRange, onProximityRange }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center gap-2 sm:gap-3 px-3 py-2"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(12px)', borderTop: `1px solid ${color}30` }}>
      {/* Visual overlay opacity slider */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Eye className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
        <span className="font-mono text-[9px] tracking-wider hidden sm:inline" style={{ color }}>OVERLAY</span>
        <input type="range" min={0} max={100} value={wallOpacity}
          onChange={(e) => onWallOpacity(Number(e.target.value))}
          className="flex-1 min-w-[60px] cursor-pointer"
          style={{ accentColor: color }} />
        <span className="font-mono text-[9px] w-8 text-right flex-shrink-0" style={{ color }}>{wallOpacity}%</span>
      </div>

      <span className="w-px h-6 flex-shrink-0" style={{ background: `${color}25` }} />

      {/* Forward zoom */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <ZoomIn className="w-3.5 h-3.5" style={{ color }} />
        <button onClick={() => onZoom(Math.max(1, +(zoom - 0.2).toFixed(2)))} disabled={autoZoom}
          className="w-5 h-5 rounded font-mono text-[10px] transition-colors hover:bg-white/10 disabled:opacity-40"
          style={{ border: `1px solid ${color}40`, color }}>-</button>
        <span className="font-mono text-[9px] w-8 text-center" style={{ color }}>{zoom.toFixed(1)}x</span>
        <button onClick={() => onZoom(Math.min(zoomMax, +(zoom + 0.2).toFixed(2)))} disabled={autoZoom}
          className="w-5 h-5 rounded font-mono text-[10px] transition-colors hover:bg-white/10 disabled:opacity-40"
          style={{ border: `1px solid ${color}40`, color }}>+</button>
        <button onClick={onAutoZoom} title="Auto-magnify when a tracked item crosses the configured threshold; requires valid range data"
          className="px-1.5 h-5 rounded font-mono text-[8px] tracking-wider transition-colors"
          style={{ border: `1px solid ${autoZoom ? color : color + '40'}`, color, background: autoZoom ? color + '18' : 'transparent' }}>AUTO</button>
      </div>

      <span className="w-px h-6 flex-shrink-0 hidden sm:block" style={{ background: `${color}25` }} />

      {/* Auto-zoom trigger range */}
      <div className="flex items-center gap-2 flex-shrink-0 hidden sm:flex">
        <span className="font-mono text-[8px] tracking-wider" style={{ color }}>RANGE</span>
        <input type="range" min={1} max={6} step={0.5} value={zoomRange}
          onChange={(e) => onZoomRange(Number(e.target.value))}
          className="w-16 cursor-pointer" style={{ accentColor: color }} />
        <span className="font-mono text-[9px] w-10" style={{ color }}>{zoomRange.toFixed(1)}m</span>
      </div>

      <span className="w-px h-6 flex-shrink-0" style={{ background: `${color}25` }} />

      {/* Proximity warning range */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Toggle active={proximityEnabled} onClick={onProximityEnabled} color="#ff2222" icon={Siren} label="PROX" />
        <input type="range" min={0.5} max={6} step={0.5} value={proximityRange}
          onChange={(e) => onProximityRange(Number(e.target.value))}
          className="w-14 cursor-pointer" style={{ accentColor: '#ff2222' }} />
        <span className="font-mono text-[9px] w-8" style={{ color: '#ff2222' }}>{proximityRange.toFixed(1)}m</span>
      </div>

      <span className="w-px h-6 flex-shrink-0 hidden sm:block" style={{ background: `${color}25` }} />

      {/* Threat alerts */}
      <Toggle active={threatAlertsEnabled} onClick={onThreatAlertsEnabled} color={color} icon={ShieldAlert} label="THREAT" />

      <span className="w-px h-6 flex-shrink-0 hidden sm:block" style={{ background: `${color}25` }} />

      {/* Movement trails */}
      <Toggle active={trailsEnabled} onClick={onTrailsEnabled} color={color} icon={Route} label="TRAILS" />

      <span className="w-px h-6 flex-shrink-0 hidden sm:block" style={{ background: `${color}25` }} />

      {/* Ghost mode — past movement paths */}
      <Toggle active={ghostMode} onClick={onGhostMode} color={color} icon={Ghost} label="GHOST" />
    </div>
  );
}
import { useMemo } from 'react';
import { Activity, Camera, Cuboid, Crosshair, Layers3, Radio, ScanLine } from 'lucide-react';

const modes = [
  { id: 'combined', label: 'COMBINED', icon: Layers3 },
  { id: 'camera', label: 'CAMERA', icon: Camera },
  { id: 'spatial', label: '3D SPATIAL', icon: Cuboid },
  { id: 'floorplan', label: 'FLOOR PLAN', icon: ScanLine },
];

export default function CMVisualCommandDeck({
  color,
  mode,
  onModeChange,
  isScanning,
  detections,
  cameraDetections,
  sensorConnected,
  cameraActive,
  heading,
}) {
  const activeCount = detections.length + cameraDetections.length;
  const confidence = useMemo(() => {
    const all = [...detections, ...cameraDetections];
    if (!all.length) return null;
    const values = all.map(d => Number(d.confidence)).filter(Number.isFinite);
    if (!values.length) return null;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return avg <= 1 ? Math.round(avg * 100) : Math.round(avg);
  }, [detections, cameraDetections]);

  return (
    <section className="cm-command-deck glass-panel rounded-2xl p-1.5 sm:p-2 relative z-30">
      <div className="flex flex-col xl:flex-row xl:items-center gap-2">
        <div className="flex items-center gap-2 px-2 py-1 shrink-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center border" style={{ borderColor: `${color}45`, background: `${color}10`, color }}>
            <Crosshair className="w-4 h-4" />
          </div>
          <div>
            <div className="font-display text-[11px] tracking-[0.18em] text-primary">CMVISUAL</div>
            <div className="font-mono text-[7px] text-muted-foreground tracking-wider">LIVE SPATIAL COMMAND</div>
          </div>
        </div>

        <div className="flex-1 flex gap-1 overflow-x-auto pb-0.5 cm-no-scrollbar">
          {modes.map(({ id, label, icon: Icon }) => {
            const active = mode === id;
            return (
              <button key={id} onClick={() => onModeChange(id)} className="cm-mode-btn shrink-0" data-active={active}
                style={{ '--cm-color': color }} aria-pressed={active}>
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 px-2 shrink-0 font-mono text-[8px]">
          <span className="cm-stat"><Activity className="w-3 h-3" />{isScanning ? 'LIVE' : 'STANDBY'}</span>
          <span className="cm-stat"><Radio className="w-3 h-3" />{sensorConnected ? 'BRIDGE' : 'LOCAL'}</span>
          <span className="cm-stat"><Crosshair className="w-3 h-3" />{activeCount} OBS</span>
          <span className="cm-stat hidden sm:flex">HDG {Number.isFinite(heading) ? `${Math.round(heading)}°` : '—'}</span>
          <span className="cm-stat hidden md:flex">CONF {confidence == null ? '—' : `${confidence}%`}</span>
          <span className="cm-camera-dot" data-on={cameraActive} title={cameraActive ? 'Camera active' : 'Camera inactive'} />
        </div>
      </div>
    </section>
  );
}
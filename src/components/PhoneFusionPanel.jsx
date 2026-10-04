import { Activity, Camera, Compass, Gauge, Mic, Move3d } from 'lucide-react';

function Item({ icon: Icon, label, value, color, active }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
      <Icon className="w-3 h-3 mb-1" style={{ color: active ? color : '#ffffff45' }} />
      <div className="font-mono text-[7px] text-muted-foreground">{label}</div>
      <div className="font-mono text-[8px] font-bold truncate" style={{ color: active ? color : '#ffffff70' }}>{value}</div>
    </div>
  );
}

export default function PhoneFusionPanel({ color = '#00ff88', sensors, cameraActive, sonar, acoustic, detections = [], spatialStats }) {
  const orientation = sensors?.hasSensors && sensors?.heading != null;
  const motion = sensors?.hasSensors;
  const camera = !!cameraActive;
  const audio = sonar?.status === 'active' || acoustic?.active;
  const sources = [orientation, motion, camera, audio].filter(Boolean).length;
  const quality = Math.round((sources / 4) * 100);
  const confidence = spatialStats?.confidence != null ? Math.round(spatialStats.confidence * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Move3d className="w-3.5 h-3.5" style={{ color }} />
          <h3 className="font-display text-xs tracking-wider">PHONE SENSOR FUSION</h3>
        </div>
        <span className="font-mono text-[8px] font-bold" style={{ color }}>{quality}% READY</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Item icon={Compass} label="HEADING" value={orientation ? `${sensors.heading}°` : 'UNAVAILABLE'} color={color} active={orientation} />
        <Item icon={Activity} label="MOTION" value={motion ? (sensors.isMoving ? 'MOVING' : 'STABLE') : 'UNAVAILABLE'} color={color} active={motion} />
        <Item icon={Camera} label="VISION" value={camera ? `${detections.length} TRACKED` : 'OFF'} color={color} active={camera} />
        <Item icon={Mic} label="ACOUSTIC" value={audio ? (sonar?.motion ? 'MOTION' : 'ACTIVE') : 'OFF'} color={color} active={audio} />
      </div>

      <div className="rounded-lg border border-white/10 bg-black/20 p-2">
        <div className="flex items-center gap-2 mb-1.5">
          <Gauge className="w-3 h-3" style={{ color }} />
          <span className="font-mono text-[8px] font-bold">SPATIAL FUSION</span>
          <span className="ml-auto font-mono text-[8px]" style={{ color }}>{confidence}% CONF</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${quality}%`, background: color }} />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[7px] text-muted-foreground">
          <span>{spatialStats?.points || 0} MAP POINTS</span>
          <span>{spatialStats?.tracked || 0} STABLE</span>
        </div>
      </div>

      <div className="font-mono text-[7px] leading-relaxed text-muted-foreground">
        Phone-only mode uses real camera, motion/orientation and acoustic inputs. Spatial positions are estimates; this phone cannot independently produce genuine through-wall radar measurements.
      </div>
    </div>
  );
}
import { motion, AnimatePresence } from 'framer-motion';
import { User, Dog, Box, HelpCircle, ArrowRight, Layers, Gauge, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

const typeConfig = {
  human:   { icon: User,        color: '#00ff88', label: 'Human',   threat: 'low' },
  animal:  { icon: Dog,         color: '#00ccff', label: 'Animal',  threat: 'none' },
  object:  { icon: Box,         color: '#ffaa00', label: 'Object',  threat: 'none' },
  unknown: { icon: HelpCircle,  color: '#ff4466', label: 'Unknown', threat: 'high' },
};

const threatConfig = {
  none: { color: '#00ff8866', label: 'CLEAR',    icon: CheckCircle },
  low:  { color: '#ffaa0099', label: 'MONITOR',  icon: Shield },
  high: { color: '#ff446699', label: 'ALERT',    icon: AlertTriangle },
};

function BarMeter({ value, color, label, unit = '%' }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between font-mono text-[9px]">
        <span className="text-muted-foreground">{label}</span>
        <span style={{ color }}>{value}{unit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: color }}
          animate={{ width: `${value}%` }} transition={{ duration: 0.4 }} />
      </div>
    </div>
  );
}

function DetectionCard({ detection, isSelected, onSelect }) {
  const config = typeConfig[detection.type] || typeConfig.unknown;
  const threat = threatConfig[detection.threat ? 'high' : config.threat];
  const ThreatIcon = threat.icon;
  const Icon = config.icon;

  return (
    <motion.button layout onClick={() => onSelect(isSelected ? null : detection)}
      className="w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-200"
      style={{ borderColor: isSelected ? `${config.color}50` : '#ffffff10', background: isSelected ? `${config.color}08` : 'transparent' }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${config.color}15`, border: `1px solid ${config.color}30` }}>
          <Icon className="w-4 h-4" style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-mono text-xs text-foreground">{config.label}</span>
            {detection.moving && (
              <motion.span animate={{ x: [0, 2, 0] }} transition={{ duration: 0.8, repeat: Infinity }}
                className="font-mono text-[8px] px-1 rounded-sm" style={{ color: config.color, background: `${config.color}15` }}>
                MOVING
              </motion.span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground">{Number.isFinite(Number(detection.distance)) ? `${Number(detection.distance).toFixed(1)}m away` : 'RANGE N/A'}</span>
            <span className="font-mono text-[10px] text-muted-foreground">·</span>
            <span className="font-mono text-[10px] text-muted-foreground">{Math.round(detection.angle)}°</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
            style={{ background: `${threat.color}20`, border: `1px solid ${threat.color}` }}>
            <ThreatIcon className="w-2.5 h-2.5" style={{ color: threat.color }} />
            <span className="font-mono text-[8px]" style={{ color: threat.color }}>{threat.label}</span>
          </div>
          <span className="font-mono text-[9px] text-muted-foreground">{detection.intensity}% conf.</span>
        </div>
      </div>

      {/* Mini signal bar */}
      <div className="mt-2 h-0.5 rounded-full bg-muted overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: config.color, opacity: 0.6 }}
          animate={{ width: `${detection.intensity}%` }} transition={{ duration: 0.4 }} />
      </div>
    </motion.button>
  );
}

export default function DetectionPanel({ detections, selectedDetection, onSelectDetection }) {
  const selected = selectedDetection;
  const config = selected ? (typeConfig[selected.type] || typeConfig.unknown) : null;

  const humans = detections.filter(d => d.type === 'human').length;
  const moving = detections.filter(d => d.moving).length;

  return (
    <div className="space-y-3">
      {/* Header stats */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xs tracking-wider text-foreground">DETECTIONS</h3>
        <div className="flex items-center gap-2">
          {moving > 0 && (
            <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }}
              className="font-mono text-[9px] px-1.5 py-0.5 rounded-full"
              style={{ color: '#00ff88', background: '#00ff8815', border: '1px solid #00ff8830' }}>
              {moving} MOVING
            </motion.span>
          )}
          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
            {detections.length} total
          </span>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: 'HUMANS', value: humans, color: '#00ff88' },
          { label: 'MOVING', value: moving, color: '#00ccff' },
          { label: 'ALERTS', value: detections.filter(d => d.threat).length, color: '#ff4466' },
        ].map(s => (
          <div key={s.label} className="text-center py-2 rounded-lg border border-border bg-muted/20">
            <div className="font-display text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="font-mono text-[8px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Detection list */}
      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5">
        <AnimatePresence>
          {detections.length === 0 && (
            <div className="text-center py-6 font-mono text-[11px] text-muted-foreground">No objects detected</div>
          )}
          {detections.map(d => (
            <DetectionCard key={d.id} detection={d}
              isSelected={selected?.id === d.id} onSelect={onSelectDetection} />
          ))}
        </AnimatePresence>
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selected && config && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-lg border p-3 space-y-3"
              style={{ borderColor: `${config.color}30`, background: `${config.color}05` }}>

              <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: `${config.color}20` }}>
                <Layers className="w-3.5 h-3.5" style={{ color: config.color }} />
                <span className="font-display text-[10px] tracking-wider" style={{ color: config.color }}>
                  {selected.source === 'camera' || selected.source === 'camera+sensor-corroborated' ? 'LIVE CAMERA OBSERVATION' : 'EXTERNAL SENSOR OBSERVATION'}
                </span>
              </div>

              {selected.source === 'live' ? (
                <div className="flex items-center gap-2 py-2 rounded-md bg-muted/40">
                  <span className="w-2 h-2 rounded-full" style={{ background: config.color, boxShadow: `0 0 6px ${config.color}` }} />
                  <span className="font-mono text-[9px] text-foreground/80">Direct line-of-sight · no wall obstruction</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-md bg-muted/40 px-2 py-2 font-mono text-[9px] text-muted-foreground">
                    Sensor-derived observation. Range, bearing and classification are shown only when supplied by the connected sensor; the phone alone does not infer through-wall location.
                  </div>
                  {(selected.wallLayers || []).length > 0 && selected.wallLayers.map((layer, i) => (
                    <BarMeter key={i} label={`${layer.material || 'UNKNOWN'} (${layer.thickness || '?'})`} value={Number(layer.density) || 0} color={config.color} unit="%" />
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="text-center py-2 rounded-md bg-muted/50">
                  <Gauge className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-mono text-[11px] text-foreground font-bold">{selected.speed ?? '0'} m/s</div>
                  <div className="font-mono text-[8px] text-muted-foreground">VELOCITY</div>
                </div>
                <div className="text-center py-2 rounded-md bg-muted/50">
                  <ArrowRight className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-mono text-[11px] text-foreground font-bold">{selected.heading ?? 'N/A'}</div>
                  <div className="font-mono text-[8px] text-muted-foreground">HEADING</div>
                </div>
              </div>

              <BarMeter label="SIGNAL CONFIDENCE" value={selected.intensity} color={config.color} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
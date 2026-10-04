import { Cpu, Radio, Sparkles, Gauge } from 'lucide-react';

function Pill({ children, color }) {
  return <span className="rounded border px-1.5 py-0.5 font-mono text-[7px]" style={{ borderColor: `${color}30`, color: `${color}bb`, background: `${color}08` }}>{children}</span>;
}

export default function SensorCapabilityPanel({ model, runtimeCapacity = null, color = '#00ff88' }) {
  if (!model) return null;
  const available = model.activeCapabilities || [];
  const paths = (model.derivationPaths || []).filter(p => p.status === 'AVAILABLE');
  const derived = model.derived || [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" style={{ color }} />
          <h3 className="font-display text-xs tracking-wider">OPPORTUNISTIC SENSOR FUSION</h3>
        </div>
        <Pill color={color}>{model.measuredSources} SIGNAL SOURCES</Pill>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
          <Radio className="w-3 h-3 mb-1" style={{ color }} />
          <div className="font-mono text-[7px] text-muted-foreground">CAPABILITY COVERAGE</div>
          <div className="font-mono text-sm font-bold" style={{ color }}>{model.capabilityCoverage}%</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
          <Gauge className="w-3 h-3 mb-1" style={{ color }} />
          <div className="font-mono text-[7px] text-muted-foreground">SAFE PROCESSING HEADROOM</div>
          <div className="font-mono text-sm font-bold" style={{ color }}>{runtimeCapacity?.headroomPct ?? model.acquisitionHeadroom}%</div>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/20 p-2">
        <div className="flex items-center gap-2 mb-1.5">
          <Cpu className="w-3 h-3" style={{ color }} />
          <span className="font-mono text-[8px] font-bold">AVAILABLE REAL SIGNALS</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {available.map(c => <Pill key={c.id} color={color}>{c.label.toUpperCase()}</Pill>)}
          {!available.length && <span className="font-mono text-[7px] text-muted-foreground">NO OPTIONAL SIGNALS EXPOSED</span>}
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/20 p-2">
        <div className="font-mono text-[8px] font-bold mb-1.5">DERIVATIONS CURRENTLY POSSIBLE</div>
        <div className="space-y-1">
          {paths.map(p => (
            <div key={p.id} className="flex items-center justify-between gap-2">
              <span className="font-mono text-[7px] text-white/70 truncate">{p.output}</span>
              <span className="font-mono text-[7px]" style={{ color }}>AVAILABLE</span>
            </div>
          ))}
          {!paths.length && <div className="font-mono text-[7px] text-muted-foreground">WAITING FOR COMPATIBLE SENSOR COMBINATION</div>}
        </div>
      </div>

      {derived.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-2">
          <div className="font-mono text-[8px] font-bold mb-1.5">LIVE DERIVED SIGNALS</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {derived.slice(0, 8).map(item => (
              <div key={item.id} className="min-w-0">
                <div className="font-mono text-[7px] text-muted-foreground truncate">{item.label}</div>
                <div className="font-mono text-[8px]" style={{ color }}>{typeof item.value === 'object' ? 'MEASURED' : `${item.value} ${item.unit || ''}`}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {runtimeCapacity && <div className="rounded-lg border border-white/10 bg-black/20 p-2">
        <div className="font-mono text-[8px] font-bold">RUNTIME CAPACITY</div>
        <div className="mt-1 grid grid-cols-3 gap-2 font-mono text-[7px] text-white/55">
          <span>SAFE <b style={{ color }}>{runtimeCapacity.safeCapacity}</b></span>
          <span>ACTIVE <b className="text-white/80">{runtimeCapacity.activeTargets}</b></span>
          <span>FPS <b className="text-white/80">{runtimeCapacity.fps == null ? '—' : runtimeCapacity.fps.toFixed(1)}</b></span>
        </div>
        <div className="mt-1 font-mono text-[6px] text-white/35">FRAME {runtimeCapacity.frameMs == null ? '—' : `${runtimeCapacity.frameMs.toFixed(1)}ms`} · LONG TASK {runtimeCapacity.longTaskMs.toFixed(1)}ms · HEAP {runtimeCapacity.heapUsedMb == null ? '—' : `${runtimeCapacity.heapUsedMb.toFixed(0)}MB`}</div>
      </div>}

      <div className="font-mono text-[7px] leading-relaxed text-muted-foreground">
        CMVisual uses whatever real signals the device exposes, then derives additional features only when the required evidence exists. A derived feature never becomes a measured fact without a supporting sensor.
      </div>
    </div>
  );
}
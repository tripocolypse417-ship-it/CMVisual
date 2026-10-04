import { useEffect, useMemo, useState } from 'react';
import { Bluetooth, Cable, CheckCircle2, RefreshCw, Radio, Settings2, Wifi, XCircle } from 'lucide-react';

function Status({ connected, label }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[8px] font-bold" style={{ color: connected ? '#7dffb2' : '#ffffff70' }}>
      {connected ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label}
    </span>
  );
}

export default function SensorConnectionPanel({ color = '#7dffb2', sensorConnected = false, lastFrame = null, bridgeStats = null }) {
  const [url, setUrl] = useState(() => localStorage.getItem('waveradar.sensorUrl') || '');
  const [saved, setSaved] = useState(false);
  const [heading, setHeading] = useState(0);
  const [distance, setDistance] = useState(2);
  const [calibrated, setCalibrated] = useState(() => localStorage.getItem('waveradar.calibrated') === '1');

  useEffect(() => {
    const onOrientation = (event) => {
      if (Number.isFinite(event.alpha)) setHeading(Math.round((360 - event.alpha + 360) % 360));
    };
    window.addEventListener('deviceorientation', onOrientation);
    return () => window.removeEventListener('deviceorientation', onOrientation);
  }, []);

  const frameAge = useMemo(() => {
    if (!lastFrame?.receivedAt) return null;
    return Math.max(0, Math.round((performance.now() - lastFrame.receivedAt) / 1000));
  }, [lastFrame]);

  const saveUrl = () => {
    const clean = url.trim();
    if (!clean) localStorage.removeItem('waveradar.sensorUrl');
    else localStorage.setItem('waveradar.sensorUrl', clean);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const calibrate = () => {
    localStorage.setItem('waveradar.calibration', JSON.stringify({ heading, referenceDistance: distance, createdAt: Date.now() }));
    localStorage.setItem('waveradar.calibrated', '1');
    setCalibrated(true);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5" style={{ color }} />
          <h3 className="font-display text-xs tracking-wider">SENSOR LINK</h3>
        </div>
        <Status connected={sensorConnected} label={sensorConnected ? 'LIVE' : 'WAITING'} />
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
          <Wifi className="w-3 h-3 mb-1" style={{ color }} />
          <div className="font-mono text-[7px] text-muted-foreground">WEBSOCKET</div>
          <div className="font-mono text-[8px] truncate">{url ? 'CONFIGURED' : 'NOT SET'}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
          <Bluetooth className="w-3 h-3 mb-1" style={{ color }} />
          <div className="font-mono text-[7px] text-muted-foreground">BLE</div>
          <div className="font-mono text-[8px]">BRIDGE READY</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
          <Cable className="w-3 h-3 mb-1" style={{ color }} />
          <div className="font-mono text-[7px] text-muted-foreground">DATA</div>
          <div className="font-mono text-[8px]">{lastFrame?.detections?.length || 0} TARGETS</div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="wss://sensor-host/range" className="flex-1 min-w-0 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 font-mono text-[8px] outline-none" />
        <button onClick={saveUrl} className="rounded-lg border px-2 font-mono text-[8px]" style={{ borderColor: `${color}40`, color }}>{saved ? 'SAVED' : 'SAVE'}</button>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Settings2 className="w-3 h-3" style={{ color }} />
          <span className="font-mono text-[8px] font-bold">REFERENCE CALIBRATION</span>
          <span className="ml-auto font-mono text-[7px]" style={{ color: calibrated ? '#7dffb2' : '#ffffff60' }}>{calibrated ? 'READY' : 'REQUIRED'}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="font-mono text-[7px] text-muted-foreground">HEADING°
            <input value={heading} onChange={e => setHeading(Number(e.target.value) || 0)} type="number" className="mt-1 w-full rounded border border-white/10 bg-black/20 px-1.5 py-1 text-[8px] text-foreground" />
          </label>
          <label className="font-mono text-[7px] text-muted-foreground">REFERENCE M
            <input value={distance} onChange={e => setDistance(Number(e.target.value) || 0)} type="number" min="0.1" step="0.1" className="mt-1 w-full rounded border border-white/10 bg-black/20 px-1.5 py-1 text-[8px] text-foreground" />
          </label>
        </div>
        <button onClick={calibrate} className="w-full rounded-lg border py-1.5 font-mono text-[8px] font-bold" style={{ borderColor: `${color}45`, color }}>
          <RefreshCw className="inline w-3 h-3 mr-1" /> STORE WORLD ORIGIN
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1.5 font-mono text-[7px]">
        <div className="rounded border border-white/10 bg-white/[0.03] p-1.5"><div className="text-muted-foreground">RATE</div><div>{bridgeStats?.hz ?? 0} Hz</div></div>
        <div className="rounded border border-white/10 bg-white/[0.03] p-1.5"><div className="text-muted-foreground">FRAMES</div><div>{bridgeStats?.frames ?? 0}</div></div>
        <div className="rounded border border-white/10 bg-white/[0.03] p-1.5"><div className="text-muted-foreground">DROPPED</div><div>{bridgeStats?.dropped ?? 0}</div></div>
        <div className="rounded border border-white/10 bg-white/[0.03] p-1.5"><div className="text-muted-foreground">LATENCY</div><div>{bridgeStats?.lastLatencyMs == null ? '—' : `${bridgeStats.lastLatencyMs}ms`}</div></div>
      </div>
      <div className="font-mono text-[7px] text-muted-foreground flex items-center justify-between">
        <span>{sensorConnected ? 'MEASUREMENTS RECEIVING' : 'NO LIVE RANGE SOURCE'}</span>
        <span>{frameAge == null ? '—' : `${frameAge}s AGO`}</span>
      </div>
    </div>
  );
}
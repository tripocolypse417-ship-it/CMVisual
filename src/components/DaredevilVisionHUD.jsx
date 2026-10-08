import React, { useMemo } from 'react';
import {
  Camera, Wifi, Radio, Activity, MapPin, Navigation, Crosshair,
  UserRound, Mic, Gauge, Sun, Compass, Smartphone, Eye, Battery,
  Signal, Wind, Footprints, Clock3, Layers3
} from 'lucide-react';

const pct = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n <= 1 ? n * 100 : n);
};

const fmt = (value, suffix = '') => Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}${suffix}` : '—';

function Panel({ title, children, className = '', tone = 'cyan' }) {
  const toneMap = {
    cyan: '#00d9ff',
    red: '#ff3158',
    green: '#00ff8a',
    amber: '#ffd23f',
    blue: '#3d8dff'
  };
  const c = toneMap[tone] || toneMap.cyan;
  return (
    <div className={`wv-panel wv-panel-${tone} ${className}`} style={{'--wv-tone': c}}>
      <div className="wv-panel-title">{title}</div>
      <div className="wv-panel-body">{children}</div>
    </div>
  );
}

function SensorRow({ icon: Icon, label, value, detail, state = 'ON', tone = 'green' }) {
  return (
    <div className="wv-sensor-row">
      <div className={`wv-sensor-icon wv-${tone}`}><Icon size={18} /></div>
      <div className="wv-sensor-copy">
        <div><span>{label}</span><b>{state}</b></div>
        <small>{value || 'AVAILABLE'} {detail ? <em>{detail}</em> : null}</small>
      </div>
    </div>
  );
}

function Radar({ detections = [], heading = 0 }) {
  const points = (Array.isArray(detections) ? detections : []).slice(0, 18).map((d, i) => {
    const angle = Number.isFinite(Number(d.angle)) ? Number(d.angle) : (i * 47 + 20) % 360;
    const distance = Number.isFinite(Number(d.distance)) ? Math.max(0.12, Math.min(1, Number(d.distance) / 12)) : 0.25 + (i % 3) * 0.15;
    const r = 45 * distance;
    const a = ((angle - Number(heading || 0) - 90) * Math.PI) / 180;
    return {
      id: d.id || i,
      x: 50 + Math.cos(a) * r,
      y: 50 + Math.sin(a) * r,
      human: d.type === 'human',
      selected: String(d.trackId ?? d.id) === String(arguments[0]?.selectedId)
    };
  });
  return (
    <div className="wv-radar">
      <div className="wv-radar-ring r1" /><div className="wv-radar-ring r2" /><div className="wv-radar-ring r3" />
      <div className="wv-radar-cross h" /><div className="wv-radar-cross v" />
      <div className="wv-radar-sweep" />
      <div className="wv-radar-n">N</div><div className="wv-radar-e">E</div><div className="wv-radar-s">S</div><div className="wv-radar-w">W</div>
      {points.map((p) => <span key={p.id} className={`wv-radar-dot ${p.human ? 'human' : ''}`} style={{left:`${p.x}%`,top:`${p.y}%`}} />)}
      <div className="wv-radar-center"><Crosshair size={15}/></div>
    </div>
  );
}

function Skeleton({ color = '#ff3158', confidence = 0.6 }) {
  const opacity = Math.max(0.5, Math.min(1, Number(confidence) || 0.6));
  return (
    <div className="wv-skeleton" style={{'--skel': color, opacity}}>
      <div className="wv-sk-head" />
      <div className="wv-sk-spine" />
      <div className="wv-sk-arm left" /><div className="wv-sk-arm right" />
      <div className="wv-sk-leg left" /><div className="wv-sk-leg right" />
      <i className="j shoulder-l"/><i className="j shoulder-r"/><i className="j elbow-l"/><i className="j elbow-r"/>
      <i className="j hip-l"/><i className="j hip-r"/><i className="j knee-l"/><i className="j knee-r"/>
      <div className="wv-skel-label">INFERRED HUMAN POSE</div>
    </div>
  );
}

export default function DaredevilVisionHUD({
  selectedDetection,
  lockedTrackId,
  liveDetections = [],
  detections = [],
  cameraActive,
  isScanning,
  heading = 0,
  battery,
  network,
  sensorConnected,
  lastFrame,
  bridgeStats,
  sensorReliability,
  wallOpacity = 35,
  workspaceMode = 'live',
}) {
  const target = selectedDetection || null;
  const isLocked = lockedTrackId != null && target && String(lockedTrackId) === String(target.trackId ?? target.id);
  const confidence = pct(target?.confidence);
  const evidence = String(target?.evidenceClass || target?.evidence_class || (target?.source ? 'MEASURED' : 'UNKNOWN')).toUpperCase();
  const isHuman = target?.type === 'human';
  const measured = evidence === 'MEASURED' || evidence === 'DERIVED';
  const distance = Number.isFinite(Number(target?.distance)) ? Number(target.distance) : null;
  const speed = Number.isFinite(Number(target?.derivedTrack?.speedMps)) ? Number(target.derivedTrack.speedMps) : null;
  const targetCount = Array.isArray(liveDetections) ? liveDetections.length : 0;
  const frameAge = lastFrame?.receivedAt ? Math.max(0, Math.round((performance.now() - lastFrame.receivedAt) / 1000)) : null;
  const signal = Number.isFinite(Number(bridgeStats?.signalStrengthDbm)) ? Number(bridgeStats.signalStrengthDbm) : null;
  const reliability = pct(sensorReliability?.overall);
  const title = isLocked ? 'TARGET LOCKED' : target ? 'TARGET ACQUIRED' : 'SEARCHING';
  const targetId = target?.displayId || target?.trackId || target?.id || 'NO TARGET';
  const movement = target?.moving == null ? 'UNKNOWN' : target.moving ? 'MOVING' : 'STATIONARY';
  const sourceLabel = cameraActive ? 'CAMERA / VISUAL' : sensorConnected ? 'SENSOR BRIDGE' : 'DEVICE SENSORS';
  const mode = workspaceMode === 'review' ? 'REVIEW' : 'LIVE';

  const movementTrail = useMemo(() => {
    const t = target?.derivedTrack?.trail;
    if (Array.isArray(t) && t.length) return t.slice(-9);
    return [];
  }, [target]);

  return (
    <div className="wv-hud" data-mode="daredevil">
      <div className="wv-scanline" />

      <div className="wv-top-brand">
        <div className="wv-logo"><Radio size={26}/></div>
        <div><strong>WaveRadar</strong><small>REAL-TIME SENSING · SEE BEYOND · TEAM AWARENESS</small></div>
      </div>

      <div className={`wv-target-banner ${isLocked ? 'locked' : ''}`}>
        <Crosshair size={30}/>
        <div><strong>{title}</strong><span>ID: {String(targetId).slice(0, 18)} · {isHuman ? 'HUMAN' : target?.type ? String(target.type).toUpperCase() : 'UNKNOWN'} · CONFIDENCE: {confidence == null ? '—' : confidence + '%'}</span></div>
      </div>

      <div className="wv-status-top">
        <span>{new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</span>
        <Signal size={18}/><span>{network?.effectiveType || '5G'}</span>
        <Battery size={18}/><span>{battery?.level != null ? Math.round(Number(battery.level) * 100) + '%' : '—'}</span>
        <i />
      </div>

      <aside className="wv-left">
        <Panel title="SENSORS (THIS DEVICE)">
          <SensorRow icon={Camera} label="Camera (Visual)" value={cameraActive ? 'LIVE' : 'READY'} detail={cameraActive ? '60 FPS' : ''} />
          <SensorRow icon={Wifi} label="Wi-Fi / CSI" value={sensorConnected ? 'CONNECTED' : 'AVAILABLE'} detail="EXPERIMENTAL" tone="blue" />
          <SensorRow icon={Activity} label="IMU (Motion)" value="ACTIVE" detail="200 Hz" />
          <SensorRow icon={MapPin} label="GPS (Location)" value="AVAILABLE" detail="DEVICE" />
          <SensorRow icon={Mic} label="Microphone (Audio)" value="READY" detail="OPTIONAL" />
          <SensorRow icon={Gauge} label="Barometer" value="AVAILABLE" detail="PRESSURE" />
          <SensorRow icon={Sun} label="Light / Proximity" value="AVAILABLE" detail="DEVICE" />
          <SensorRow icon={Compass} label="Magnetometer" value={heading ? `${Math.round(heading)}°` : 'AVAILABLE'} detail="HEADING" />
        </Panel>

        <Panel title={`NEARBY OBSERVATIONS (${Math.min(9, targetCount)})`} tone="blue">
          {(Array.isArray(liveDetections) ? liveDetections : []).slice(0, 4).map((d, i) => (
            <div className="wv-nearby" key={d.id || i}>
              <Smartphone size={18}/><span>{d.displayId || `Track ${i + 1}`}<small>{d.source || 'LOCAL INPUT'}</small></span><b>{fmt(d.distance, ' m')}</b>
            </div>
          ))}
          {!targetCount && <div className="wv-empty">NO LIVE TARGETS · REAL INPUT REQUIRED</div>}
        </Panel>

        <div className="wv-radar-wrap"><Radar detections={liveDetections} heading={heading}/><span>TEAM NETWORK · {targetCount} ACTIVE OBSERVATIONS</span></div>
      </aside>

      <aside className="wv-right">
        <Panel title="TARGET DETAILS" tone={isLocked ? 'red' : 'cyan'}>
          <div className="wv-detail-head"><UserRound size={27}/><div><strong>{isHuman ? 'Human observation' : target?.type ? String(target.type) : 'No target'}</strong><small>ID: {String(targetId)}</small></div><b>{isLocked ? 'LOCKED' : 'READY'}</b></div>
          <div className="wv-detail-row"><MapPin/><span>Position</span><b>{distance == null ? 'UNAVAILABLE' : `${distance.toFixed(1)} m · EST.`}</b></div>
          <div className="wv-detail-row"><Navigation/><span>Direction</span><b>{target?.angle == null ? '—' : `${Number(target.angle).toFixed(0)}°`}</b></div>
          <div className="wv-detail-row"><Footprints/><span>Movement</span><b>{movement}{speed != null ? ` · ${speed.toFixed(1)} m/s` : ''}</b></div>
          <div className="wv-confidence"><span>CONFIDENCE</span><b>{confidence == null ? '—' : confidence + '%'}</b><div><i style={{width:`${confidence || 0}%`}}/></div></div>
        </Panel>

        <Panel title="EVIDENCE SOURCES">
          <div className="wv-evidence"><Camera/><span>Camera / visual lock</span><b>{cameraActive ? 'GOOD' : 'READY'}</b></div>
          <div className="wv-evidence"><Wifi/><span>Wi-Fi / RF</span><b>{sensorConnected ? 'EXPERIMENTAL' : 'UNAVAILABLE'}</b></div>
          <div className="wv-evidence"><Layers3/><span>Wall mapping</span><b>INFERRED</b></div>
          <div className="wv-evidence"><Activity/><span>Sensor agreement</span><b>{reliability == null ? 'UNKNOWN' : reliability + '%'}</b></div>
        </Panel>

        <Panel title="DATA QUALITY" tone="amber">
          <div className="wv-quality"><span>Sensor agreement</span><b>{reliability == null ? 'UNKNOWN' : reliability + '%'}</b></div>
          <div className="wv-quality"><span>Input age</span><b>{frameAge == null ? 'LIVE / —' : frameAge + ' s'}</b></div>
          <div className="wv-quality"><span>Validation status</span><b>{measured ? 'MEASURED INPUT' : 'EXPERIMENTAL'}</b></div>
          <div className="wv-quality"><span>Mode</span><b>{mode}</b></div>
        </Panel>

        <Panel title="UNFILTERED DATA (RAW FEED)" tone="blue">
          <div className="wv-raw"><Clock3/> <span>Source</span><b>{sourceLabel}</b></div>
          <div className="wv-raw"><Activity/> <span>Targets</span><b>{targetCount}</b></div>
          <div className="wv-raw"><Radio/> <span>RF signal</span><b>{signal == null ? '—' : signal + ' dBm'}</b></div>
          <div className="wv-raw"><Eye/> <span>Wall layer</span><b>INFERRED · OPACITY {wallOpacity}%</b></div>
        </Panel>
      </aside>

      <div className="wv-center-reticle">
        <div className="wv-corners"><i/><i/><i/><i/></div>
        {target && isHuman && <Skeleton confidence={target.confidence ?? 0.6}/>}
        <div className="wv-target-box">
          <Crosshair size={34}/>
          <span>{target ? `TARGET ${String(targetId).slice(0, 12)}` : 'SEARCHING'}</span>
          <small>{target ? `${evidence} · ${distance == null ? 'RANGE —' : distance.toFixed(1) + ' m EST.'}` : 'NO VALID LOCK'}</small>
        </div>
        <div className="wv-route-arrow"><Navigation size={22}/><span>{target ? 'PATH / APPROACH' : 'ORIENT'}</span></div>
      </div>

      <div className="wv-bottom-left">
        <div className="wv-legend"><i className="measured"/>MEASURED <i className="inferred"/>INFERRED <i className="experimental"/>EXPERIMENTAL <i className="unknown"/>NO DATA</div>
      </div>

      <div className="wv-movement">
        <div className="wv-panel-title">MOVEMENT PATTERN · LAST OBSERVATIONS</div>
        <div className="wv-steps">
          {movementTrail.length ? movementTrail.map((_, i) => <span key={i} style={{'--delay': i}}><Footprints size={17}/></span>) : Array.from({length: 9}).map((_, i) => <span key={i} className="muted"><Footprints size={17}/></span>)}
          <div><b>SPEED</b>{speed == null ? '—' : speed.toFixed(1) + ' m/s'}</div>
          <div><b>STATE</b>{movement}</div>
        </div>
      </div>

      <div className="wv-modebar">
        <Eye size={24}/><div><b>DAREDEVIL VISION MODE</b><small>WALL / RF / WI-FI / SENSOR FUSION · INFERENCE CLEARLY MARKED</small></div>
      </div>

      <div className="wv-viewmodes">
        <button className="active">NORMAL</button><button className="active">DAREDEVIL VISION</button><button>3D MODEL</button>
      </div>

      <div className="wv-footer-state"><span className={isScanning ? 'on' : ''}>● {isScanning ? 'SCANNING' : 'STANDBY'}</span><span>{targetCount} ACTIVE OBSERVATIONS</span><span>MODE: {mode}</span></div>
    </div>
  );
}

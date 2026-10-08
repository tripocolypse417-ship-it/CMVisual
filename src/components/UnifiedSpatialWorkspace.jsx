import React, { useMemo, useState } from 'react';
import EnvironmentMap from './EnvironmentMap';
import AutoFloorplanMap from './AutoFloorplanMap';
import WallVisionScene from './WallVisionScene';
import CameraARView from './CameraARView';
import { Camera, Cuboid, Map, ScanLine, Layers3, Eye, EyeOff, Activity, Crosshair, Settings2 } from 'lucide-react';
import useTargetLockStyle from '../hooks/useTargetLockStyle';

/**
 * CMVisual's single-screen spatial workspace.
 *
 * The camera remains the primary visual source. Spatial reconstruction,
 * orientation/map and scan-built floorplan are layered into the same workspace
 * instead of forcing the operator to scroll between separate dashboards.
 * Every source remains explicitly labeled so inference is never presented as
 * measured reality.
 */
export default function UnifiedSpatialWorkspace({
  color,
  detections,
  cameraDetections,
  liveDetections,
  trajectoryPredictions = [],
  trackAnomalies = [],
  predictionCalibration = null,
  physicalOutcomeForecast = [],
  worldTimeline = null,
  worldProjection = null,
  scanMode,
  isScanning,
  cameraActive,
  onCameraDetections,
  onCameraActive,
  wallOpacity,
  onWallOpacity,
  trailsEnabled,
  zoom,
  autoZoom,
  zoomRange,
  ghostMode,
  sonar,
  proximityRange,
  proximityEnabled,
  onProximityAlert,
  heading,
  compassNeedsPermission,
  onEnableCompass,
  selectedDetection,
  onSelectDetection,
  lockedTrackId = null,
  onToggleTrackLock,
  workspaceMode = 'combined',
  onWorkspaceModeChange,
  sensorConnected,
  lastFrame,
  bridgeStats,
  sensorReliability = null,
  sensorConflicts = null,
  cellular,
}) {
  const [layers, setLayers] = useState({ camera: true, spatial: true, map: true, floorplan: true, tracks: true, coverage: false });
  // PDF visual baseline: the scene is unobstructed at launch; detail rails open on demand.
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [targetStripOpen, setTargetStripOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [incidentCommand, setIncidentCommand] = useState(false);
  const [trainingMode, setTrainingMode] = useState(false);
  const [lockStyleOpen, setLockStyleOpen] = useState(false);
  const lockVisual = useTargetLockStyle();

  const toggleLayer = (key) => setLayers((current) => ({ ...current, [key]: !current[key] }));
  const selected = useMemo(() => selectedDetection || null, [selectedDetection]);
  const lockedCurrent = useMemo(() => {
    if (lockedTrackId == null) return null;
    return (Array.isArray(liveDetections) ? liveDetections : []).find((d) => String(d.trackId ?? d.id) === String(lockedTrackId)) || null;
  }, [liveDetections, lockedTrackId]);
  const lockedStale = lockedTrackId != null && !lockedCurrent;
  const sameTrack = (a, b) => {
    if (!a || !b) return false;
    const idsA = [a.trackId, a.id].filter((v) => v != null).map(String);
    const idsB = [b.trackId, b.id].filter((v) => v != null).map(String);
    return idsA.some((id) => idsB.includes(id));
  };
  const evidenceClass = selected?.evidenceClass || selected?.evidence_class || (
    selected?.corroborated ? 'DERIVED' : selected?.source ? 'MEASURED' : 'UNAVAILABLE'
  );
  const evidenceLabel = String(evidenceClass).toUpperCase();
  const lockTone = selected?.type === 'human' ? '#00ff88' : selected?.type === 'animal' ? '#00ccff' : '#ffaa00';
  const lockSizePx = lockVisual.settings.size === 'large' ? 30 : lockVisual.settings.size === 'small' ? 16 : 22;
  const motionLabel = selected?.moving == null ? 'UNAVAILABLE' : selected.moving ? 'MOVING' : 'STATIONARY';
  const telemetry = useMemo(() => {
    const external = Array.isArray(detections) ? detections.length : 0;
    const camera = Array.isArray(cameraDetections) ? cameraDetections.length : 0;
    const measurements = Array.isArray(lastFrame?.measurements) ? lastFrame.measurements.length : 0;
    const ageMs = lastFrame?.receivedAt ? Math.max(0, performance.now() - lastFrame.receivedAt) : null;
    const hz = Number(bridgeStats?.hz) || 0;
    const latency = Number.isFinite(Number(bridgeStats?.lastLatencyMs)) ? Number(bridgeStats.lastLatencyMs) : null;
    const quality = Number.isFinite(Number(bridgeStats?.rangeQuality)) ? Math.round(Number(bridgeStats.rangeQuality) * 100) : null;
    const agreement = Number.isFinite(Number(bridgeStats?.sensorAgreement)) ? Math.round(Number(bridgeStats.sensorAgreement) * 100) : null;
    const cellularCells = Array.isArray(cellular?.cells) ? cellular.cells.length : 0;
    const cellularAgeMs = Number.isFinite(Number(cellular?.ageMs)) ? Number(cellular.ageMs) : null;
    const reliability = Number.isFinite(Number(sensorReliability?.overall)) ? Number(sensorReliability.overall) : null;
    const conflicts = Number(sensorConflicts?.conflicts?.length) || 0;
    return { external, camera, measurements, ageMs, hz, latency, quality, agreement, cellularCells, cellularAgeMs, reliability, conflicts };
  }, [detections, cameraDetections, lastFrame, bridgeStats, sensorReliability, sensorConflicts, cellular]);

  const targetSummary = useMemo(() => {
    const items = Array.isArray(liveDetections) ? liveDetections : [];
    return items.map((d, index) => ({
      ...d,
      uiId: d.displayId || (d.type === 'human' ? `PERSON ${String(index + 1).padStart(2, '0')}` : String(d.type || 'UNKNOWN').toUpperCase()),
      evidence: String(d.evidenceClass || d.evidence_class || (d.corroborated ? 'DERIVED' : d.source ? 'MEASURED' : 'UNAVAILABLE')).toUpperCase(),
      confidencePct: Number.isFinite(Number(d.confidence)) ? Math.round(Number(d.confidence) * 100) : null,
      distanceM: Number.isFinite(Number(d.distance)) ? Number(d.distance) : null,
      angleDeg: Number.isFinite(Number(d.angle)) ? Number(d.angle) : null,
      trackSpeed: Number.isFinite(Number(d.derivedTrack?.speedMps)) ? Number(d.derivedTrack.speedMps) : null,
      trackHeading: Number.isFinite(Number(d.derivedTrack?.headingDeg)) ? Number(d.derivedTrack.headingDeg) : null,
    }));
  }, [liveDetections]);

  const forecastSummary = useMemo(() => {
    const predictions = Array.isArray(trajectoryPredictions) ? trajectoryPredictions : [];
    return predictions.map((p) => ({
      ...p,
      one: (Array.isArray(p.horizons) ? p.horizons : []).find((h) => h.horizonMs === 1000) || null,
      three: (Array.isArray(p.horizons) ? p.horizons : []).find((h) => h.horizonMs === 3000) || null,
      five: (Array.isArray(p.horizons) ? p.horizons : []).find((h) => h.horizonMs === 5000) || null,
    }));
  }, [trajectoryPredictions]);

  const federatedMapDetections = useMemo(() => {
    const remote = Array.isArray(worldProjection?.federatedMeasured) ? worldProjection.federatedMeasured : [];
    return remote.map((d) => {
      const x = Number(d?.position?.x);
      const z = Number(d?.position?.z);
      if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
      const distance = Math.hypot(x, z);
      if (!Number.isFinite(distance)) return null;
      return { ...d, id: `federated-${String(d.id)}`, angle: Math.atan2(z, x) * 180 / Math.PI, distance, source: d.source || 'FEDERATED', federation: true };
    }).filter(Boolean);
  }, [worldProjection?.federatedMeasured]);

  const mapDetections = useMemo(() => [...(Array.isArray(liveDetections) ? liveDetections : []), ...federatedMapDetections], [liveDetections, federatedMapDetections]);

  const integrityStatus = useMemo(() => {
    const stale = Number.isFinite(Number(telemetry.ageMs)) && Number(telemetry.ageMs) > 15000;
    const conflicts = Number(telemetry.conflicts) || 0;
    const liveCount = Array.isArray(liveDetections) ? liveDetections.length : 0;
    if (trainingMode) return { label: 'TRAINING · SIMULATION', tone: 'TRAINING DATA ONLY' };
    if (stale) return { label: 'INTEGRITY DEGRADED', tone: 'STALE INPUT' };
    if (conflicts > 0) return { label: 'INTEGRITY REVIEW', tone: `${conflicts} SENSOR CONFLICT${conflicts === 1 ? '' : 'S'}` };
    if (!liveCount && !cameraActive) return { label: 'READY · NO LIVE TARGETS', tone: 'REAL INPUT REQUIRED' };
    return { label: 'INTEGRITY OK', tone: 'PROVENANCE + UNCERTAINTY ACTIVE' };
  }, [telemetry.ageMs, telemetry.conflicts, liveDetections, cameraActive, trainingMode]);

  const modeMeta = {
    live: { label: 'LIVE', detail: 'CURRENT SENSOR + CAMERA OBSERVATIONS' },
    scan: { label: 'SCAN', detail: 'CAPTURE / ACCUMULATE REAL INPUT' },
    analyze: { label: 'ANALYZE', detail: 'INSPECT AVAILABLE OBSERVATIONS' },
    review: { label: 'REVIEW', detail: 'REVIEW CAPTURED DATA ONLY' },
    combined: { label: 'LIVE', detail: 'CURRENT SENSOR + CAMERA OBSERVATIONS' },
  }[workspaceMode] || { label: 'LIVE', detail: 'CURRENT SENSOR + CAMERA OBSERVATIONS' };

  return (
    <section className="relative w-full h-[clamp(560px,72vh,820px)] min-h-[560px] overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl touch-manipulation" data-unified-spatial-workspace>
      {/* PRIMARY LAYER — live camera */}
      {layers.camera && <div className="absolute inset-0 z-0">
        <CameraARView
          detections={cameraDetections}
          wallDetections={detections}
          scanMode={scanMode}
          isScanning={isScanning}
          onDetections={onCameraDetections}
          onCameraActive={onCameraActive}
          wallOpacity={wallOpacity}
          onWallOpacity={onWallOpacity}
          trailsEnabled={trailsEnabled}
          zoom={zoom}
          autoZoom={autoZoom}
          zoomRange={zoomRange}
          ghostMode={ghostMode}
          sonar={sonar}
          proximityRange={proximityRange}
          proximityEnabled={proximityEnabled}
          onProximityAlert={onProximityAlert}
          heading={heading}
          compassNeedsPermission={compassNeedsPermission}
          onEnableCompass={onEnableCompass}
          selectedDetection={selectedDetection}
          onSelectDetection={onSelectDetection}
        />
      </div>}

      {/* SPATIAL LAYER — translucent reconstruction over the camera */}
      {layers.spatial && <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute right-2 top-14 w-[46%] h-[58%] min-w-[300px] max-md:w-[calc(100%-16px)] max-md:h-[42%] max-md:min-w-0 max-md:top-auto max-md:bottom-[205px] max-md:left-2 rounded-xl overflow-hidden border border-white/10 bg-black/30 backdrop-blur-[1px] pointer-events-auto shadow-2xl">
          <WallVisionScene
            detections={liveDetections}
            scanMode={scanMode}
            isScanning={isScanning}
            trailsEnabled={trailsEnabled && layers.tracks}
            heading={heading}
            selectedDetection={selectedDetection}
            onSelectDetection={onSelectDetection}
          />
          <div className="absolute top-2 left-2 rounded-md border border-white/10 bg-black/65 px-2 py-1 font-mono text-[8px] tracking-wider text-white/75 pointer-events-none">
            <Cuboid className="inline w-3 h-3 mr-1" />3D SPATIAL · LIVE
          </div>
        </div>
      </div>}

      {/* MAP + FLOORPLAN dock — same coordinate workspace, not separate pages */}
      {/* Operating mode controller */}
      <div className="absolute left-1/2 -translate-x-1/2 top-3 z-40 rounded-xl border border-white/10 bg-black/80 p-1 backdrop-blur-md shadow-xl pointer-events-auto">
        <div className="grid grid-cols-4 gap-1">
          {[['live','LIVE'],['scan','SCAN'],['analyze','ANALYZE'],['review','REVIEW']].map(([key,label]) => (
            <button key={key} type="button" onClick={() => onWorkspaceModeChange?.(key)} className={`min-h-[40px] min-w-[54px] rounded-md px-2.5 py-1.5 font-mono text-[7px] tracking-wider transition ${workspaceMode === key ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="px-1 pt-1 text-center font-mono text-[6px] tracking-[0.14em] text-white/35">
          {modeMeta.label} · {modeMeta.detail}
        </div>
        <div className="mt-1 grid grid-cols-2 gap-1">
          <button type="button" onClick={() => setIncidentCommand(v => !v)} className={`min-h-[30px] rounded-md border px-2 font-mono text-[6px] tracking-wider ${incidentCommand ? 'border-amber-300/40 bg-amber-300/10 text-amber-100' : 'border-white/5 text-white/35'}`}>INCIDENT COMMAND</button>
          <button type="button" onClick={() => setTrainingMode(v => !v)} className={`min-h-[30px] rounded-md border px-2 font-mono text-[6px] tracking-wider ${trainingMode ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100' : 'border-white/5 text-white/35'}`}>TRAINING MODE</button>
        </div>
      </div>

      <div className="absolute left-3 top-14 z-40 rounded-xl border border-white/10 bg-black/80 px-2.5 py-2 backdrop-blur-md shadow-xl pointer-events-none">
        <div className="font-mono text-[7px] tracking-[0.12em] text-white/70">{incidentCommand ? 'COMMAND VIEW · WIDE AREA' : 'FIELD VIEW · LOCAL DETAIL'}</div>
        <div className="mt-1 font-mono text-[6px] tracking-[0.1em] text-white/35">{integrityStatus.label} · {integrityStatus.tone}</div>
        <div className="mt-1 font-mono text-[6px] text-white/25">MEASURED · DERIVED · PREDICTED · UNKNOWN</div>
      </div>

      {/* Layer controller */}
      <div className="absolute right-3 top-14 z-40 w-[170px] max-md:w-[154px] rounded-xl border border-white/10 bg-black/80 p-2 backdrop-blur-md shadow-xl pointer-events-auto">
        <button type="button" onClick={() => setLayersOpen(v => !v)} className="w-full min-h-[40px] flex items-center justify-between px-1 border-b border-white/10">
          <span className="font-mono text-[8px] tracking-[0.16em] text-white/75"><Layers3 className="inline w-3 h-3 mr-1" />LAYERS</span>
          <span className="font-mono text-[7px] text-white/35">{Object.values(layers).filter(Boolean).length}/6 {layersOpen ? '−' : '+'}</span>
        </button>
        {layersOpen && <div className="grid grid-cols-2 gap-1 mt-1.5">
          {[['camera','Camera'],['spatial','3D Spatial'],['map','Map'],['floorplan','Floorplan'],['tracks','Tracks'],['coverage','Coverage']].map(([key,label]) => (
            <button key={key} type="button" onClick={() => toggleLayer(key)} className={`flex items-center gap-1 rounded-md border px-1.5 py-1.5 text-left font-mono text-[7px] transition ${layers[key] ? 'border-white/20 bg-white/10 text-white/85' : 'border-white/5 bg-black/20 text-white/35'}`}>
              {layers[key] ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}{label}
            </button>
          ))}
        </div>}
      </div>

      {layers.map && <div className={`absolute bottom-3 left-3 z-20 w-[250px] h-[190px] max-md:w-[calc(50%-8px)] max-md:h-[170px] rounded-xl overflow-hidden border border-white/10 bg-black/80 shadow-xl ${workspaceMode === 'review' ? 'opacity-70' : ''}`}>
        <EnvironmentMap
          detections={mapDetections}
          scanMode={scanMode}
          onSelectDetection={onSelectDetection}
          selectedDetection={selectedDetection}
          isScanning={isScanning}
          heading={heading}
        />
        <div className="absolute top-2 left-2 rounded-md border border-white/10 bg-black/70 px-2 py-1 font-mono text-[8px] text-white/75 pointer-events-none">
          <Map className="inline w-3 h-3 mr-1" />SPATIAL MAP
        </div>
      </div>}

      {layers.floorplan && <div className="absolute bottom-3 right-3 z-20 w-[250px] h-[190px] max-md:w-[calc(50%-8px)] max-md:h-[170px] rounded-xl overflow-hidden border border-white/10 bg-black/80 shadow-xl">
        <AutoFloorplanMap
          detections={mapDetections}
          heading={heading}
          color={color}
          sensorConnected={sensorConnected}
          lastFrame={lastFrame}
          bridgeStats={bridgeStats}
          selectedDetection={selectedDetection}
          onSelectDetection={onSelectDetection}
        />
        <div className="absolute top-2 left-2 rounded-md border border-white/10 bg-black/70 px-2 py-1 font-mono text-[8px] text-white/75 pointer-events-none">
          <ScanLine className="inline w-3 h-3 mr-1" />SCAN FLOORPLAN
        </div>
      </div>}

      {/* Unified source/status rail */}
      <div className="absolute left-3 top-3 z-30 max-w-[52%] max-md:max-w-[calc(100%-24px)] rounded-xl border border-white/10 bg-black/75 px-3 py-2 backdrop-blur-md pointer-events-none pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2 font-display text-[10px] tracking-[0.18em]" style={{ color }}>
          <Camera className="w-3.5 h-3.5" /> CMVISUAL · UNIFIED SPATIAL VIEW
        </div>
        <div className="mt-1 font-mono text-[8px] text-white/65">
          CAMERA {cameraActive ? 'LIVE' : 'READY'} · {worldTimeline?.timeline?.live === false ? `REPLAY · ${worldTimeline?.timeline?.visibleEventCount || 0} EVENTS` : `${liveDetections.length} OBSERVATIONS`} · {isScanning ? 'SCANNING' : 'STANDBY'}
        </div>
        <div className="mt-0.5 font-mono text-[7px] text-white/45">
          CAMERA + SENSOR OBSERVATIONS · HISTORY / PREDICTION / INFERENCE REMAIN DISTINCT · QUALITY FIREWALL ACTIVE
        </div>
      </div>

      {/* Dense live telemetry rail: exposes real inputs without creating synthetic targets. */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[84px] z-30 max-w-[calc(100%-24px)] rounded-lg border border-white/10 bg-black/70 px-2.5 py-1.5 backdrop-blur-md pointer-events-none">
        <div className="flex items-center justify-center gap-x-3 gap-y-1 flex-wrap font-mono text-[7px] tracking-wider text-white/60">
          <span style={{ color }}>{worldProjection?.counts?.measured ?? telemetry.camera} MEASURED</span>
          <span>{telemetry.external} SENSOR</span>
          <span>QUALITY {telemetry.reliability ?? telemetry.quality ?? '—'}%</span>
          {telemetry.conflicts > 0 && <span>CONFLICT {telemetry.conflicts}</span>}
          {worldProjection?.dataQuality?.quarantined > 0 && <span>QUAR {worldProjection.dataQuality.quarantined}</span>}
          <span>{telemetry.ageMs != null && telemetry.ageMs > 1500 ? 'STALE' : 'LIVE'}</span>
        </div>
      </div>

      {/* Prediction layer: derived from repeated live tracks and visually separated from measurements. */}
      {forecastSummary.length > 0 && (
        <div className="absolute left-1/2 -translate-x-1/2 top-[122px] z-30 max-w-[calc(100%-24px)] rounded-lg border border-dashed border-white/15 bg-black/65 px-2.5 py-1.5 backdrop-blur-md pointer-events-none shadow-lg">
          <div className="flex items-center gap-2 font-mono text-[7px] tracking-[0.14em] text-white/55">
            <Activity className="w-3 h-3" /> FORECAST · {forecastSummary.length} TRACK{forecastSummary.length === 1 ? '' : 'S'}
            <span className="text-white/30">+1s / +3s / +5s</span>
            {trackAnomalies.length > 0 && <span className="text-white/45">Δ {trackAnomalies.length}</span>}
            {predictionCalibration?.calibrationScore != null && <span className="text-white/45">CAL {predictionCalibration.calibrationScore}%</span>}
          </div>
          <div className="mt-1 flex gap-2 overflow-hidden font-mono text-[6px] text-white/45">
            {forecastSummary.slice(0, 4).map((p) => {
              const outcome = (Array.isArray(physicalOutcomeForecast) ? physicalOutcomeForecast : []).find(o => String(o.trackId) === String(p.trackId));
              return (
                <span key={p.trackId} className="whitespace-nowrap">
                  {p.trackId} · {p.speedMps.toFixed(1)}m/s · {outcome?.outcome || 'PATH'} · ±{p.one?.uncertaintyM?.toFixed(1) ?? '—'}m
                </span>
              );
            })}
          </div>
          <div className="mt-1 border-t border-white/10 pt-1 font-mono text-[6px] text-white/30">PHYSICAL OUTCOME FORECAST · OBSERVABLE PATH ONLY · NOT INTENT / PERSONALITY · UNCERTAINTY EXPANDS WITH HORIZON · CAL {predictionCalibration?.count || 0} OUTCOMES</div>
          <div className="mt-1 font-mono text-[6px] text-white/25">WORLD MODEL · {worldProjection?.counts?.historical ?? 0} HIST · {worldProjection?.counts?.hazards ?? 0} VALIDATED HAZARDS · {physicalOutcomeForecast.length} PHYSICAL FORECASTS</div>
        </div>
      )}

      {/* Cellular fusion rail: radio environment telemetry only, never a human target. */}
      <div className="absolute left-3 bottom-[205px] max-md:bottom-[185px] z-30 w-[250px] max-md:w-[calc(50%-8px)] rounded-xl border border-white/10 bg-black/78 px-2.5 py-2 backdrop-blur-md pointer-events-none shadow-xl">
        <div className="flex items-center justify-between font-mono text-[7px] tracking-[0.14em]">
          <span className="text-white/70">CELLULAR FUSION</span>
          <span className="text-white/45">{cellular?.status || 'UNAVAILABLE'}</span>
        </div>
        <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[6px] text-white/45">
          <span>RADIO <b className="text-white/70">{cellular?.radioTechnology || '—'}</b></span>
          <span>CELLS <b className="text-white/70">{telemetry.cellularCells}</b></span>
          <span>SIGNAL <b className="text-white/70">{cellular?.registeredCell?.dbm != null ? `${Math.round(cellular.registeredCell.dbm)} dBm` : '—'}</b></span>
          <span>AGE <b className="text-white/70">{telemetry.cellularAgeMs == null ? '—' : `${Math.round(telemetry.cellularAgeMs / 1000)}s`}</b></span>
        </div>
        <div className="mt-1 border-t border-white/10 pt-1 font-mono text-[6px] leading-relaxed text-white/35">RADIO ENVIRONMENT ONLY · NOT A HUMAN/IDENTITY TRACK</div>
      </div>

      {/* Compact live target strip — every currently valid observation is one tap away. */}
      {targetStripOpen && targetSummary.length > 0 && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-3 z-35 max-w-[calc(100%-24px)] w-[min(760px,calc(100%-24px))] pointer-events-auto">
          <div className="rounded-xl border border-white/10 bg-black/82 p-1.5 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between px-1.5 pb-1">
              <span className="font-mono text-[7px] tracking-[0.16em] text-white/50">LIVE TRACKS · {targetSummary.length}</span>
              <button type="button" onClick={() => setTargetStripOpen(false)} className="min-w-[40px] min-h-[40px] rounded-md text-white/40 hover:text-white" aria-label="Hide live tracks">×</button>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {targetSummary.map((d) => {
                const isSelected = sameTrack(selectedDetection, d);
                const tone = d.type === 'human' ? '#00ff88' : d.type === 'animal' ? '#00ccff' : d.type === 'object' ? '#ffaa00' : '#ff4466';
                return (
                  <button key={d.id} type="button" onClick={() => onSelectDetection?.(d)} className="min-w-[150px] min-h-[54px] rounded-lg border px-2 py-1.5 text-left transition" style={{ borderColor: isSelected ? `${tone}90` : `${tone}25`, background: isSelected ? `${tone}16` : 'rgba(255,255,255,0.03)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[8px] font-bold" style={{ color: tone }}>{d.uiId}</span>
                      <span className="font-mono text-[6px] text-white/40">{d.evidence}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 font-mono text-[6px] text-white/60">
                      <span>{d.moving ? 'MOVING' : d.moving === false ? 'STILL' : '—'}</span>
                      <span>{d.distanceM == null ? 'RANGE —' : `${d.distanceM.toFixed(1)}m`}</span>
                      <span>{d.trackSpeed == null ? 'SPEED —' : `${d.trackSpeed.toFixed(1)}m/s`}</span>
                      {d.confidencePct != null && <span>{d.confidencePct}%</span>}
                    </div>
                    <div className="mt-0.5 font-mono text-[6px] text-white/35 truncate">{d.source || 'LOCAL INPUT'}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {targetSummary.length > 0 && !targetStripOpen && (
        <button type="button" onClick={() => setTargetStripOpen(true)} className="absolute left-1/2 -translate-x-1/2 bottom-3 z-35 min-h-[44px] rounded-xl border border-white/10 bg-black/85 px-3 font-mono text-[8px] tracking-wider text-white/70 backdrop-blur-md pointer-events-auto shadow-xl">
          TARGETS · {targetSummary.length}
        </button>
      )}

      {/* Target-lock appearance controls. These change presentation only; they never alter track identity or evidence. */}
      {lockedTrackId != null && <div className="absolute right-3 top-[205px] z-40 w-[170px] rounded-xl border border-white/10 bg-black/85 p-2 backdrop-blur-md shadow-xl pointer-events-auto">
        <button type="button" onClick={() => setLockStyleOpen(v => !v)} className="w-full min-h-[40px] flex items-center justify-between font-mono text-[7px] tracking-[0.14em] text-white/70">
          <span><Settings2 className="inline w-3 h-3 mr-1" />LOCK DISPLAY</span><span>{lockStyleOpen ? '−' : '+'}</span>
        </button>
        {lockStyleOpen && <div className="space-y-2 border-t border-white/10 pt-2">
          <div className="grid grid-cols-2 gap-1">{lockVisual.styles.map(s => <button key={s.id} type="button" onClick={() => lockVisual.update({ style: s.id })} className={`min-h-[32px] rounded border px-1 font-mono text-[6px] ${lockVisual.settings.style === s.id ? 'border-white/35 bg-white/12 text-white' : 'border-white/5 text-white/40'}`}>{s.label}</button>)}</div>
          <div className="grid grid-cols-3 gap-1">{['small','medium','large'].map(s => <button key={s} type="button" onClick={() => lockVisual.update({ size: s })} className={`min-h-[30px] rounded border font-mono text-[6px] ${lockVisual.settings.size === s ? 'border-white/30 bg-white/10 text-white' : 'border-white/5 text-white/40'}`}>{s.toUpperCase()}</button>)}</div>
          <div className="grid grid-cols-2 gap-1">{[['showLabel','LABEL'],['showEvidence','EVIDENCE'],['showConfidence','CONF'],['showRange','RANGE'],['showTrail','TRAIL'],['showUncertainty','UNCERTAINTY'],['showHeading','HEADING']].map(([key,label]) => <button key={key} type="button" onClick={() => lockVisual.update({ [key]: !lockVisual.settings[key] })} className={`min-h-[30px] rounded border font-mono text-[6px] ${lockVisual.settings[key] ? 'border-white/20 bg-white/8 text-white/70' : 'border-white/5 text-white/30'}`}>{lockVisual.settings[key] ? 'ON' : 'OFF'} · {label}</button>)}</div>
          <button type="button" onClick={lockVisual.reset} className="w-full min-h-[30px] rounded border border-white/5 font-mono text-[6px] text-white/35">RESET LOCK DISPLAY</button>
        </div>}
      </div>}

      {/* Selected observation — one compact cross-view focus card */}
      {selected && inspectorOpen && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-35 w-[210px] max-md:w-[calc(100%-24px)] max-md:left-3 max-md:top-auto max-md:bottom-[185px] max-md:translate-y-0 rounded-xl border border-white/10 bg-black/85 p-3 backdrop-blur-md shadow-xl pointer-events-auto">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-mono text-[8px] tracking-[0.14em] text-white/80"><Crosshair className="w-3 h-3" />OBSERVATION INSPECTOR</div>
            <button type="button" aria-label="Close observation inspector" onClick={() => { setInspectorOpen(false); onSelectDetection?.(null); }} className="min-w-[40px] min-h-[40px] rounded-md text-white/55 hover:text-white text-lg">×</button>
          </div>
          <div className="mt-1.5 flex items-center gap-2 font-mono text-[7px]">
            {lockedTrackId != null && <span className="inline-flex items-center justify-center rounded border" style={{ width: lockVisual.settings.size === 'large' ? 28 : lockVisual.settings.size === 'small' ? 16 : 22, height: lockVisual.settings.size === 'large' ? 28 : lockVisual.settings.size === 'small' ? 16 : 22, borderColor: `${lockTone}90`, color: lockTone, opacity: lockVisual.settings.opacity / 100 }}>{lockVisual.settings.style === 'reticle' ? '⊕' : lockVisual.settings.style === 'ring' ? '○' : lockVisual.settings.style === 'minimal' ? '•' : '⌜⌟'}</span>}
            <span className="rounded border border-white/15 bg-white/5 px-1.5 py-1 text-white/75">{evidenceLabel}</span>
            <span className="text-white/40">{selected.displayId || selected.label || selected.id || 'OBSERVATION'}</span>
            {lockedTrackId != null && <span className={`rounded border px-1.5 py-1 ${lockedStale ? 'border-amber-300/40 text-amber-300/80' : 'border-white/15 text-white/60'}`}>{lockedStale ? 'LOCKED · STALE' : 'LOCKED · FOLLOWING'}</span>}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 font-mono text-[7px]">
            <div><span className="text-white/35">SOURCE</span><div className="text-white/80 truncate">{selected.source || 'LOCAL'}</div></div>
            <div><span className="text-white/35">MOTION</span><div className="text-white/80">{motionLabel}</div></div>
            <div><span className="text-white/35">DISTANCE</span><div className="text-white/80">{selected.distance != null ? `${selected.distance} m` : 'UNAVAILABLE'}</div></div>
            <div><span className="text-white/35">CONFIDENCE</span><div className="text-white/80">{selected.confidence != null ? `${Math.round(selected.confidence * 100)}%` : 'UNAVAILABLE'}</div></div>
            <div><span className="text-white/35">ANGLE</span><div className="text-white/80">{selected.angle != null ? `${Number(selected.angle).toFixed(1)}°` : 'UNAVAILABLE'}</div></div>
            <div><span className="text-white/35">TRACK SPEED</span><div className="text-white/80">{selected.derivedTrack?.speedMps != null ? `${Number(selected.derivedTrack.speedMps).toFixed(2)} m/s` : 'UNAVAILABLE'}</div></div>
            <div><span className="text-white/35">TRACK HEADING</span><div className="text-white/80">{selected.derivedTrack?.headingDeg != null ? `${Math.round(Number(selected.derivedTrack.headingDeg))}°` : 'UNAVAILABLE'}</div></div>
            <div><span className="text-white/35">SENSOR SUPPORT</span><div className="text-white/80">{selected.sensorSupportCount ?? 0}</div></div>
            <div><span className="text-white/35">TRACK STATUS</span><div className="text-white/80">{selected.derivedTrack?.status || 'UNAVAILABLE'}</div></div>
            <div><span className="text-white/35">OBSERVATIONS</span><div className="text-white/80">{selected.derivedTrack?.observationCount ?? 'UNAVAILABLE'}</div></div>
            <div><span className="text-white/35">TRACK AGE</span><div className="text-white/80">{selected.derivedTrack?.ageMs != null ? `${(Number(selected.derivedTrack.ageMs) / 1000).toFixed(1)}s` : 'UNAVAILABLE'}</div></div>
            <div><span className="text-white/35">UNCERTAINTY</span><div className="text-white/80">{selected.uncertaintyM != null ? `±${Number(selected.uncertaintyM).toFixed(2)} m` : 'UNAVAILABLE'}</div></div>
            <div><span className="text-white/35">LATENCY</span><div className="text-white/80">{selected.latencyMs != null ? `${Math.round(Number(selected.latencyMs))} ms` : 'UNAVAILABLE'}</div></div>
            <div><span className="text-white/35">PACKET RATE</span><div className="text-white/80">{selected.packetRateHz != null ? `${Number(selected.packetRateHz).toFixed(1)} Hz` : 'UNAVAILABLE'}</div></div>
          </div>
          <button type="button" onClick={() => onToggleTrackLock?.(selected)} className="mt-2 w-full min-h-[38px] rounded-lg border border-white/10 bg-white/5 px-2 font-mono text-[7px] tracking-wider text-white/75 hover:bg-white/10">
            {sameTrack(lockedCurrent, selected) ? '🔒 LOCKED TRACK · FOLLOWING' : lockedStale && String(lockedTrackId) === String(selected?.trackId ?? selected?.id) ? '🔒 LOCKED TRACK · STALE' : '◎ LOCK TRACK'}
          </button>
          <div className="mt-2 border-t border-white/10 pt-2 font-mono text-[7px] leading-relaxed text-white/45"><Activity className="inline w-2.5 h-2.5 mr-1" />{lockedStale ? 'LOCK RETAINED · NO CURRENT MEASUREMENT · EXPLICIT UNLOCK REQUIRED' : 'PHYSICAL FORECASTS DESCRIBE OBSERVABLE MOTION; THEY DO NOT CLAIM INTENT OR PSYCHOLOGICAL STATE.'}</div>
        </div>
      )}
      {selected && !inspectorOpen && (
        <button type="button" onClick={() => setInspectorOpen(true)} className="absolute left-3 top-1/2 -translate-y-1/2 max-md:top-auto max-md:bottom-[185px] max-md:translate-y-0 z-35 min-h-[44px] rounded-xl border border-white/10 bg-black/85 px-3 font-mono text-[8px] tracking-wider text-white/75 backdrop-blur-md pointer-events-auto shadow-xl">
          <Crosshair className="inline w-3 h-3 mr-1" /> INSPECT
        </button>
      )}

      {/* Evidence legend + federation health: compact, always-visible interpretation boundary. */}
      <div className="absolute right-3 bottom-[205px] max-md:bottom-[185px] z-30 w-[250px] max-md:w-[calc(50%-8px)] rounded-xl border border-white/10 bg-black/78 px-2.5 py-2 backdrop-blur-md pointer-events-none shadow-xl">
        <div className="flex items-center justify-between font-mono text-[7px] tracking-[0.14em]">
          <span className="text-white/70">EVIDENCE</span>
          <span className="text-white/35">NO SYNTHETIC TARGETS</span>
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1 font-mono text-[6px] text-white/50">
          {['MEASURED','CORROBORATED','DERIVED','HISTORICAL','PREDICTED','SPECULATIVE','UNRESOLVED','INSUFFICIENT DATA'].map((label) => (
            <span key={label} className="truncate"><b className={label === 'MEASURED' || label === 'CORROBORATED' ? 'text-white/80' : label === 'PREDICTED' || label === 'SPECULATIVE' ? 'text-white/60' : 'text-white/45'}>{label}</b></span>
          ))}
        </div>
        <div className="mt-1.5 border-t border-white/10 pt-1 font-mono text-[6px] leading-relaxed text-white/35">
          PREDICTIONS CARRY UNCERTAINTY · SPECULATION IS NOT FACT · UNALIGNED FEDERATED DATA IS NEVER PROJECTED
        </div>
        {Array.isArray(worldProjection?.federatedMeasured) && worldProjection.federatedMeasured.length > 0 && (
          <div className="mt-1 font-mono text-[6px] text-white/45">FEDERATED ALIGNED · {worldProjection.federatedMeasured.length} OBSERVATION{worldProjection.federatedMeasured.length === 1 ? '' : 'S'}</div>
        )}
      </div>

      {/* Bottom-center target summary */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-[205px] max-md:bottom-[185px] z-30 max-w-[calc(100%-24px)] rounded-xl border border-white/10 bg-black/75 px-4 py-2 backdrop-blur-md pointer-events-none text-center whitespace-nowrap">
        <div className="font-mono text-[8px] tracking-[0.15em]" style={{ color }}>
          {liveDetections.length ? `${liveDetections.length} LIVE OBSERVATIONS` : 'WAITING FOR REAL INPUT'}
        </div>
        <div className="font-mono text-[7px] text-white/45 mt-0.5">
          {sensorConnected ? 'EXTERNAL SENSOR BRIDGE CONNECTED' : 'PHONE / LOCAL SENSORS'} · {worldProjection?.coordinateSystem || 'SESSION LOCAL'}
        </div>
      </div>
    </section>
  );
}
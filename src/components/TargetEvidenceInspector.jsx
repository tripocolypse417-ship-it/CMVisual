import React, { useMemo } from 'react';
import { CheckCircle2, CircleAlert, Crosshair, Gauge, History, Radio, ShieldCheck, TrendingUp } from 'lucide-react';

const finite = (v) => Number.isFinite(Number(v)) ? Number(v) : null;
const pct = (v) => v == null ? '—' : `${Math.round(Number(v))}%`;

function Cell({ label, value, tone = 'text-white/80' }) {
  return <div className="rounded-lg border border-white/10 bg-black/25 px-2.5 py-2">
    <div className="font-mono text-[6px] tracking-[0.14em] text-white/35">{label}</div>
    <div className={`mt-0.5 font-mono text-[9px] font-semibold truncate ${tone}`}>{value}</div>
  </div>;
}

export default function TargetEvidenceInspector({
  selected,
  tracks = [],
  sensorReliability = null,
  sensorConflicts = null,
  predictionCalibration = null,
  physicalOutcomeForecast = [],
  worldTimeline = null,
  evidenceBundle = null,
  color = '#00ff88',
}) {
  const id = selected?.trackId ?? selected?.id;
  const trackKey = id == null ? null : String(id);

  const track = useMemo(() => {
    if (!trackKey) return null;
    return (tracks || []).find(t => String(t?.trackId ?? t?.id ?? '') === trackKey) || selected;
  }, [tracks, selected, trackKey]);

  const sensorRows = useMemo(() => {
    const rows = [];
    const sources = Array.isArray(track?.sensorSources) ? track.sensorSources : [];
    if (track?.source) rows.push(String(track.source));
    sources.forEach(s => rows.push(String(s)));
    const reliability = sensorReliability?.sensors || [];
    const names = [...new Set(rows)];
    return names.map(source => ({
      source,
      quality: reliability.find(s => String(s.source) === source) || null,
    }));
  }, [track, sensorReliability]);

  const conflicts = useMemo(() => (sensorConflicts?.conflicts || []).filter(c => String(c.trackId) === trackKey), [sensorConflicts, trackKey]);
  const calibration = useMemo(() => (predictionCalibration?.samples || []).filter(s => String(s.trackId) === trackKey), [predictionCalibration, trackKey]);
  const forecast = useMemo(() => (physicalOutcomeForecast || []).find(f => String(f.trackId) === trackKey) || null, [physicalOutcomeForecast, trackKey]);
  const timelineTrack = useMemo(() => (worldTimeline?.tracks || []).find(t => String(t.trackId) === trackKey) || null, [worldTimeline, trackKey]);

  if (!selected) return null;

  const uncertainty = finite(selected.uncertaintyM);
  const confidence = finite(selected.confidence);
  const ageMs = finite(track?.derivedTrack?.ageMs ?? selected.derivedTrack?.ageMs);
  const observationCount = finite(track?.derivedTrack?.observationCount ?? selected.derivedTrack?.observationCount);
  const historyCount = timelineTrack?.trail?.length ?? observationCount ?? 0;
  const basis = track?.corroborated ? 'CAMERA + EXTERNAL CORROBORATION' : (track?.source || 'LOCAL OBSERVATION');

  return (
    <section className="rounded-xl border border-white/10 bg-black/35 p-3" aria-label="selected target evidence">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Crosshair className="h-4 w-4 flex-shrink-0" style={{ color }} />
          <div className="min-w-0">
            <div className="font-mono text-[7px] tracking-[0.16em] text-white/35">SELECTED TRACK · EVIDENCE CHAIN</div>
            <div className="font-mono text-sm font-bold tracking-wider truncate" style={{ color }}>{selected.displayId || selected.label || selected.id}</div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-mono text-[6px] text-white/35">BASIS</div>
          <div className="font-mono text-[7px] text-white/65">{basis}</div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Cell label="TYPE" value={String(selected.type || 'UNKNOWN').toUpperCase()} tone="text-emerald-300" />
        <Cell label="RANGE" value={finite(selected.distance) == null ? 'UNAVAILABLE' : `${Number(selected.distance).toFixed(2)} m`} />
        <Cell label="UNCERTAINTY" value={uncertainty == null ? 'UNAVAILABLE' : `±${uncertainty.toFixed(2)} m`} tone={uncertainty != null && uncertainty <= 1 ? 'text-emerald-300' : 'text-amber-300'} />
        <Cell label="CONFIDENCE" value={confidence == null ? 'UNAVAILABLE' : pct(confidence * 100)} tone={confidence != null && confidence >= 0.7 ? 'text-emerald-300' : 'text-amber-300'} />
      </div>

      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Cell label="MOTION" value={selected.moving == null ? 'UNAVAILABLE' : selected.moving ? 'MOVING' : 'STATIONARY'} />
        <Cell label="SPEED" value={finite(track?.derivedTrack?.speedMps) == null ? 'UNAVAILABLE' : `${Number(track.derivedTrack.speedMps).toFixed(2)} m/s`} />
        <Cell label="TRACK AGE" value={ageMs == null ? 'UNAVAILABLE' : `${(ageMs / 1000).toFixed(1)} s`} />
        <Cell label="OBSERVATIONS" value={observationCount == null ? 'UNAVAILABLE' : observationCount} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Radio className="h-3.5 w-3.5" style={{ color }} />
        <span className="font-mono text-[7px] tracking-[0.15em] text-white/45">SOURCE / SENSOR EVIDENCE</span>
      </div>
      <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        <Cell label="PRIMARY SOURCE" value={selected.source || 'LOCAL INPUT'} />
        <Cell label="SUPPORTING OBSERVATIONS" value={selected.sensorSupportCount ?? 0} />
        {sensorRows.map(({ source, quality }) => (
          <div key={source} className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[7px] text-white/65 truncate">{source}</span>
              <span className="font-mono text-[7px]" style={{ color: quality?.reliability >= 70 ? '#00ff88' : '#ffaa00' }}>{quality ? `${quality.reliability}%` : 'NO SCORE'}</span>
            </div>
            <div className="mt-1 font-mono text-[6px] text-white/35">
              {quality ? `QUALITY ${quality.quality}% · CAPABILITY ${quality.capability}% · DELIVERY ${quality.delivery}% · LATENCY ${quality.latency}%` : 'Measurement-quality score unavailable'}
            </div>
          </div>
        ))}
      </div>

      {track?.corroboration && (
        <div className="mt-2 rounded-lg border border-emerald-300/20 bg-emerald-300/5 p-2">
          <div className="flex items-center gap-1.5 font-mono text-[7px] tracking-wider text-emerald-200/80"><CheckCircle2 className="h-3 w-3" /> CORROBORATION — NOT IDENTITY MATCHING</div>
          <div className="mt-1 grid grid-cols-3 gap-2 font-mono text-[7px] text-white/55">
            <span>Δ ANGLE {Number(track.corroboration.angleDeltaDeg).toFixed(1)}°</span>
            <span>Δ RANGE {Number(track.corroboration.rangeDeltaM).toFixed(2)}m</span>
            <span>SENSOR {track.corroboration.sensor}</span>
          </div>
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="mt-2 rounded-lg border border-amber-300/20 bg-amber-300/5 p-2">
          <div className="flex items-center gap-1.5 font-mono text-[7px] tracking-wider text-amber-200/80"><CircleAlert className="h-3 w-3" /> SENSOR CONFLICT RETAINED</div>
          {conflicts.slice(0, 3).map((c, i) => <div key={i} className="mt-1 font-mono text-[7px] text-white/55">{c.reason || 'MEASUREMENT DISAGREEMENT'}{c.rangeSpread != null ? ` · RANGE SPREAD ${Number(c.rangeSpread).toFixed(2)}m` : ''}{c.bearingSpread != null ? ` · BEARING SPREAD ${Number(c.bearingSpread).toFixed(1)}°` : ''}</div>)}
        </div>
      )}

      {evidenceBundle && (
        <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2">
          <div className="font-mono text-[7px] tracking-wider text-white/45">AUDITABLE EVIDENCE BUNDLE</div>
          <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <Cell label="REFERENCES" value={evidenceBundle.observationRefs?.length || 0} />
            <Cell label="QUALITY" value={evidenceBundle.qualitySummary || 'UNKNOWN'} />
            <Cell label="CONFIDENCE" value={evidenceBundle.confidence == null ? '—' : pct(Number(evidenceBundle.confidence) * 100)} />
            <Cell label="GAPS" value={evidenceBundle.missingEvidence?.length || 0} />
          </div>
          {evidenceBundle.missingEvidence?.length > 0 && <div className="mt-1 font-mono text-[6px] text-amber-200/60">MISSING: {evidenceBundle.missingEvidence.join(' · ')}</div>}
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-2">
        <div className="rounded-lg border border-white/10 bg-black/20 p-2">
          <div className="flex items-center gap-1.5 font-mono text-[7px] text-white/45"><TrendingUp className="h-3 w-3" style={{ color }} /> PHYSICAL FORECAST</div>
          <div className="mt-1 font-mono text-[9px] font-bold" style={{ color }}>{forecast?.outcome || 'UNAVAILABLE'}</div>
          <div className="mt-1 font-mono text-[6px] leading-relaxed text-white/40">{forecast?.basis || 'No validated repeated-motion forecast is currently available.'}</div>
          {forecast?.uncertaintyM != null && <div className="mt-1 font-mono text-[6px] text-white/35">HORIZON {forecast.horizon}s · ±{Number(forecast.uncertaintyM).toFixed(2)}m</div>}
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 p-2">
          <div className="flex items-center gap-1.5 font-mono text-[7px] text-white/45"><Gauge className="h-3 w-3" style={{ color }} /> PREDICTION CALIBRATION</div>
          <div className="mt-1 font-mono text-[9px] font-bold" style={{ color }}>{calibration.length ? `${Math.round(calibration.filter(x => x.calibrated).length / calibration.length * 100)}% WITHIN 2×U` : 'NO SAMPLES'}</div>
          <div className="mt-1 font-mono text-[6px] text-white/40">{calibration.length ? `${calibration.length} measured outcomes · mean error ${ (calibration.reduce((s,x)=>s+Number(x.errorM||0),0)/calibration.length).toFixed(2)}m` : 'Future predictions require later measured observations for calibration.'}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 p-2">
          <div className="flex items-center gap-1.5 font-mono text-[7px] text-white/45"><History className="h-3 w-3" style={{ color }} /> HISTORY</div>
          <div className="mt-1 font-mono text-[9px] font-bold" style={{ color }}>{historyCount} SAMPLES</div>
          <div className="mt-1 font-mono text-[6px] text-white/40">{timelineTrack ? `TRACK WINDOW · ${timelineTrack.trail?.length || 0} POSITION EVENTS` : 'No persisted timeline events currently associated with this track.'}</div>
        </div>
      </div>

      <div className="mt-2 flex items-start gap-2 rounded-lg border border-white/10 bg-black/25 p-2">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color }} />
        <div className="font-mono text-[7px] leading-relaxed text-white/50">
          SOURCE · TIME · LOCATION · UNCERTAINTY · CONFIDENCE · VALIDATION remain distinct. Physical forecasting describes observable spatial outcomes only. It does not infer identity, intent, hostility, mental state, personality, or dangerousness.
        </div>
      </div>
    </section>
  );
}
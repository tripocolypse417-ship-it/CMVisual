import React from 'react';

export default function LiveDataStatus({ sensorCount = 0, detectionCount = 0 }) {
  const live = sensorCount > 0;
  return (
    <div className="pointer-events-none fixed left-1/2 top-20 z-40 -translate-x-1/2">
      <div className="rounded-md border border-white/15 bg-black/75 px-4 py-2 text-center font-mono text-xs tracking-wider text-white/80 backdrop-blur">
        <div className="text-[10px] uppercase text-white/50">LIVE DATA STATUS</div>
        <div className={live ? 'text-emerald-300' : 'text-amber-300'}>
          {live ? `${sensorCount} LIVE SENSOR${sensorCount === 1 ? '' : 'S'}` : 'AWAITING LIVE SENSOR DATA'}
        </div>
        <div className="text-[10px] text-white/45">
          {detectionCount > 0 ? `${detectionCount} LIVE DETECTION${detectionCount === 1 ? '' : 'S'}` : 'NO LIVE DETECTIONS'}
        </div>
      </div>
    </div>
  );
}
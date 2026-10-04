import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Crosshair, Trash2, User, Dog, Box, HelpCircle, Image as ImageIcon, Move, RotateCw, Ruler, CheckCircle2, MapPin } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PinCommentPanel from './PinCommentPanel';

const TYPE_CONFIG = {
  human:   { color: '#00ff88', Icon: User,       label: 'HUMAN' },
  animal:  { color: '#00ccff', Icon: Dog,        label: 'ANIMAL' },
  object:  { color: '#ffaa00', Icon: Box,        label: 'OBJECT' },
  unknown: { color: '#ff4466', Icon: HelpCircle, label: 'UNKNOWN' },
};

const EVENT_TYPE_CONFIG = {
  new_target:     { color: '#00ff88', label: 'NEW TARGET' },
  movement_start: { color: '#00ccff', label: 'MOVEMENT' },
  shift:          { color: '#ffaa00', label: 'SHIFT' },
  alert:          { color: '#ff4466', label: 'ALERT' },
};

const STORAGE_KEY = 'waveradar_floorplan';

const sameTrack = (a, b) => {
  if (!a || !b) return false;
  const idsA = [a.trackId, a.id].filter((v) => v != null).map(String);
  const idsB = [b.trackId, b.id].filter((v) => v != null).map(String);
  return idsA.some((id) => idsB.includes(id));
};

// Upload-your-own floorplan display mode. The user supplies a building plan
// image, drags the device marker to where they're standing, and sets the
// scale (meters across the image width) + rotation so radar detections plot
// at their real-world positions on the plan. Config persists in localStorage.
export default function FloorplanOverlay({ detections = [], selectedDetection, onSelectDetection, color = '#00ff88' }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [origin, setOrigin] = useState({ x: 0.5, y: 0.5 });
  const [metersAcross, setMetersAcross] = useState(20);
  const [rotation, setRotation] = useState(0);
  const [calibrating, setCalibrating] = useState(false);
  const [calibA, setCalibA] = useState({ x: 0.3, y: 0.5 });
  const [calibB, setCalibB] = useState({ x: 0.7, y: 0.5 });
  const [refDistance, setRefDistance] = useState(5);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragging = useRef(null); // 'origin' | 'A' | 'B' | null
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [showEvents, setShowEvents] = useState(true);
  const [events, setEvents] = useState([]);
  const [selectedPin, setSelectedPin] = useState(null);
  const [commentCounts, setCommentCounts] = useState({});

  // Load historical detection events (pins) + subscribe to new ones live.
  useEffect(() => {
    let unsub = () => {};
    base44.entities.DetectionEvent.list('-created_date', 100).then(setEvents).catch(() => {});
    try {
      unsub = base44.entities.DetectionEvent.subscribe((ev) => {
        setEvents((prev) => {
          if (ev.type === 'delete') return prev.filter((e) => e.id !== ev.id);
          const without = prev.filter((e) => e.id !== ev.id);
          return [ev.data, ...without].slice(0, 100);
        });
      });
    } catch {}
    return () => { try { unsub(); } catch {} };
  }, []);

  // Load comment counts per pin + subscribe to new comments live.
  useEffect(() => {
    const buildCounts = (list) => {
      const m = {};
      (list || []).forEach((c) => { m[c.pin_id] = (m[c.pin_id] || 0) + 1; });
      return m;
    };
    let unsub = () => {};
    base44.entities.PinComment.list('-created_date', 500).then((list) => setCommentCounts(buildCounts(list))).catch(() => {});
    try {
      unsub = base44.entities.PinComment.subscribe((ev) => {
        setCommentCounts((prev) => {
          const next = { ...prev };
          if (ev.type === 'create') next[ev.data.pin_id] = (next[ev.data.pin_id] || 0) + 1;
          else if (ev.type === 'delete' && prev[ev.id]) next[ev.id] = Math.max(0, prev[ev.id] - 1);
          return next;
        });
      });
    } catch {}
    return () => { try { unsub(); } catch {} };
  }, []);

  // Load saved floorplan config on mount.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const data = JSON.parse(saved);
      if (data.url) setImgUrl(data.url);
      if (data.origin) setOrigin(data.origin);
      if (data.metersAcross) setMetersAcross(data.metersAcross);
      if (typeof data.rotation === 'number') setRotation(data.rotation);
      if (data.calibA) setCalibA(data.calibA);
      if (data.calibB) setCalibB(data.calibB);
      if (data.refDistance) setRefDistance(data.refDistance);
    } catch {}
  }, []);

  // Persist config whenever it changes (once an image is loaded).
  useEffect(() => {
    if (!imgUrl) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ url: imgUrl, origin, metersAcross, rotation, calibA, calibB, refDistance }));
    } catch {}
  }, [imgUrl, origin, metersAcross, rotation]);

  // Track container size for coordinate math.
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSize({ w: width, h: height });
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Device-origin drag handlers (pointer + touch).
  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      const x = Math.max(0, Math.min(1, (cx - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (cy - rect.top) / rect.height));
      if (dragging.current === 'origin') setOrigin({ x, y });
      else if (dragging.current === 'A') setCalibA({ x, y });
      else if (dragging.current === 'B') setCalibB({ x, y });
    };
    const onUp = () => { dragging.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  const onFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      const url = res?.file_url;
      setImgUrl(url || URL.createObjectURL(file));
    } catch {
      setImgUrl(URL.createObjectURL(file));
    } finally {
      setUploading(false);
    }
  };

  const clearPlan = () => {
    setImgUrl(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  // Map a radar detection (angle°, distance m) → pixel offset from device origin.
  const posFor = (d) => {
    const r = ((d.angle ?? 0) * Math.PI) / 180;
    const xm = (d.distance ?? 0) * Math.cos(r);
    const ym = (d.distance ?? 0) * Math.sin(r);
    const rr = (rotation * Math.PI) / 180;
    const rxm = xm * Math.cos(rr) - ym * Math.sin(rr);
    const rym = xm * Math.sin(rr) + ym * Math.cos(rr);
    const mToPx = size.w / metersAcross;
    return { px: origin.x * size.w + rxm * mToPx, py: origin.y * size.h + rym * mToPx };
  };

  // Events use `bearing` as their polar angle; reuse the same projection.
  const posForEvent = (e) => posFor({ angle: e.bearing ?? e.angle ?? 0, distance: e.distance ?? 0 });

  // Calibration: pixel distance between A and B, and the scale it implies.
  const calibDx = (calibB.x - calibA.x) * size.w;
  const calibDy = (calibB.y - calibA.y) * size.h;
  const pxDist = Math.sqrt(calibDx * calibDx + calibDy * calibDy);
  const previewScale = pxDist > 0 && refDistance > 0 ? Math.max(4, Math.min(60, Math.round(refDistance * size.w / pxDist))) : metersAcross;

  const applyCalibration = () => {
    if (pxDist < 2 || !refDistance) return;
    setMetersAcross(Math.max(4, Math.min(60, Math.round(refDistance * size.w / pxDist))));
    setCalibrating(false);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[340px] rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

      {/* Floorplan image */}
      {imgUrl && (
        <img src={imgUrl} alt="floorplan" className="absolute inset-0 w-full h-full object-contain" draggable={false} style={{ opacity: 0.92 }} />
      )}

      {/* Subtle grid overlay */}
      {imgUrl && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: `linear-gradient(${color}10 1px, transparent 1px), linear-gradient(90deg, ${color}10 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
      )}

      {/* Detection icons */}
      {imgUrl && size.w > 0 && (
        <AnimatePresence>
          {detections.map(d => {
            const cfg = TYPE_CONFIG[d.type] || TYPE_CONFIG.unknown;
            const { px, py } = posFor(d);
            if (px < -30 || px > size.w + 30 || py < -30 || py > size.h + 30) return null;
            return (
              <motion.div key={d.id} className="absolute"
                style={{ left: 0, top: 0, transform: `translate3d(${px}px, ${py}px, 0)`, willChange: 'transform', transition: 'transform 0.12s linear' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <button onClick={() => onSelectDetection?.(sameTrack(selectedDetection, d) ? null : d)} className="relative flex flex-col items-center" style={{ transform: 'translate(-50%, -50%)' }}>
                  <span className="absolute inset-0 -m-2 rounded-full ar-ring" style={{ border: `1px solid ${cfg.color}`, opacity: sameTrack(selectedDetection, d) ? 1 : 0.55, boxShadow: sameTrack(selectedDetection, d) ? `0 0 12px ${cfg.color}` : 'none' }} />
                  <span className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: `${cfg.color}26`, border: `2px solid ${cfg.color}`, boxShadow: `0 0 10px ${cfg.color}, inset 0 0 6px ${cfg.color}40` }}>
                    <cfg.Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                  </span>
                  <span className="mt-1 px-1.5 py-0.5 rounded-sm whitespace-nowrap"
                    style={{ background: 'rgba(0,0,0,0.82)', border: `1px solid ${cfg.color}55` }}>
                    <span className="font-mono text-[7px] tracking-wider" style={{ color: cfg.color, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                      {cfg.label} · {d.distance.toFixed(1)}m
                    </span>
                  </span>
                  {d.moving && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />
                  )}
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}

      {/* Detected-event pins — historical movement over the site map */}
      {imgUrl && size.w > 0 && showEvents && (
        <AnimatePresence>
          {events.map((e) => {
            const cfg = EVENT_TYPE_CONFIG[e.event_type] || EVENT_TYPE_CONFIG.shift;
            const { px, py } = posForEvent(e);
            if (px < -30 || px > size.w + 30 || py < -30 || py > size.h + 30) return null;
            const isAlert = e.event_type === 'alert';
            return (
              <motion.div key={`evt-${e.id}`} className="absolute pointer-events-auto cursor-pointer"
                style={{ left: 0, top: 0, transform: `translate3d(${px}px, ${py}px, 0)`, willChange: 'transform', zIndex: selectedPin?.id === e.id ? 30 : 1 }}
                initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 0.9, scale: 1 }} exit={{ opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.25 }}
                onClick={() => setSelectedPin(e)}
                title={e.summary}>
                <div style={{ transform: 'translate(-50%, -100%)' }}>
                  <svg width="16" height="22" viewBox="0 0 18 24" style={{ filter: `drop-shadow(0 0 4px ${cfg.color})` }}>
                    <path d="M9 23 C9 23 1 13 1 8 A8 8 0 0 1 17 8 C17 13 9 23 9 23 Z" fill={`${cfg.color}22`} stroke={cfg.color} strokeWidth={selectedPin?.id === e.id ? 2.5 : 1.5} />
                    <circle cx="9" cy="8" r="2.6" fill={cfg.color} />
                  </svg>
                  {isAlert && (
                    <span className="absolute left-1/2 top-0 -translate-x-1/2 -mt-0.5 w-2.5 h-2.5 rounded-full ar-ring" style={{ border: `1px solid ${cfg.color}` }} />
                  )}
                  {(commentCounts[e.id] || 0) > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 flex items-center justify-center rounded-full font-mono text-[7px] font-bold"
                      style={{ background: color, color: '#001a0d', border: `1px solid ${cfg.color}`, boxShadow: `0 0 4px ${color}` }}>
                      {commentCounts[e.id]}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}

      {/* Device origin marker (draggable) */}
      {imgUrl && size.w > 0 && (
        <div className="absolute pointer-events-none" style={{ left: 0, top: 0, transform: `translate3d(${origin.x * size.w}px, ${origin.y * size.h}px, 0)` }}>
          <div className="relative" style={{ transform: 'translate(-50%, -50%)' }}>
            <div className="absolute rounded-full ar-sweep" style={{ width: 120, height: 120, marginLeft: -60, marginTop: -60, border: `1px solid ${color}` }} />
            <button onPointerDown={(e) => { dragging.current = 'origin'; e.preventDefault(); }}
              className="pointer-events-auto flex items-center justify-center w-8 h-8 rounded-full cursor-grab active:cursor-grabbing"
              style={{ background: `${color}22`, border: `2px solid ${color}`, boxShadow: `0 0 12px ${color}` }}>
              <Crosshair className="w-4 h-4" style={{ color }} />
            </button>
            <div className="absolute top-9 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-sm whitespace-nowrap"
              style={{ background: 'rgba(0,0,0,0.82)', border: `1px solid ${color}55` }}>
              <span className="font-mono text-[7px] tracking-wider" style={{ color }}>DEVICE · DRAG TO POSITION</span>
            </div>
          </div>
        </div>
      )}

      {/* Calibration markers + connecting line */}
      {calibrating && imgUrl && size.w > 0 && (
        <>
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line x1={calibA.x * size.w} y1={calibA.y * size.h} x2={calibB.x * size.w} y2={calibB.y * size.h} stroke={color} strokeWidth="2" strokeDasharray="6 4" />
          </svg>
          {[
            { key: 'A', pos: calibA },
            { key: 'B', pos: calibB },
          ].map(({ key, pos }) => (
            <div key={key} className="absolute" style={{ left: 0, top: 0, transform: `translate3d(${pos.x * size.w}px, ${pos.y * size.h}px, 0)` }}>
              <div className="relative" style={{ transform: 'translate(-50%, -50%)' }}>
                <button onPointerDown={(e) => { dragging.current = key; e.preventDefault(); }}
                  className="pointer-events-auto flex items-center justify-center w-7 h-7 rounded-full cursor-grab active:cursor-grabbing"
                  style={{ background: `${color}22`, border: `2px solid ${color}`, boxShadow: `0 0 10px ${color}` }}>
                  <span className="font-mono text-[10px] font-bold" style={{ color }}>{key}</span>
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Empty state */}
      {!imgUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
            <ImageIcon className="w-8 h-8" style={{ color }} />
          </div>
          <div>
            <p className="font-display text-sm tracking-widest mb-1" style={{ color }}>FLOORPLAN OVERLAY</p>
            <p className="font-mono text-[10px] text-muted-foreground max-w-xs leading-relaxed">
              Upload your building's floor plan to plot detected targets at their real positions. Drag the device marker to set where you're standing.
            </p>
          </div>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-display text-xs tracking-widest transition-all hover:scale-105 disabled:opacity-50"
            style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}>
            <Upload className="w-4 h-4" /> {uploading ? 'UPLOADING…' : 'UPLOAD FLOORPLAN'}
          </button>
        </div>
      )}

      {/* Control bar */}
      {imgUrl && (
        <div className="absolute top-0 left-0 right-0 flex flex-wrap items-center gap-3 px-3 py-2"
          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${color}25` }}>
          <div className="flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5" style={{ color }} />
            <span className="font-display text-[10px] tracking-widest" style={{ color }}>FLOORPLAN</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Move className="w-3 h-3 text-muted-foreground" />
            <span className="font-mono text-[8px] text-muted-foreground">SCALE</span>
            <input type="range" min={4} max={60} step={1} value={metersAcross} onChange={(e) => setMetersAcross(Number(e.target.value))}
              className="w-20" style={{ accentColor: color }} />
            <span className="font-mono text-[8px]" style={{ color }}>{metersAcross}m</span>
          </div>
          <div className="flex items-center gap-1.5">
            <RotateCw className="w-3 h-3 text-muted-foreground" />
            <span className="font-mono text-[8px] text-muted-foreground">ROT</span>
            <input type="range" min={-180} max={180} step={5} value={rotation} onChange={(e) => setRotation(Number(e.target.value))}
              className="w-20" style={{ accentColor: color }} />
            <span className="font-mono text-[8px]" style={{ color }}>{rotation}°</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setCalibrating(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[9px] transition-colors"
              style={{ border: `1px solid ${calibrating ? color : color + '40'}`, color, background: calibrating ? `${color}14` : 'transparent' }}>
              <Ruler className="w-3 h-3" /> {calibrating ? 'CALIBRATING' : 'CALIBRATE'}
            </button>
            <button onClick={() => setShowEvents(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[9px] transition-colors"
              style={{ border: `1px solid ${showEvents ? color : color + '40'}`, color, background: showEvents ? `${color}14` : 'transparent' }}>
              <MapPin className="w-3 h-3" /> EVENTS{showEvents && events.length > 0 ? ` (${events.length})` : ''}
            </button>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[9px] transition-colors"
              style={{ border: `1px solid ${color}40`, color }}>
              <Upload className="w-3 h-3" /> CHANGE
            </button>
            <button onClick={clearPlan}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[9px] text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors">
              <Trash2 className="w-3 h-3" /> CLEAR
            </button>
          </div>
        </div>
      )}

      {/* Calibration panel */}
      {calibrating && imgUrl && size.w > 0 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col gap-2 px-3 py-2.5 rounded-xl w-[90%] max-w-sm"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)', border: `1px solid ${color}40` }}>
          <div className="flex items-center gap-1.5">
            <Ruler className="w-3.5 h-3.5" style={{ color }} />
            <span className="font-display text-[10px] tracking-widest" style={{ color }}>SCALE CALIBRATION</span>
          </div>
          <p className="font-mono text-[8px] text-muted-foreground leading-relaxed">
            Drag points A and B to span a known distance on the plan, then enter the real-world distance between them.
          </p>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-muted-foreground whitespace-nowrap">DISTANCE</span>
            <input type="number" min={0.1} step={0.1} value={refDistance}
              onChange={(e) => setRefDistance(Number(e.target.value))}
              className="flex-1 px-2 py-1 rounded-md bg-black/40 border font-mono text-[10px] text-foreground outline-none"
              style={{ borderColor: `${color}30` }} />
            <span className="font-mono text-[9px]" style={{ color }}>m</span>
          </div>
          <div className="flex items-center justify-between font-mono text-[8px]">
            <span className="text-muted-foreground">MEASURED: {Math.round(pxDist)}px</span>
            <span style={{ color }}>→ {previewScale}m / WIDTH</span>
          </div>
          <div className="flex gap-2">
            <button onClick={applyCalibration}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg font-mono text-[9px] tracking-wider"
              style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}>
              <CheckCircle2 className="w-3 h-3" /> APPLY &amp; SAVE
            </button>
            <button onClick={() => setCalibrating(false)}
              className="px-3 py-1.5 rounded-lg font-mono text-[9px] border border-white/15 text-muted-foreground">CANCEL</button>
          </div>
        </div>
      )}

      {/* Event pin legend */}
      {imgUrl && !calibrating && showEvents && events.length > 0 && (
        <div className="absolute bottom-2 right-2 flex flex-col gap-1 px-2 py-1.5 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)', border: `1px solid ${color}25` }}>
          <span className="font-mono text-[7px] tracking-widest text-muted-foreground mb-0.5">EVENT PINS</span>
          {Object.entries(EVENT_TYPE_CONFIG).map(([k, cfg]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="w-2 h-2.5 rounded-sm" style={{ background: cfg.color, boxShadow: `0 0 4px ${cfg.color}` }} />
              <span className="font-mono text-[7px]" style={{ color: cfg.color }}>{cfg.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Status hint */}
      {imgUrl && !calibrating && (
        <div className="absolute bottom-2 left-2 flex items-center gap-2 px-2 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <span className="font-mono text-[8px] text-muted-foreground">{detections.length} TARGETS</span>
          <span className="w-px h-3 bg-border" />
          <span className="font-mono text-[8px] text-muted-foreground">{showEvents ? `${events.length} EVENT PINS` : 'EVENTS OFF'}</span>
          <span className="w-px h-3 bg-border" />
          <span className="font-mono text-[8px] text-muted-foreground">DRAG ◉ TO REPOSITION</span>
        </div>
      )}

      {/* Pin comment thread */}
      {selectedPin && (
        <PinCommentPanel pin={selectedPin} color={color} onClose={() => setSelectedPin(null)} />
      )}
    </div>
  );
}
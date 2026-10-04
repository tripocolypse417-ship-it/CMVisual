import { useEffect, useRef, useState, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, User, Dog, Box, HelpCircle, Crosshair, Flame, SwitchCamera, ZoomIn, Waves } from 'lucide-react';
import useObjectDetector from '../hooks/useObjectDetector';
import usePoseDetector from '../hooks/usePoseDetector';
import PoseSkeleton from './PoseSkeleton';
import useGhostTrails from '../hooks/useGhostTrails';
import GhostTrailsOverlay from './GhostTrailsOverlay';
import ArLegend from './ArLegend';
import WallVisionOverlay from './WallVisionOverlay';
import ThroughWallMinimap from './ThroughWallMinimap';

const TYPE_CONFIG = {
  human:   { color: '#00ff88', label: 'HUMAN',   shape: 'capsule', Icon: User },
  animal:  { color: '#00ccff', label: 'ANIMAL',  shape: 'oval',    Icon: Dog },
  object:  { color: '#ffaa00', label: 'OBJECT',  shape: 'box',     Icon: Box },
  unknown: { color: '#ff4466', label: 'UNKNOWN', shape: 'diamond', Icon: HelpCircle },
};

// Maps detection polar coords to a position on screen (simple spread)
function detectionToScreen(detection, width, height) {
  const norm = detection.angle / 360;
  const distNorm = Math.min(1, detection.distance / 10);
  const x = width * 0.12 + norm * width * 0.76;
  const y = height * 0.30 + distNorm * height * 0.55;
  return { x, y };
}

// Through-wall projection is compass-based now (see WallVisionOverlay).

function ARShapeRaw({ detection, screenW, screenH, onSelect, isSelected }) {
  const cfg = TYPE_CONFIG[detection.type] || TYPE_CONFIG.unknown;
  let x, y, size, heightSize;
  if (detection._box) {
    const { x: bx, y: by, w: bw, h: bh, vw, vh } = detection._box;
    x = ((bx + bw / 2) / vw) * screenW;
    y = ((by + bh / 2) / vh) * screenH;
    size = Math.max(50, (bw / vw) * screenW);
    heightSize = Math.max(80, (bh / vh) * screenH);
  } else {
    const pos = detectionToScreen(detection, screenW, screenH);
    x = pos.x; y = pos.y;
    size = Math.max(60, 110 - detection.distance * 0.6);
    heightSize = detection.type === 'human' ? size * 2.2 : size * 1.2;
  }

  return (
    <motion.div
      className="absolute cursor-pointer"
      style={{ left: 0, top: 0, transform: `translate3d(${x}px, ${y}px, 0)`, willChange: 'transform', transition: 'transform 0.15s linear' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={() => onSelect(detection)}
    >
      {/* Main shape outline */}
      <div className="relative" style={{ width: size, height: heightSize }}>
        {/* Shape border — different per type */}
        {detection.type === 'human' && (
          <>
            {/* Dark backdrop so the figure pops against the camera feed */}
            <div className="absolute inset-0 rounded-md pointer-events-none"
              style={{ background: 'rgba(0,0,0,0.55)', boxShadow: 'inset 0 0 22px rgba(0,0,0,0.65)' }} />
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 220" preserveAspectRatio="none"
              style={{ filter: `drop-shadow(0 1px 2px rgba(0,0,0,1)) drop-shadow(0 0 ${isSelected ? 13 : 9}px ${cfg.color})` }}>
              <ellipse cx="50" cy="112" rx="28" ry="98" fill={cfg.color} opacity="0.16" />
              {/* dark outline pass for contrast */}
              <g stroke="#000" strokeOpacity="0.85" strokeWidth="9" strokeLinecap="round" fill="none">
                <circle cx="50" cy="26" r="15" />
                <line x1="50" y1="41" x2="50" y2="128" />
                <line x1="28" y1="60" x2="72" y2="60" />
                <line x1="28" y1="60" x2="18" y2="92" />
                <line x1="18" y1="92" x2="16" y2="122" />
                <line x1="72" y1="60" x2="82" y2="92" />
                <line x1="82" y1="92" x2="84" y2="122" />
                <line x1="38" y1="128" x2="62" y2="128" />
                <line x1="42" y1="128" x2="36" y2="168" />
                <line x1="36" y1="168" x2="32" y2="208" />
                <line x1="58" y1="128" x2="64" y2="168" />
                <line x1="64" y1="168" x2="68" y2="208" />
              </g>
              {/* color pass */}
              <g stroke={cfg.color} strokeWidth="5.5" strokeLinecap="round" fill="none">
                <circle cx="50" cy="26" r="15" />
                <line x1="50" y1="41" x2="50" y2="128" />
                <line x1="28" y1="60" x2="72" y2="60" />
                <line x1="28" y1="60" x2="18" y2="92" />
                <line x1="18" y1="92" x2="16" y2="122" />
                <line x1="72" y1="60" x2="82" y2="92" />
                <line x1="82" y1="92" x2="84" y2="122" />
                <line x1="38" y1="128" x2="62" y2="128" />
                <line x1="42" y1="128" x2="36" y2="168" />
                <line x1="36" y1="168" x2="32" y2="208" />
                <line x1="58" y1="128" x2="64" y2="168" />
                <line x1="64" y1="168" x2="68" y2="208" />
              </g>
              {/* head fill + joint dots */}
              <circle cx="50" cy="26" r="15" fill={cfg.color} opacity="0.22" />
              {[[28,60],[72,60],[18,92],[82,92],[42,128],[58,128],[36,168],[64,168]].map(([jx,jy],i) => (
                <circle key={i} cx={jx} cy={jy} r="3.5" fill={cfg.color} stroke="#000" strokeOpacity="0.6" strokeWidth="1.5" />
              ))}
            </svg>
            {/* Identification bounding box */}
            <div className="absolute inset-0 rounded-md pointer-events-none"
              style={{ border: `1px dashed ${cfg.color}90`, boxShadow: `inset 0 0 12px ${cfg.color}15` }} />
            {/* PERSON ID tag */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-sm whitespace-nowrap"
              style={{ background: cfg.color, color: '#001a0d', boxShadow: '0 1px 4px rgba(0,0,0,0.65)' }}>
              <span className="font-mono text-[8px] font-bold tracking-wider" style={{ textShadow: '0 1px 1px rgba(255,255,255,0.35)' }}>PERSON · {Math.round(detection.intensity)}%</span>
            </div>
            {/* Radar-pulse-synced ring (CSS for GPU compositing) */}
            <div className="absolute inset-0 rounded-md pointer-events-none ar-ring"
              style={{ border: `1.5px solid ${cfg.color}` }} />
          </>
        )}
        {detection.type === 'animal' && (
          <>
            <div className="absolute inset-0 rounded-md pointer-events-none"
              style={{ background: 'rgba(0,0,0,0.5)', boxShadow: 'inset 0 0 18px rgba(0,0,0,0.6)' }} />
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none"
              style={{ filter: `drop-shadow(0 1px 2px rgba(0,0,0,1)) drop-shadow(0 0 ${isSelected ? 12 : 8}px ${cfg.color})` }}>
              {/* body + head volume */}
              <ellipse cx="46" cy="50" rx="34" ry="23" fill={cfg.color} fillOpacity="0.14" />
              <circle cx="80" cy="40" r="13" fill={cfg.color} fillOpacity="0.14" />
              {/* dark outline pass for contrast */}
              <g stroke="#000" strokeOpacity="0.85" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="46" cy="50" rx="34" ry="23" />
                <circle cx="80" cy="40" r="13" />
                <path d="M60,46 Q70,40 76,39" />
                <path d="M73,30 L71,21 L78,25 Z" />
                <path d="M84,30 L87,22 L80,26 Z" />
                <line x1="28" y1="70" x2="26" y2="97" />
                <line x1="40" y1="72" x2="42" y2="97" />
                <line x1="56" y1="72" x2="58" y2="97" />
                <line x1="66" y1="70" x2="68" y2="97" />
                <path d="M14,44 Q5,38 3,25" />
              </g>
              {/* color pass */}
              <g stroke={cfg.color} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="46" cy="50" rx="34" ry="23" />
                <circle cx="80" cy="40" r="13" />
                <path d="M60,46 Q70,40 76,39" />
                <path d="M73,30 L71,21 L78,25 Z" />
                <path d="M84,30 L87,22 L80,26 Z" />
                <line x1="28" y1="70" x2="26" y2="97" />
                <line x1="40" y1="72" x2="42" y2="97" />
                <line x1="56" y1="72" x2="58" y2="97" />
                <line x1="66" y1="70" x2="68" y2="97" />
                <path d="M14,44 Q5,38 3,25" />
              </g>
              {/* eye + joints */}
              <circle cx="84" cy="38" r="1.6" fill={cfg.color} />
              {[[26,97],[42,97],[58,97],[68,97],[80,40]].map(([jx,jy],i) => (
                <circle key={i} cx={jx} cy={jy} r="2.2" fill={cfg.color} stroke="#000" strokeOpacity="0.7" strokeWidth="1" />
              ))}
            </svg>
            <div className="absolute inset-0 rounded-md pointer-events-none"
              style={{ border: `1px dashed ${cfg.color}80`, boxShadow: `inset 0 0 10px ${cfg.color}12` }} />
          </>
        )}
        {detection.type === 'object' && (
          <div className="absolute inset-0 rounded-sm"
            style={{
              border: `2px solid ${cfg.color}`,
              boxShadow: isSelected
                ? `0 0 20px ${cfg.color}, 0 0 40px ${cfg.color}60, inset 0 0 20px ${cfg.color}15`
                : `0 0 10px ${cfg.color}80, inset 0 0 10px ${cfg.color}10`,
              background: `${cfg.color}08`,
            }} />
        )}
        {detection.type === 'unknown' && (
          <div className="absolute inset-0 rotate-45"
            style={{
              border: `2px solid ${cfg.color}`,
              boxShadow: isSelected
                ? `0 0 20px ${cfg.color}, 0 0 40px ${cfg.color}60, inset 0 0 20px ${cfg.color}15`
                : `0 0 10px ${cfg.color}80, inset 0 0 10px ${cfg.color}10`,
              background: `${cfg.color}08`,
            }} />
        )}

        {/* Corner brackets for selected */}
        {isSelected && (
          <>
            <div className="absolute top-0 left-0 w-3 h-3" style={{ borderTop: `2px solid ${cfg.color}`, borderLeft: `2px solid ${cfg.color}` }} />
            <div className="absolute top-0 right-0 w-3 h-3" style={{ borderTop: `2px solid ${cfg.color}`, borderRight: `2px solid ${cfg.color}` }} />
            <div className="absolute bottom-0 left-0 w-3 h-3" style={{ borderBottom: `2px solid ${cfg.color}`, borderLeft: `2px solid ${cfg.color}` }} />
            <div className="absolute bottom-0 right-0 w-3 h-3" style={{ borderBottom: `2px solid ${cfg.color}`, borderRight: `2px solid ${cfg.color}` }} />
          </>
        )}

        {/* Moving pulse ring (CSS) */}
        {detection.moving && (
          <div className="absolute inset-0 rounded-full ar-ring"
            style={{ border: `1px solid ${cfg.color}`, borderRadius: 'inherit', animationDuration: '1.5s' }} />
        )}
      </div>

      {/* Label tag (CSS pulse) */}
      <div
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-sm whitespace-nowrap ar-label"
        style={{ background: 'rgba(0,0,0,0.88)', border: `1px solid ${cfg.color}55`, backdropFilter: 'blur(6px)' }}>
        <span className="font-mono text-[9px] font-semibold" style={{ color: cfg.color, textShadow: `0 0 4px ${cfg.color}, 0 1px 2px rgba(0,0,0,0.9)` }}>
          {cfg.label} · {Number.isFinite(Number(detection.distance)) ? `${Number(detection.distance).toFixed(1)}m` : 'RANGE ?'}{detection.threatReason ? ` · ${detection.threatReason}` : ''}
        </span>
      </div>

    </motion.div>
  );
}

const ARShape = memo(ARShapeRaw);

// Through-wall figure rendering now lives in WallVisionOverlay (compass-projected).

export default function CameraARView({ detections, wallDetections = [], scanMode, isScanning, onDetections, onCameraActive, wallOpacity = 65, onWallOpacity,   trailsEnabled = true, zoom = 1, autoZoom = false, zoomRange = 3, ghostMode = false, sonar = null, proximityRange = 2.5, proximityEnabled = true, onProximityAlert, heading, compassNeedsPermission, onEnableCompass, selectedDetection: externalSelectedDetection = null, onSelectDetection }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [selectedDetection, setSelectedDetection] = useState(null);
  useEffect(() => { setSelectedDetection(externalSelectedDetection || null); }, [externalSelectedDetection]);
  const selectDetection = useCallback((d) => {
    setSelectedDetection(prev => {
      const isSame = prev?.id === d.id || externalSelectedDetection?.trackId === d.id;
      const next = isSame ? null : d;
      onSelectDetection?.(next ? { ...next, id: `live-${next.id}`, trackId: next.trackId ?? next.id } : null);
      return next;
    });
  }, [externalSelectedDetection, onSelectDetection]);
  const [containerSize, setContainerSize] = useState({ w: 400, h: 600 });
  const [heatmapOn, setHeatmapOn] = useState(false);
  const [awaiting, setAwaiting] = useState(false);
  // wallOpacity + trailsEnabled are now driven by the consolidated AR control bar (props)
  const [facingMode, setFacingMode] = useState('environment');
  const [activeCamLabel, setActiveCamLabel] = useState('');
  const [detectorStatus, setDetectorStatus] = useState('idle');
  const heatCanvasRef = useRef(null);
  const detectionsRef = useRef(detections);
  detectionsRef.current = detections;
  // Cache the verified rear-camera deviceId so subsequent restarts/flip-backs
  // re-acquire the same lens instantly without re-enumerating every camera.
  const rearDeviceIdRef = useRef(null);
  const ghostGroups = useGhostTrails(ghostMode, containerSize);

  // Non-visual observations may be rendered as an overlay only when supplied
  // by the external ranging pipeline. Camera detections remain a separate layer.
  const anyMeasuredExternalMoving = wallDetections.some(d => d.moving && d.source && d.source !== 'camera');
  const sameTrack = useCallback((a, b) => {
    if (!a || !b) return false;
    const idsA = [a.trackId, a.id].filter((v) => v != null).map(String);
    const idsB = [b.trackId, b.id].filter((v) => v != null).map(String);
    return idsA.some((id) => idsB.includes(id));
  }, []);

  // Real camera-based detection.
  // COCO-SSD handles animals/objects; MoveNet pose estimation drives the human
  // stick figures with real body joints that move naturally with each person.
  const [poseDets, setPoseDets] = useState([]);
  const [objDets, setObjDets] = useState([]);
  const { modelStatus } = useObjectDetector(videoRef, {
    // Camera AI is an independent observation source. Keep it running whenever
    // the camera is active so changing SONAR/THERMAL/MOTION modes cannot hide
    // real people detected by the camera.
    enabled: cameraActive,
    onDetections: (dets) => setObjDets(dets.filter(d => d.type !== 'human')),
  });
  const { modelStatus: poseStatus } = usePoseDetector(videoRef, {
    // Human pose tracking follows the live camera, not the selected external
    // sensor mode. This keeps PERSON tracks visible in the unified 3D scene.
    enabled: cameraActive,
    onPoses: setPoseDets,
  });

  // Throttle detection emission to ~10fps so the parent dashboard doesn't
  // re-render on every model frame — keeps the camera feed buttery smooth.
  const lastEmitRef = useRef(0);
  useEffect(() => {
    if (!onDetections) return;
    const now = performance.now();
    if (now - lastEmitRef.current < 50) return;
    lastEmitRef.current = now;
    onDetections([...poseDets, ...objDets]);
  }, [poseDets, objDets, onDetections]);

  // Debounce the "awaiting targets" hint so it doesn't flicker when tracking
  // briefly drops to zero between frames.
  useEffect(() => {
    if (detections.length > 0) { setAwaiting(false); return; }
    const t = setTimeout(() => setAwaiting(true), 600);
    return () => clearTimeout(t);
  }, [detections.length]);

  useEffect(() => {
    if (onCameraActive) onCameraActive(cameraActive);
  }, [cameraActive, onCameraActive]);

  const modeColors = { sonar: '#00ff88', thermal: '#ff6633', motion: '#00ccff' };
  const color = modeColors[scanMode] || modeColors.sonar;
  // Visual opacity is an interface control only; changing it does not create
  // or reveal measurements through a physical wall.
  const seeThrough = (100 - wallOpacity) / 100;

  // Distance-based radar pulse warning: fires the instant any on-screen target
  // (live camera OR radar/through-wall) enters the safety range. Urgency scales
  // with closeness so a nearer target pulses faster and brighter.
  const allOnScreen = [...detections, ...wallDetections];
  const measuredDistances = allOnScreen.map(d => Number(d.distance)).filter(Number.isFinite);
  const nearestDist = measuredDistances.length ? Math.min(...measuredDistances) : Infinity;
  const proximityAlert = proximityEnabled && nearestDist <= proximityRange;
  const proximityUrgency = proximityAlert ? Math.max(0, Math.min(1, 1 - nearestDist / proximityRange)) : 0;
  const pulseDuration = (1.3 - proximityUrgency * 0.85).toFixed(2);

  // Emit one event per breach (rising edge) so the safety panel can log it.
  const prevAlertRef = useRef(false);
  useEffect(() => {
    if (proximityAlert && !prevAlertRef.current && onProximityAlert) {
      onProximityAlert({ distance: nearestDist, timestamp: Date.now() });
    }
    prevAlertRef.current = proximityAlert;
  }, [proximityAlert, nearestDist, onProximityAlert]);

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: width, h: height });
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Force the requested facing camera — try exact, then ideal, then any camera.
  // A plain facingMode string is only a preference, so some browsers hand back
  // the selfie cam; exact prevents that.
  const requestCameraStream = async (mode) => {
    const dims = { width: { ideal: 1280 }, height: { ideal: 720 } };
    const stop = (s) => { try { s.getTracks().forEach(t => t.stop()); } catch {} };
    // A camera counts as "rear" if it reports facingMode 'environment' OR its
    // label says back/rear — many phones omit facingMode entirely.
    const isRear = (track) => {
      const s = track?.getSettings?.() || {};
      const lbl = track?.label || '';
      return s.facingMode === 'environment' || /back|rear|environment/i.test(lbl);
    };
    // Cache the deviceId of any stream we verify as rear so the next start
    // re-acquires it directly — no enumerate-and-probe round trip.
    const acceptRear = (s) => {
      const track = s.getVideoTracks()[0];
      const settings = track?.getSettings?.() || {};
      if (settings.deviceId) rearDeviceIdRef.current = settings.deviceId;
      return s;
    };

    if (mode === 'environment') {
      // 0. Fast path: re-acquire the previously verified rear lens by deviceId.
      if (rearDeviceIdRef.current) {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: rearDeviceIdRef.current }, ...dims } });
          if (isRear(s.getVideoTracks()[0])) return acceptRear(s);
          stop(s);
        } catch { rearDeviceIdRef.current = null; }
      }
      // 1. Prefer the rear camera loosely; verify the track really is rear
      //    before accepting it (some browsers ignore 'ideal' and hand back front).
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, ...dims } });
        if (isRear(s.getVideoTracks()[0])) return acceptRear(s);
        stop(s);
      } catch {}
      // 2. Stricter exact request — works on devices where 'ideal' doesn't.
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: 'environment' }, ...dims } });
        if (isRear(s.getVideoTracks()[0])) return acceptRear(s);
        stop(s);
      } catch {}
      // 3. Enumerate cameras and pick the real rear one by label or facing.
      try {
        const prime = await navigator.mediaDevices.getUserMedia({ video: { ...dims } });
        stop(prime);
        const devices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
        // Fast path: a device whose label already names the back camera.
        const labeled = devices.filter(d => /back|rear|environment/i.test(d.label));
        for (const d of labeled) {
          try {
            const s = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: d.deviceId }, ...dims } });
            if (isRear(s.getVideoTracks()[0])) return acceptRear(s);
            stop(s);
          } catch {}
        }
        // Otherwise open each camera and keep only a verified rear one —
        // never fall back to the front lens for wall-vision.
        for (const d of devices) {
          try {
            const s = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: d.deviceId }, ...dims } });
            if (isRear(s.getVideoTracks()[0])) return acceptRear(s);
            stop(s);
          } catch {}
        }
        // Heuristic: no camera verified as rear. On most phones the back
        // camera is enumerated after the front one, so prefer the last listed
        // device rather than defaulting to the front lens.
        if (devices.length > 1) {
          const last = devices[devices.length - 1];
          try {
            const s = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: last.deviceId }, ...dims } });
            if (isRear(s.getVideoTracks()[0])) return acceptRear(s);
            return s;
          } catch {}
        }
      } catch {}
      // 4. Last resort: ask for the environment lens again (best effort).
      try { return await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, ...dims } }); } catch {}
    } else {
      try { return await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: mode }, ...dims } }); }
      catch { return await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: mode }, ...dims } }); }
    }
    return await navigator.mediaDevices.getUserMedia({ video: { ...dims } });
  };

  const startCamera = async (mode = facingMode) => {
    if (typeof mode !== 'string') mode = facingMode;
    setCameraError(null);
    try {
      const stream = await requestCameraStream(mode);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
        setActiveCamLabel(stream.getVideoTracks()[0]?.label || '');
      }
    } catch (err) {
      setCameraError(err.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access.'
        : 'Camera not available on this device.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Retry AI model loading by cycling the camera — the detector hooks re-run
  // and (with the cached-promise reset) re-fetch the model weights.
  const restartAI = async () => {
    stopCamera();
    await new Promise(r => setTimeout(r, 250));
    startCamera();
  };

  const flipCamera = async () => {
    if (!cameraActive) {
      // Not running yet — just remember the requested facing for next start.
      setFacingMode(f => (f === 'environment' ? 'user' : 'environment'));
      return;
    }
    setCameraError(null);
    const dims = { width: { ideal: 1280 }, height: { ideal: 720 } };
    // Switch by real device id — more reliable than facingMode, which many
    // phones report inconsistently. cameraActive stays true throughout so the
    // AI models keep running and the view never "shuts off".
    try {
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
      const currentTrack = videoRef.current?.srcObject?.getVideoTracks?.()[0];
      const currentId = currentTrack?.getSettings?.()?.deviceId;
      const idx = devices.findIndex(d => d.deviceId === currentId);
      const nextDevice = devices.length > 1
        ? devices[(idx + 1) % devices.length]
        : devices[0];
      // Release the current camera first — mobile devices drive one at a time.
      if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      let stream;
      if (nextDevice?.deviceId) {
        try { stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: nextDevice.deviceId }, ...dims } }); }
        catch { stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { ideal: nextDevice.deviceId }, ...dims } }); }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ video: { ...dims } });
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setActiveCamLabel(stream.getVideoTracks()[0]?.label || '');
      }
      // Infer the new facing from the live track so the HUD label stays correct.
      const newTrack = stream.getVideoTracks()[0];
      const s = newTrack?.getSettings?.() || {};
      const lbl = newTrack?.label || '';
      setFacingMode(s.facingMode === 'user' || /front|user|face/i.test(lbl) ? 'user' : 'environment');
      setCameraActive(true);
    } catch (err) {
      // Restore the previous facing so the feed stays live instead of going dark.
      try {
        const stream = await requestCameraStream(facingMode);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraActive(true);
        setCameraError('Flip unavailable — this device has one camera.');
      } catch (e2) {
        setCameraError(e2.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access.'
          : 'Camera not available on this device.');
        setCameraActive(false);
      }
    }
  };

  useEffect(() => () => stopCamera(), []);

  // Auto-start the rear camera on mount so the view pops open immediately.
  useEffect(() => {
    startCamera('environment');
     
  }, []);

  // Movement heat map overlay — only runs the RAF loop while active; clears
  // and exits otherwise so it costs nothing when the heat layer is off.
  useEffect(() => {
    const canvas = heatCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { w, h } = containerSize;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    if (!heatmapOn || !cameraActive) { ctx.clearRect(0, 0, w, h); return; }
    let raf;
    const render = () => {
      raf = requestAnimationFrame(render);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.018)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      detectionsRef.current.forEach(d => {
        if (!d.moving) return;
        const { x, y } = detectionToScreen(d, w, h);
        const r = Math.max(30, 50 + d.intensity * 0.7);
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, 'rgba(255,40,0,0.85)');
        grad.addColorStop(0.35, 'rgba(255,180,0,0.55)');
        grad.addColorStop(0.7, 'rgba(255,230,40,0.2)');
        grad.addColorStop(1, 'rgba(0,255,136,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      });
    };
    render();
    return () => cancelAnimationFrame(raf);
  }, [heatmapOn, cameraActive, containerSize]);

  return (
    <div ref={containerRef} className="relative w-full h-full rounded-2xl overflow-hidden bg-black min-h-[420px]">
      {/* Zoom group — video + through-wall overlays scale together */}
      <div className="absolute inset-0 origin-center" style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.3s ease', willChange: 'transform' }}>
      {/* Camera feed */}
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline
        style={{
          opacity: cameraActive ? 1 : 0,
          filter: seeThrough > 0 ? `contrast(${1 + 0.4 * seeThrough}) saturate(${1 - 0.75 * seeThrough}) brightness(${1 - 0.25 * seeThrough})` : 'none',
          transition: 'filter 0.4s ease',
        }} />

      {/* Dark overlay when camera is on — subtle */}
      {cameraActive && (
        <div className="absolute inset-0"
          style={{ background: `linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.35) 100%)` }} />
      )}

      {/* Mode color tint */}
      {cameraActive && scanMode === 'thermal' && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'rgba(255,80,0,0.08)', mixBlendMode: 'screen' }} />
      )}

      {/* Spatial overlay tint — presentation only; it is not a through-wall sensor. */}
      {cameraActive && seeThrough > 0 && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(180deg, rgba(0,255,136,0.10) 0%, rgba(0,255,136,0.04) 50%, rgba(0,255,136,0.12) 100%)`, mixBlendMode: 'screen', opacity: seeThrough }} />
      )}
      {/* Wall/spatial haze — presentation layer only. The opacity slider does
          not alter sensor measurements or expose unmeasured space. */}
      {cameraActive && wallOpacity > 0 && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ opacity: (wallOpacity / 100) * (anyMeasuredExternalMoving ? 0.55 : 1), transition: 'opacity 0.4s ease', background: 'linear-gradient(180deg, rgba(18,28,22,0.5), rgba(6,12,9,0.62) 50%, rgba(18,28,22,0.5))', backdropFilter: 'blur(1.5px)' }} />
      )}

      {/* AR grid overlay */}
      {cameraActive && (
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(${color}12 1px, transparent 1px), linear-gradient(90deg, ${color}12 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }} />
      )}

      {/* Horizon line */}
      {cameraActive && (
        <div className="absolute left-0 right-0 pointer-events-none"
          style={{ top: '50%', height: 1, background: `linear-gradient(90deg, transparent, ${color}30, transparent)` }} />
      )}

      {/* WiFi radar pulse sweep — two GPU-composited rings from the device */}
      {cameraActive && isScanning && (
        <div className="absolute inset-0 pointer-events-none flex items-end justify-center overflow-hidden">
          <div className="relative" style={{ width: 1, height: 1 }}>
            {[0, 1].map(i => {
              const R = containerSize.w * 1.5;
              return (
                <div key={i} className="absolute rounded-full ar-sweep"
                  style={{ border: `1.5px solid ${color}`, width: R, height: R, marginLeft: -R / 2, marginTop: -R / 2, animationDelay: `${i * 1.75}s` }} />
              );
            })}
          </div>
        </div>
      )}

      {/* Movement heat map overlay */}
      {cameraActive && heatmapOn && (
        <canvas ref={heatCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ mixBlendMode: 'screen', opacity: 0.95 }} />
      )}

      {/* Detection shapes — animals / objects */}
      {cameraActive && (
        <AnimatePresence>
          {objDets.map(d => (
            <ARShape
              key={d.id}
              detection={d}
              screenW={containerSize.w}
              screenH={containerSize.h}
              isSelected={sameTrack(selectedDetection, d)}
              onSelect={selectDetection}
            />
          ))}
        </AnimatePresence>
      )}

      {/* Human skeletons from real pose keypoints */}
      {cameraActive && (
        <AnimatePresence>
          {poseDets.map(d => (
            <PoseSkeleton
              key={d.id}
              detection={d}
              screenW={containerSize.w}
              screenH={containerSize.h}
              isSelected={sameTrack(selectedDetection, d)}
              onClick={() => selectDetection(d)}
              sonar={sonar}
            />
          ))}
        </AnimatePresence>
      )}

      {/* Non-visual continuity layer. Only validated external observations are
          rendered beyond the camera view. A camera track cannot be invented
          behind an occluding wall; historical continuity is shown separately
          when the evidence actually supports it. */}
      {/* Through-wall vision — compass-projected figures behind the wall you're looking at */}
      {cameraActive && seeThrough > 0.02 && (
        <WallVisionOverlay
          detections={wallDetections}
          heading={heading}
          W={containerSize.w}
          H={containerSize.h}
          wallOpacity={wallOpacity}
          color={color}
          isScanning={isScanning}
          sonar={sonar}
          onSelectDetection={selectDetection}
          selectedDetection={selectedDetection}
        />
      )}

      {/* Around-you radar — every human & animal by position, easy to read at a glance */}
      {cameraActive && isScanning && (
        <ThroughWallMinimap detections={wallDetections} heading={heading} color={color} sonar={sonar} />
      )}
      {/* Ghost mode — past movement paths overlaid on the live feed */}
      {cameraActive && ghostMode && ghostGroups.length > 0 && (
        <GhostTrailsOverlay groups={ghostGroups} />
      )}

      {/* Cross-view focus reticle: selection is a shared operator focus, not a
          claim that different sensors have identified the same physical person. */}
      {cameraActive && selectedDetection && (
        <div className="absolute inset-0 pointer-events-none z-[18]" aria-live="polite">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-white/20" />
          <div className="absolute left-1/2 top-1/2 w-[min(34%,260px)] h-px -translate-y-1/2 bg-gradient-to-r from-white/0 via-white/30 to-white/0" />
          <div className="absolute left-1/2 top-1/2 h-[min(34%,260px)] w-px -translate-x-1/2 bg-gradient-to-b from-white/0 via-white/30 to-white/0" />
          <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-md border border-white/20 bg-black/75 px-2 py-1 backdrop-blur-sm font-mono text-[7px] tracking-[0.16em] text-white/75">
            FOCUS · {selectedDetection.displayId || selectedDetection.label || selectedDetection.id || 'OBSERVATION'}
          </div>
        </div>
      )}
      </div>

      {/* Distance-based radar pulse warning — fires the instant a target enters the safety range */}
      {cameraActive && proximityAlert && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Concentric radar pulses — urgency scales with closeness */}
          <div className="absolute inset-0 flex items-center justify-center">
            {[0, 0.45, 0.9].map((delay, i) => (
              <div key={i} className="proximity-pulse rounded-full absolute"
                style={{
                  width: '55%', height: '55%',
                  border: `${2 + proximityUrgency * 2}px solid #ff2222`,
                  boxShadow: `0 0 ${30 + proximityUrgency * 40}px ${4 + proximityUrgency * 8}px #ff2222`,
                  animationDuration: `${pulseDuration}s`,
                  animationDelay: `${delay}s`,
                }} />
            ))}
          </div>
          {/* Range ring — marks the configured proximity boundary */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full" style={{ width: '55%', height: '55%', border: '1px dashed #ff222266' }} />
          </div>
          <div className="absolute inset-0 ar-threat" style={{ boxShadow: `inset 0 0 ${100 + proximityUrgency * 80}px ${14 + proximityUrgency * 14}px #ff222255` }} />
          <div className="absolute top-9 left-0 right-0 flex justify-center">
            <div className="px-3 py-1.5 rounded-lg flex items-center gap-2" style={{ background: 'rgba(40,0,0,0.88)', border: `1px solid #ff2222${proximityUrgency > 0.6 ? 'aa' : '60'}` }}>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-mono text-[10px] tracking-widest text-red-400" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>
                ⚠ PROXIMITY ALERT · TARGET AT {nearestDist.toFixed(1)}m · RANGE {proximityRange.toFixed(1)}m
              </span>
            </div>
          </div>
        </div>
      )}

      {/* AI status overlays — tell the user what's happening so stick figures aren't a mystery */}
      {cameraActive && (modelStatus === 'loading' || poseStatus === 'loading') && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid #facc1555', backdropFilter: 'blur(6px)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            <span className="font-mono text-[9px] tracking-widest text-yellow-400/90" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>LOADING AI MODELS…</span>
          </div>
        </div>
      )}
      {cameraActive && modelStatus === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button onClick={restartAI}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-[10px] tracking-widest text-red-400 transition-colors hover:bg-red-400/10"
            style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid #f8717155', backdropFilter: 'blur(6px)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            AI MODEL FAILED — TAP TO RETRY
          </button>
        </div>
      )}
      {cameraActive && modelStatus === 'ready' && awaiting && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.6)', border: `1px solid ${color}40`, backdropFilter: 'blur(6px)' }}>
            <span className="font-mono text-[9px] tracking-widest" style={{ color: `${color}cc`, textShadow: `0 0 6px ${color}, 0 1px 2px rgba(0,0,0,0.9)` }}>AWAITING TARGETS · POINT AT A PERSON</span>
          </div>
        </div>
      )}

      {/* HUD corners */}
      {cameraActive && (
        <>
          <div className="absolute top-3 left-3 w-8 h-8 pointer-events-none"
            style={{ borderTop: `2px solid ${color}70`, borderLeft: `2px solid ${color}70` }} />
          <div className="absolute top-3 right-3 w-8 h-8 pointer-events-none"
            style={{ borderTop: `2px solid ${color}70`, borderRight: `2px solid ${color}70` }} />
          <div className="absolute bottom-3 left-3 w-8 h-8 pointer-events-none"
            style={{ borderBottom: `2px solid ${color}70`, borderLeft: `2px solid ${color}70` }} />
          <div className="absolute bottom-12 right-3 w-8 h-8 pointer-events-none"
            style={{ borderBottom: `2px solid ${color}70`, borderRight: `2px solid ${color}70` }} />
        </>
      )}

      {/* Sonar motion edge glow — real ultrasonic motion detected in the room */}
      {cameraActive && sonar?.motion && (
        <div className="absolute inset-0 pointer-events-none ar-threat"
          style={{ boxShadow: 'inset 0 0 90px 14px #ff663355' }} />
      )}

      {/* Compass prompt — through-wall figures need the real heading to aim */}
      {cameraActive && heading == null && compassNeedsPermission && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
          <button onClick={onEnableCompass}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[9px] tracking-wider transition-colors"
            style={{ background: 'rgba(0,0,0,0.82)', border: `1px solid ${color}50`, color, backdropFilter: 'blur(6px)' }}>
            <Crosshair className="w-3 h-3" /> ENABLE COMPASS FOR THROUGH-WALL AIM
          </button>
        </div>
      )}

      {/* Detection legend — tap to learn the color/icon codes */}
      {cameraActive && <ArLegend color={color} />}

      {/* Top HUD bar */}
      {cameraActive && (
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2.5"
          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${color}30` }}>
          <div className="flex items-center gap-2">
            <motion.div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }}
              animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
            <span className="font-display text-[10px] tracking-widest" style={{ color, textShadow: `0 0 6px ${color}, 0 1px 2px rgba(0,0,0,0.9)` }}>AR SCAN · {scanMode.toUpperCase()}</span>
            {modelStatus === 'loading' && (
              <span className="font-mono text-[8px] text-yellow-400/80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />AI LOADING…
              </span>
            )}
            {modelStatus === 'ready' && (
              <span className="font-mono text-[8px]" style={{ color: `${color}90`, textShadow: `0 0 5px ${color}, 0 1px 2px rgba(0,0,0,0.9)` }}>AI LIVE</span>
            )}
            {modelStatus === 'error' && (
              <span className="font-mono text-[8px] text-red-400">AI ERROR</span>
            )}
            {zoom > 1.01 && (
              <span className="font-mono text-[8px] flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                style={{ color, background: `${color}15`, border: `1px solid ${color}40`, textShadow: `0 0 5px ${color}, 0 1px 2px rgba(0,0,0,0.9)` }}>
                <ZoomIn className="w-2.5 h-2.5" /> {zoom.toFixed(1)}×{autoZoom ? ' AUTO' : ''} <span className="opacity-60">· ≤{zoomRange.toFixed(1)}m</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9px] text-white/80" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>{detections.length} TARGETS</span>
            {sonar?.motion && (
              <span className="font-mono text-[9px] flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ color: '#ff6633', background: '#ff663315', border: '1px solid #ff663340', textShadow: '0 0 5px #ff6633, 0 1px 2px rgba(0,0,0,0.9)' }}>
                <Waves className="w-3 h-3" /> SONAR
              </span>
            )}

            <button onClick={() => setHeatmapOn(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[9px] transition-colors"
              style={{
                color: heatmapOn ? color : 'rgba(255,255,255,0.6)',
                border: `1px solid ${heatmapOn ? color + '50' : 'rgba(255,255,255,0.15)'}`,
                background: heatmapOn ? color + '18' : 'transparent',
              }}>
              <Flame className="w-3 h-3" /> HEAT
            </button>
            <span className="font-mono text-[8px] text-white/45 hidden md:inline max-w-[120px] truncate" title={activeCamLabel}>
              {activeCamLabel || '—'}
            </span>
            <button onClick={flipCamera}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[9px] text-white/70 border border-white/15 hover:bg-white/10 transition-colors"
              title="Switch front / back camera">
              <SwitchCamera className="w-3 h-3" /> FLIP
            </button>
            <button onClick={stopCamera}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[9px] text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors">
              <CameraOff className="w-3 h-3" /> STOP
            </button>
          </div>
        </div>
      )}

      {/* Selected detection info */}
      <AnimatePresence>
        {cameraActive && selectedDetection && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-16 left-4 right-4 rounded-xl p-3"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', border: `1px solid ${TYPE_CONFIG[selectedDetection.type]?.color || color}30` }}>
            {(() => {
              const cfg = TYPE_CONFIG[selectedDetection.type] || TYPE_CONFIG.unknown;
              return (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}>
                    <cfg.Icon className="w-4 h-4" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-display text-[11px] tracking-wider" style={{ color: cfg.color }}>{cfg.label}</span>
                      <button onClick={() => { setSelectedDetection(null); onSelectDetection?.(null); }}
                        className="font-mono text-[9px] text-muted-foreground hover:text-foreground">✕</button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { l: 'DIST', v: Number.isFinite(Number(selectedDetection.distance)) ? `${Number(selectedDetection.distance).toFixed(1)}m` : 'N/A' },
                        { l: 'ANGLE', v: `${Math.round(selectedDetection.angle)}°` },
                        { l: 'CONF', v: `${selectedDetection.intensity}%` },
                      ].map(s => (
                        <div key={s.l} className="text-center py-1.5 rounded-md bg-white/5">
                          <div className="font-mono text-[10px] font-bold" style={{ color: cfg.color }}>{s.v}</div>
                          <div className="font-mono text-[8px] text-muted-foreground">{s.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No camera — launch screen */}
      {!cameraActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6"
          style={{ background: 'radial-gradient(ellipse at center, rgba(0,255,136,0.04) 0%, rgba(0,0,0,0.95) 70%)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
            <Camera className="w-8 h-8" style={{ color }} />
          </div>
          <div className="text-center">
            <p className="font-display text-sm tracking-widest mb-2" style={{ color }}>LIVE AI VISION MODE</p>
            <p className="font-mono text-[11px] text-muted-foreground max-w-xs leading-relaxed">
              Activates your camera and runs on-device AI to detect real people, animals, and objects in view — tracked live as they move, with no simulation.
            </p>
            {cameraError && (
              <p className="font-mono text-[10px] text-red-400 mt-2 max-w-xs">{cameraError}</p>
            )}
          </div>
          <button onClick={() => startCamera()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-display text-xs tracking-widest transition-all hover:scale-105"
            style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}>
            <Camera className="w-4 h-4" />
            ACTIVATE CAMERA
          </button>
        </div>
      )}
    </div>
  );
}
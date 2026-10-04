import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import useSpatialWorld from '../hooks/useSpatialWorld';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Eye, EyeOff, Layers, X, Target, AlertTriangle, Scan, Ruler } from 'lucide-react';

const TYPE_COLORS = { human: 0x00ff88, animal: 0x00ccff, object: 0xffaa00, unknown: 0xff4466 };
const TYPE_HEX    = { human: '#00ff88', animal: '#00ccff', object: '#ffaa00', unknown: '#ff4466' };
const TRAIL_LEN   = 60;
const GHOST_COUNT = 6;

// Shape outline dimensions per type
const SHAPE_DIMS = {
  human:   { w: 0.55, h: 1.75, d: 0.35, label: 'HUMAN · VISUAL ENVELOPE' },
  animal:  { w: 0.7,  h: 0.55, d: 0.9,  label: 'ANIMAL · VISUAL ENVELOPE' },
  object:  { w: 0.8,  h: 0.8,  d: 0.8,  label: 'OBJECT · VISUAL ENVELOPE' },
  unknown: { w: 0.6,  h: 0.9,  d: 0.6,  label: 'UNKNOWN · VISUAL ENVELOPE'   },
};

function polar2cart(angleDeg, distPct, scale = 7) {
  const rad = (angleDeg * Math.PI) / 180;
  const r   = (distPct / 100) * scale;
  return new THREE.Vector3(r * Math.cos(rad), 0, r * Math.sin(rad));
}

// Build a single merged articulated humanoid geometry (head + torso + arms +
// legs). Merging keeps it as one Mesh with one material, so the existing
// render loop (opacity / emissive / rotation) works unchanged while the
// silhouette — and its X-ray wireframe — read clearly as a human figure,
// even behind walls.
function buildHumanoidGeo() {
  const parts = [];
  const add = (geo, x, y, z) => {
    geo.applyMatrix4(new THREE.Matrix4().makeTranslation(x, y, z));
    parts.push(geo);
  };
  add(new THREE.SphereGeometry(0.16, 16, 16), 0, 0.86, 0);            // head
  add(new THREE.CapsuleGeometry(0.2, 0.5, 8, 16), 0, 0.42, 0);        // torso
  add(new THREE.CapsuleGeometry(0.08, 0.42, 6, 12), 0.26, 0.45, 0);  // right arm
  add(new THREE.CapsuleGeometry(0.08, 0.42, 6, 12), -0.26, 0.45, 0);  // left arm
  add(new THREE.CapsuleGeometry(0.1, 0.5, 6, 12), 0.12, -0.32, 0);   // right leg
  add(new THREE.CapsuleGeometry(0.1, 0.5, 6, 12), -0.12, -0.32, 0);  // left leg
  return mergeGeometries(parts, false);
}

function makeLabel(text, hexColor, scale = [2.0, 0.45]) {
  const c = document.createElement('canvas');
  c.width = 300; c.height = 72;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 300, 72);
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.roundRect(3, 3, 294, 66, 10); ctx.fill();
  ctx.strokeStyle = hexColor; ctx.lineWidth = 2;
  ctx.roundRect(3, 3, 294, 66, 10); ctx.stroke();
  ctx.fillStyle = hexColor;
  ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 150, 36);
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(...scale, 1);
  return spr;
}

// Make a dimension annotation sprite (small text label for shape outline mode)
function makeDimLabel(text, hexColor) {
  const c = document.createElement('canvas');
  c.width = 380; c.height = 56;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.roundRect(2, 2, c.width - 4, c.height - 4, 6); ctx.fill();
  ctx.strokeStyle = hexColor; ctx.lineWidth = 1.5;
  ctx.roundRect(2, 2, c.width - 4, c.height - 4, 6); ctx.stroke();
  ctx.fillStyle = hexColor;
  ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(2.4, 0.36, 1);
  return spr;
}

// Build a presentation envelope around a detection. Dimensions are UI defaults,
// not measured body geometry, and are never presented as physical reconstruction.
function buildShapeOutline(type, color, hex) {
  const group = new THREE.Group();
  const dims = SHAPE_DIMS[type] ?? SHAPE_DIMS.unknown;
  const { w, h, d } = dims;

  // Primary bounding box edges (bright)
  const boxGeo = new THREE.BoxGeometry(w, h, d);
  const edgesMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, depthTest: false });
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), edgesMat);
  edges.position.y = h / 2;
  edges.renderOrder = 1000;
  group.add(edges);

  // Corner tick marks at each bottom corner for measurement feel
  const tickLen = 0.12;
  const tickMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7, depthTest: false });
  const corners = [
    [-w/2, 0, -d/2], [w/2, 0, -d/2], [-w/2, 0, d/2], [w/2, 0, d/2],
  ];
  corners.forEach(([cx, cy, cz]) => {
    const pts = [];
    pts.push(new THREE.Vector3(cx, cy + tickLen, cz));
    pts.push(new THREE.Vector3(cx, cy, cz));
    pts.push(new THREE.Vector3(cx + (cx > 0 ? -tickLen : tickLen), cy, cz));
    const tGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const tick = new THREE.Line(tGeo, tickMat.clone());
    tick.renderOrder = 1001;
    group.add(tick);
  });

  // Vertical height line on one side
  const hLinePts = [new THREE.Vector3(-w/2, 0, -d/2), new THREE.Vector3(-w/2, h, -d/2)];
  const hLineGeo = new THREE.BufferGeometry().setFromPoints(hLinePts);
  const hLine = new THREE.Line(hLineGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4, depthTest: false }));
  hLine.renderOrder = 1001;
  group.add(hLine);

  // Floor projection rectangle (flat dashed-look quad)
  const floorPts = [
    new THREE.Vector3(-w/2, 0.01, -d/2),
    new THREE.Vector3( w/2, 0.01, -d/2),
    new THREE.Vector3( w/2, 0.01,  d/2),
    new THREE.Vector3(-w/2, 0.01,  d/2),
    new THREE.Vector3(-w/2, 0.01, -d/2),
  ];
  const floorGeo = new THREE.BufferGeometry().setFromPoints(floorPts);
  const floorLine = new THREE.Line(floorGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35, depthTest: false }));
  floorLine.renderOrder = 1002;
  group.add(floorLine);

  // Dim annotation sprite above box
  const dimLabel = makeDimLabel(dims.label, hex);
  dimLabel.position.set(0, h + 0.28, 0);
  group.add(dimLabel);

  group.visible = false; // hidden by default, shown when outlineMode is ON
  return { group, edges, edgesMat };
}

// Build a session-local reference grid. It is a coordinate aid, not measured room
// geometry; dimensions must never be interpreted as surveyed walls/furniture.
function buildMeasurementGrid(modeColor, modeHex) {
  const group = new THREE.Group();
  const roomHalf = 4.5; // session-local reference extent only; not a measured room
  const gridColor = modeColor;
  const lineMat = () => new THREE.LineBasicMaterial({ color: gridColor, transparent: true, opacity: 0.35, depthTest: false });

  // Floor meter lines X axis
  for (let x = -4; x <= 4; x++) {
    const pts = [new THREE.Vector3(x, 0.015, -roomHalf), new THREE.Vector3(x, 0.015, roomHalf)];
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat());
    line.renderOrder = 1100;
    group.add(line);
  }
  // Floor meter lines Z axis
  for (let z = -4; z <= 4; z++) {
    const pts = [new THREE.Vector3(-roomHalf, 0.015, z), new THREE.Vector3(roomHalf, 0.015, z)];
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat());
    line.renderOrder = 1100;
    group.add(line);
  }

  // Meter tick labels along X axis (south wall edge)
  for (let x = -4; x <= 4; x++) {
    if (x === 0) continue;
    const lbl = makeDimLabel(`${x > 0 ? '+' : ''}${x}m`, modeHex);
    lbl.scale.set(0.9, 0.18, 1);
    lbl.position.set(x, 0.04, roomHalf - 0.3);
    group.add(lbl);
  }
  // Meter tick labels along Z axis (east wall edge)
  for (let z = -4; z <= 4; z++) {
    if (z === 0) continue;
    const lbl = makeDimLabel(`${z > 0 ? '+' : ''}${z}m`, modeHex);
    lbl.scale.set(0.9, 0.18, 1);
    lbl.position.set(roomHalf - 0.3, 0.04, z);
    group.add(lbl);
  }

  // Origin marker
  const originLbl = makeDimLabel('0,0', modeHex);
  originLbl.scale.set(0.8, 0.18, 1);
  originLbl.position.set(0.3, 0.04, 0.3);
  group.add(originLbl);

  // Wall height ruler on left wall (vertical ticks at 0.5m intervals)
  const wallX = -roomHalf + 0.05;
  for (let y = 0; y <= 3.5; y += 0.5) {
    // tick line
    const pts = [new THREE.Vector3(wallX, y, -roomHalf + 0.02), new THREE.Vector3(wallX + 0.25, y, -roomHalf + 0.02)];
    const tick = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: gridColor, transparent: true, opacity: 0.5, depthTest: false }));
    tick.renderOrder = 1101;
    group.add(tick);
    // label every 1m
    if (y % 1 === 0) {
      const lbl = makeDimLabel(`${y.toFixed(0)}m`, modeHex);
      lbl.scale.set(0.7, 0.15, 1);
      lbl.position.set(wallX + 0.55, y, -roomHalf + 0.06);
      group.add(lbl);
    }
  }

  // Vertical ruler line on left wall
  const vRulerPts = [new THREE.Vector3(wallX, 0, -roomHalf + 0.02), new THREE.Vector3(wallX, 3.6, -roomHalf + 0.02)];
  const vRuler = new THREE.Line(new THREE.BufferGeometry().setFromPoints(vRulerPts),
    new THREE.LineBasicMaterial({ color: gridColor, transparent: true, opacity: 0.6, depthTest: false }));
  vRuler.renderOrder = 1100;
  group.add(vRuler);

  group.visible = false;
  return group;
}

export default function WallVisionScene({ detections, scanMode, isScanning, trailsEnabled = true, heading = 0, selectedDetection: externalSelectedDetection = null, onSelectDetection }) {
  const spatialWorld = useSpatialWorld(detections, heading, true);
  const isMobileDevice = typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);
  const mountRef  = useRef(null);
  const sceneRef  = useRef(null);
  const orientRef = useRef({ alpha: 0, beta: 0, gamma: 0, hasOrientation: false });
  const dragRef   = useRef({ active: false, lastX: 0, lastY: 0, yaw: 0, pitch: 0.1 });
  const rafRef    = useRef(null);
  const headingRef = useRef(heading);
  const spatialMapRef = useRef(new Map());
  const previousFrameRef = useRef(new Map());

  useEffect(() => { headingRef.current = Number.isFinite(heading) ? heading : 0; }, [heading]);

  const [xrayMode, setXrayMode]           = useState(true);
  const [heatmapMode, setHeatmapMode]     = useState(false);
  const [outlineMode, setOutlineMode]     = useState(false);
  const [measureGrid, setMeasureGrid]     = useState(false);
  const heatmapRef                        = useRef(false);
  const outlineModeRef                    = useRef(false);
  const measureGridRef                    = useRef(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [permDenied, setPermDenied]       = useState(false);
  const [selected, setSelected]           = useState(null);
  useEffect(() => { setSelected(externalSelectedDetection || null); }, [externalSelectedDetection]);
  const [useGyro, setUseGyro]             = useState(false);

  const requestOrientation = useCallback(async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm === 'granted') { setHasPermission(true); setUseGyro(true); }
        else setPermDenied(true);
      } catch { setPermDenied(true); }
    } else {
      setHasPermission(true); setUseGyro(true);
    }
  }, []);

  useEffect(() => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission !== 'function') {
      setHasPermission(true);
    }
  }, []);

  useEffect(() => {
    if (!useGyro) return;
    const handler = e => {
      orientRef.current.alpha  = e.alpha  ?? 0;
      orientRef.current.beta   = e.beta   ?? 0;
      orientRef.current.gamma  = e.gamma  ?? 0;
      orientRef.current.hasOrientation = true;
    };
    window.addEventListener('deviceorientation', handler, true);
    return () => window.removeEventListener('deviceorientation', handler, true);
  }, [useGyro]);

  // Keep refs in sync
  useEffect(() => { heatmapRef.current = heatmapMode; }, [heatmapMode]);
  useEffect(() => { outlineModeRef.current = outlineMode; }, [outlineMode]);
  useEffect(() => { measureGridRef.current = measureGrid; }, [measureGrid]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const W = Math.max(320, mount.clientWidth || mount.parentElement?.clientWidth || window.innerWidth);
    const H = Math.max(320, mount.clientHeight || mount.parentElement?.clientHeight || Math.min(window.innerHeight * 0.7, 640));

    // Perf-tuned renderer: antialias off on mobile, capped pixel ratio, no
    // logarithmic depth buffer (unnecessary at this scene scale), high-power
    // GPU hint. Shadows are disabled — no light in this scene casts them, so
    // the shadow pass was pure overhead.
    const isMobile = W < 768 || /Mobi|Android/i.test(navigator.userAgent);
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    } catch (err) {
      console.error('WebGL unavailable:', err);
      mount.innerHTML = `<div style="height:100%;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;font:12px monospace;color:#00ff88;background:#020806"><div><div style="font-size:18px;margin-bottom:8px">3D VIEW UNAVAILABLE</div><div>WebGL could not be initialized on this device/browser.</div><div style="margin-top:8px;opacity:.7">Use the 2D measurement map or enable hardware acceleration.</div></div></div>`;
      return () => { mount.innerHTML = ''; };
    }
    renderer.setSize(W, H);
    // Mobile GPU budget: rendering above 1x device pixels is rarely worth the cost
    // for this instrument view, especially underneath the live camera layer.
    const basePixelRatio = Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5);
    renderer.setPixelRatio(basePixelRatio);
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = false;
    renderer.sortObjects = true;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07130d);
    renderer.setClearColor(0x07130d, 1);
    // Fail-safe: if any later scene setup throws, keep the canvas visibly alive.
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    scene.fog = new THREE.FogExp2(0x07130d, 0.012);

    const camera = new THREE.PerspectiveCamera(75, W / H, 0.05, 150);
    camera.position.set(0, 1.65, 6);
    camera.aspect = W / H;
    camera.lookAt(0, 0.8, 0);
    camera.near = 0.01;
    camera.far = 500;
    camera.updateProjectionMatrix();

    scene.add(new THREE.AmbientLight(0x001a0d, 0.7));
    scene.add(new THREE.HemisphereLight(0x002010, 0x000000, 0.5));
    const sun = new THREE.DirectionalLight(0x00ff88, 0.4);
    sun.position.set(0, 20, 0); scene.add(sun);

    const modeColor = { sonar: 0x00ff88, thermal: 0xff6633, motion: 0x00ccff }[scanMode] ?? 0x00ff88;
    const modeHex   = `#${modeColor.toString(16).padStart(6, '0')}`;

    // Floor
    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0x040e08, roughness: 0.98 })
    );
    floorMesh.rotation.x = -Math.PI / 2;
    scene.add(floorMesh);
    const grid = new THREE.GridHelper(24, 48, modeColor, 0x00ff8810);
    grid.position.y = 0.005; scene.add(grid);

    // No assumed room, wall, ceiling, or furniture geometry is rendered.
    // This scene is intentionally an instrument view: only the phone origin,
    // measurement reference grid, measured coverage, and sensor observations
    // are allowed to represent physical space.

    // Sonar pulse rings
    const pulseRings = Array.from({ length: 4 }).map((_, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.3, 0.03, 6, isMobile ? 32 : 48),
        new THREE.MeshBasicMaterial({ color: modeColor, transparent: true, opacity: 0.5 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.05;
      ring.userData.phase = (i / 6) * Math.PI * 2;
      scene.add(ring);
      return ring;
    });

    // ── Volumetric radar dome (inspired by OpenStorm's volumetric ray-marching) ──
    // A translucent hemisphere with a custom GPU shader that renders a rotating
    // volumetric sweep — bright at the leading edge, fading behind, attenuated
    // by height and radial distance. GPU-composited so it costs nothing on the
    // JS side per frame.
    const domeMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uSweepAngle: { value: 0 },
        uColor: { value: new THREE.Color(modeColor) },
        uOpacity: { value: 0.5 },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPos;
        uniform float uSweepAngle;
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uTime;
        void main() {
          // azimuth angle in the XZ plane (atan2(z, x))
          float az = atan(vPos.z, vPos.x);
          // signed angular distance from the sweep heading
          float diff = atan(sin(az - uSweepAngle), cos(az - uSweepAngle));
          // bright at the leading edge, exponential falloff behind
          float sweep = exp(-pow(abs(diff), 1.4) * 7.0);
          // a soft leading-edge highlight band
          float lead = smoothstep(0.0, 0.08, abs(diff)) * 0.0;
          // fade with height (strongest near the floor)
          float heightFade = 1.0 - smoothstep(0.0, 3.2, vPos.y);
          // fade with radial distance from sensor
          float r = length(vPos.xz);
          float radialFade = 1.0 - smoothstep(3.5, 6.8, r);
          // subtle radial scanlines for a volumetric texture feel
          float scan = 0.85 + 0.15 * sin(r * 6.0 - uTime * 2.0);
          float alpha = sweep * heightFade * radialFade * uOpacity * scan;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    });
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(7, isMobile ? 32 : 48, isMobile ? 16 : 24, 0, Math.PI * 2, 0, Math.PI / 2),
      domeMat
    );
    dome.position.set(0, 0, 0);
    dome.renderOrder = 2;
    scene.add(dome);

    // ── Signal particle field (point-cloud propagation) ──
    // GPU points that emanate outward from the sensor and fade, giving a
    // volumetric "signal energy" feel without per-frame JS allocation.
    const PARTICLE_COUNT = isMobile ? 160 : 400;
    const pPositions = new Float32Array(PARTICLE_COUNT * 3);
    const pSeeds = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const a = Math.random() * Math.PI * 2;
      pPositions[i * 3] = 0;
      pPositions[i * 3 + 1] = 0;
      pPositions[i * 3 + 2] = 0;
      pSeeds[i] = a;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    pGeo.setAttribute('aSeed', new THREE.BufferAttribute(pSeeds, 1));
    const pMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(modeColor) },
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float aSeed;
        uniform float uTime;
        varying float vFade;
        void main() {
          // each particle cycles outward from origin on its own phase
          float cycle = 3.5;
          float t = mod(uTime * 0.35 + aSeed * 0.77, cycle) / cycle; // 0..1
          float r = t * 6.5;
          float ang = aSeed;
          vec3 pos = vec3(cos(ang) * r, sin(t * 3.14) * 0.4 * (1.0 - t), sin(ang) * r);
          vFade = (1.0 - t) * (1.0 - smoothstep(4.0, 6.5, r));
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = (3.0 * (1.0 - t * 0.7)) * (300.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vFade;
        void main() {
          // round soft point
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float a = (1.0 - smoothstep(0.0, 0.5, d)) * vFade * 0.6;
          gl_FragColor = vec4(uColor, a);
        }
      `,
    });
    const particles = new THREE.Points(pGeo, pMat);
    particles.renderOrder = 3;
    scene.add(particles);

    // Heatmap overlay
    const heatCanvas = document.createElement('canvas');
    heatCanvas.width = 512; heatCanvas.height = 512;
    const heatCtx = heatCanvas.getContext('2d');
    const heatTex = new THREE.CanvasTexture(heatCanvas);
    const heatMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.MeshBasicMaterial({ map: heatTex, transparent: true, opacity: 0.82, depthWrite: false, side: THREE.DoubleSide })
    );
    heatMesh.rotation.x = -Math.PI / 2;
    heatMesh.position.y = 0.012;
    heatMesh.renderOrder = 1;
    heatMesh.visible = false;
    scene.add(heatMesh);

    const updateHeatmap = (dets, visible) => {
      heatMesh.visible = visible;
      if (!visible) return;
      const { width: W2, height: H2 } = heatCanvas;
      heatCtx.clearRect(0, 0, W2, H2);
      const bgGrad = heatCtx.createRadialGradient(W2/2, H2/2, 0, W2/2, H2/2, W2/2);
      bgGrad.addColorStop(0,   'rgba(0,30,60,0.35)');
      bgGrad.addColorStop(1,   'rgba(0,5,15,0.55)');
      heatCtx.fillStyle = bgGrad;
      heatCtx.fillRect(0, 0, W2, H2);
      const worldToCanvas = (wx, wz) => ({
        cx: ((wx + 12) / 24) * W2,
        cy: ((wz + 12) / 24) * H2,
      });
      dets.forEach(d => {
        const pos = polar2cart(d.angle, d.distance, 7);
        const { cx, cy } = worldToCanvas(pos.x, pos.z);
        const intensity = d.intensity / 100;
        const radius = (intensity * 0.18 + 0.08) * W2;
        const grad = heatCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        if (d.type === 'human') {
          grad.addColorStop(0,   `rgba(255,30,30,${0.75 * intensity})`);
          grad.addColorStop(0.4, `rgba(255,120,0,${0.55 * intensity})`);
          grad.addColorStop(0.75,`rgba(255,220,0,${0.3 * intensity})`);
        } else if (d.type === 'animal') {
          grad.addColorStop(0,   `rgba(0,200,255,${0.65 * intensity})`);
          grad.addColorStop(0.5, `rgba(0,100,200,${0.35 * intensity})`);
        } else if (d.type === 'object') {
          grad.addColorStop(0,   `rgba(255,180,0,${0.6 * intensity})`);
          grad.addColorStop(0.5, `rgba(180,100,0,${0.3 * intensity})`);
        } else {
          grad.addColorStop(0,   `rgba(255,0,100,${0.7 * intensity})`);
          grad.addColorStop(0.5, `rgba(150,0,80,${0.35 * intensity})`);
        }
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        heatCtx.fillStyle = grad;
        heatCtx.fillRect(0, 0, W2, H2);
      });
      heatCtx.save();
      heatCtx.strokeStyle = 'rgba(0,255,136,0.06)';
      heatCtx.lineWidth = 1;
      for (let i = 0; i < W2; i += 32) {
        heatCtx.beginPath(); heatCtx.moveTo(i, 0); heatCtx.lineTo(i, H2); heatCtx.stroke();
        heatCtx.beginPath(); heatCtx.moveTo(0, i); heatCtx.lineTo(W2, i); heatCtx.stroke();
      }
      heatCtx.restore();
      heatTex.needsUpdate = true;
    };
    updateHeatmap(detections, false);

    // Detections
    const detObjs = {};
    detections.forEach(d => {
      const pos   = polar2cart(d.angle, d.distance, 7);
      const color = TYPE_COLORS[d.type] ?? 0xffffff;
      const hex   = TYPE_HEX[d.type] ?? '#ffffff';

      let geo;
      if (d.type === 'human')       geo = buildHumanoidGeo();
      else if (d.type === 'animal') geo = new THREE.SphereGeometry(0.3, 10, 10);
      else if (d.type === 'object') geo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
      else                          geo = new THREE.OctahedronGeometry(0.32);

      const mat = new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.8,
        roughness: 0.3, metalness: 0.4, transparent: true, opacity: 0.92,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos.x, 0.7, pos.z);
      mesh.userData = { id: d.id, type: d.type, det: d };
      scene.add(mesh);

      // Head is part of the merged humanoid geometry — no separate head mesh.
      const headMesh = null;

      // X-ray wireframe
      const xrayMat  = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.5, depthTest: false });
      const xrayMesh = new THREE.Mesh(geo, xrayMat);
      xrayMesh.position.copy(mesh.position);
      xrayMesh.renderOrder = 999;
      scene.add(xrayMesh);

      // Halo
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 8, 8),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.05, side: THREE.BackSide, depthTest: false })
      );
      halo.position.copy(mesh.position); halo.renderOrder = 998; scene.add(halo);

      // Ground ring
      const gRing = new THREE.Mesh(
        new THREE.RingGeometry(0.38, 0.55, isMobile ? 20 : 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
      );
      gRing.rotation.x = -Math.PI / 2; gRing.position.set(pos.x, 0.02, pos.z); scene.add(gRing);

      // Signal beam
      const beamMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthTest: false });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.6, 6), beamMat);
      beam.position.set(pos.x, 1.8, pos.z); beam.renderOrder = 997; scene.add(beam);

      // Per-target point lights are expensive on mobile. Keep only a small
      // desktop budget; the emissive materials provide the same visual cue.
      const ptLight = !isMobile && Object.keys(detObjs).length < 4
        ? new THREE.PointLight(color, 0.8, 5)
        : null;
      if (ptLight) {
        ptLight.position.set(pos.x, 1.4, pos.z);
        scene.add(ptLight);
      }

      // Trail line
      const trailPositions = new Float32Array(TRAIL_LEN * 3);
      for (let i = 0; i < TRAIL_LEN; i++) { trailPositions[i*3]=pos.x; trailPositions[i*3+1]=0.05; trailPositions[i*3+2]=pos.z; }
      const tGeo = new THREE.BufferGeometry();
      tGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      tGeo.setDrawRange(0, 1);
      const trail = new THREE.Line(tGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5, depthTest: false }));
      trail.renderOrder = 995;
      scene.add(trail);
      const trailHistory = [new THREE.Vector3(pos.x, 0.05, pos.z)];

      // Ghost wireframe trail
      const ghosts = Array.from({ length: GHOST_COUNT }).map((_, gi) => {
        const gMat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0, depthTest: false });
        const g = new THREE.Mesh(geo.clone(), gMat);
        g.scale.setScalar(0.95 - gi * 0.04);
        g.position.copy(mesh.position);
        g.renderOrder = 994 - gi;
        g.visible = false;
        scene.add(g);
        return g;
      });

      // Label
      const safeDistance = Number.isFinite(Number(d.distance)) ? Number(d.distance) : null;
      const uncertainty = Number.isFinite(Number(d.uncertaintyM)) ? Math.max(0, Number(d.uncertaintyM)) : null;
      const labelText = d.type === 'human'
        ? `HUMAN · ${safeDistance == null ? 'RANGE ?' : `${safeDistance.toFixed(1)}m`}${uncertainty == null ? '' : ` ±${uncertainty.toFixed(1)}m`}`
        : `${String(d.type || 'UNKNOWN').toUpperCase()} · ${safeDistance == null ? 'RANGE ?' : `${safeDistance.toFixed(1)}m`}`;
      const label = makeLabel(labelText, hex);
      label.position.set(pos.x, 1.95, pos.z); scene.add(label);

      // ── Shape outline group ──
      const { group: outlineGroup, edgesMat: outlineEdgesMat } = buildShapeOutline(d.type, color, hex);
      outlineGroup.position.set(pos.x, 0, pos.z);
      scene.add(outlineGroup);

      let uncertaintyRing = null;
      if (d.type === 'human') {
        const radius = uncertainty == null ? 0.35 : Math.max(0.18, Math.min(2.5, uncertainty));
        uncertaintyRing = new THREE.Mesh(
          new THREE.RingGeometry(radius * 0.92, radius, isMobile ? 20 : 32),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthTest: false })
        );
        uncertaintyRing.rotation.x = -Math.PI / 2;
        uncertaintyRing.position.set(pos.x, 0.035, pos.z);
        uncertaintyRing.renderOrder = 1001;
        scene.add(uncertaintyRing);
      }

      detObjs[d.id] = {
        mesh, headMesh, xrayMesh, halo, gRing, beam, ptLight,
        trail, tGeo, trailHistory, ghosts, label, uncertaintyRing,
        outlineGroup, outlineEdgesMat,
        d,
      };
    });

    // Measurement grid
    const measurementGrid = buildMeasurementGrid(modeColor, modeHex);
    scene.add(measurementGrid);

    // Lightweight GPU bloom: makes the radar energy, target halos and scan
    // sweep read as emissive signal rather than flat geometry. Keep the pass
    // deliberately subtle and reduce resolution on phones for free/mobile-safe rendering.
    // Keep the base renderer as the primary path on mobile. Post-processing can
    // fail on constrained WebGL implementations and should never blank the scene.
    let composer = null;
    let bloom = null;
    let postFXHealthy = false;
    // Keep the direct renderer as the primary path on phones. Some mobile WebGL
    // implementations accept post-processing setup but produce a blank frame.
    try {
      if (!isMobile) {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.16, 0.65, 0.9);
        composer.addPass(bloom);
        postFXHealthy = true;
      }
    } catch (err) {
      console.warn('Optional post-processing unavailable; using direct renderer.', err);
      composer = null;
      bloom = null;
    }

    const renderProfile = { level: isMobile ? 1 : 2, samples: 0, frameStart: performance.now(), basePixelRatio };
    sceneRef.current = { scene, camera, renderer, composer, bloom, pulseRings, detObjs, updateHeatmap, measurementGrid, particles, renderProfile };

    // Raycaster for tap
    const raycaster = new THREE.Raycaster();
    const tapMeshes = Object.values(detObjs).map(o => o.mesh);
    const handleTap = (cx, cy) => {
      const rect = mount.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((cx - rect.left) / rect.width) * 2 - 1,
        -((cy - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(tapMeshes);
      const next = hits.length > 0 ? hits[0].object.userData.det : null;
      setSelected(next);
      onSelectDetection?.(next);
    };

    // Drag / touch controls
    const drag = dragRef.current;
    const getP = e => e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
    let tapStart = null;
    const onDown = e => { drag.active = true; drag.lastX = getP(e).x; drag.lastY = getP(e).y; tapStart = getP(e); };
    const onUp = e => {
      if (drag.active && tapStart) {
        const p = e.changedTouches ? { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY } : { x: e.clientX, y: e.clientY };
        if (Math.abs(p.x - tapStart.x) < 8 && Math.abs(p.y - tapStart.y) < 8) handleTap(tapStart.x, tapStart.y);
      }
      drag.active = false; tapStart = null;
    };
    const onMove = e => {
      if (!drag.active || orientRef.current.hasOrientation) return;
      const p = getP(e);
      drag.yaw   -= (p.x - drag.lastX) * 0.003;
      drag.pitch  = Math.max(-0.5, Math.min(0.6, drag.pitch + (p.y - drag.lastY) * 0.003));
      drag.lastX = p.x; drag.lastY = p.y;
    };
    mount.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    mount.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchmove', onMove, { passive: true });

    // Animation loop
    const euler   = new THREE.Euler(0, 0, 0, 'YXZ');
    const q       = new THREE.Quaternion();
    const qScreen = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
    let t = 0;
    let lastHeatmapUpdate = 0;
    let lastDetectionFxUpdate = 0;

    const animate = () => {
      t += 0.016;

      // Autonomous renderer: sample frame time and lower/raise GPU quality without
      // interrupting the scene. This keeps the visualization responsive on phones.
      const rp = sceneRef.current?.renderProfile;
      if (rp && ++rp.samples % 30 === 0) {
        const now = performance.now();
        const avgMs = (now - rp.frameStart) / 30;
        rp.frameStart = now;
        if (avgMs > 25 && rp.level > 0) {
          rp.level -= 1;
          const ratio = rp.level === 0 ? Math.min(rp.basePixelRatio, 0.85) : Math.min(rp.basePixelRatio, 1.15);
          renderer.setPixelRatio(ratio);
          if (composer && typeof composer.setPixelRatio === 'function') composer.setPixelRatio(ratio);
          if (bloom) bloom.strength = rp.level === 0 ? 0.08 : 0.14;
          particles.visible = rp.level > 0;
        } else if (avgMs < 15 && rp.level < 2) {
          rp.level += 1;
          const ratio = rp.level === 2 ? rp.basePixelRatio : Math.min(rp.basePixelRatio, 1.15);
          renderer.setPixelRatio(ratio);
          if (composer && typeof composer.setPixelRatio === 'function') composer.setPixelRatio(ratio);
          if (bloom) bloom.strength = rp.level === 2 ? 0.16 : 0.12;
          particles.visible = true;
        }
      }

      // Camera
      const or = orientRef.current;
      if (or.hasOrientation) {
        euler.set(THREE.MathUtils.degToRad(or.beta ?? 0), THREE.MathUtils.degToRad(or.alpha ?? 0), -THREE.MathUtils.degToRad(or.gamma ?? 0), 'YXZ');
        q.setFromEuler(euler);
        q.multiply(qScreen);
        camera.quaternion.slerp(q, 0.15);
      } else {
        // Stable fallback camera: keep the origin in view when orientation is unavailable.
        camera.position.set(0, 1.65, 6);
        camera.lookAt(0, 0.8, 0);
      }

      // Decorative scan effects are fully dormant when scanning is paused.
      // This removes continuous shader/geometry work while preserving the
      // measured target positions and the underlying sensor stream.
      if (isScanning) {
        pulseRings.forEach(r => {
          const phase = (t * 0.55 + r.userData.phase) % (Math.PI * 2);
          const s = 1 + 10 * (phase / (Math.PI * 2));
          r.scale.set(s, s, s);
          r.material.opacity = Math.max(0, 0.35 * (1 - phase / (Math.PI * 2)));
        });
        dome.visible = true;
        domeMat.uniforms.uSweepAngle.value = t * 0.9;
        domeMat.uniforms.uTime.value = t;
        domeMat.uniforms.uOpacity.value = 0.55;
        pMat.uniforms.uTime.value = t;
        particles.visible = sceneRef.current?.renderProfile?.level !== 0;
      } else {
        pulseRings.forEach(r => { r.material.opacity = 0; });
        dome.visible = false;
        particles.visible = false;
      }

      // Heatmap is a diagnostic texture, not a per-frame display. Update at
      // ~2 Hz only when enabled instead of repeatedly repainting a 512×512 canvas.
      const hmOn = heatmapRef.current;
      if (hmOn && (performance.now() - lastHeatmapUpdate) >= 500) {
        lastHeatmapUpdate = performance.now();
        updateHeatmap(Object.values(detObjs).map(o => o.d), true);
      }
      heatMesh.visible = hmOn;

      const omOn = outlineModeRef.current;

      // Measurement grid visibility
      measurementGrid.visible = measureGridRef.current;

      // Detection presentation. Position updates still arrive through the live
      // detection effect; expensive decorative animation is sampled at ~30 Hz.
      const nowFx = performance.now();
      const updateDetectionFx = isScanning || (nowFx - lastDetectionFxUpdate) >= 33;
      if (updateDetectionFx) lastDetectionFxUpdate = nowFx;
      Object.values(detObjs).forEach((tr, idx) => {
        const { mesh, xrayMesh, halo, gRing, beam, ptLight, trail, tGeo, trailHistory, ghosts, label, uncertaintyRing, outlineGroup, outlineEdgesMat, d } = tr;
        const floatY = isScanning ? 0.7 + Math.sin(t * 1.4 + idx) * 0.07 : 0.7;
        mesh.position.y = floatY;
        xrayMesh.position.set(mesh.position.x, floatY, mesh.position.z);
        halo.position.set(mesh.position.x, floatY, mesh.position.z);
        if (updateDetectionFx) mesh.rotation.y += isScanning ? 0.01 : 0.003;
        xrayMesh.rotation.y = mesh.rotation.y;
        if (tr.headMesh) { tr.headMesh.position.set(mesh.position.x, floatY + 0.82, mesh.position.z); tr.headMesh.rotation.y = mesh.rotation.y; }

        // In outline mode, fade the solid mesh and emphasise the outline
        if (omOn) {
          mesh.material.opacity = 0.15;
          mesh.material.emissiveIntensity = 0.2;
          if (tr.headMesh) { tr.headMesh.material.opacity = 0.15; tr.headMesh.material.emissiveIntensity = 0.2; }
          xrayMesh.material.opacity = 0;
          beam.material.opacity = 0;
          outlineGroup.visible = true;
          outlineGroup.position.set(mesh.position.x, 0, mesh.position.z);
          if (updateDetectionFx) outlineEdgesMat.opacity = isScanning ? 0.7 + 0.3 * Math.sin(t * 2 + idx) : 0.8;
        } else {
          mesh.material.opacity = 0.92;
          if (updateDetectionFx) mesh.material.emissiveIntensity = isScanning ? 0.65 + 0.5 * Math.sin(t * 2.5 + idx) : 0.72;
          if (tr.headMesh) { tr.headMesh.material.opacity = 0.92; tr.headMesh.material.emissiveIntensity = mesh.material.emissiveIntensity; }
          xrayMesh.material.opacity = xrayMode ? (isScanning ? 0.6 + 0.15 * Math.sin(t * 2 + idx) : 0.6) : 0;
          beam.material.opacity = xrayMode ? (isScanning ? 0.22 + 0.08 * Math.sin(t * 1.5 + idx) : 0.22) : 0;
          outlineGroup.visible = false;
        }

        if (ptLight && updateDetectionFx) ptLight.intensity = isScanning ? 0.5 + 0.35 * Math.sin(t * 2 + idx) : 0.55;

        if (d.moving && updateDetectionFx) {
          trailHistory.push(new THREE.Vector3(mesh.position.x, 0.05, mesh.position.z));
          if (trailHistory.length > TRAIL_LEN) trailHistory.shift();
          const pa = tGeo.attributes.position;
          trailHistory.forEach((v, i) => pa.setXYZ(i, v.x, v.y, v.z));
          pa.needsUpdate = true;
          tGeo.setDrawRange(0, trailHistory.length);
          trail.visible = trailsEnabled;
          trail.material.opacity = isScanning ? 0.25 + 0.25 * Math.sin(t * 3 + idx) : 0.25;
          const signalPulse = (d.intensity / 100) * (0.5 + 0.5 * Math.sin(t * 2.8 + idx));
          const step = Math.max(1, Math.floor(trailHistory.length / (GHOST_COUNT + 1)));
          ghosts.forEach((ghost, gi) => {
            const histIdx = trailHistory.length - 2 - gi * step;
            if (histIdx >= 0) {
              const hp = trailHistory[histIdx];
              ghost.position.set(hp.x, mesh.position.y, hp.z);
              ghost.rotation.y = mesh.rotation.y;
              const fadeRatio = 1 - (gi + 1) / (GHOST_COUNT + 1);
              ghost.material.opacity = fadeRatio * 0.55 * signalPulse;
              ghost.visible = true;
            } else {
              ghost.visible = false;
            }
          });
        } else {
          trail.visible = false;
          ghosts.forEach(g => { g.visible = false; });
        }
        if (!trailsEnabled) {
          trail.visible = false;
          ghosts.forEach(g => { g.visible = false; });
        }

        gRing.position.x = mesh.position.x; gRing.position.z = mesh.position.z;
        if (uncertaintyRing) {
          uncertaintyRing.position.x = mesh.position.x;
          uncertaintyRing.position.z = mesh.position.z;
          const u = Number.isFinite(Number(d.uncertaintyM)) ? Math.max(0.18, Math.min(2.5, Number(d.uncertaintyM))) : 0.35;
          uncertaintyRing.scale.setScalar(u / 0.35);
          uncertaintyRing.visible = d.type === 'human';
        }
        label.position.set(mesh.position.x, d.type === 'human' ? 2.35 : 1.95, mesh.position.z);
      });

      try {
        // Keep the diagnostic path independent of post-processing. If the
        // composer is unhealthy, render the raw scene directly.
        const canRawRender = renderer && renderer.domElement && scene && camera;
        if (!canRawRender) throw new Error('Renderer scene/camera unavailable');
        renderer.setViewport(0, 0, W, H);
        renderer.setScissorTest(false);
        renderer.setClearColor(0x07130d, 1);
        renderer.autoClear = true;
        // Desktop uses the optional bloom composer for the highest visual quality;
        // mobile stays on the proven direct renderer to protect frame rate and avoid
        // constrained-WebGL blank frames. Any composer failure falls back immediately.
        if (postFXHealthy && composer) composer.render();
        else renderer.render(scene, camera);
      } catch (err) {
        postFXHealthy = false;
        console.error('Post-processing disabled:', err);
        renderer.render(scene, camera);
      }
    };
    renderer.setAnimationLoop(animate);

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (composer) composer.setSize(w, h);
      if (bloom) bloom.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      renderer.setAnimationLoop(null);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      if (composer) composer.dispose();
      renderer.dispose();
      mount.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
      mount.removeEventListener('touchstart', onDown);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('resize', onResize);
    };
   
  }, [scanMode, xrayMode]);

  // Live-update moving detections
  useEffect(() => {
    const objs = sceneRef.current?.detObjs;
    if (!objs) return;

    // Persistent world-coordinate cache. Detection updates are smoothed into a
    // stable map so the renderer does not visually "teleport" targets between scans.
    detections.forEach(d => {
      const np = polar2cart(d.angle, d.distance, 7);
      const prev = spatialMapRef.current.get(d.id);
      const alpha = d.moving ? 0.28 : 0.12;
      const now = performance.now();
      const world = prev
        ? { x: prev.x + (np.x - prev.x) * alpha, y: prev.y ?? 0, z: prev.z + (np.z - prev.z) * alpha, lastSeen: now }
        : { x: np.x, y: 0, z: np.z, lastSeen: now };
      const prior = previousFrameRef.current.get(d.id);
      const dt = prior ? Math.max(0.05, (now - prior.t) / 1000) : null;
      const vx = prior && dt ? (world.x - prior.x) / dt : 0;
      const vz = prior && dt ? (world.z - prior.z) / dt : 0;
      const speed = Math.hypot(vx, vz);
      const headingDeg = speed > 0.05 ? ((Math.atan2(vz, vx) * 180 / Math.PI) + 360) % 360 : null;
      previousFrameRef.current.set(d.id, { x: world.x, z: world.z, t: now });
      spatialMapRef.current.set(d.id, { ...world, vx, vz, speed, headingDeg });

      const tr = objs[d.id];
      if (!tr) return;
      tr.mesh.position.y = Number.isFinite(Number(d.height)) ? Math.max(0.1, Number(d.height) * 0.5) : tr.mesh.position.y;
      tr.mesh.position.x = world.x;
      tr.mesh.position.z = world.z;
      if (tr.headMesh) { tr.headMesh.position.x = world.x; tr.headMesh.position.z = world.z; }
      if (tr.label) tr.label.position.set(world.x, (Number.isFinite(Number(d.height)) ? Math.max(1.8, Number(d.height) + 0.25) : 2.35), world.z);
      if (tr.gRing) tr.gRing.position.set(world.x, 0.03, world.z);
      if (tr.beam) tr.beam.position.set(world.x, 1.8, world.z);
      if (tr.ptLight) tr.ptLight.position.set(world.x, 1.1, world.z);
      if (tr.uncertaintyRing) tr.uncertaintyRing.position.set(world.x, 0.035, world.z);
      if (tr.uncertaintyRing) {
        tr.uncertaintyRing.position.x = world.x;
        tr.uncertaintyRing.position.z = world.z;
      }
      if (tr.poseGroup) {
        tr.poseGroup.position.x = world.x;
        tr.poseGroup.position.z = world.z;
        const kp = Array.isArray(d._keypoints) ? d._keypoints : [];
        const box = d._box;
        const hasBox = box && Number(box.w) > 0 && Number(box.h) > 0 && Number(box.vw) > 0 && Number(box.vh) > 0;
        tr.poseGroup.visible = d.type === 'human' && hasBox && kp.length > 0;
        if (tr.poseGroup.visible) {
          tr.poseGroup.children.forEach(line => {
            const pair = line.userData.posePair;
            const a = pair ? kp[pair[0]] : null;
            const b = pair ? kp[pair[1]] : null;
            if (!a || !b) { line.visible = false; return; }
            const ax = (Number(a.x) - Number(box.x) / Number(box.vw)) / (Number(box.w) / Number(box.vw));
            const ay = (Number(a.y) - Number(box.y) / Number(box.vh)) / (Number(box.h) / Number(box.vh));
            const bx = (Number(b.x) - Number(box.x) / Number(box.vw)) / (Number(box.w) / Number(box.vw));
            const by = (Number(b.y) - Number(box.y) / Number(box.vh)) / (Number(box.h) / Number(box.vh));
            const p = line.geometry.attributes.position.array;
            p[0] = (ax - 0.5) * 0.9; p[1] = (1 - ay) * 1.55; p[2] = 0.01;
            p[3] = (bx - 0.5) * 0.9; p[4] = (1 - by) * 1.55; p[5] = 0.01;
            line.geometry.attributes.position.needsUpdate = true;
            line.visible = (Number(a.score) || 0) >= 0.2 && (Number(b.score) || 0) >= 0.2;
          });
        }
      }
      tr.d = { ...d, derivedTrack: {
        speedMps: speed,
        headingDeg,
        ageMs: 0,
        lastSeenAt: now,
      }};
    });

    // Retain a bounded spatial history instead of allowing stale targets to grow forever.
    const cutoff = performance.now() - 30000;
    spatialMapRef.current.forEach((v, id) => {
      if (v.lastSeen < cutoff) spatialMapRef.current.delete(id);
    });
    previousFrameRef.current.forEach((v, id) => {
      if (v.t < cutoff) previousFrameRef.current.delete(id);
    });
  }, [detections]);

  // Create/remove live target geometry as detections appear after the Three.js
  // scene has already mounted. The previous implementation only created target
  // meshes during scene initialization, so newly detected people could exist in
  // React state while never appearing in Live 3D.
  useEffect(() => {
    const runtime = sceneRef.current;
    if (!runtime?.scene || !runtime?.detObjs) return;

    const { scene, detObjs } = runtime;
    const liveIds = new Set(detections.map(d => String(d.id)));

    detections.forEach(d => {
      const id = String(d.id);
      if (detObjs[id]) {
        // Existing targets stay attached to the same track ID; update metadata
        // without recreating geometry, preserving visual continuity.
        detObjs[id].d = d;
        return;
      }

      const angle = Number.isFinite(Number(d.angle))
        ? Number(d.angle)
        : (Number.isFinite(Number(d.cx)) ? (((0.5 - Number(d.cx)) * 90) + 360) % 360 : 0);
      const distance = Number.isFinite(Number(d.distance)) ? Number(d.distance) : null;
      if (distance == null) return;

      const pos = polar2cart(angle, distance, 7);
      const isHuman = d.type === 'human';
      const color = isHuman ? 0x00ff88 : d.type === 'animal' ? 0x00ccff : d.type === 'object' ? 0xffaa00 : 0xff4466;
      const geo = isHuman ? buildHumanoidGeo() : d.type === 'animal'
        ? new THREE.SphereGeometry(0.3, 10, 10)
        : d.type === 'object' ? new THREE.BoxGeometry(0.55, 0.55, 0.55)
        : new THREE.OctahedronGeometry(0.32);

      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.8, roughness: 0.35, metalness: 0.15,
        transparent: true, opacity: 0.92, depthWrite: false
      }));
      mesh.position.set(pos.x, 0.7, pos.z);

      const xrayMesh = new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({
        color, wireframe: true, transparent: true, opacity: 0, depthTest: false
      }));
      xrayMesh.position.copy(mesh.position);

      const halo = new THREE.Mesh(new THREE.SphereGeometry(isHuman ? 0.65 : 0.5, 8, 8), new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.06, side: THREE.BackSide, depthTest: false
      }));
      halo.position.copy(mesh.position);

      const gRing = new THREE.Mesh(new THREE.RingGeometry(isHuman ? 0.38 : 0.3, isHuman ? 0.55 : 0.45, isMobileDevice ? 20 : 32), new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.45, side: THREE.DoubleSide
      }));
      gRing.rotation.x = -Math.PI / 2;
      gRing.position.set(pos.x, 0.03, pos.z);

      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.6, 6), new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.18, depthTest: false
      }));
      beam.position.set(pos.x, 1.8, pos.z);

      // Dynamic targets can arrive after mount. Do not create an unbounded
      // light-per-target budget; emissive materials already provide the cue.
      const existingLightCount = Object.values(detObjs).filter(o => o.ptLight).length;
      const ptLight = !isMobileDevice && existingLightCount < 4
        ? new THREE.PointLight(color, 0.8, 5)
        : null;
      if (ptLight) ptLight.position.set(pos.x, 1.1, pos.z);

      const trailPositions = new Float32Array(TRAIL_LEN * 3);
      const tGeo = new THREE.BufferGeometry();
      tGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      tGeo.setDrawRange(0, 0);
      const trail = new THREE.Line(tGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5, depthTest: false }));

      const uncertaintyRing = isHuman
        ? new THREE.Mesh(new THREE.RingGeometry(0.32, 0.38, isMobileDevice ? 20 : 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthTest: false }))
        : null;
      if (uncertaintyRing) {
        uncertaintyRing.rotation.x = -Math.PI / 2;
        uncertaintyRing.position.set(pos.x, 0.035, pos.z);
      }

      const outlineGroup = new THREE.Group();
      const outlineEdgesMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8, depthTest: false });
      const outlineEdges = new THREE.LineSegments(new THREE.EdgesGeometry(geo.clone()), outlineEdgesMat);

      // Camera pose keypoints are rendered as a local 3D overlay. Their vertical
      // placement is derived from the image bounding box; this is visualization
      // of measured pose landmarks, not a claim of independent depth sensing.
      const poseGroup = new THREE.Group();
      const poseMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, depthTest: false });
      const poseEdges = [[5,6],[5,7],[7,9],[6,8],[8,10],[5,11],[6,12],[11,12],[11,13],[13,15],[12,14],[14,16]];
      if (isHuman && Array.isArray(d._keypoints) && d._keypoints.length) {
        poseEdges.forEach(([a,b]) => {
          const lineGeo = new THREE.BufferGeometry();
          lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
          const line = new THREE.Line(lineGeo, poseMat);
          line.userData.posePair = [a,b];
          poseGroup.add(line);
        });
      }
      poseGroup.position.set(pos.x, 0.7, pos.z);
      outlineGroup.add(outlineEdges);
      outlineGroup.position.set(pos.x, 0.7, pos.z);
      outlineGroup.visible = false;

      const label = makeLabel(
        isHuman ? `${d.displayId || 'PERSON'} · ${String(d.source || 'CAMERA').toUpperCase()}` : `${String(d.displayId || d.type || 'UNKNOWN').toUpperCase()} · ${String(d.source || 'CAMERA').toUpperCase()}`,
        `#${color.toString(16).padStart(6, '0')}`
      );
      label.position.set(pos.x, isHuman ? 2.35 : 1.95, pos.z);

      scene.add(mesh, xrayMesh, halo, gRing, beam, trail, label, outlineGroup, poseGroup);
      if (ptLight) scene.add(ptLight);
      if (uncertaintyRing) scene.add(uncertaintyRing);

      detObjs[id] = {
        d, mesh, xrayMesh, halo, gRing, beam, ptLight, trail, tGeo,
        trailHistory: [new THREE.Vector3(pos.x, 0.05, pos.z)],
        ghosts: [], label, uncertaintyRing, outlineGroup, outlineEdgesMat, poseGroup
      };
    });

    // Remove targets that are no longer present in the current live stream.
    Object.entries(detObjs).forEach(([id, tr]) => {
      if (liveIds.has(id)) return;
      [tr.mesh, tr.xrayMesh, tr.halo, tr.gRing, tr.beam, tr.ptLight, tr.trail, tr.label, tr.uncertaintyRing, tr.outlineGroup, tr.poseGroup]
        .filter(Boolean)
        .forEach(obj => scene.remove(obj));
      delete detObjs[id];
    });
  }, [detections]);

  const isIOS = typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-border/50" style={{ minHeight: 440 }}>
      <div ref={mountRef} className="w-full h-full" style={{ touchAction: 'none' }} />

      {/* Top HUD */}
      <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
        <div className="bg-black/70 backdrop-blur-md rounded-xl px-3 py-2 border border-white/8">
          <div className="font-display text-[9px] tracking-[0.2em] text-primary mb-0.5">ENVIRONMENT SCAN</div>
          <div className="font-mono text-[8px] text-muted-foreground">
            {orientRef.current.hasOrientation ? '📡 Gyro active' : '👆 Drag to look'} · {Math.round(spatialWorld.stats.confidence * 100)}% map confidence
          </div>
          <div className="font-mono text-[8px] text-muted-foreground">{detections.length} observations · {scanMode} · TRACKED {spatialWorld.stats.tracked}</div>
          <div className="font-mono text-[8px] mt-1" style={{ color: detections.filter(d => d.type === 'human').length ? '#00ff88' : 'rgba(255,255,255,0.45)' }}>
            HUMANS {detections.filter(d => d.type === 'human').length} · LIVE 3D {detections.length ? 'ACTIVE' : 'WAITING FOR REAL INPUT'}
          </div>
          <div className="font-mono text-[7px] text-primary/70 mt-1">MEASURED SPACE ONLY · CAMERA DEPTH ESTIMATES LABELED · NO SYNTHETIC TARGETS</div>
        </div>
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          <button onClick={() => setXrayMode(v => !v)}
            className="flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-xl px-3 py-2.5 border transition-all"
            style={{ borderColor: xrayMode ? '#00ff8850' : '#ffffff15' }}>
            {xrayMode
              ? <Eye className="w-4 h-4" style={{ color: '#00ff88' }} />
              : <EyeOff className="w-4 h-4 text-muted-foreground" />}
            <span className="font-mono text-[9px]" style={{ color: xrayMode ? '#00ff88' : '#ffffff60' }}>
              X-RAY {xrayMode ? 'ON' : 'OFF'}
            </span>
          </button>
          <button onClick={() => setHeatmapMode(v => !v)}
            className="flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-xl px-3 py-2.5 border transition-all"
            style={{ borderColor: heatmapMode ? '#ff660050' : '#ffffff15' }}>
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" style={{ color: heatmapMode ? '#ff6600' : '#ffffff40' }}>
              <circle cx="8" cy="8" r="3.5" fill="currentColor" opacity="0.9"/>
              <circle cx="8" cy="8" r="6"   stroke="currentColor" strokeWidth="1" opacity="0.5"/>
              <circle cx="8" cy="8" r="8"   stroke="currentColor" strokeWidth="0.7" opacity="0.25"/>
            </svg>
            <span className="font-mono text-[9px]" style={{ color: heatmapMode ? '#ff6600' : '#ffffff60' }}>
              HEATMAP {heatmapMode ? 'ON' : 'OFF'}
            </span>
          </button>
          {/* Shape Outline toggle */}
          <button onClick={() => setOutlineMode(v => !v)}
            className="flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-xl px-3 py-2.5 border transition-all"
            style={{ borderColor: outlineMode ? '#a78bfa50' : '#ffffff15' }}>
            <Scan className="w-4 h-4" style={{ color: outlineMode ? '#a78bfa' : '#ffffff40' }} />
            <span className="font-mono text-[9px]" style={{ color: outlineMode ? '#a78bfa' : '#ffffff60' }}>
              ENVELOPE {outlineMode ? 'ON' : 'OFF'}
            </span>
          </button>
          {/* Measurement grid toggle */}
          <button onClick={() => setMeasureGrid(v => !v)}
            className="flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-xl px-3 py-2.5 border transition-all"
            style={{ borderColor: measureGrid ? '#38bdf850' : '#ffffff15' }}>
            <Ruler className="w-4 h-4" style={{ color: measureGrid ? '#38bdf8' : '#ffffff40' }} />
            <span className="font-mono text-[9px]" style={{ color: measureGrid ? '#38bdf8' : '#ffffff60' }}>
              MEASURE {measureGrid ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      </div>

      {/* Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-8 h-8">
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-primary/30" />
          <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-primary/30" />
          <div className="absolute inset-[6px] rounded-full border border-primary/30" />
        </div>
      </div>

      {/* Outline mode banner */}
      <AnimatePresence>
        {outlineMode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="flex items-center gap-2 bg-black/80 backdrop-blur-sm rounded-full px-3 py-1.5 border"
              style={{ borderColor: '#a78bfa40' }}>
              <Scan className="w-3 h-3" style={{ color: '#a78bfa' }} />
              <span className="font-mono text-[9px]" style={{ color: '#a78bfa' }}>VISUAL ENVELOPE — DEFAULT DIMENSIONS · NOT MEASURED BODY GEOMETRY</span>
            </div>
          </motion.div>
        )}
        {measureGrid && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="absolute top-14 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="flex items-center gap-2 bg-black/80 backdrop-blur-sm rounded-full px-3 py-1.5 border"
              style={{ borderColor: '#38bdf840' }}>
              <Ruler className="w-3 h-3" style={{ color: '#38bdf8' }} />
              <span className="font-mono text-[9px]" style={{ color: '#38bdf8' }}>REFERENCE GRID — 1m SESSION COORDINATE INTERVALS · NOT SURVEYED GEOMETRY</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS permission */}
      {isIOS && !hasPermission && !permDenied && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-center space-y-4 px-6">
            <Smartphone className="w-12 h-12 mx-auto text-primary" />
            <div>
              <div className="font-display text-sm tracking-wider text-foreground mb-2">ENABLE PHONE ORIENTATION</div>
              <div className="font-mono text-[11px] text-muted-foreground">
                Tilt your phone to look around the environment. Allow motion access to use gyro controls.
              </div>
            </div>
            <button onClick={requestOrientation}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-display text-[11px] tracking-wider">
              ALLOW MOTION ACCESS
            </button>
            <div>
              <button onClick={() => setHasPermission(true)}
                className="font-mono text-[10px] text-muted-foreground underline underline-offset-2">
                Use drag controls instead
              </button>
            </div>
          </div>
        </div>
      )}

      {permDenied && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2 bg-destructive/20 border border-destructive/40 rounded-xl px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
            <span className="font-mono text-[9px] text-destructive">Motion denied — using drag controls</span>
          </div>
        </div>
      )}

      {!isIOS && !useGyro && (
        <button onClick={requestOrientation}
          className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/70 backdrop-blur-sm border border-primary/40 rounded-xl px-3 py-2.5 transition-all hover:border-primary/70">
          <Smartphone className="w-4 h-4 text-primary" />
          <span className="font-mono text-[9px] text-primary">USE GYRO</span>
        </button>
      )}

      {/* Scan status */}
      <div className="absolute bottom-4 left-3">
        <div className="flex items-center gap-2 bg-black/65 backdrop-blur-sm rounded-xl px-3 py-2 border border-border/40">
          <motion.div className="w-2 h-2 rounded-full bg-primary"
            animate={isScanning ? { opacity: [1, 0.2, 1], scale: [1, 1.4, 1] } : { opacity: 0.3 }}
            transition={{ duration: 1.1, repeat: Infinity }} />
          <span className="font-mono text-[9px]" style={{ color: isScanning ? '#00ff88' : '#ffffff40' }}>
            {isScanning ? 'LIVE' : 'PAUSED'}
          </span>
          <span className="font-mono text-[8px] text-muted-foreground">{scanMode.toUpperCase()}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-14 left-3 flex flex-col gap-1 pointer-events-none">
        {Object.entries({ Human: '#00ff88', Animal: '#00ccff', Object: '#ffaa00', Unknown: '#ff4466' }).map(([l, c]) => (
          <div key={l} className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-md px-2 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: c, boxShadow: `0 0 4px ${c}` }} />
            <span className="font-mono text-[8px]" style={{ color: c }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Selected target */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[320px] max-w-[90vw]">
            <div className="rounded-2xl border bg-black/85 backdrop-blur-xl shadow-2xl overflow-hidden"
              style={{ borderColor: `${TYPE_HEX[selected.type] ?? '#fff'}40` }}>
              <div className="flex items-center justify-between px-4 py-2.5 border-b"
                style={{ borderColor: `${TYPE_HEX[selected.type]}20`, background: `${TYPE_HEX[selected.type]}08` }}>
                <div className="flex items-center gap-2">
                  <Target className="w-3.5 h-3.5" style={{ color: TYPE_HEX[selected.type] }} />
                  <span className="font-display text-[10px] tracking-wider" style={{ color: TYPE_HEX[selected.type] }}>
                    {selected.type.toUpperCase()} — {Number.isFinite(Number(selected.distance)) ? `${Number(selected.distance).toFixed(1)}m` : 'RANGE ?'}
                  </span>
                </div>
                <button onClick={() => { setSelected(null); onSelectDetection?.(null); }} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  {[
                    { label: 'BEARING',  val: `${Math.round(selected.angle)}°` },
                    { label: 'VELOCITY', val: `${selected.speed ?? 0} m/s` },
                    { label: 'SIGNAL',   val: `${selected.intensity}%` },
                  ].map(s => (
                    <div key={s.label} className="py-2 rounded-lg bg-white/5 border border-white/5">
                      <div className="font-mono text-[10px] font-bold text-foreground">{s.val}</div>
                      <div className="font-mono text-[8px] text-muted-foreground">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-muted-foreground" />
                  <span className="font-mono text-[8px] text-muted-foreground tracking-wider">WALL COMPOSITION</span>
                </div>
                {selected.wallLayers?.map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-mono text-[8px] text-muted-foreground w-24 truncate">{l.material}</span>
                    <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${l.density}%`, background: TYPE_HEX[selected.type], opacity: 0.6 }} />
                    </div>
                    <span className="font-mono text-[8px] text-foreground w-10 text-right">{l.thickness}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
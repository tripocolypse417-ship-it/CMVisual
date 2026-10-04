import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers3, Wifi, ScanLine } from 'lucide-react';

const TYPE_HEX = { human: '#00ff88', animal: '#00ccff', object: '#ffaa00', unknown: '#ff4466' };
const TYPE_COLORS = { human: 0x00ff88, animal: 0x00ccff, object: 0xffaa00, unknown: 0xff4466 };

// Room geometry: walls, floor, furniture — returns arrays of sample points
function sampleRoomPoints() {
  // No fabricated room geometry. The point cloud is populated only from
  // measurements supplied by real sensors/detections.
  return [];
}

// Convert polar detection to world XZ
function polar2cart(angleDeg, distPct, scale = 7) {
  const rad = (angleDeg * Math.PI) / 180;
  const r   = (distPct / 100) * scale;
  return { x: r * Math.cos(rad), z: r * Math.sin(rad) };
}

// Render-only uncertainty envelope around a measured detection. These points
// visualize the observation volume; they are not measured surface points.
function sampleDetectionPoints(d, count = 120) {
  const { x, z } = polar2cart(d.angle, d.distance);
  const pts = [];
  const dims = d.type === 'human'
    ? { rx: 0.28, ry: 0.9, rz: 0.22, baseY: 0.05 }
    : d.type === 'animal'
    ? { rx: 0.38, ry: 0.32, rz: 0.5, baseY: 0.1 }
    : d.type === 'object'
    ? { rx: 0.42, ry: 0.42, rz: 0.42, baseY: 0.05 }
    : { rx: 0.35, ry: 0.55, rz: 0.35, baseY: 0.05 };

  const hex = TYPE_HEX[d.type] ?? '#ffffff';
  const cr = parseInt(hex.slice(1,3),16)/255;
  const cg = parseInt(hex.slice(3,5),16)/255;
  const cb = parseInt(hex.slice(5,7),16)/255;

  // Deterministic lattice: this is a visualization of the observation
  // envelope, never a generated measurement or synthetic surface.
  const side = Math.max(2, Math.ceil(Math.cbrt(count)));
  for (let ix = 0; ix < side; ix++) for (let iy = 0; iy < side; iy++) for (let iz = 0; iz < side; iz++) {
    if (pts.length >= count) break;
    const nx = side === 1 ? 0 : (ix / (side - 1)) * 2 - 1;
    const ny = side === 1 ? 0 : (iy / (side - 1)) * 2 - 1;
    const nz = side === 1 ? 0 : (iz / (side - 1)) * 2 - 1;
    pts.push({
      x: x + nx * dims.rx,
      y: dims.baseY + (ny + 1) * dims.ry,
      z: z + nz * dims.rz,
      r: cr, g: cg, b: cb,
      intensity: Number(d.intensity ?? 0) / 100,
    });
  }
  return pts;
}

export default function PointCloudView({ detections, scanMode, isScanning }) {
  const mountRef      = useRef(null);
  const sceneRef      = useRef(null);
  const rafRef        = useRef(null);
  const dragRef       = useRef({ active: false, lastX: 0, lastY: 0, azimuth: 0.4, elevation: 0.55, radius: 11 });
  const detPtsRef     = useRef({});

  const [pointCount, setPointCount]   = useState(0);
  const [meshMode, setMeshMode]       = useState(false);
  const [densityLevel, setDensityLevel] = useState('medium'); // low / medium / high
  const meshModeRef    = useRef(false);
  const densityRef     = useRef('medium');

  useEffect(() => { meshModeRef.current = meshMode; }, [meshMode]);
  useEffect(() => { densityRef.current = densityLevel; }, [densityLevel]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const W = mount.clientWidth || 800, H = mount.clientHeight || 500;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010a05);
    scene.fog = new THREE.FogExp2(0x010a05, 0.018);

    const camera = new THREE.PerspectiveCamera(60, W / H, 0.05, 100);

    // Ambient + directional for when mesh mode is on
    scene.add(new THREE.AmbientLight(0x002010, 1.2));
    const dirLight = new THREE.DirectionalLight(0x00ff88, 0.6);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    const modeColor = { sonar: 0x00ff88, thermal: 0xff6633, motion: 0x00ccff }[scanMode] ?? 0x00ff88;

    // Grid
    const grid = new THREE.GridHelper(10, 20, modeColor, 0x00ff8808);
    grid.position.y = 0.002;
    scene.add(grid);

    // ── Static room point cloud ──
    const roomPts = sampleRoomPoints();
    const roomPositions = new Float32Array(roomPts.length * 3);
    const roomColors    = new Float32Array(roomPts.length * 3);
    roomPts.forEach((p, i) => {
      roomPositions[i*3]   = p.x; roomPositions[i*3+1] = p.y; roomPositions[i*3+2] = p.z;
      roomColors[i*3]   = p.r; roomColors[i*3+1] = p.g; roomColors[i*3+2] = p.b;
    });
    const roomGeo = new THREE.BufferGeometry();
    roomGeo.setAttribute('position', new THREE.BufferAttribute(roomPositions, 3));
    roomGeo.setAttribute('color',    new THREE.BufferAttribute(roomColors, 3));
    const roomMat = new THREE.PointsMaterial({ vertexColors: true, size: 0.045, sizeAttenuation: true, transparent: true, opacity: 0.75 });
    const roomCloud = new THREE.Points(roomGeo, roomMat);
    scene.add(roomCloud);

    // Thin mesh overlay for room (triangulated quad strips on floor + walls)
    const buildRoomMesh = () => {
      const group = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0x00ff88, wireframe: true, transparent: true, opacity: 0.06 });
      // floor
      const fGeo = new THREE.PlaneGeometry(9, 9, 18, 18);
      const fm = new THREE.Mesh(fGeo, mat.clone()); fm.rotation.x = -Math.PI/2; fm.position.y = 0.003;
      group.add(fm);
      // walls
      [[0,-4.5,0,0],[0,4.5,Math.PI,0],[-4.5,0,Math.PI/2,0],[4.5,0,-Math.PI/2,0]].forEach(([x,z,ry]) => {
        const wGeo = new THREE.PlaneGeometry(9, 3.6, 12, 8);
        const wm = new THREE.Mesh(wGeo, mat.clone());
        wm.position.set(x, 1.8, z); wm.rotation.y = ry;
        group.add(wm);
      });
      group.visible = false;
      scene.add(group);
      return group;
    };
    const roomMeshGroup = buildRoomMesh();

    // ── Detection point cloud containers ──
    const detectionClouds = {}; // id → { points: Points, meshes: Mesh[], group: Group }
    const rebuildDetectionCloud = (d) => {
      // Remove old
      if (detectionClouds[d.id]) {
        scene.remove(detectionClouds[d.id].group);
        detectionClouds[d.id].group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      }

      const density = densityRef.current;
      const count = density === 'high' ? 220 : density === 'low' ? 60 : 130;
      const pts = sampleDetectionPoints(d, count);
      const col = TYPE_COLORS[d.type] ?? 0xffffff;
      const hex = TYPE_HEX[d.type] ?? '#ffffff';

      const group = new THREE.Group();

      // Points
      const posArr = new Float32Array(pts.length * 3);
      const colArr = new Float32Array(pts.length * 3);
      pts.forEach((p, i) => { posArr[i*3]=p.x; posArr[i*3+1]=p.y; posArr[i*3+2]=p.z; colArr[i*3]=p.r; colArr[i*3+1]=p.g; colArr[i*3+2]=p.b; });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
      geo.setAttribute('color',    new THREE.BufferAttribute(colArr, 3));
      const pMat = new THREE.PointsMaterial({ vertexColors: true, size: 0.07, sizeAttenuation: true, transparent: true, opacity: 0.9 });
      const cloud = new THREE.Points(geo, pMat);
      group.add(cloud);

      // Estimated envelope only. The browser has no measured 3D surface here,
      // so this mesh must never be presented as a reconstructed physical surface.
      let meshGeo;
      if (d.type === 'human') {
        meshGeo = new THREE.CapsuleGeometry(0.26, 0.95, 5, 10);
      } else if (d.type === 'animal') {
        meshGeo = new THREE.SphereGeometry(0.35, 10, 8);
        meshGeo.scale(1, 0.7, 1.4);
      } else if (d.type === 'object') {
        meshGeo = new THREE.BoxGeometry(0.82, 0.82, 0.82);
      } else {
        meshGeo = new THREE.OctahedronGeometry(0.45);
      }
      const { x, z } = polar2cart(d.angle, d.distance);
      const baseY = d.type === 'human' ? 0.9 : d.type === 'animal' ? 0.35 : 0.42;
      const meshMat = new THREE.MeshStandardMaterial({
        color: col, emissive: col, emissiveIntensity: 0.4,
        transparent: true, opacity: 0.18, roughness: 0.5, metalness: 0.2, wireframe: false, side: THREE.DoubleSide,
      });
      const meshObj = new THREE.Mesh(meshGeo, meshMat);
      meshObj.position.set(x, baseY, z);
      meshObj.visible = false; // shown in mesh mode
      group.add(meshObj);

      // Wireframe shell over mesh
      const wireMat = new THREE.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: 0.35, depthTest: false });
      const wireObj = new THREE.Mesh(meshGeo.clone(), wireMat);
      wireObj.position.set(x, baseY, z);
      wireObj.visible = false;
      group.add(wireObj);

      // Ground ring
      const ringGeo = new THREE.RingGeometry(0.32, 0.48, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI/2; ring.position.set(x, 0.008, z);
      group.add(ring);

      // Label sprite
      const canvas = document.createElement('canvas');
      canvas.width = 280; canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.roundRect(2,2,276,60,8); ctx.fill();
      ctx.strokeStyle = hex; ctx.lineWidth = 1.5;
      ctx.roundRect(2,2,276,60,8); ctx.stroke();
      ctx.fillStyle = hex; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${d.type.toUpperCase()} · ${d.distance.toFixed(0)}m`, 140, 32);
      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      sprite.scale.set(1.8, 0.4, 1);
      const labelY = d.type === 'human' ? 2.1 : 1.1;
      sprite.position.set(x, labelY, z);
      group.add(sprite);

      scene.add(group);
      detectionClouds[d.id] = { cloud, meshObj, wireObj, ring, sprite, group, pts, posArr };
    };

    // Build initial detection clouds
    detections.forEach(d => rebuildDetectionCloud(d));
    setPointCount(roomPts.length + detections.reduce((a,d) => a + (densityRef.current === 'high' ? 220 : densityRef.current === 'low' ? 60 : 130), 0));

    sceneRef.current = { scene, camera, renderer, roomCloud, roomMeshGroup, detectionClouds, rebuildDetectionCloud, roomMat, dirLight };

    // Drag to orbit
    const drag = dragRef.current;
    const getP = e => e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
    const onDown = e => { drag.active = true; const p = getP(e); drag.lastX = p.x; drag.lastY = p.y; };
    const onUp   = () => { drag.active = false; };
    const onMove = e => {
      if (!drag.active) return;
      const p = getP(e);
      drag.azimuth   -= (p.x - drag.lastX) * 0.005;
      drag.elevation  = Math.max(0.1, Math.min(1.4, drag.elevation + (p.y - drag.lastY) * 0.004));
      drag.lastX = p.x; drag.lastY = p.y;
    };
    const onWheel = e => { drag.radius = Math.max(4, Math.min(20, drag.radius + e.deltaY * 0.02)); };
    mount.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    mount.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    mount.addEventListener('wheel', onWheel, { passive: true });

    // Animation
    let t = 0;
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      t += 0.016;

      // Orbit camera around scene center
      const { azimuth, elevation, radius } = drag;
      camera.position.set(
        radius * Math.sin(elevation) * Math.sin(azimuth),
        radius * Math.cos(elevation) + 0.5,
        radius * Math.sin(elevation) * Math.cos(azimuth)
      );
      camera.lookAt(0, 1, 0);

      const omOn = meshModeRef.current;

      // Toggle room mesh overlay
      roomMeshGroup.visible = omOn;
      roomMat.opacity = omOn ? 0.45 : 0.75;
      roomMat.size    = omOn ? 0.03 : 0.045;

      // Animate detection clouds
      Object.entries(detectionClouds).forEach(([id, obj], idx) => {
        const { cloud, meshObj, wireObj, ring, posArr } = obj;
        const d = detections.find(d2 => String(d2.id) === String(id));
        if (!d) return;

        // Gently float the detection points
        const positions = cloud.geometry.attributes.position;
        const orig = obj.pts;
        for (let i = 0; i < orig.length; i++) {
          positions.setY(i, orig[i].y + Math.sin(t * 1.6 + i * 0.3 + idx) * 0.018);
        }
        positions.needsUpdate = true;

        // Pulse point size
        cloud.material.size = omOn ? 0.04 : (0.065 + 0.025 * Math.sin(t * 2 + idx));
        cloud.material.opacity = omOn ? 0.5 : (0.8 + 0.2 * Math.sin(t * 1.5 + idx));

        // Mesh / wire visibility
        meshObj.visible = omOn;
        wireObj.visible = omOn;
        if (omOn) {
          meshObj.material.emissiveIntensity = 0.3 + 0.2 * Math.sin(t * 2 + idx);
          wireObj.material.opacity = 0.3 + 0.15 * Math.sin(t * 2.5 + idx);
        }

        // Pulse ring
        ring.material.opacity = 0.2 + 0.25 * Math.abs(Math.sin(t * 1.8 + idx));
        ring.scale.setScalar(1 + 0.08 * Math.sin(t * 2 + idx));
      });

      // Do not mutate measured geometry for visual shimmer. Render-only animation
      // is applied to target envelopes/rings above; measured point positions remain stable.
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w/h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
      mount.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
      mount.removeEventListener('touchstart', onDown);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchmove', onMove);
      mount.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
    };
   
  }, [scanMode, densityLevel]);

  // Live-update detection positions
  useEffect(() => {
    const sc = sceneRef.current;
    if (!sc) return;
    detections.forEach(d => {
      const obj = sc.detectionClouds[d.id];
      if (!obj || !d.moving) return;
      const { x, z } = polar2cart(d.angle, d.distance);
      const dx = x - obj.pts[0].x, dz = z - obj.pts[0].z;
      // Shift all points
      obj.pts.forEach(p => { p.x += dx; p.z += dz; });
      const positions = obj.cloud.geometry.attributes.position;
      obj.pts.forEach((p, i) => { positions.setX(i, p.x); positions.setZ(i, p.z); });
      positions.needsUpdate = true;
      // Move mesh + wire + ring + label
      const baseY = d.type === 'human' ? 0.9 : d.type === 'animal' ? 0.35 : 0.42;
      obj.meshObj.position.set(x, baseY, z);
      obj.wireObj.position.set(x, baseY, z);
      obj.ring.position.set(x, 0.008, z);
      const labelY = d.type === 'human' ? 2.1 : 1.1;
      obj.sprite.position.set(x, labelY, z);
    });
  }, [detections]);

  const modeColor = { sonar: '#00ff88', thermal: '#ff6633', motion: '#00ccff' }[scanMode] ?? '#00ff88';
  const totalPts = pointCount > 0 ? pointCount : '—';

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden" style={{ minHeight: 440 }}>
      <div ref={mountRef} className="w-full h-full" style={{ touchAction: 'none' }} />

      {/* Top HUD */}
      <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
        <div className="bg-black/70 backdrop-blur-md rounded-xl px-3 py-2 border border-white/8">
          <div className="font-display text-[9px] tracking-[0.2em] mb-0.5" style={{ color: modeColor }}>POINT CLOUD · SPATIAL MESH</div>
          <div className="font-mono text-[8px] text-muted-foreground">🖱 Drag to orbit · Scroll to zoom</div>
          <div className="font-mono text-[8px] text-muted-foreground">{detections.length} detections · ~{typeof totalPts === 'number' ? totalPts.toLocaleString() : totalPts} pts</div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          {/* Mesh toggle */}
          <button onClick={() => setMeshMode(v => !v)}
            className="flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-xl px-3 py-2.5 border transition-all"
            style={{ borderColor: meshMode ? `${modeColor}50` : '#ffffff15' }}>
            <Layers3 className="w-4 h-4" style={{ color: meshMode ? modeColor : '#ffffff40' }} />
            <span className="font-mono text-[9px]" style={{ color: meshMode ? modeColor : '#ffffff60' }}>
              MESH {meshMode ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Density selector */}
          <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md rounded-xl px-2 py-1.5 border border-white/10">
            <ScanLine className="w-3 h-3 text-muted-foreground mr-0.5" />
            {['low','medium','high'].map(lvl => (
              <button key={lvl} onClick={() => setDensityLevel(lvl)}
                className="font-mono text-[8px] px-2 py-1 rounded-lg transition-all"
                style={{
                  background: densityLevel === lvl ? `${modeColor}20` : 'transparent',
                  color: densityLevel === lvl ? modeColor : '#ffffff40',
                  border: densityLevel === lvl ? `1px solid ${modeColor}40` : '1px solid transparent',
                }}>
                {lvl.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live scan pulse indicator */}
      <div className="absolute bottom-4 left-3 flex items-center gap-2 bg-black/65 backdrop-blur-sm rounded-xl px-3 py-2 border border-border/40">
        <motion.div className="w-2 h-2 rounded-full"
          style={{ background: modeColor }}
          animate={isScanning ? { opacity: [1, 0.2, 1], scale: [1, 1.4, 1] } : { opacity: 0.3 }}
          transition={{ duration: 1.1, repeat: Infinity }} />
        <span className="font-mono text-[9px]" style={{ color: isScanning ? modeColor : '#ffffff40' }}>
          {isScanning ? 'LIVE ACQUISITION' : 'PAUSED'}
        </span>
        <span className="font-mono text-[8px] text-muted-foreground">{scanMode.toUpperCase()}</span>
      </div>

      {/* Type legend */}
      <div className="absolute bottom-14 left-3 flex flex-col gap-1 pointer-events-none">
        {Object.entries({ Human: '#00ff88', Animal: '#00ccff', Object: '#ffaa00', Unknown: '#ff4466' }).map(([l, c]) => (
          <div key={l} className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-md px-2 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: c, boxShadow: `0 0 4px ${c}` }} />
            <span className="font-mono text-[8px]" style={{ color: c }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Mesh mode banner */}
      <AnimatePresence>
        {meshMode && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="flex items-center gap-2 bg-black/80 backdrop-blur-sm rounded-full px-3 py-1.5 border"
              style={{ borderColor: `${modeColor}40` }}>
              <Wifi className="w-3 h-3" style={{ color: modeColor }} />
              <span className="font-mono text-[9px]" style={{ color: modeColor }}>ESTIMATED ENVELOPE — NOT A MEASURED SURFACE</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
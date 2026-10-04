import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, Move, Gauge, Layers, Wifi, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const TYPE_COLORS = { human: 0x00ff88, animal: 0x00ccff, object: 0xffaa00, unknown: 0xff4466 };
const TYPE_HEX    = { human: '#00ff88', animal: '#00ccff', object: '#ffaa00', unknown: '#ff4466' };
const TRAIL_LEN   = 60;

function polar2cart(angleDeg, distPct, scale = 8) {
  const rad = (angleDeg * Math.PI) / 180;
  const r = (distPct / 100) * scale;
  return new THREE.Vector3(r * Math.cos(rad), 0, r * Math.sin(rad));
}

function makeSprite(text, color = '#00ff88', alpha = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 320; canvas.height = 80;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 320, 80);
  ctx.fillStyle = `rgba(0,0,0,${alpha * 0.7})`;
  ctx.roundRect(4, 4, 312, 72, 12); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.roundRect(4, 4, 312, 72, 12); ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = 'bold 28px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 160, 40);
  const tex = new THREE.CanvasTexture(canvas);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(2.2, 0.55, 1);
  return spr;
}

export default function RealtimeScene3D({ detections, scanMode, isScanning }) {
  const mountRef    = useRef(null);
  const sceneRef    = useRef(null);
  const detMeshRef  = useRef({});
  const rafRef      = useRef(null);
  const orbRef      = useRef({ theta: 0.5, phi: 0.85, r: 22, tx: 0, ty: 1 });
  const inputRef    = useRef({ dragging: false, last: null, pinchDist: null });
  const [selected, setSelected]   = useState(null);
  const [hovered, setHovered]     = useState(null);

  /* ─── Build scene once ─── */
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const W = mount.clientWidth, H = mount.clientHeight;

    /* Renderer */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.4;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020c07);
    scene.fog = new THREE.FogExp2(0x020c07, 0.032);

    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 200);

    /* Lighting */
    scene.add(new THREE.AmbientLight(0x001a0d, 0.6));
    const sun = new THREE.DirectionalLight(0x00ff88, 0.5);
    sun.position.set(10, 20, 10); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0x001a0d, 0x000000, 0.4));

    const modeColor = { sonar: 0x00ff88, thermal: 0xff6633, motion: 0x00ccff }[scanMode] ?? 0x00ff88;
    const modeHex   = `#${modeColor.toString(16).padStart(6, '0')}`;

    /* Floor */
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 22, 22, 22),
      new THREE.MeshStandardMaterial({ color: 0x040e08, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    scene.add(floor);

    /* Grid */
    const grid = new THREE.GridHelper(22, 44, modeColor, 0x00ff8810);
    grid.position.y = 0.01; scene.add(grid);

    /* Ceiling */
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 22),
      new THREE.MeshStandardMaterial({ color: 0x030809, transparent: true, opacity: 0.4 })
    );
    ceil.rotation.x = Math.PI / 2; ceil.position.y = 3.6; scene.add(ceil);
    const ceilGrid = new THREE.GridHelper(22, 22, 0x00ff8812, 0x00ff8806);
    ceilGrid.position.y = 3.59; scene.add(ceilGrid);

    /* Walls */
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0a1c14, transparent: true, opacity: 0.3, roughness: 0.9 });
    const edgeMat = new THREE.LineBasicMaterial({ color: modeColor, transparent: true, opacity: 0.18 });
    const R = 9, WH = 3.6, WT = 0.25;
    [
      { p: [0, WH/2, -R/2], s: [R, WH, WT] },
      { p: [0, WH/2,  R/2], s: [R, WH, WT] },
      { p: [-R/2, WH/2, 0], s: [WT, WH, R] },
      { p: [ R/2, WH/2, 0], s: [WT, WH, R] },
    ].forEach(({ p, s }) => {
      const g = new THREE.BoxGeometry(...s);
      const m = new THREE.Mesh(g, wallMat); m.position.set(...p); m.receiveShadow = true; scene.add(m);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat); e.position.set(...p); scene.add(e);
    });

    /* Furniture */
    const fMat = new THREE.MeshStandardMaterial({ color: 0x061410, roughness: 0.9, metalness: 0.1, transparent: true, opacity: 0.55 });
    const fEdge = new THREE.LineBasicMaterial({ color: modeColor, transparent: true, opacity: 0.12 });
    [
      { p: [-3.5, 0.4, -3.8], s: [2.5, 0.08, 1.2], label: 'TABLE' },
      { p: [-3.5, 0.2, -3.3], s: [0.1, 0.4, 0.1] }, { p: [-3.5, 0.2, -4.3], s: [0.1, 0.4, 0.1] },
      { p: [-2.4, 0.2, -3.3], s: [0.1, 0.4, 0.1] }, { p: [-2.4, 0.2, -4.3], s: [0.1, 0.4, 0.1] },
      { p: [3.5, 0.3, 3.5], s: [1.8, 0.6, 0.9], label: 'SOFA' },
      { p: [3.5, 0.75, 3.5], s: [1.8, 0.15, 0.22] },
      { p: [-3.5, 0.6, 3.5], s: [1.2, 1.2, 0.15], label: 'DOOR' },
      { p: [0, 0.5, -4.2], s: [0.8, 1.0, 0.8], label: 'CABINET' },
    ].forEach(({ p, s, label }) => {
      const g = new THREE.BoxGeometry(...s);
      const m = new THREE.Mesh(g, fMat); m.position.set(...p); m.receiveShadow = true; scene.add(m);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), fEdge); e.position.set(...p); scene.add(e);
      if (label) {
        const spr = makeSprite(label, modeHex + '88', 0.6);
        spr.position.set(p[0], p[1] + s[1] / 2 + 0.45, p[2]); scene.add(spr);
      }
    });

    /* Sensor origin */
    const originRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.05, 8, 64),
      new THREE.MeshStandardMaterial({ color: modeColor, emissive: modeColor, emissiveIntensity: 2 })
    );
    originRing.rotation.x = Math.PI / 2; scene.add(originRing);

    /* WiFi scan waves */
    const waveRings = Array.from({ length: 5 }).map((_, i) => {
      const r = new THREE.Mesh(
        new THREE.TorusGeometry(0.3, 0.025, 6, 64),
        new THREE.MeshBasicMaterial({ color: modeColor, transparent: true, opacity: 0.5 })
      );
      r.rotation.x = Math.PI / 2; r.userData.phase = (i / 5) * Math.PI * 2; scene.add(r);
      return r;
    });

    /* ── Detection objects with trails ── */
    const trackers = {};
    detections.forEach(d => {
      const pos = polar2cart(d.angle, d.distance, 9);
      const color = TYPE_COLORS[d.type] ?? 0xffffff;

      let geo;
      if      (d.type === 'human')   geo = new THREE.CapsuleGeometry(0.22, 0.95, 6, 12);
      else if (d.type === 'animal')  geo = new THREE.SphereGeometry(0.28, 10, 10);
      else if (d.type === 'object')  geo = new THREE.BoxGeometry(0.52, 0.52, 0.52);
      else                           geo = new THREE.OctahedronGeometry(0.3);

      const mat = new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.7,
        roughness: 0.3, metalness: 0.4, transparent: true, opacity: 0.92,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos.x, 0.65, pos.z);
      mesh.castShadow = true;
      mesh.userData = { id: d.id, type: d.type };
      scene.add(mesh);

      /* Glow halo */
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 8, 8),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.06, side: THREE.BackSide })
      );
      halo.position.copy(mesh.position); scene.add(halo);

      /* Ground ring */
      const gRing = new THREE.Mesh(
        new THREE.RingGeometry(0.35, 0.52, 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
      );
      gRing.rotation.x = -Math.PI / 2; gRing.position.set(pos.x, 0.02, pos.z); scene.add(gRing);

      /* Vertical beam */
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.65, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 })
      );
      beam.position.set(pos.x, 0.32, pos.z); scene.add(beam);

      /* Point light */
      const ptLight = new THREE.PointLight(color, 1.2, 5);
      ptLight.position.set(pos.x, 1.2, pos.z); scene.add(ptLight);

      /* Movement trail */
      const trailPositions = new Float32Array(TRAIL_LEN * 3);
      for (let i = 0; i < TRAIL_LEN; i++) { trailPositions[i*3]=pos.x; trailPositions[i*3+1]=0.05; trailPositions[i*3+2]=pos.z; }
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      const trailMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45, linewidth: 1 });
      const trail = new THREE.Line(trailGeo, trailMat);
      scene.add(trail);

      /* Label */
      const typeLabel = d.type.toUpperCase();
      const label = makeSprite(`${typeLabel} · ${d.distance.toFixed(0)}m`, TYPE_HEX[d.type] ?? '#fff');
      label.position.set(pos.x, 1.7, pos.z); scene.add(label);

      const movingLabel = d.moving ? makeSprite('▶ MOVING', TYPE_HEX[d.type] ?? '#fff', 0.7) : null;
      if (movingLabel) { movingLabel.position.set(pos.x, 2.18, pos.z); scene.add(movingLabel); }

      trackers[d.id] = { mesh, halo, gRing, beam, ptLight, trail, trailGeo, trailHistory: [pos.clone()], label, movingLabel, d };
    });

    detMeshRef.current = trackers;
    sceneRef.current   = { scene, camera, renderer, waveRings, originRing };

    /* ── Raycaster for tap selection ── */
    const raycaster = new THREE.Raycaster();
    const allMeshes = Object.values(trackers).map(t => t.mesh);
    const onTap = (cx, cy) => {
      const rect = mount.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((cx - rect.left) / rect.width)  * 2 - 1,
        -((cy - rect.top)  / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(allMeshes);
      if (hits.length > 0) {
        const id = hits[0].object.userData.id;
        const det = detections.find(d => d.id === id);
        setSelected(prev => prev?.id === id ? null : det ?? null);
      } else {
        setSelected(null);
      }
    };

    /* ── Touch / Mouse Controls ── */
    const inp = inputRef.current;
    const orb = orbRef.current;

    const dist2D = (t1, t2) => Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

    const onPointerDown = e => {
      if (e.touches?.length === 1) {
        inp.dragging = true; inp.last = { x: e.touches[0].clientX, y: e.touches[0].clientY }; inp.tapPos = inp.last;
      } else if (e.touches?.length === 2) {
        inp.pinchDist = dist2D(e.touches[0], e.touches[1]); inp.dragging = false;
      } else {
        inp.dragging = true; inp.last = { x: e.clientX, y: e.clientY }; inp.tapPos = inp.last;
      }
    };
    const onPointerMove = e => {
      if (e.touches?.length === 2 && inp.pinchDist != null) {
        const nd = dist2D(e.touches[0], e.touches[1]);
        orb.r = Math.max(6, Math.min(35, orb.r * (inp.pinchDist / nd)));
        inp.pinchDist = nd;
      } else if (inp.dragging) {
        const p = e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
        orb.theta -= (p.x - inp.last.x) * 0.005;
        orb.phi = Math.max(0.22, Math.min(1.5, orb.phi + (p.y - inp.last.y) * 0.005));
        inp.last = p;
      }
    };
    const onPointerUp = e => {
      const tp = inp.tapPos;
      if (inp.dragging && tp) {
        const p = e.changedTouches ? { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY } : { x: e.clientX, y: e.clientY };
        if (Math.abs(p.x - tp.x) < 8 && Math.abs(p.y - tp.y) < 8) onTap(tp.x, tp.y);
      }
      inp.dragging = false; inp.pinchDist = null; inp.tapPos = null;
    };
    const onWheel = e => { orb.r = Math.max(6, Math.min(35, orb.r + e.deltaY * 0.025)); };

    mount.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('mousemove', onPointerMove);
    mount.addEventListener('wheel', onWheel, { passive: true });
    mount.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchend', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });

    /* ── Animation loop ── */
    let t = 0;
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      t += 0.016;

      /* Camera */
      camera.position.set(
        orb.r * Math.sin(orb.phi) * Math.sin(orb.theta),
        orb.r * Math.cos(orb.phi),
        orb.r * Math.sin(orb.phi) * Math.cos(orb.theta)
      );
      camera.lookAt(0, orb.ty, 0);

      /* WiFi scan waves */
      waveRings.forEach(r => {
        const phase = (t * 0.65 + r.userData.phase) % (Math.PI * 2);
        const s = 1 + 10 * (phase / (Math.PI * 2));
        r.scale.set(s, s, s);
        r.material.opacity = isScanning ? Math.max(0, 0.4 * (1 - phase / (Math.PI * 2))) : 0;
      });

      /* Origin ring pulse */
      originRing.material.emissiveIntensity = 1.5 + Math.sin(t * 3) * 0.5;

      /* Detection animations */
      Object.entries(detMeshRef.current).forEach(([id, tracker]) => {
        const { mesh, halo, gRing, beam, ptLight, trail, trailGeo, trailHistory, label, movingLabel } = tracker;
        const floatY = 0.65 + Math.sin(t * 1.5 + parseInt(id)) * 0.07;
        mesh.position.y = floatY;
        halo.position.y = floatY;
        mesh.rotation.y += 0.012;
        mesh.material.emissiveIntensity = 0.6 + 0.45 * Math.sin(t * 2.5 + parseInt(id));
        ptLight.intensity = 0.9 + 0.7 * Math.sin(t * 2 + parseInt(id));

        /* Update trail */
        if (tracker.d.moving) {
          trailHistory.push(new THREE.Vector3(mesh.position.x, 0.05, mesh.position.z));
          if (trailHistory.length > TRAIL_LEN) trailHistory.shift();
          const pos = trailGeo.attributes.position;
          trailHistory.forEach((v, i) => { pos.setXYZ(i, v.x, v.y, v.z); });
          for (let i = trailHistory.length; i < TRAIL_LEN; i++) pos.setXYZ(i, mesh.position.x, 0.05, mesh.position.z);
          pos.needsUpdate = true;
          trailGeo.setDrawRange(0, trailHistory.length);

          /* Fade trail by recency */
          trail.material.opacity = 0.35 + 0.2 * Math.sin(t);
        }

        /* Keep ground ring + beam in sync */
        gRing.position.x = mesh.position.x; gRing.position.z = mesh.position.z;
        beam.position.x  = mesh.position.x; beam.position.z = mesh.position.z;
        ptLight.position.x = mesh.position.x; ptLight.position.z = mesh.position.z;
        label.position.set(mesh.position.x, 1.75, mesh.position.z);
        if (movingLabel) movingLabel.position.set(mesh.position.x, 2.24, mesh.position.z);
      });

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
      mount.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('mousemove', onPointerMove);
      mount.removeEventListener('wheel', onWheel);
      mount.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchend', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('resize', onResize);
    };
   
  }, [scanMode]);

  /* Live-update detection positions each prop change. The scene is built once
     per scan mode, so newly arriving observations must be materialized here;
     otherwise a real target that appears after mount would never become visible. */
  useEffect(() => {
    const trackers = detMeshRef.current;
    detections.forEach(d => {
      if (!d?.id || !Number.isFinite(Number(d.distance)) || !Number.isFinite(Number(d.angle))) return;
      const newPos = polar2cart(Number(d.angle), Number(d.distance), 9);
      const tr = trackers[d.id];

      if (tr) {
        tr.mesh.position.x = newPos.x;
        tr.mesh.position.z = newPos.z;
        tr.gRing.position.x = newPos.x;
        tr.gRing.position.z = newPos.z;
        tr.beam.position.x = newPos.x;
        tr.beam.position.z = newPos.z;
        tr.ptLight.position.x = newPos.x;
        tr.ptLight.position.z = newPos.z;
        tr.d = d;
        if (tr.movingLabel) tr.movingLabel.visible = Boolean(d.moving);
        return;
      }

      const color = TYPE_COLORS[d.type] ?? TYPE_COLORS.unknown;
      let geo;
      if (d.type === 'human') geo = new THREE.CapsuleGeometry(0.22, 0.95, 6, 12);
      else if (d.type === 'animal') geo = new THREE.SphereGeometry(0.28, 10, 10);
      else if (d.type === 'object') geo = new THREE.BoxGeometry(0.52, 0.52, 0.52);
      else geo = new THREE.OctahedronGeometry(0.3);

      const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.4, transparent: true, opacity: 0.92 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(newPos.x, 0.65, newPos.z);
      mesh.castShadow = true;
      mesh.userData = { id: d.id, type: d.type };
      sceneRef.current?.scene.add(mesh);

      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.06, side: THREE.BackSide }));
      halo.position.copy(mesh.position);
      sceneRef.current?.scene.add(halo);

      const gRing = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.52, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
      gRing.rotation.x = -Math.PI / 2; gRing.position.set(newPos.x, 0.02, newPos.z);
      sceneRef.current?.scene.add(gRing);

      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.65, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 }));
      beam.position.set(newPos.x, 0.32, newPos.z);
      sceneRef.current?.scene.add(beam);

      const ptLight = new THREE.PointLight(color, 1.2, 5);
      ptLight.position.set(newPos.x, 1.2, newPos.z);
      sceneRef.current?.scene.add(ptLight);

      const trailPositions = new Float32Array(TRAIL_LEN * 3);
      for (let i = 0; i < TRAIL_LEN; i++) { trailPositions[i * 3] = newPos.x; trailPositions[i * 3 + 1] = 0.05; trailPositions[i * 3 + 2] = newPos.z; }
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45, linewidth: 1 }));
      sceneRef.current?.scene.add(trail);

      const typeLabel = d.type.toUpperCase();
      const label = makeSprite(`${typeLabel} · ${Number(d.distance).toFixed(0)}m`, TYPE_HEX[d.type] ?? '#fff');
      label.position.set(newPos.x, 1.7, newPos.z);
      sceneRef.current?.scene.add(label);
      const movingLabel = d.moving ? makeSprite('▶ MOVING', TYPE_HEX[d.type] ?? '#fff', 0.7) : null;
      if (movingLabel) { movingLabel.position.set(newPos.x, 2.18, newPos.z); sceneRef.current?.scene.add(movingLabel); }

      trackers[d.id] = { mesh, halo, gRing, beam, ptLight, trail, trailGeo, trailHistory: [newPos.clone()], label, movingLabel, d };
    });

    /* Remove observations that are no longer present; the data layer owns
       truth, so the 3D scene must not retain stale targets indefinitely. */
    Object.keys(trackers).forEach(id => {
      if (detections.some(d => String(d?.id) === String(id))) return;
      const tr = trackers[id];
      [tr.mesh, tr.halo, tr.gRing, tr.beam, tr.ptLight, tr.trail, tr.label, tr.movingLabel].forEach(obj => {
        if (obj) {
          obj.parent?.remove(obj);
          if (obj.geometry?.dispose) obj.geometry.dispose();
          if (obj.material) {
            const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
            materials.forEach(m => { m.map?.dispose?.(); m.dispose?.(); });
          }
        }
      });
      tr.trailGeo?.dispose?.();
      delete trackers[id];
    });
  }, [detections]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-border/50" style={{ minHeight: 440 }}>
      {/* Three.js canvas */}
      <div ref={mountRef} className="w-full h-full" style={{ touchAction: 'none' }} />

      {/* ── HUD Overlays ── */}

      {/* Top-left: room stats */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
        <div className="bg-black/65 backdrop-blur-md rounded-xl px-3 py-2 border border-white/5">
          <div className="font-display text-[9px] tracking-[0.2em] text-primary mb-1">WALLSIGHT 3D</div>
          <div className="font-mono text-[8px] text-muted-foreground">Room 9×9m · H 3.6m</div>
          <div className="font-mono text-[8px] text-muted-foreground">{detections.length} live targets</div>
          <div className="font-mono text-[8px] text-muted-foreground">Live observations only · no synthetic targets</div>
        </div>
        <div className="flex flex-col gap-1">
          {Object.entries({ Human: '#00ff88', Animal: '#00ccff', Object: '#ffaa00', Unknown: '#ff4466' }).map(([l, c]) => (
            <div key={l} className="flex items-center gap-2 bg-black/55 backdrop-blur-sm rounded-lg px-2 py-1">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
              <span className="font-mono text-[8px]" style={{ color: c }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top-right: controls guide */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 items-end pointer-events-none">
        {[
          { icon: '👆', label: 'Drag — orbit' },
          { icon: '🤏', label: 'Pinch — zoom' },
          { icon: '🎯', label: 'Tap target — info' },
        ].map(h => (
          <div key={h.label} className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
            <span className="text-[11px]">{h.icon}</span>
            <span className="font-mono text-[8px] text-muted-foreground">{h.label}</span>
          </div>
        ))}
      </div>

      {/* Bottom: camera reset + zoom buttons */}
      <div className="absolute bottom-4 right-3 flex flex-col gap-2">
        {[
          { icon: ZoomIn,      action: () => { orbRef.current.r = Math.max(6, orbRef.current.r - 3); }, tip: 'Zoom in' },
          { icon: ZoomOut,     action: () => { orbRef.current.r = Math.min(35, orbRef.current.r + 3); }, tip: 'Zoom out' },
          { icon: RotateCcw,   action: () => { orbRef.current.theta = 0.5; orbRef.current.phi = 0.85; orbRef.current.r = 22; }, tip: 'Reset view' },
        ].map(({ icon: Icon, action, tip }) => (
          <button key={tip} onClick={action} title={tip}
            className="w-9 h-9 rounded-xl border border-border/60 bg-black/70 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all active:scale-95">
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {/* Bottom-left: scanning indicator */}
      <div className="absolute bottom-4 left-3">
        <div className="flex items-center gap-2 bg-black/65 backdrop-blur-sm rounded-xl px-3 py-2 border border-border/40">
          <motion.div className="w-2 h-2 rounded-full bg-primary"
            animate={isScanning ? { opacity: [1, 0.2, 1], scale: [1, 1.3, 1] } : { opacity: 0.3 }}
            transition={{ duration: 1.2, repeat: Infinity }} />
          <span className="font-mono text-[9px]" style={{ color: isScanning ? '#00ff88' : '#ffffff40' }}>
            {isScanning ? 'LIVE SCAN' : 'STANDBY'}
          </span>
          <span className="font-mono text-[8px] text-muted-foreground">{scanMode.toUpperCase()}</span>
        </div>
      </div>

      {/* ── Selected target info card ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[340px] max-w-[90vw]"
          >
            <div className="rounded-2xl border bg-black/80 backdrop-blur-xl overflow-hidden shadow-2xl"
              style={{ borderColor: `${TYPE_HEX[selected.type] ?? '#fff'}40` }}>

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: `${TYPE_HEX[selected.type] ?? '#fff'}20`, background: `${TYPE_HEX[selected.type] ?? '#fff'}08` }}>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" style={{ color: TYPE_HEX[selected.type] }} />
                  <span className="font-display text-xs tracking-wider" style={{ color: TYPE_HEX[selected.type] }}>
                    {selected.type.toUpperCase()} DETECTED
                  </span>
                </div>
                <button onClick={() => setSelected(null)}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: Target,  label: 'DISTANCE', value: `${selected.distance.toFixed(1)}m` },
                    { icon: Gauge,   label: 'VELOCITY', value: `${selected.speed ?? '0'} m/s` },
                    { icon: Move,    label: 'STATUS',   value: selected.moving ? 'MOVING' : 'STATIC' },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="text-center py-2 rounded-xl bg-white/5 border border-white/5">
                      <Icon className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                      <div className="font-mono text-[10px] font-bold text-foreground">{value}</div>
                      <div className="font-mono text-[8px] text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Confidence bar */}
                <div className="space-y-1">
                  <div className="flex justify-between font-mono text-[9px]">
                    <span className="text-muted-foreground">SIGNAL CONFIDENCE</span>
                    <span style={{ color: TYPE_HEX[selected.type] }}>{selected.intensity}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div className="h-full rounded-full"
                      style={{ background: TYPE_HEX[selected.type] }}
                      animate={{ width: `${selected.intensity}%` }} />
                  </div>
                </div>

                {/* Wall composition */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-muted-foreground" />
                    <span className="font-mono text-[9px] text-muted-foreground tracking-wider">WALL LAYERS</span>
                  </div>
                  {selected.wallLayers?.map((layer, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="font-mono text-[9px] text-muted-foreground w-28 truncate">{layer.material}</span>
                      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${layer.density}%`, background: TYPE_HEX[selected.type], opacity: 0.6 }} />
                      </div>
                      <span className="font-mono text-[9px] text-foreground w-10 text-right">{layer.thickness}</span>
                    </div>
                  ))}
                </div>

                {/* WiFi info row */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <div className="flex items-center gap-1.5">
                    <Wifi className="w-3 h-3 text-muted-foreground" />
                    <span className="font-mono text-[9px] text-muted-foreground">Bearing {Math.round(selected.angle)}° · Heading {selected.heading}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
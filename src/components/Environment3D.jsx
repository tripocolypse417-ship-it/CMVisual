import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const TYPE_COLORS = {
  human: 0x00ff88,
  animal: 0x00ccff,
  object: 0xffaa00,
  unknown: 0xff4466,
};

const TYPE_LABELS = {
  human: 'HUMAN',
  animal: 'ANIMAL',
  object: 'OBJECT',
  unknown: 'UNKNOWN',
};

function polar2cart(angleDeg, distancePct, scale = 8) {
  const rad = (angleDeg * Math.PI) / 180;
  const r = (distancePct / 100) * scale;
  return [r * Math.cos(rad), 0, r * Math.sin(rad)];
}

function makeLabel(text, color = '#00ff88', fontSize = 28) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.roundRect(4, 4, 248, 56, 10);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.roundRect(4, 4, 248, 56, 10);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.8, 0.45, 1);
  return sprite;
}

function makeDistanceLabel(dist) {
  return makeLabel(`${dist.toFixed(1)}m`, '#ffffff80', 22);
}

export default function Environment3D({ detections, scanMode, isScanning }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const W = mount.clientWidth, H = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020a08, 0.035);
    scene.background = new THREE.Color(0x030a08);

    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 200);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.3;
    mount.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0x001508, 0.5));
    const dirLight = new THREE.DirectionalLight(0x00ff88, 0.4);
    dirLight.position.set(8, 18, 8); dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    scene.add(dirLight);
    scene.add(new THREE.HemisphereLight(0x001a0d, 0x000000, 0.3));

    const modeEmissives = { sonar: 0x00ff88, thermal: 0xff6633, motion: 0x00ccff };
    const modeColor = modeEmissives[scanMode] || modeEmissives.sonar;
    const modeColorHex = `#${modeColor.toString(16).padStart(6, '0')}`;

    // --- FLOOR ---
    const floorGeo = new THREE.PlaneGeometry(20, 20, 20, 20);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x050f08, roughness: 0.95, metalness: 0 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    scene.add(floor);
    const gridHelper = new THREE.GridHelper(20, 40, modeColor, 0x00ff8808);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // --- CEILING ---
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x030808, roughness: 1, transparent: true, opacity: 0.5 });
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), ceilMat);
    ceil.rotation.x = Math.PI / 2; ceil.position.y = 3.5;
    scene.add(ceil);
    const ceilGrid = new THREE.GridHelper(20, 20, 0x00ff8810, 0x00ff8805);
    ceilGrid.position.y = 3.49;
    scene.add(ceilGrid);

    // --- WALLS with thickness ---
    const roomSize = 9, wallH = 3.5, wallT = 0.25;
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0a1c14, roughness: 0.8, metalness: 0.1, transparent: true, opacity: 0.35,
    });
    const wallEdgeMat = new THREE.LineBasicMaterial({ color: modeColor, opacity: 0.2, transparent: true });

    [
      { pos: [0, wallH/2, -roomSize/2], sz: [roomSize, wallH, wallT] },
      { pos: [0, wallH/2,  roomSize/2], sz: [roomSize, wallH, wallT] },
      { pos: [-roomSize/2, wallH/2, 0], sz: [wallT, wallH, roomSize] },
      { pos: [ roomSize/2, wallH/2, 0], sz: [wallT, wallH, roomSize] },
    ].forEach(({ pos, sz }) => {
      const geo = new THREE.BoxGeometry(...sz);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(...pos); mesh.castShadow = true; mesh.receiveShadow = true;
      scene.add(mesh);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), wallEdgeMat);
      edges.position.set(...pos);
      scene.add(edges);
    });

    // --- FURNITURE (simplified room items) ---
    const furnitureMat = new THREE.MeshStandardMaterial({ color: 0x061410, roughness: 0.9, metalness: 0.1, transparent: true, opacity: 0.6 });
    const furnitureEdge = new THREE.LineBasicMaterial({ color: modeColor, opacity: 0.15, transparent: true });

    const furniture = [
      { pos: [-3.5, 0.4, -3.8], sz: [2.5, 0.08, 1.2], label: 'TABLE' },   // table top
      { pos: [-3.5, 0.2, -3.3], sz: [0.1, 0.4, 0.1] },                    // table leg
      { pos: [-3.5, 0.2, -4.3], sz: [0.1, 0.4, 0.1] },
      { pos: [-2.4, 0.2, -3.3], sz: [0.1, 0.4, 0.1] },
      { pos: [-2.4, 0.2, -4.3], sz: [0.1, 0.4, 0.1] },
      { pos: [3.5, 0.3, 3.5], sz: [1.8, 0.6, 0.9], label: 'SOFA' },       // sofa
      { pos: [3.5, 0.75, 3.5], sz: [1.8, 0.15, 0.2] },                    // sofa back
      { pos: [-3.5, 0.6, 3.5], sz: [1.2, 1.2, 0.15], label: 'DOOR' },    // door
    ];

    furniture.forEach(({ pos, sz, label }) => {
      const geo = new THREE.BoxGeometry(...sz);
      const mesh = new THREE.Mesh(geo, furnitureMat);
      mesh.position.set(...pos);
      mesh.receiveShadow = true;
      scene.add(mesh);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), furnitureEdge);
      edges.position.set(...pos);
      scene.add(edges);
      if (label) {
        const spr = makeLabel(label, modeColorHex + '99', 20);
        spr.position.set(pos[0], pos[1] + sz[1] / 2 + 0.35, pos[2]);
        scene.add(spr);
      }
    });

    // --- SENSOR ORIGIN ---
    const sensorGeo = new THREE.TorusGeometry(0.4, 0.04, 8, 64);
    const sensorMat = new THREE.MeshStandardMaterial({ color: modeColor, emissive: modeColor, emissiveIntensity: 1.5 });
    const sensorRing = new THREE.Mesh(sensorGeo, sensorMat);
    sensorRing.rotation.x = Math.PI / 2;
    scene.add(sensorRing);

    // Sensor label
    const sensorLabel = makeLabel('SENSOR', modeColorHex, 26);
    sensorLabel.position.set(0, 1.2, 0);
    scene.add(sensorLabel);

    // Pulse rings
    const pulseRings = Array.from({ length: 4 }).map((_, i) => {
      const r = new THREE.Mesh(
        new THREE.TorusGeometry(0.4, 0.02, 6, 64),
        new THREE.MeshBasicMaterial({ color: modeColor, transparent: true, opacity: 0.5 })
      );
      r.rotation.x = Math.PI / 2;
      r.userData.phase = (i / 4) * Math.PI * 2;
      scene.add(r);
      return r;
    });

    // --- DETECTION OBJECTS ---
    const detectionMeshes = detections.map((d, idx) => {
      const [x, , z] = polar2cart(d.angle, d.distance, 9);
      const color = TYPE_COLORS[d.type] || 0xffffff;
      const colorHex = `#${color.toString(16).padStart(6, '0')}`;

      let geo;
      if (d.type === 'human') geo = new THREE.CapsuleGeometry(0.22, 0.9, 6, 12);
      else if (d.type === 'animal') geo = new THREE.SphereGeometry(0.28, 10, 10);
      else if (d.type === 'object') geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      else geo = new THREE.OctahedronGeometry(0.3);

      const mat = new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.6,
        transparent: true, opacity: 0.9, roughness: 0.4, metalness: 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 0.65, z);
      mesh.castShadow = true;
      mesh.userData = { ...d, baseY: 0.65, baseEmissive: 0.6 };
      scene.add(mesh);

      // Glow outer halo
      const haloGeo = new THREE.SphereGeometry(0.55, 8, 8);
      const haloMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.05, side: THREE.BackSide });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.set(x, 0.65, z);
      scene.add(halo);

      // Ground ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.35, 0.5, 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0.02, z);
      scene.add(ring);

      // Vertical beam (height indicator)
      const beamGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.65, 6);
      const beamMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(x, 0.32, z);
      scene.add(beam);

      // Floating label: type + distance
      const safeDistance = Number.isFinite(Number(d.distance)) ? Number(d.distance) : null;
      const nameLabel = makeLabel(`${TYPE_LABELS[d.type] || 'UNKNOWN'} · ${safeDistance == null ? 'RANGE ?' : `${safeDistance.toFixed(0)}m`}`, colorHex, 24);
      nameLabel.position.set(x, 1.6, z);
      scene.add(nameLabel);

      // Moving indicator
      const movingLabel = d.moving ? makeLabel('▶ MOVING', colorHex, 20) : null;
      if (movingLabel) { movingLabel.position.set(x, 2.05, z); scene.add(movingLabel); }

      // Point light
      const ptLight = new THREE.PointLight(color, 1.2, 5);
      ptLight.position.set(x, 1.2, z);
      scene.add(ptLight);

      return { mesh, halo, ring, beam, ptLight, nameLabel, movingLabel };
    });

    // --- ORBIT CONTROLS ---
    let isDragging = false, lastMouse = { x: 0, y: 0 };
    let spherical = { theta: 0.5, phi: 0.85, r: 20 };

    const getXY = e => e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
    const onDown = e => { isDragging = true; lastMouse = getXY(e); };
    const onUp = () => { isDragging = false; };
    const onMove = e => {
      if (!isDragging) return;
      const p = getXY(e);
      spherical.theta -= (p.x - lastMouse.x) * 0.005;
      spherical.phi = Math.max(0.25, Math.min(1.45, spherical.phi + (p.y - lastMouse.y) * 0.005));
      lastMouse = p;
    };
    const onWheel = e => { spherical.r = Math.max(7, Math.min(30, spherical.r + e.deltaY * 0.03)); };

    mount.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    mount.addEventListener('wheel', onWheel, { passive: true });
    mount.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchmove', onMove, { passive: true });

    // --- ANIMATE ---
    let t = 0, rafId;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      t += 0.016;

      camera.position.set(
        spherical.r * Math.sin(spherical.phi) * Math.sin(spherical.theta),
        spherical.r * Math.cos(spherical.phi),
        spherical.r * Math.sin(spherical.phi) * Math.cos(spherical.theta),
      );
      camera.lookAt(0, 1, 0);

      pulseRings.forEach(r => {
        const phase = (t * 0.7 + r.userData.phase) % (Math.PI * 2);
        const s = 1 + 9 * (phase / (Math.PI * 2));
        r.scale.set(s, s, s);
        r.material.opacity = isScanning ? Math.max(0, 0.4 * (1 - phase / (Math.PI * 2))) : 0;
      });

      detectionMeshes.forEach(({ mesh, halo, ring, beam, ptLight, nameLabel, movingLabel }, i) => {
        const bY = mesh.userData.baseY;
        if (mesh.userData.moving) {
          mesh.position.x += Math.sin(t * 0.8 + i * 1.3) * 0.003;
          mesh.position.z += Math.cos(t * 0.6 + i * 1.3) * 0.003;
          halo.position.copy(mesh.position);
          ring.position.x = mesh.position.x;
          ring.position.z = mesh.position.z;
          beam.position.x = mesh.position.x;
          beam.position.z = mesh.position.z;
          nameLabel.position.x = mesh.position.x;
          nameLabel.position.z = mesh.position.z;
          if (movingLabel) { movingLabel.position.x = mesh.position.x; movingLabel.position.z = mesh.position.z; }
          ptLight.position.x = mesh.position.x;
          ptLight.position.z = mesh.position.z;
        }
        mesh.position.y = bY + Math.sin(t * 1.4 + i) * 0.06;
        mesh.rotation.y += 0.01;
        mesh.material.emissiveIntensity = mesh.userData.baseEmissive + 0.4 * Math.sin(t * 2.5 + i);
        ptLight.intensity = 0.8 + 0.6 * Math.sin(t * 2 + i);
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
      cancelAnimationFrame(rafId);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
      mount.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
      mount.removeEventListener('wheel', onWheel);
      mount.removeEventListener('touchstart', onDown);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('resize', onResize);
    };
  }, [detections, scanMode, isScanning]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-border/50" style={{ minHeight: 400 }}>
      <div ref={mountRef} className="w-full h-full" />
      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1.5">
        <div className="font-mono text-[9px] text-muted-foreground mb-1 tracking-wider">DETECTION KEY</div>
        {Object.entries({ Human: '#00ff88', Animal: '#00ccff', Object: '#ffaa00', Unknown: '#ff4466' }).map(([label, color]) => (
          <div key={label} className="flex items-center gap-2 bg-black/60 rounded-md px-2 py-1 backdrop-blur-sm">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
            <span className="font-mono text-[9px]" style={{ color }}>{label}</span>
          </div>
        ))}
      </div>
      {/* Controls hint */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
        <div className="font-mono text-[9px] bg-black/60 backdrop-blur-sm rounded-md px-2 py-1 text-muted-foreground">
          🖱 Drag to orbit
        </div>
        <div className="font-mono text-[9px] bg-black/60 backdrop-blur-sm rounded-md px-2 py-1 text-muted-foreground">
          ⚙ Scroll to zoom
        </div>
      </div>
      {/* Stats overlay */}
      <div className="absolute top-3 left-3 flex flex-col gap-1">
        <div className="bg-black/60 backdrop-blur-sm rounded-md px-2 py-1.5 font-mono text-[9px]">
          <div className="text-muted-foreground mb-0.5">ROOM SIZE</div>
          <div className="text-foreground">9m × 9m · H 3.5m</div>
        </div>
        <div className="bg-black/60 backdrop-blur-sm rounded-md px-2 py-1.5 font-mono text-[9px]">
          <div className="text-muted-foreground mb-0.5">TARGETS</div>
          <div className="text-foreground">{detections.length} detected</div>
        </div>
      </div>
    </div>
  );
}
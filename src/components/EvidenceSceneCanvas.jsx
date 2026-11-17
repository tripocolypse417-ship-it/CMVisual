import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Renders only explicitly aligned scene entities. The grid/axes are reference
 * aids, not an inferred building or floor plan.
 */
export default function EvidenceSceneCanvas({ entities = [] }) {
  const hostRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const groupRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let renderer;
    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050d16);
      const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 1000);
      camera.position.set(8, 7, 9);
      camera.lookAt(0, 0, 0);
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(host.clientWidth || 640, host.clientHeight || 360);
      renderer.setClearColor(0x050d16, 1);
      host.appendChild(renderer.domElement);
      scene.add(new THREE.HemisphereLight(0xb8e5ff, 0x172332, 2));
      const key = new THREE.DirectionalLight(0xffffff, 2);
      key.position.set(5, 8, 4);
      scene.add(key);
      scene.add(new THREE.GridHelper(20, 20, 0x345064, 0x1b2d3b));
      scene.add(new THREE.AxesHelper(1.5));
      const group = new THREE.Group();
      scene.add(group);
      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      groupRef.current = group;
      const resize = () => {
        if (!hostRef.current || !rendererRef.current || !cameraRef.current) return;
        const width = hostRef.current.clientWidth || 640;
        const height = hostRef.current.clientHeight || 360;
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(width, height);
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      };
      window.addEventListener('resize', resize);
      resize();
      return () => {
        window.removeEventListener('resize', resize);
        group.traverse(object => {
          object.geometry?.dispose?.();
          if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
          else object.material?.dispose?.();
        });
        renderer.dispose();
        if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
        sceneRef.current = null;
        rendererRef.current = null;
        cameraRef.current = null;
        groupRef.current = null;
      };
    } catch (cause) {
      setError(cause?.message || 'WebGL renderer unavailable');
      renderer?.dispose?.();
      return undefined;
    }
  }, []);

  useEffect(() => {
    const group = groupRef.current;
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!group || !scene || !renderer || !camera) return;
    while (group.children.length) {
      const object = group.children.pop();
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
      else object.material?.dispose?.();
    }
    for (const entity of entities) {
      if (entity?.spatialRegistration !== 'ALIGNED' || !entity.position) continue;
      const { x, y, z } = entity.position;
      if (![x, y, z].every(Number.isFinite)) continue;
      const geometry = new THREE.SphereGeometry(0.13, 16, 12);
      const material = new THREE.MeshStandardMaterial({
        color: entity.evidenceClass === 'PREDICTED' ? 0xffbd55 : entity.evidenceClass === 'INFERRED' ? 0xffd166 : 0x57d9ef,
        emissive: 0x102b38,
        roughness: 0.4,
        metalness: 0.15,
      });
      const marker = new THREE.Mesh(geometry, material);
      marker.position.set(x, y, z);
      group.add(marker);
    }
    renderer.render(scene, camera);
  }, [entities]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-cyan-900/60 bg-slate-950">
      <div ref={hostRef} className="h-[320px] w-full" />
      <div className="absolute left-3 top-3 rounded bg-slate-950/80 px-2 py-1 text-[10px] font-mono tracking-wider text-cyan-200">
        REGISTERED GEOMETRY ONLY
      </div>
      {error && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 p-4 text-center text-xs text-amber-200">{error}</div>}
      {!error && entities.filter(entity => entity?.spatialRegistration === 'ALIGNED' && entity.position).length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-lg border border-white/10 bg-slate-950/85 px-4 py-3 text-center text-xs text-slate-300">
            No calibrated scene entities at this time cursor
            <div className="mt-1 text-[10px] text-slate-500">No positions are invented from unlocated sensor observations</div>
          </div>
        </div>
      )}
    </div>
  );
}

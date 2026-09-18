import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

const PRIORITY_CONFIG = {
  High: {
    color: 0xff6464,
    emissive: 0x991111,
    emissiveIntensity: 0.4,
    size: 0.85,
    speed: 0.014,
    orbitFactor: 2.0,
    ringColor: 0xff8888,
    hasRing: true,
  },
  Medium: {
    color: 0xf0a36e,
    emissive: 0x7a4000,
    emissiveIntensity: 0.25,
    size: 0.62,
    speed: 0.007,
    orbitFactor: 3.2,
    ringColor: null,
    hasRing: false,
  },
  Low: {
    color: 0x6bd8cb,
    emissive: 0x003330,
    emissiveIntensity: 0.2,
    size: 0.42,
    speed: 0.003,
    orbitFactor: 4.2,
    ringColor: null,
    hasRing: false,
  },
};

function buildStarfield(scene) {
  // Layer 1: distant small dim stars
  const geo1 = new THREE.BufferGeometry();
  const count1 = 1400;
  const pos1 = new Float32Array(count1 * 3);
  for (let i = 0; i < count1 * 3; i++) pos1[i] = (Math.random() - 0.5) * 200;
  geo1.setAttribute("position", new THREE.BufferAttribute(pos1, 3));
  scene.add(new THREE.Points(geo1, new THREE.PointsMaterial({ size: 0.07, color: 0xaac8ee, transparent: true, opacity: 0.55 })));

  // Layer 2: mid-range brighter cyan-tinted stars
  const geo2 = new THREE.BufferGeometry();
  const count2 = 500;
  const pos2 = new Float32Array(count2 * 3);
  for (let i = 0; i < count2 * 3; i++) pos2[i] = (Math.random() - 0.5) * 120;
  geo2.setAttribute("position", new THREE.BufferAttribute(pos2, 3));
  scene.add(new THREE.Points(geo2, new THREE.PointsMaterial({ size: 0.14, color: 0x6bd8cb, transparent: true, opacity: 0.35 })));

  // Layer 3: close bright accent points
  const geo3 = new THREE.BufferGeometry();
  const count3 = 120;
  const pos3 = new Float32Array(count3 * 3);
  for (let i = 0; i < count3 * 3; i++) pos3[i] = (Math.random() - 0.5) * 60;
  geo3.setAttribute("position", new THREE.BufferAttribute(pos3, 3));
  return {
    stars: [
      new THREE.Points(geo1, new THREE.PointsMaterial({ size: 0.07, color: 0xaac8ee, transparent: true, opacity: 0.55 })),
      new THREE.Points(geo2, new THREE.PointsMaterial({ size: 0.14, color: 0x6bd8cb, transparent: true, opacity: 0.35 })),
      new THREE.Points(geo3, new THREE.PointsMaterial({ size: 0.22, color: 0xffffff, transparent: true, opacity: 0.25 })),
    ]
  };
}

function buildSun(scene) {
  // Core sun sphere
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x6bd8cb,
    emissive: 0x229980,
    emissiveIntensity: 1.2,
    roughness: 0.0,
    metalness: 0.0,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(2.0, 32, 32), coreMat);
  scene.add(core);

  // Inner halo glow (slightly larger, additive transparent sphere)
  const halo1Mat = new THREE.MeshBasicMaterial({
    color: 0x4ae0d5,
    transparent: true,
    opacity: 0.18,
    side: THREE.BackSide,
  });
  const halo1 = new THREE.Mesh(new THREE.SphereGeometry(2.7, 32, 32), halo1Mat);
  scene.add(halo1);

  // Outer corona glow
  const halo2Mat = new THREE.MeshBasicMaterial({
    color: 0x00ffe0,
    transparent: true,
    opacity: 0.07,
    side: THREE.BackSide,
  });
  const halo2 = new THREE.Mesh(new THREE.SphereGeometry(3.8, 32, 32), halo2Mat);
  scene.add(halo2);

  // Subtle point light at sun center for planetary lighting
  const sunLight = new THREE.PointLight(0x88ffe8, 2.0, 80);
  sunLight.position.set(0, 0, 0);
  scene.add(sunLight);

  return { core, halo1, halo2 };
}

function buildOrbitRing(scene, radius) {
  const points = [];
  const segments = 128;
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  // Dashed look via line with low opacity
  const mat = new THREE.LineBasicMaterial({
    color: 0x3a4a6a,
    transparent: true,
    opacity: 0.4,
  });
  const ring = new THREE.Line(geo, mat);
  scene.add(ring);
  return ring;
}

function buildPlanet(scene, task, index) {
  const cfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Medium;
  const orbitRadius = 6.0 + index * cfg.orbitFactor;
  const startAngle = Math.random() * Math.PI * 2;

  // Orbit ring
  buildOrbitRing(scene, orbitRadius);

  // Planet mesh
  const planetMat = new THREE.MeshStandardMaterial({
    color: task.color ? new THREE.Color(task.color) : new THREE.Color(cfg.color),
    emissive: cfg.emissive,
    emissiveIntensity: cfg.emissiveIntensity,
    roughness: 0.45,
    metalness: 0.3,
  });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(cfg.size, 24, 24), planetMat);
  planet.position.set(Math.cos(startAngle) * orbitRadius, 0, Math.sin(startAngle) * orbitRadius);
  scene.add(planet);

  // Atmosphere glow on planet
  const atmosMat = new THREE.MeshBasicMaterial({
    color: task.color ? new THREE.Color(task.color) : new THREE.Color(cfg.color),
    transparent: true,
    opacity: 0.12,
    side: THREE.BackSide,
  });
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(cfg.size * 1.35, 24, 24), atmosMat);
  planet.add(atmosphere);

  // Saturn-style ring for High Priority planets
  let saturnRing = null;
  if (cfg.hasRing) {
    const ringGeo = new THREE.RingGeometry(cfg.size * 1.5, cfg.size * 2.4, 32);
    // Rotate ring to lie flat around planet
    ringGeo.rotateX(-Math.PI / 2.8);
    const ringMat = new THREE.MeshBasicMaterial({
      color: cfg.ringColor || 0xff8888,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    saturnRing = new THREE.Mesh(ringGeo, ringMat);
    planet.add(saturnRing);
  }

  return {
    mesh: planet,
    radius: orbitRadius,
    speed: cfg.speed,
    angle: startAngle,
    taskId: task.id,
    taskTitle: task.title,
    priority: task.priority,
  };
}

export default function OrbitView({ taskList, onBackToDashboard }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const sunRef = useRef(null);
  const planetsRef = useRef([]);
  const starLayersRef = useRef([]);
  const [hoveredTask, setHoveredTask] = useState(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const width = el.clientWidth;
    const height = el.clientHeight;

    // ── Scene ─────────────────────────────
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x070a12);

    // ── Camera ────────────────────────────
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 20, 28);
    camera.lookAt(0, 0, 0);

    // ── Renderer ──────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Ambient light ─────────────────────
    scene.add(new THREE.AmbientLight(0x1a2a4a, 0.8));

    // ── Starfield ─────────────────────────
    const { stars } = buildStarfield(scene);
    stars.forEach(s => scene.add(s));
    starLayersRef.current = stars;

    // ── Sun ───────────────────────────────
    const { core: sunCore, halo1, halo2 } = buildSun(scene);
    sunRef.current = { core: sunCore, halo1, halo2 };

    // ── Planets ───────────────────────────
    const activeTasks = taskList.filter(t => !t.is_completed);
    planetsRef.current = activeTasks.map((task, idx) => buildPlanet(scene, task, idx));

    // ── Raycaster for hover ───────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const meshes = planetsRef.current.map(p => p.mesh);
      const intersects = raycaster.intersectObjects(meshes);
      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const found = planetsRef.current.find(p => p.mesh === hit);
        if (found) {
          setHoveredTask({ title: found.taskTitle, priority: found.priority });
          el.style.cursor = "pointer";
          return;
        }
      }
      setHoveredTask(null);
      el.style.cursor = "default";
    };

    el.addEventListener("mousemove", handleMouseMove);

    // ── 30 FPS animation loop ─────────────
    let animId = null;
    let lastTime = 0;
    const FPS_INTERVAL = 1000 / 30;

    const renderLoop = (now) => {
      animId = requestAnimationFrame(renderLoop);
      if (now - lastTime < FPS_INTERVAL) return;
      lastTime = now;

      // Sun pulse
      const pulse = 1 + Math.sin(now * 0.0015) * 0.04;
      if (sunRef.current) {
        sunRef.current.core.rotation.y += 0.004;
        sunRef.current.halo1.scale.setScalar(pulse);
        sunRef.current.halo2.scale.setScalar(pulse * 1.06);
      }

      // Stars slow drift
      starLayersRef.current.forEach((s, i) => {
        s.rotation.y += 0.00015 * (i + 1);
      });

      // Planet orbits
      planetsRef.current.forEach((p) => {
        p.angle += p.speed;
        p.mesh.position.x = Math.cos(p.angle) * p.radius;
        p.mesh.position.z = Math.sin(p.angle) * p.radius;
        p.mesh.rotation.y += 0.018;
      });

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(renderLoop);

    // ── Resize handler ────────────────────
    const handleResize = () => {
      if (!el || !renderer) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      el.removeEventListener("mousemove", handleMouseMove);
      if (renderer && el.contains(renderer.domElement)) {
        el.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, [taskList]);

  const PRIORITY_COLORS = { High: "text-red-400", Medium: "text-orange-400", Low: "text-teal-400" };

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: "#070a12" }}>

      {/* 3D canvas */}
      <div ref={mountRef} className="w-full h-full absolute inset-0 z-0" />

      {/* Top bar — drag handle + exit button */}
      <div
        style={{ WebkitAppRegion: "drag" }}
        className="absolute top-0 left-0 right-0 z-50 h-10 flex items-center justify-between px-3"
        // Semi-transparent top overlay
      >
        {/* Left: orbit label */}
        <div className="flex items-center gap-2 opacity-50" style={{ WebkitAppRegion: "no-drag" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-teal-300 font-semibold">
            Orbit Mode
          </span>
        </div>

        {/* Right: Exit button */}
        <div style={{ WebkitAppRegion: "no-drag" }}>
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-300 bg-teal-900/40 hover:bg-teal-600/50 border border-teal-500/30 hover:border-teal-400/60 px-3 py-1 rounded-lg transition-all cursor-pointer"
            title="Return to Dashboard"
          >
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            Exit
          </button>
        </div>
      </div>

      {/* Planet hover tooltip */}
      {hoveredTask && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-fade-in">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md"
               style={{ background: "rgba(13,18,32,0.88)" }}>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${PRIORITY_COLORS[hoveredTask.priority] || "text-teal-400"}`}>
              {hoveredTask.priority}
            </span>
            <span className="w-px h-3 bg-white/20" />
            <span className="text-[13px] font-semibold text-white/90 max-w-[200px] truncate">
              {hoveredTask.title}
            </span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {taskList.filter(t => !t.is_completed).length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center opacity-40">
            <p className="text-teal-400 text-sm font-mono tracking-widest uppercase">No active tasks</p>
            <p className="text-white/40 text-xs mt-1">Add tasks in Dashboard Mode</p>
          </div>
        </div>
      )}
    </div>
  );
}

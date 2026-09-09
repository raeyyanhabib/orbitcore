import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import FocusModeOverlay from "./FocusModeOverlay.jsx";

export default function OrbitView({ taskList, activeTask, monitorUpdate, isFocusActive, focusMessages, onBackToDashboard }) {
  const mountRef = useRef(null);
  const [hoverOnTop, setHoverOnTop] = useState(true);
  const [showFocusModal, setShowFocusModal] = useState(false);

  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const sunMeshRef = useRef(null);
  const planetsRef = useRef([]);

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onReceiveFromMain) {
      window.electronAPI.onReceiveFromMain("orbit-hover-status", (data) => {
        if (data && data.alwaysOnTop !== undefined) {
          setHoverOnTop(data.alwaysOnTop);
        }
      });
    }
  }, []);

  const toggleHoverMode = () => {
    if (window.electronAPI && window.electronAPI.sendTaskAction) {
      window.electronAPI.sendTaskAction("toggle-orbit-hover");
      setHoverOnTop((prev) => !prev);
    }
  };

  useEffect(() => {
    if (!sunMeshRef.current) return;
    let targetColor = 0x6bd8cb; // primary

    if (isFocusActive) {
      if (monitorUpdate && !monitorUpdate.isOnTask) {
        targetColor = 0xffb4ab; // error
      } else {
        targetColor = 0x4ae176; // tertiary
      }
    }
    sunMeshRef.current.material.color.setHex(targetColor);
  }, [isFocusActive, monitorUpdate]);

  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(0, 16, 22);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xFFFFFF, 1.2, 100);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // Procedural Ambient Particles
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 400;
    const posArray = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 60;
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const starsMaterial = new THREE.PointsMaterial({
      size: 0.12,
      color: 0x88ccff,
      transparent: true,
      opacity: 0.6
    });
    const starMesh = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starMesh);

    // Sun / Central Core
    const sunGeometry = new THREE.SphereGeometry(2.0, 24, 24);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0x6bd8cb });
    const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sunMesh);
    sunMeshRef.current = sunMesh;

    const activeTasks = taskList.filter(t => !t.is_completed);
    planetsRef.current = [];

    activeTasks.forEach((task, index) => {
      let orbitRadius = 5.0 + index * 2.8;
      let speed = 0.006;
      let planetSize = 0.5;

      if (task.priority === "High") {
        orbitRadius = 4.5 + index * 1.8;
        speed = 0.016;
        planetSize = 0.75;
      } else if (task.priority === "Low") {
        orbitRadius = 6.5 + index * 3.2;
        speed = 0.004;
        planetSize = 0.35;
      }

      const ringPoints = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        ringPoints.push(new THREE.Vector3(Math.cos(theta) * orbitRadius, 0, Math.sin(theta) * orbitRadius));
      }
      
      const ringGeometry = new THREE.BufferGeometry().setFromPoints(ringPoints);
      const ringMaterial = new THREE.LineBasicMaterial({ color: 0x3d4947, transparent: true, opacity: 0.4 });
      const orbitRing = new THREE.Line(ringGeometry, ringMaterial);
      scene.add(orbitRing);

      const planetGeometry = new THREE.SphereGeometry(planetSize, 16, 16);
      const colorVal = task.color || "#6bd8cb";
      const planetMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorVal),
        roughness: 0.3,
        metalness: 0.2
      });
      
      const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
      const startingAngle = Math.random() * Math.PI * 2;
      planetMesh.position.set(
        Math.cos(startingAngle) * orbitRadius,
        0,
        Math.sin(startingAngle) * orbitRadius
      );
      
      scene.add(planetMesh);
      planetsRef.current.push({
        mesh: planetMesh,
        radius: orbitRadius,
        speed: speed,
        angle: startingAngle,
        taskId: task.id,
        taskDetails: task
      });
    });

    const raycaster = new THREE.Raycaster();
    const mouseCoord = new THREE.Vector2();

    const handleCanvasClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseCoord.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseCoord.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseCoord, camera);

      const targetMeshes = planetsRef.current.map(p => p.mesh);
      const intersects = raycaster.intersectObjects(targetMeshes);

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const matchingPlanet = planetsRef.current.find(p => p.mesh === clickedMesh);
        if (matchingPlanet) {
          // Direct action: Start focus for clicked task planet
          window.electronAPI.sendTaskAction("startFocus", { taskId: matchingPlanet.taskId });
        }
      }
    };

    renderer.domElement.addEventListener("click", handleCanvasClick);

    let animationFrameId = null;
    let lastRenderTime = 0;
    const fpsInterval = 1000 / 30;

    const renderLoop = (currentTime) => {
      animationFrameId = requestAnimationFrame(renderLoop);
      const elapsed = currentTime - lastRenderTime;
      if (elapsed < fpsInterval) return;

      lastRenderTime = currentTime - (elapsed % fpsInterval);

      if (sunMesh) {
        sunMesh.rotation.y += 0.005;
      }

      if (starMesh) {
        starMesh.rotation.y += 0.0005;
      }

      planetsRef.current.forEach((planet) => {
        planet.angle += planet.speed;
        planet.mesh.position.x = Math.cos(planet.angle) * planet.radius;
        planet.mesh.position.z = Math.sin(planet.angle) * planet.radius;
        planet.mesh.rotation.y += 0.02;
      });

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      
      if (rendererRef.current && mountRef.current) {
        rendererRef.current.domElement.removeEventListener("click", handleCanvasClick);
        if (mountRef.current.contains(rendererRef.current.domElement)) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }
      }

      scene.traverse((object) => {
        if (!object.isMesh) return;
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => mat.dispose());
        } else {
          object.material.dispose();
        }
      });
    };
  }, [taskList]);

  const handleAlertDismiss = () => {
    setShowFocusModal(false);
  };

  return (
    <div className="w-full h-full relative orbit-widget-glass rounded-2xl overflow-hidden flex flex-col select-none">
      
      {/* Top Header / Drag Handle */}
      <div 
        style={{ WebkitAppRegion: 'drag' }}
        className="w-full px-3 py-2 flex items-center justify-between bg-surface-container-high/60 border-b border-white/10 cursor-move"
      >
        <div className="flex items-center gap-1.5 pointer-events-none">
          <span className="material-symbols-outlined text-primary text-base">public</span>
          <span className="text-xs font-bold text-on-surface font-space tracking-wider uppercase">Orbit</span>
          {activeTask && (
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse ml-1"></span>
          )}
        </div>

        {/* Action Controls (no-drag) */}
        <div style={{ WebkitAppRegion: 'no-drag' }} className="flex items-center gap-1">
          {/* Hover Mode Toggle Button */}
          <button 
            onClick={toggleHoverMode}
            title={hoverOnTop ? "Hover Mode: Always on Top (Click to Pin to Desktop)" : "Desktop Mode: Pinned (Click to Always on Top)"}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              hoverOnTop 
                ? "bg-primary/20 text-primary hover:bg-primary/30" 
                : "bg-surface-variant text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {hoverOnTop ? "layers" : "dock_to_right"}
            </span>
          </button>

          {/* Switch Back to Console Window */}
          <button 
            onClick={onBackToDashboard}
            title="Open Console Window"
            className="p-1.5 rounded-lg bg-surface-variant/80 hover:bg-surface-variant text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="flex-1 relative w-full overflow-hidden">
        <div ref={mountRef} className="w-full h-full absolute inset-0 z-0 cursor-pointer" />

        {/* Ambient Active Task Reminder Pill */}
        {activeTask && (
          <div className="absolute bottom-2 left-2 right-2 z-10 bg-surface-container/90 backdrop-blur-md border border-primary/30 rounded-xl px-3 py-1.5 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping flex-shrink-0"></span>
              <span className="text-[11px] font-semibold text-primary truncate">{activeTask.title}</span>
            </div>
            <span className="text-[9px] uppercase font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded">Active</span>
          </div>
        )}
      </div>

      <FocusModeOverlay 
        activeTask={activeTask}
        monitorUpdate={monitorUpdate}
        onDismiss={handleAlertDismiss}
        onPauseFocus={() => window.electronAPI.sendTaskAction("stopFocus")}
        focusMessages={focusMessages}
      />
    </div>
  );
}


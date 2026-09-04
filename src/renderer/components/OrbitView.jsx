import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import FocusModeOverlay from "./FocusModeOverlay.jsx";

export default function OrbitView({ taskList, activeTask, monitorUpdate, isFocusActive, focusMessages, onBackToDashboard }) {
  const mountRef = useRef(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showFocusModal, setShowFocusModal] = useState(false);

  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const sunMeshRef = useRef(null);
  const planetsRef = useRef([]);

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
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = null; // Transparent background to show through

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 18, 25);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xFFFFFF, 1.2, 100);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // Procedural Stars
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 1500;
    const posArray = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 100;
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const starsMaterial = new THREE.PointsMaterial({
      size: 0.1,
      color: 0x88ccff,
      transparent: true,
      opacity: 0.8
    });
    const starMesh = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starMesh);

    const sunGeometry = new THREE.SphereGeometry(2.4, 24, 24);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0x6bd8cb });
    const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sunMesh);
    sunMeshRef.current = sunMesh;

    const activeTasks = taskList.filter(t => !t.is_completed);
    planetsRef.current = [];

    activeTasks.forEach((task, index) => {
      let orbitRadius = 6.0 + index * 3.5;
      let speed = 0.005;
      let planetSize = 0.6;

      if (task.priority === "High") {
        orbitRadius = 5.5 + index * 2.0;
        speed = 0.015;
        planetSize = 0.9;
      } else if (task.priority === "Low") {
        orbitRadius = 8.0 + index * 4.0;
        speed = 0.003;
        planetSize = 0.4;
      }

      const ringPoints = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        ringPoints.push(new THREE.Vector3(Math.cos(theta) * orbitRadius, 0, Math.sin(theta) * orbitRadius));
      }
      
      const ringGeometry = new THREE.BufferGeometry().setFromPoints(ringPoints);
      const ringMaterial = new THREE.LineBasicMaterial({ color: 0x2d3449, transparent: true, opacity: 0.5 });
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
          setSelectedTask(matchingPlanet.taskDetails);
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
        starMesh.rotation.x += 0.0002;
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
    <div className="w-full h-full relative bg-background">
      
      <div ref={mountRef} className="w-full h-full absolute inset-0 z-0" />

      <div className="absolute top-8 left-8 z-10 flex space-x-3">
        <button 
          onClick={onBackToDashboard}
          className="flex items-center gap-2 px-5 py-3 bg-surface/80 hover:bg-surface-variant backdrop-blur-md text-on-surface font-label-md rounded-xl border border-white/10 transition-all shadow-lg hover:shadow-xl group"
        >
          <span className="material-symbols-outlined text-primary group-hover:-translate-x-1 transition-transform">arrow_back</span>
          Back to Console
        </button>
      </div>

      {selectedTask && (
        <div className="absolute bottom-8 right-8 z-10 w-96 glass-panel p-6 rounded-2xl border border-white/10 shadow-2xl animate-fade-in">
          
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
            <h4 className="font-headline-md text-primary font-bold truncate pr-2">{selectedTask.title}</h4>
            <button 
              onClick={() => setSelectedTask(null)}
              className="text-on-surface-variant hover:text-on-surface p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-on-surface-variant text-label-md">Priority</span>
              <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                selectedTask.priority === "High" ? "bg-error/20 text-error" : selectedTask.priority === "Medium" ? "bg-secondary/20 text-secondary" : "bg-tertiary/20 text-tertiary"
              }`}>
                {selectedTask.priority}
              </span>
            </div>

            {activeTask && activeTask.id === selectedTask.id && (
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant text-label-md">Focus Status</span>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                  !isFocusActive ? "bg-surface-variant text-on-surface-variant" : (monitorUpdate && !monitorUpdate.isOnTask ? "bg-error/20 text-error animate-pulse" : "bg-tertiary/20 text-tertiary")
                }`}>
                  {!isFocusActive ? "Paused" : (monitorUpdate && !monitorUpdate.isOnTask ? <><span className="material-symbols-outlined text-[14px]">warning</span> Distracted</> : <><span className="material-symbols-outlined text-[14px]">check_circle</span> Focused</>)}
                </span>
              </div>
            )}

            <div className="bg-surface/50 rounded-xl p-3 text-label-sm font-mono text-on-surface-variant space-y-2 border border-white/5">
              <div><span className="opacity-50">Target Apps:</span> {selectedTask.target_apps || "Advisory"}</div>
              <div><span className="opacity-50">Type:</span> {selectedTask.type}</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => {
                window.electronAPI.sendTaskAction("startFocus", { taskId: selectedTask.id });
                setSelectedTask(null);
              }}
              className="flex-1 py-3 bg-primary hover:bg-primary-fixed text-on-primary rounded-xl font-label-md font-bold transition-all shadow-[0_0_15px_rgba(107,216,203,0.2)] hover:shadow-[0_0_20px_rgba(107,216,203,0.4)] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">rocket_launch</span> Focus
            </button>

            <button 
              onClick={() => {
                window.electronAPI.sendTaskAction("completeTask", { taskId: selectedTask.id });
                setSelectedTask(null);
              }}
              className="py-3 px-6 bg-tertiary/20 hover:bg-tertiary/30 text-tertiary rounded-xl font-label-md font-bold transition-all border border-tertiary/30 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">check</span> Done
            </button>
          </div>
        </div>
      )}

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

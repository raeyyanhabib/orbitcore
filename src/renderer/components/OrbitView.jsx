import React, { useRef, useEffect } from "react";
import * as THREE from "three";

export default function OrbitView({ taskList, onBackToDashboard }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const sunMeshRef = useRef(null);
  const planetsRef = useRef([]);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = null; // Transparent

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 18, 25);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xFFFFFF, 1.2, 100);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // Stars background
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

    // Sun (center)
    const sunGeometry = new THREE.SphereGeometry(2.4, 24, 24);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0x6bd8cb });
    const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sunMesh);
    sunMeshRef.current = sunMesh;

    // Create planets from task list
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

      // Orbit ring
      const ringPoints = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        ringPoints.push(new THREE.Vector3(Math.cos(theta) * orbitRadius, 0, Math.sin(theta) * orbitRadius));
      }
      const ringGeometry = new THREE.BufferGeometry().setFromPoints(ringPoints);
      const ringMaterial = new THREE.LineBasicMaterial({ color: 0x2d3449, transparent: true, opacity: 0.5 });
      const orbitRing = new THREE.Line(ringGeometry, ringMaterial);
      scene.add(orbitRing);

      // Planet
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
        taskId: task.id
      });
    });

    // Animation loop (30 FPS)
    let animationFrameId = null;
    let lastRenderTime = 0;
    const FPS = 30;
    const fpsInterval = 1000 / FPS;

    const renderLoop = (currentTime) => {
      animationFrameId = requestAnimationFrame(renderLoop);
      const elapsed = currentTime - lastRenderTime;

      if (elapsed < fpsInterval) return;
      lastRenderTime = currentTime - (elapsed % fpsInterval);

      // Rotate sun
      if (sunMeshRef.current) {
        sunMeshRef.current.rotation.y += 0.005;
      }

      // Rotate stars
      if (starMesh) {
        starMesh.rotation.y += 0.0005;
        starMesh.rotation.x += 0.0002;
      }

      // Update planet positions
      planetsRef.current.forEach((planet) => {
        planet.angle += planet.speed;
        planet.mesh.position.x = Math.cos(planet.angle) * planet.radius;
        planet.mesh.position.z = Math.sin(planet.angle) * planet.radius;
        planet.mesh.rotation.y += 0.02;
      });

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);

      if (rendererRef.current && mountRef.current) {
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

  return (
    <div className="w-full h-full relative bg-background">
      
      {/* 3D Canvas */}
      <div ref={mountRef} className="w-full h-full absolute inset-0 z-0" />

      {/* EXIT BAR - Minimal top bar with just back button */}
      <div className="absolute top-0 left-0 right-0 z-20 h-12 flex items-center px-4 bg-background/30 backdrop-blur-sm border-b border-white/5">
        <button 
          onClick={onBackToDashboard}
          className="flex items-center gap-2 px-3 py-1.5 text-on-surface hover:text-primary transition-colors group cursor-pointer"
          title="Exit Orbit Mode"
        >
          <span className="material-symbols-outlined text-lg group-hover:-translate-x-0.5 transition-transform">
            arrow_back
          </span>
          <span className="text-label-sm font-semibold">Exit</span>
        </button>
      </div>

    </div>
  );
}

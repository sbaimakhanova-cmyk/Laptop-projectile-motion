import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SimulationConfig, TelemetryRefs, SimulationAction, SimulationState } from '../types';

interface SimulationProps {
  config: SimulationConfig;
  telemetryRefs: React.MutableRefObject<TelemetryRefs>;
  actionTrigger: { type: SimulationAction; count: number } | null;
}

const Simulation: React.FC<SimulationProps> = ({ config, telemetryRefs, actionTrigger }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Mutable state reference to avoid re-renders on every frame
  const stateRef = useRef<SimulationState>({
    t: 0,
    y0: config.height,
    y: config.height,
    v: 0,
    g: config.gravity,
    mass: config.mass,
    running: false,
    paused: false,
    finished: false,
    cliffEdgeX: -4,
    dropX: 0,
    sharks: []
  });

  // Set initial drop X based on cliff edge
  stateRef.current.dropX = stateRef.current.cliffEdgeX + 4;

  // Refs for Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const objectsRef = useRef<{
    laptop: THREE.Group | null;
    cliff: THREE.Group | null;
    velArrow: THREE.ArrowHelper | null;
    accArrow: THREE.ArrowHelper | null;
    trajGeo: THREE.BufferGeometry | null;
    partMat: THREE.PointsMaterial | null;
    partGeo: THREE.BufferGeometry | null;
    trajPos: Float32Array | null;
    partPos: Float32Array | null;
    partVel: {x:number, y:number, z:number}[] | null;
  }>({
    laptop: null,
    cliff: null,
    velArrow: null,
    accArrow: null,
    trajGeo: null,
    partMat: null,
    partGeo: null,
    trajPos: null,
    partPos: null,
    partVel: null,
  });

  const trajCountRef = useRef(0);
  const animationFrameId = useRef<number>(0);
  const clockRef = useRef(new THREE.Clock());

  // --- HELPERS ---

  const createRuler = (height: number, parentGroup: THREE.Group, dropX: number) => {
      const rulerGroup = new THREE.Group();
      
      // Vertical Line
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(dropX + 2, 0, 0),
          new THREE.Vector3(dropX + 2, height, 0)
      ]);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
      rulerGroup.add(new THREE.Line(lineGeo, lineMat));

      // Ticks
      for (let h = 0; h <= height; h += 10) {
          // Tick mark
          const tickGeo = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(dropX + 1.5, h, 0),
              new THREE.Vector3(dropX + 2.5, h, 0)
          ]);
          rulerGroup.add(new THREE.Line(tickGeo, lineMat));

          // Label (Canvas Texture)
          const canvas = document.createElement('canvas');
          canvas.width = 128; 
          canvas.height = 64;
          const ctx = canvas.getContext('2d');
          if(ctx) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(h + 'm', 64, 48);
          }
          
          const tex = new THREE.CanvasTexture(canvas);
          const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
          const sprite = new THREE.Sprite(spriteMat);
          sprite.position.set(dropX + 4, h, 0);
          sprite.scale.set(4, 2, 1);
          rulerGroup.add(sprite);
      }
      parentGroup.add(rulerGroup);
  };

  const generateCliff = (height: number, scene: THREE.Scene) => {
    const cliffGroup = objectsRef.current.cliff;
    if (!cliffGroup) return;

    // Clear previous
    while(cliffGroup.children.length > 0){ 
        const m = cliffGroup.children[0]; 
        if ((m as any).geometry) (m as any).geometry.dispose(); 
        cliffGroup.remove(m); 
    }

    const w = 50;
    const d = 80;
    const geo = new THREE.BoxGeometry(w, height, d, 10, Math.max(2, Math.floor(height/2)), 10);
    const pos = geo.attributes.position;
    const edgeX = stateRef.current.cliffEdgeX;

    for(let i=0; i < pos.count; i++){
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        
        // Distort face
        if(x > w/2 - 2) {
            const noise = Math.sin(y * 0.5) * Math.cos(z * 0.3) * 2;
            pos.setX(i, x + (Math.random()-0.5)*1.5 + noise);
            pos.setZ(i, z + (Math.random()-0.5)*1.0);
        }
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({ 
        color: 0x5D4037, 
        roughness: 0.9, 
        flatShading: true 
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(-w/2 + edgeX, height/2 - 5, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    cliffGroup.add(mesh);

    // Grass Top
    const grass = new THREE.Mesh(
        new THREE.PlaneGeometry(w, d),
        new THREE.MeshStandardMaterial({ color: 0x4ade80 })
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(-w/2 + edgeX, height - 5 + 0.05, 0);
    grass.receiveShadow = true;
    cliffGroup.add(grass);

    // Ruler
    createRuler(height, cliffGroup, stateRef.current.dropX);
  };

  const createSplash = () => {
      const { partMat, partGeo, partPos } = objectsRef.current;
      if (!partMat || !partGeo || !partPos) return;

      partMat.opacity = 0.8;
      const count = 200;
      const dropX = stateRef.current.dropX;

      const newVel = [];
      for(let i=0; i<count; i++) {
          partPos[i*3] = dropX; 
          partPos[i*3+1] = 0;
          partPos[i*3+2] = 0;
          newVel[i] = {
              x: (Math.random()-0.5) * 8,
              y: Math.random() * 8,
              z: (Math.random()-0.5) * 8
          };
      }
      objectsRef.current.partVel = newVel;
      partGeo.attributes.position.needsUpdate = true;
  };

  const updateTooltip = () => {
      const { tooltip, tooltipTitle, tooltipText } = telemetryRefs.current;
      const { laptop } = objectsRef.current;
      const camera = cameraRef.current;

      if (!tooltip || !tooltipTitle || !tooltipText || !laptop || !camera) return;

      const show = stateRef.current.paused || stateRef.current.finished;
      
      if (!show) {
          tooltip.classList.add('hidden');
          return;
      }

      const vec = laptop.position.clone();
      vec.y += 2;
      vec.project(camera);

      const x = (vec.x * .5 + .5) * window.innerWidth;
      const y = (-(vec.y * .5) + .5) * window.innerHeight;

      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${y}px`;
      tooltip.classList.remove('hidden');

      if (stateRef.current.finished) {
          tooltipTitle.textContent = "SPLASH!";
          tooltipText.textContent = "Experiment finished.";
      } else if (stateRef.current.paused) {
          tooltipTitle.textContent = "PAUSED";
          tooltipText.textContent = "Record data in the log.";
      }
  };

  const resetSimulation = () => {
      const s = stateRef.current;
      s.running = false;
      s.paused = false;
      s.finished = false;
      s.t = 0;
      s.y0 = config.height;
      s.y = config.height;
      s.v = 0;
      s.g = config.gravity;
      
      if (sceneRef.current) {
        generateCliff(s.y0, sceneRef.current);
      }

      // Reset Visuals
      trajCountRef.current = 0;
      if (objectsRef.current.trajGeo) {
          objectsRef.current.trajGeo.setDrawRange(0, 0);
      }
      if (objectsRef.current.partMat) {
          objectsRef.current.partMat.opacity = 0;
      }
      if (objectsRef.current.laptop) {
          objectsRef.current.laptop.rotation.set(0,0,0);
      }

      // Snap Camera
      if (cameraRef.current) {
          const camStartY = s.y0 + 15;
          cameraRef.current.position.set(s.dropX + 30, camStartY, 50);
          cameraRef.current.lookAt(s.dropX, s.y0, 0);
      }

      if (telemetryRefs.current.tooltip) {
          telemetryRefs.current.tooltip.classList.add('hidden');
      }
      
      // Manual render for instant update
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
          // Calculate initial visuals
          const dt = 0;
          const dropX = s.dropX;
          if (objectsRef.current.laptop) objectsRef.current.laptop.position.set(dropX, s.y, 0);
          rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
  };

  // --- INITIALIZATION EFFECT ---
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x1e293b, 0.005);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // LIGHTS
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.2);
    sunLight.position.set(50, 80, 60);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    fillLight.position.set(-50, 20, -50);
    scene.add(fillLight);

    // OCEAN
    const oceanGeo = new THREE.PlaneGeometry(800, 800, 32, 32);
    const oceanMat = new THREE.MeshStandardMaterial({ 
        color: 0x0369a1, // Sky Blue 700
        roughness: 0.1, 
        metalness: 0.6,
        transparent: true,
        opacity: 0.9
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.receiveShadow = true;
    scene.add(ocean);

    // CLIFF
    const cliffGroup = new THREE.Group();
    scene.add(cliffGroup);
    objectsRef.current.cliff = cliffGroup;
    generateCliff(config.height, scene);

    // SHARKS
    const sharkGroup = new THREE.Group();
    scene.add(sharkGroup);
    const sharkGeo = new THREE.ConeGeometry(0.4, 1.5, 8);
    sharkGeo.rotateX(Math.PI / 2);
    const sharkMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    
    const sharks: THREE.Group[] = [];
    for(let i=0; i<6; i++) {
        const cont = new THREE.Group();
        cont.add(new THREE.Mesh(sharkGeo, sharkMat));
        cont.position.set(
            (Math.random()-0.5)*15+5, 
            -0.5-Math.random(), 
            (Math.random()-0.5)*15
        );
        cont.userData = { 
            speed: 0.03 + Math.random()*0.04, 
            angle: Math.random()*Math.PI*2,
            radius: 4 + Math.random()*8,
            centerX: 5
        };
        sharkGroup.add(cont);
        sharks.push(cont);
    }
    stateRef.current.sharks = sharks;

    // WHITE LAPTOP
    const laptopGroup = new THREE.Group();
    const whiteMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        roughness: 0.2, 
        metalness: 0.5 
    });
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 1.1), whiteMat);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 1.1), whiteMat);
    const display = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), screenMat);

    lid.geometry.translate(0, 0, -0.55);
    lid.rotation.x = Math.PI / 2.5;
    lid.geometry.translate(0, 0, 0.55);
    lid.position.y = 0.05;
    lid.position.z = -0.55;
    
    display.rotation.x = -Math.PI/2 + Math.PI/2.5; 
    display.position.set(0, 0.4, -0.75);

    laptopGroup.add(base); laptopGroup.add(lid); laptopGroup.add(display);
    laptopGroup.castShadow = true;
    scene.add(laptopGroup);
    objectsRef.current.laptop = laptopGroup;

    // HELPERS
    const velArrow = new THREE.ArrowHelper(new THREE.Vector3(0,-1,0), new THREE.Vector3(), 1, 0x22d3ee);
    const accArrow = new THREE.ArrowHelper(new THREE.Vector3(0,-1,0), new THREE.Vector3(), 2, 0xfacc15);
    scene.add(velArrow); scene.add(accArrow);
    objectsRef.current.velArrow = velArrow;
    objectsRef.current.accArrow = accArrow;

    // TRAJECTORY (Bright Orange)
    const trajGeo = new THREE.BufferGeometry();
    const trajPos = new Float32Array(3000);
    trajGeo.setAttribute('position', new THREE.BufferAttribute(trajPos, 3));
    const trajMat = new THREE.LineBasicMaterial({ color: 0xff6600, linewidth: 2 });
    const trajLine = new THREE.Line(trajGeo, trajMat);
    trajLine.frustumCulled = false;
    scene.add(trajLine);
    objectsRef.current.trajGeo = trajGeo;
    objectsRef.current.trajPos = trajPos;

    // PARTICLES (Splash)
    const partGeo = new THREE.BufferGeometry();
    const partCount = 200;
    const pPos = new Float32Array(partCount*3);
    partGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const partMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, transparent: true, opacity: 0 });
    const partSys = new THREE.Points(partGeo, partMat);
    scene.add(partSys);
    objectsRef.current.partGeo = partGeo;
    objectsRef.current.partMat = partMat;
    objectsRef.current.partPos = pPos;

    // Init
    resetSimulation();

    const handleResize = () => {
        if (cameraRef.current && rendererRef.current) {
            cameraRef.current.aspect = window.innerWidth / window.innerHeight;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(window.innerWidth, window.innerHeight);
        }
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
        animationFrameId.current = requestAnimationFrame(animate);
        
        const dt = Math.min(clockRef.current.getDelta(), 0.1);
        const state = stateRef.current;

        if (state.running && !state.paused) {
             state.t += dt;
             const dist = 0.5 * state.g * Math.pow(state.t, 2);
             state.y = state.y0 - dist;
             state.v = state.g * state.t;

             if (laptopGroup) {
                laptopGroup.rotation.x += dt * 2.5;
                laptopGroup.rotation.z += dt * 1.0;
             }

             if (state.y <= 0) {
                 state.y = 0;
                 state.finished = true;
                 state.running = false;
                 createSplash();
             }
        }

        // Visuals Update
        if (laptopGroup) {
            laptopGroup.position.set(state.dropX, state.y, 0);
        }

        // Trajectory
        if (!state.finished && trajCountRef.current < 1000 && state.running && objectsRef.current.trajGeo && objectsRef.current.trajPos) {
            objectsRef.current.trajPos[trajCountRef.current*3] = state.dropX;
            objectsRef.current.trajPos[trajCountRef.current*3+1] = state.y;
            objectsRef.current.trajPos[trajCountRef.current*3+2] = 0;
            trajCountRef.current++;
            objectsRef.current.trajGeo.setDrawRange(0, trajCountRef.current);
            objectsRef.current.trajGeo.attributes.position.needsUpdate = true;
        }

        // Arrows
        const origin = laptopGroup.position.clone();
        if (state.v > 0.1 && velArrow) {
            velArrow.visible = true;
            velArrow.position.copy(origin);
            velArrow.position.x += 1.5;
            velArrow.setLength(Math.min(state.v * 0.2, 10), 1, 0.5);
        } else if (velArrow) {
            velArrow.visible = false;
        }
        if (!state.finished && accArrow) {
            accArrow.visible = true;
            accArrow.position.copy(origin);
            accArrow.position.x -= 1.5;
            accArrow.setLength(3, 1, 0.5);
        } else if (accArrow) {
            accArrow.visible = false;
        }

        // Particles
        if (objectsRef.current.partMat && objectsRef.current.partMat.opacity > 0 && objectsRef.current.partPos && objectsRef.current.partVel) {
            for(let i=0; i<200; i++) {
                const vel = objectsRef.current.partVel[i];
                objectsRef.current.partPos[i*3] += vel.x * dt;
                objectsRef.current.partPos[i*3+1] += vel.y * dt;
                objectsRef.current.partPos[i*3+2] += vel.z * dt;
                vel.y -= 9.81 * dt;
                if(objectsRef.current.partPos[i*3+1] < 0) objectsRef.current.partPos[i*3+1] = 0;
            }
            if (objectsRef.current.partGeo) {
                objectsRef.current.partGeo.attributes.position.needsUpdate = true;
            }
            objectsRef.current.partMat.opacity -= dt * 0.8;
        }

        // Sharks
        state.sharks.forEach(s => {
            const d = s.userData;
            d.angle += d.speed;
            s.position.x = d.centerX + Math.cos(d.angle)*d.radius;
            s.position.z = Math.sin(d.angle)*d.radius;
            s.rotation.y = -d.angle;
        });

        // Camera
        const camY = Math.max(state.y, 10);
        const targetPos = new THREE.Vector3(state.dropX + 30, camY + 10, 50);
        camera.position.lerp(targetPos, 0.1);
        camera.lookAt(state.dropX, camY - 5, 0);

        // Telemetry
        const tRefs = telemetryRefs.current;
        if (tRefs.time) tRefs.time.textContent = state.t.toFixed(2) + ' s';
        if (tRefs.height) tRefs.height.textContent = state.y.toFixed(2) + ' m';
        if (tRefs.velocity) tRefs.velocity.textContent = state.v.toFixed(2) + ' m/s';
        if (tRefs.acceleration) tRefs.acceleration.textContent = state.g.toFixed(2) + ' m/s²';

        updateTooltip();
        renderer.render(scene, camera);
    };

    animate();

    return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationFrameId.current);
        if (containerRef.current && rendererRef.current) {
            containerRef.current.removeChild(rendererRef.current.domElement);
        }
    };
  }, []);

  // --- EFFECT HOOKS ---

  useEffect(() => {
      const s = stateRef.current;
      s.g = config.gravity;
      s.mass = config.mass;
      if (!s.running && Math.abs(s.y0 - config.height) > 0.01) {
          s.y0 = config.height;
          resetSimulation();
      }
  }, [config]);

  useEffect(() => {
      if (!actionTrigger) return;
      const s = stateRef.current;
      
      switch (actionTrigger.type) {
          case SimulationAction.START:
              if (s.finished) resetSimulation();
              s.running = true;
              s.paused = false;
              break;
          case SimulationAction.PAUSE:
              if (!s.running || s.finished) return;
              s.paused = !s.paused;
              break;
          case SimulationAction.STEP:
             if (s.finished) return;
             s.running = true;
             s.paused = true;
             
             const dt = 0.1;
             s.t += dt;
             const dist = 0.5 * s.g * Math.pow(s.t, 2);
             s.y = s.y0 - dist;
             s.v = s.g * s.t;
             
             if (objectsRef.current.laptop) {
                 objectsRef.current.laptop.rotation.x += dt * 2.5;
                 objectsRef.current.laptop.rotation.z += dt * 1.0;
             }

             if (s.y <= 0) {
                 s.y = 0;
                 s.finished = true;
                 s.running = false;
                 createSplash();
             }
             break;
          case SimulationAction.RESET:
              resetSimulation();
              break;
      }
  }, [actionTrigger]);

  return (
      <>
        <div ref={containerRef} className="w-full h-full absolute top-0 left-0 z-10" />
        {/* Tooltip Portal */}
        <div 
            ref={(el) => { if (telemetryRefs.current) telemetryRefs.current.tooltip = el; }}
            className="hidden absolute z-30 bg-slate-900/95 border border-cyan-500/50 p-4 rounded-xl shadow-2xl max-w-xs transform -translate-x-1/2 -translate-y-full mb-4 transition-all duration-300"
        >
             <h4 
                ref={(el) => { if (telemetryRefs.current) telemetryRefs.current.tooltipTitle = el; }}
                className="font-bold text-cyan-400 text-sm mb-1 uppercase tracking-wider"
             >
                Info
             </h4>
             <p 
                ref={(el) => { if (telemetryRefs.current) telemetryRefs.current.tooltipText = el; }}
                className="text-xs text-slate-300 leading-relaxed"
             >
             </p>
             <div className="tooltip-arrow"></div>
        </div>
      </>
  );
};

export default Simulation;
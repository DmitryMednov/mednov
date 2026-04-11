/* ===== PHILOSOPHY SCENE — Interactive glass shapes ===== */
/* Three.js scene with floating glass geometry — mouse-reactive */

(function () {
  const container = document.getElementById('philosophy-canvas');
  if (!container || typeof THREE === 'undefined') return;

  const isMobile = window.innerWidth < 768;

  /* --- Setup --- */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 7);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: !isMobile,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  container.appendChild(renderer.domElement);

  /* --- Lights --- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));

  const light1 = new THREE.PointLight(0x2CB0A8, 60, 40);
  light1.position.set(5, 4, 5);
  scene.add(light1);

  const light2 = new THREE.PointLight(0xCCD4FD, 45, 40);
  light2.position.set(-5, -3, 4);
  scene.add(light2);

  const light3 = new THREE.PointLight(0xFAFFAF, 25, 30);
  light3.position.set(0, 5, -2);
  scene.add(light3);

  /* --- Materials --- */
  const turquoise = 0x2CB0A8;
  const violet = 0xCCD4FD;
  const yellow = 0xFAFFAF;
  const white = 0xEAECF2;

  function glassMat(color, opacity) {
    return new THREE.MeshPhysicalMaterial({
      color: color,
      metalness: 0.15,
      roughness: 0.12,
      transparent: true,
      opacity: opacity || 0.7,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      side: THREE.DoubleSide,
    });
  }

  /* --- The central "point" — glowing sphere that is the
         symbolic "точка отсчёта" around which shapes orbit --- */
  const dotGeo = new THREE.SphereGeometry(0.28, 48, 48);
  const dotMat = new THREE.MeshStandardMaterial({
    color: turquoise,
    emissive: turquoise,
    emissiveIntensity: 1.2,
    metalness: 0.2,
    roughness: 0.1,
  });
  const dot = new THREE.Mesh(dotGeo, dotMat);
  scene.add(dot);

  // Glow halo (additive blending sprite-like plane)
  const haloGeo = new THREE.RingGeometry(0.35, 0.9, 64);
  const haloMat = new THREE.MeshBasicMaterial({
    color: turquoise,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  scene.add(halo);

  /* --- Orbiting glass shapes --- */
  const shapes = [];
  const SHAPE_DEFS = [
    { geo: new THREE.IcosahedronGeometry(0.7, 0), color: turquoise, opacity: 0.55 },
    { geo: new THREE.TorusGeometry(0.55, 0.2, 16, 48), color: violet, opacity: 0.6 },
    { geo: new THREE.OctahedronGeometry(0.6, 0), color: yellow, opacity: 0.55 },
    { geo: new THREE.TorusKnotGeometry(0.4, 0.15, 64, 16), color: turquoise, opacity: 0.5 },
    { geo: new THREE.DodecahedronGeometry(0.55, 0), color: violet, opacity: 0.55 },
    { geo: new THREE.TetrahedronGeometry(0.6, 0), color: white, opacity: 0.5 },
    { geo: new THREE.BoxGeometry(0.7, 0.7, 0.7), color: turquoise, opacity: 0.55 },
  ];

  SHAPE_DEFS.forEach((def, i) => {
    const mat = glassMat(def.color, def.opacity);
    const mesh = new THREE.Mesh(def.geo, mat);

    const angle = (i / SHAPE_DEFS.length) * Math.PI * 2;
    const radius = 1.8 + (i % 2) * 0.6;
    const basePos = new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * 0.8,
      Math.sin(angle * 2) * 0.5
    );

    mesh.position.copy(basePos);
    mesh.scale.setScalar(0.7 + Math.random() * 0.4);
    mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    scene.add(mesh);
    shapes.push({
      mesh,
      basePos: basePos.clone(),
      orbitSpeed: 0.2 + Math.random() * 0.3,
      orbitRadius: radius,
      angleStart: angle,
      rotSpeed: {
        x: (Math.random() - 0.5) * 0.01,
        y: (Math.random() - 0.5) * 0.01,
        z: (Math.random() - 0.5) * 0.006,
      },
      baseOpacity: def.opacity,
      velocity: new THREE.Vector3(),
    });
  });

  /* --- Particle field (subtle ambient dust) --- */
  const particleCount = isMobile ? 60 : 150;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 14;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: turquoise,
    size: 0.035,
    transparent: true,
    opacity: 0.35,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  /* --- Mouse tracking --- */
  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let mouseInside = false;

  container.addEventListener('pointermove', (e) => {
    const rect = container.getBoundingClientRect();
    mouse.targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    mouse.targetY = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
    mouseInside = true;
  }, { passive: true });

  container.addEventListener('pointerleave', () => {
    mouseInside = false;
    mouse.targetX = 0;
    mouse.targetY = 0;
  });

  /* --- Resize --- */
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.fov = w < h ? 60 : 50;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  const ro = new ResizeObserver(() => resize());
  ro.observe(container);
  resize();

  /* --- Animate --- */
  const _tmpVec = new THREE.Vector3();
  const clock = new THREE.Clock();
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Smooth mouse
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    // Camera parallax
    camera.position.x = mouse.x * 0.8;
    camera.position.y = mouse.y * 0.6;
    camera.lookAt(0, 0, 0);

    // Central dot — pulse + rotate
    const pulse = 1 + Math.sin(t * 2) * 0.08;
    dot.scale.setScalar(pulse);
    dotMat.emissiveIntensity = 1.0 + Math.sin(t * 2.5) * 0.4;

    // Halo — rotate + pulse
    halo.rotation.z = t * 0.3;
    haloMat.opacity = 0.08 + Math.sin(t * 1.5) * 0.05;

    // Repulsion origin from mouse
    _tmpVec.set(mouse.x * 3, mouse.y * 2.5, 1);

    // Animate shapes
    for (let i = 0; i < shapes.length; i++) {
      const s = shapes[i];
      const mesh = s.mesh;

      // Orbital motion around center
      const angle = s.angleStart + t * s.orbitSpeed;
      const targetX = Math.cos(angle) * s.orbitRadius;
      const targetY = Math.sin(angle) * s.orbitRadius * 0.8;
      const targetZ = Math.sin(angle * 2 + t * 0.3) * 0.6;

      // Mouse repulsion
      const dx = mesh.position.x - _tmpVec.x;
      const dy = mesh.position.y - _tmpVec.y;
      const dz = mesh.position.z - _tmpVec.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < 9 && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        const force = (1 - dist / 3) * 0.15;
        s.velocity.x += (dx / dist) * force;
        s.velocity.y += (dy / dist) * force;
        s.velocity.z += (dz / dist) * force;
      }

      // Spring + damping
      s.velocity.x += (targetX - mesh.position.x) * 0.03;
      s.velocity.y += (targetY - mesh.position.y) * 0.03;
      s.velocity.z += (targetZ - mesh.position.z) * 0.03;
      s.velocity.multiplyScalar(0.88);
      mesh.position.add(s.velocity);

      // Rotation
      mesh.rotation.x += s.rotSpeed.x;
      mesh.rotation.y += s.rotSpeed.y;
      mesh.rotation.z += s.rotSpeed.z;
    }

    // Particles — gentle rotation
    particles.rotation.y = t * 0.02;

    // Animated lights
    light1.position.x = 5 + Math.sin(t * 0.3) * 2;
    light1.position.y = 4 + Math.cos(t * 0.25) * 1.5;
    light2.position.x = -5 + Math.cos(t * 0.4) * 2;
    light2.position.y = -3 + Math.sin(t * 0.35) * 1.5;

    renderer.render(scene, camera);
  }

  animate();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animId);
    else { clock.getDelta(); animate(); }
  });
})();

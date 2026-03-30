/* ===== MEDNOV 3D HERO SCENE — v2.1 ===== */
/* Three.js interactive scene — centered, responsive, optimized */

(function () {
  const container = document.getElementById('hero-3d');
  if (!container) return;

  // Bail on very low-end devices
  const isMobile = window.innerWidth < 768;
  const isLowEnd = isMobile && window.devicePixelRatio < 2;

  /* --- Setup --- */
  const scene = new THREE.Scene();

  // Adaptive FOV: wider on mobile for better framing
  const baseFov = isMobile ? 60 : 50;
  const camera = new THREE.PerspectiveCamera(baseFov, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: !isMobile, // skip AA on mobile for perf
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  /* --- Lights --- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  const light1 = new THREE.PointLight(0x2CB0A8, 80, 50);
  light1.position.set(6, 5, 6);
  scene.add(light1);

  const light2 = new THREE.PointLight(0xCCD4FD, 50, 50);
  light2.position.set(-6, -3, 5);
  scene.add(light2);

  const light3 = new THREE.PointLight(0xFAFFAF, 25, 40);
  light3.position.set(0, 6, -3);
  scene.add(light3);

  /* --- Materials --- */
  const turquoise = 0x2CB0A8;
  const violet = 0xCCD4FD;
  const yellow = 0xFAFFAF;
  const deepGreen = 0x053B3A;
  const white = 0xEAECF2;

  function glassMat(color, opacity) {
    return new THREE.MeshPhysicalMaterial({
      color: color,
      metalness: 0.1,
      roughness: 0.15,
      transparent: true,
      opacity: opacity || 0.65,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
    });
  }

  function solidMat(color) {
    return new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.3,
      roughness: 0.4,
      transparent: true,
      opacity: 0.85,
    });
  }

  /* --- Geometries --- */
  const geos = [
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.TorusGeometry(0.7, 0.3, 16, 32),
    new THREE.OctahedronGeometry(0.9, 0),
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.SphereGeometry(0.6, 32, 32),
    new THREE.TorusKnotGeometry(0.5, 0.2, 64, 16),
    new THREE.TetrahedronGeometry(0.8, 0),
    new THREE.ConeGeometry(0.6, 1.2, 6),
    new THREE.DodecahedronGeometry(0.7, 0),
    new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8),
  ];

  const colors = [turquoise, violet, yellow, deepGreen, white, turquoise, violet, yellow, turquoise, violet];
  const matTypes = ['glass', 'solid', 'glass', 'solid', 'glass', 'glass', 'solid', 'glass', 'solid', 'glass'];

  /* --- Create floating objects — centered distribution --- */
  const objects = [];
  const COUNT = isMobile ? 12 : 18;

  for (let i = 0; i < COUNT; i++) {
    const geoIndex = i % geos.length;
    const colorIndex = i % colors.length;
    const isGlass = matTypes[geoIndex] === 'glass';
    const mat = isGlass
      ? glassMat(colors[colorIndex], 0.4 + Math.random() * 0.3)
      : solidMat(colors[colorIndex]);

    const mesh = new THREE.Mesh(geos[geoIndex], mat);

    // Fibonacci sphere distribution — CENTERED at origin
    const phi = Math.acos(1 - 2 * (i + 0.5) / COUNT);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const radius = 2.5 + Math.random() * 3.5;

    const basePos = new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi) * 0.5 // flatten Z spread to keep centered
    );

    mesh.position.copy(basePos);
    const s = 0.35 + Math.random() * 0.55;
    mesh.scale.setScalar(s);
    mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    scene.add(mesh);

    objects.push({
      mesh,
      basePos: basePos.clone(),
      baseOpacity: mat.opacity,
      scale: s,
      rotSpeed: {
        x: (Math.random() - 0.5) * 0.006,
        y: (Math.random() - 0.5) * 0.006,
        z: (Math.random() - 0.5) * 0.004,
      },
      floatSpeed: 0.3 + Math.random() * 0.6,
      floatAmp: 0.2 + Math.random() * 0.4,
      floatPhase: Math.random() * Math.PI * 2,
      velocity: new THREE.Vector3(0, 0, 0),
    });
  }

  /* --- Central logo sphere (glowing dot) --- */
  const logoGeo = new THREE.SphereGeometry(0.5, 48, 48);
  const logoMat = new THREE.MeshStandardMaterial({
    color: turquoise,
    emissive: turquoise,
    emissiveIntensity: 0.8,
    metalness: 0.2,
    roughness: 0.1,
    transparent: true,
    opacity: 0.9,
  });
  const logoMesh = new THREE.Mesh(logoGeo, logoMat);
  logoMesh.position.set(0, 0, 0);
  scene.add(logoMesh);

  // Orbital rings
  const ringGeo = new THREE.TorusGeometry(1.0, 0.015, 16, 100);
  const ringMat = new THREE.MeshBasicMaterial({ color: turquoise, transparent: true, opacity: 0.25 });
  const ring1 = new THREE.Mesh(ringGeo, ringMat);
  scene.add(ring1);
  const ring2 = new THREE.Mesh(ringGeo, ringMat.clone());
  ring2.rotation.x = Math.PI / 3;
  scene.add(ring2);
  const ring3 = new THREE.Mesh(ringGeo, ringMat.clone());
  ring3.rotation.x = -Math.PI / 4;
  ring3.rotation.y = Math.PI / 3;
  scene.add(ring3);

  /* --- Particle field --- */
  const particleCount = isMobile ? 80 : 200;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 24;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 24;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 3;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const particleMat = new THREE.PointsMaterial({
    color: turquoise, size: 0.04, transparent: true, opacity: 0.35, sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  /* --- Mouse tracking --- */
  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

  document.addEventListener('mousemove', (e) => {
    mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      mouse.targetX = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      mouse.targetY = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
    }
  }, { passive: true });

  /* --- Scroll tracking --- */
  let scrollProgress = 0;
  let scrollTarget = 0;
  window.addEventListener('scroll', () => {
    const heroH = container.parentElement ? container.parentElement.offsetHeight : window.innerHeight;
    scrollTarget = Math.min(window.scrollY / heroH, 1);
  }, { passive: true });

  /* --- Resize --- */
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    // Adjust camera Z based on aspect ratio to keep scene centered
    camera.fov = w < h ? 65 : 50; // wider FOV on portrait
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  const ro = new ResizeObserver(() => resize());
  ro.observe(container);
  resize();

  /* --- Reusable temp vector --- */
  const _tmpVec = new THREE.Vector3();

  /* --- Animation loop --- */
  const clock = new THREE.Clock();
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Smooth mouse (lerp)
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    // Smooth scroll
    scrollProgress += (scrollTarget - scrollProgress) * 0.08;

    // Camera — centered with subtle mouse parallax
    camera.position.x = mouse.x * 1.5;
    camera.position.y = mouse.y * 1.0;
    camera.position.z = 10 + scrollProgress * 6;
    camera.lookAt(0, 0, 0);

    // Logo pulse
    const pulse = 1 + Math.sin(t * 2) * 0.04;
    logoMesh.scale.setScalar(pulse);
    logoMat.emissiveIntensity = 0.6 + Math.sin(t * 3) * 0.25;
    logoMesh.rotation.y = t * 0.25;

    // Rings
    ring1.rotation.z = t * 0.15;
    ring2.rotation.z = -t * 0.12;
    ring2.rotation.x = Math.PI / 3 + Math.sin(t * 0.5) * 0.08;
    ring3.rotation.z = t * 0.08;
    ring3.rotation.y = Math.PI / 3 + Math.cos(t * 0.3) * 0.08;

    // Mouse position in 3D space for repulsion
    _tmpVec.set(mouse.x * 6, mouse.y * 4, 1.5);

    // Animate objects
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      const mesh = obj.mesh;

      // Floating
      const ft = t * obj.floatSpeed + obj.floatPhase;
      const floatY = Math.sin(ft) * obj.floatAmp;
      const floatX = Math.cos(ft * 0.7) * obj.floatAmp * 0.4;

      // Target position with scroll spread
      const spread = 1 + scrollProgress * 0.6;
      const targetX = obj.basePos.x * spread + floatX;
      const targetY = obj.basePos.y * spread + floatY;
      const targetZ = obj.basePos.z - scrollProgress * 4;

      // Mouse repulsion
      const dx = mesh.position.x - _tmpVec.x;
      const dy = mesh.position.y - _tmpVec.y;
      const dz = mesh.position.z - _tmpVec.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const repulseRadiusSq = 16; // 4^2

      if (distSq < repulseRadiusSq && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        const force = (1 - dist / 4) * 0.12;
        obj.velocity.x += (dx / dist) * force;
        obj.velocity.y += (dy / dist) * force;
        obj.velocity.z += (dz / dist) * force;
      }

      // Spring back
      obj.velocity.x += (targetX - mesh.position.x) * 0.025;
      obj.velocity.y += (targetY - mesh.position.y) * 0.025;
      obj.velocity.z += (targetZ - mesh.position.z) * 0.025;

      // Damping
      obj.velocity.multiplyScalar(0.9);

      // Apply
      mesh.position.add(obj.velocity);

      // Rotation
      mesh.rotation.x += obj.rotSpeed.x;
      mesh.rotation.y += obj.rotSpeed.y;
      mesh.rotation.z += obj.rotSpeed.z;

      // Opacity — stable value, no random flicker
      const targetOpacity = obj.baseOpacity * (1 - scrollProgress * 0.4);
      mesh.material.opacity += (targetOpacity - mesh.material.opacity) * 0.05;
    }

    // Particles
    particles.rotation.y = t * 0.015;
    particles.rotation.x = Math.sin(t * 0.008) * 0.08;

    // Lights
    light1.position.x = 6 + Math.sin(t * 0.4) * 2;
    light1.position.y = 5 + Math.cos(t * 0.25) * 1.5;
    light2.position.x = -6 + Math.cos(t * 0.35) * 2;
    light2.position.y = -3 + Math.sin(t * 0.5) * 1.5;

    renderer.render(scene, camera);
  }

  animate();

  /* --- Pause when tab hidden --- */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
    } else {
      clock.getDelta();
      animate();
    }
  });
})();

/* ===== MEDNOV 3D HERO SCENE ===== */
/* Three.js interactive scene with floating geometry, mouse parallax, scroll animation */

(function () {
  const container = document.getElementById('hero-3d');
  if (!container) return;

  /* --- Setup --- */
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  /* --- Lights --- */
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  const light1 = new THREE.PointLight(0x2CB0A8, 80, 50);
  light1.position.set(8, 6, 8);
  scene.add(light1);

  const light2 = new THREE.PointLight(0xCCD4FD, 60, 50);
  light2.position.set(-8, -4, 6);
  scene.add(light2);

  const light3 = new THREE.PointLight(0xFAFFAF, 30, 40);
  light3.position.set(0, 8, -4);
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
      opacity: opacity || 0.7,
      transmission: 0.4,
      thickness: 1.5,
      envMapIntensity: 0.5,
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

  /* --- Create floating objects --- */
  const objects = [];
  const COUNT = 18;

  for (let i = 0; i < COUNT; i++) {
    const geoIndex = i % geos.length;
    const colorIndex = i % colors.length;
    const isGlass = matTypes[geoIndex] === 'glass';
    const mat = isGlass
      ? glassMat(colors[colorIndex], 0.5 + Math.random() * 0.3)
      : solidMat(colors[colorIndex]);

    const mesh = new THREE.Mesh(geos[geoIndex], mat);

    // Distribute in a sphere-like pattern
    const phi = Math.acos(1 - 2 * (i + 0.5) / COUNT);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const radius = 4 + Math.random() * 4;

    const basePos = new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi) - 2
    );

    mesh.position.copy(basePos);
    const s = 0.4 + Math.random() * 0.6;
    mesh.scale.setScalar(s);
    mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    scene.add(mesh);

    objects.push({
      mesh: mesh,
      basePos: basePos.clone(),
      scale: s,
      rotSpeed: {
        x: (Math.random() - 0.5) * 0.008,
        y: (Math.random() - 0.5) * 0.008,
        z: (Math.random() - 0.5) * 0.005,
      },
      floatSpeed: 0.3 + Math.random() * 0.7,
      floatAmp: 0.3 + Math.random() * 0.5,
      floatPhase: Math.random() * Math.PI * 2,
      // For mouse repulsion
      velocity: new THREE.Vector3(0, 0, 0),
    });
  }

  /* --- Central logo sphere (glowing dot) --- */
  const logoGeo = new THREE.SphereGeometry(0.6, 64, 64);
  const logoMat = new THREE.MeshPhysicalMaterial({
    color: turquoise,
    emissive: turquoise,
    emissiveIntensity: 0.8,
    metalness: 0.2,
    roughness: 0.1,
    transparent: true,
    opacity: 0.9,
    transmission: 0.3,
    thickness: 2,
    clearcoat: 1,
  });
  const logoMesh = new THREE.Mesh(logoGeo, logoMat);
  logoMesh.position.set(0, 0, 0);
  scene.add(logoMesh);

  // Glow ring around logo
  const ringGeo = new THREE.TorusGeometry(1.2, 0.02, 16, 100);
  const ringMat = new THREE.MeshBasicMaterial({
    color: turquoise,
    transparent: true,
    opacity: 0.3,
  });
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
  const particleCount = 200;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const particleSizes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;
    particleSizes[i] = Math.random() * 2 + 0.5;
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));

  const particleMat = new THREE.PointsMaterial({
    color: turquoise,
    size: 0.04,
    transparent: true,
    opacity: 0.4,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  /* --- Mouse tracking --- */
  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  const mouseWorld = new THREE.Vector3();

  document.addEventListener('mousemove', (e) => {
    mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
  }, { passive: true });

  /* --- Scroll tracking --- */
  let scrollProgress = 0;
  let scrollTarget = 0;
  window.addEventListener('scroll', () => {
    const heroH = container.parentElement ? container.parentElement.offsetHeight : window.innerHeight;
    scrollTarget = Math.min(window.scrollY / heroH, 1);
  }, { passive: true });

  /* --- Touch support --- */
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      mouse.targetX = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      mouse.targetY = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
    }
  }, { passive: true });

  /* --- Resize --- */
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  const ro = new ResizeObserver(() => resize());
  ro.observe(container);
  resize();

  /* --- Animation loop --- */
  const clock = new THREE.Clock();
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dt = clock.getDelta();

    // Smooth mouse
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    // Smooth scroll
    scrollProgress += (scrollTarget - scrollProgress) * 0.08;

    // Camera parallax from mouse
    camera.position.x = mouse.x * 2.5;
    camera.position.y = mouse.y * 1.5;
    camera.position.z = 14 + scrollProgress * 8;
    camera.lookAt(0, 0, 0);

    // Logo pulse
    const pulse = 1 + Math.sin(t * 2) * 0.05;
    logoMesh.scale.setScalar(pulse);
    logoMat.emissiveIntensity = 0.6 + Math.sin(t * 3) * 0.3;
    logoMesh.rotation.y = t * 0.3;

    // Rings rotation
    ring1.rotation.z = t * 0.2;
    ring2.rotation.z = -t * 0.15;
    ring2.rotation.x = Math.PI / 3 + Math.sin(t * 0.5) * 0.1;
    ring3.rotation.z = t * 0.1;
    ring3.rotation.y = Math.PI / 3 + Math.cos(t * 0.3) * 0.1;

    // Animate objects
    const mouseWorld3D = new THREE.Vector3(mouse.x * 8, mouse.y * 5, 2);

    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      const mesh = obj.mesh;

      // Floating motion
      const ft = t * obj.floatSpeed + obj.floatPhase;
      const floatY = Math.sin(ft) * obj.floatAmp;
      const floatX = Math.cos(ft * 0.7) * obj.floatAmp * 0.5;

      // Target position (base + float + scroll spread)
      const spreadFactor = 1 + scrollProgress * 0.8;
      const targetX = obj.basePos.x * spreadFactor + floatX;
      const targetY = obj.basePos.y * spreadFactor + floatY;
      const targetZ = obj.basePos.z - scrollProgress * 6;

      // Mouse repulsion
      const dx = mesh.position.x - mouseWorld3D.x;
      const dy = mesh.position.y - mouseWorld3D.y;
      const dz = mesh.position.z - mouseWorld3D.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const repulseRadius = 4;

      if (dist < repulseRadius && dist > 0.01) {
        const force = (1 - dist / repulseRadius) * 0.15;
        obj.velocity.x += (dx / dist) * force;
        obj.velocity.y += (dy / dist) * force;
        obj.velocity.z += (dz / dist) * force;
      }

      // Spring back to target
      obj.velocity.x += (targetX - mesh.position.x) * 0.02;
      obj.velocity.y += (targetY - mesh.position.y) * 0.02;
      obj.velocity.z += (targetZ - mesh.position.z) * 0.02;

      // Damping
      obj.velocity.multiplyScalar(0.92);

      // Apply
      mesh.position.add(obj.velocity);

      // Rotation
      mesh.rotation.x += obj.rotSpeed.x;
      mesh.rotation.y += obj.rotSpeed.y;
      mesh.rotation.z += obj.rotSpeed.z;

      // Fade on scroll
      mesh.material.opacity = mesh.material.opacity * 0.95 +
        (obj.mesh.material === logoMat ? 0.9 : (0.5 + Math.random() * 0.3) * (1 - scrollProgress * 0.5)) * 0.05;
    }

    // Animate particles
    particles.rotation.y = t * 0.02;
    particles.rotation.x = Math.sin(t * 0.01) * 0.1;

    // Animate lights
    light1.position.x = 8 + Math.sin(t * 0.5) * 3;
    light1.position.y = 6 + Math.cos(t * 0.3) * 2;
    light2.position.x = -8 + Math.cos(t * 0.4) * 3;
    light2.position.y = -4 + Math.sin(t * 0.6) * 2;

    renderer.render(scene, camera);
  }

  animate();

  /* --- Cleanup on page hide --- */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
    } else {
      clock.getDelta(); // reset delta
      animate();
    }
  });
})();

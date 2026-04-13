/* ===== MEDNOV 3D HERO SCENE — v4 ===== */
/* ES module: glass material on all floating geometry, central logo, mouse parallax */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

(function () {
  const container = document.getElementById('hero-3d');
  if (!container) return;

  const isMobile = window.innerWidth < 768;

  /* --- Setup --- */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(isMobile ? 60 : 50, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: !isMobile,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  /* --- Environment for glass reflections (same as birthday "60") --- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const roomEnv = new RoomEnvironment();
  scene.environment = pmrem.fromScene(roomEnv, 0.04).texture;
  roomEnv.dispose?.();

  /* --- Lights --- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  const light1 = new THREE.PointLight(0x2cb0a8, 60, 50);
  light1.position.set(6, 5, 6);
  scene.add(light1);

  const light2 = new THREE.PointLight(0xccd4fd, 40, 50);
  light2.position.set(-6, -3, 5);
  scene.add(light2);

  const light3 = new THREE.PointLight(0xfaffaf, 20, 40);
  light3.position.set(0, 6, -3);
  scene.add(light3);

  /* --- Brand palette (strictly the 5 official colors, no inventions) --- */
  const PALETTE = {
    white:     0xffffff,
    turquoise: 0x2cb0a8,
    deepGreen: 0x053b3a,
    violet:    0xccd4fd,
    yellow:    0xfaffaf,
  };

  /* --- Glass material factory ---
     Tinted glass: the brand color is used as the surface color (not just
     attenuation) so the tint reads clearly even at low opacity. */
  function glassMat(tintHex) {
    const c = new THREE.Color(tintHex);
    const mat = new THREE.MeshPhysicalMaterial({
      color: c,
      metalness: 0.0,
      roughness: 0.06,
      transmission: 1.0,
      thickness: 0.7,
      ior: 1.42,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      iridescence: isMobile ? 0.25 : 0.45,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [100, 800],
      attenuationColor: c.clone().multiplyScalar(0.85),
      attenuationDistance: 1.8,
      envMapIntensity: 1.5,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    if ('dispersion' in mat) mat.dispersion = isMobile ? 0.6 : 1.0;
    return mat;
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

  /* Color pairs from the brand book — cycle so adjacent shapes never share
     a tint. Turquoise is the primary brand color and appears most often;
     white / violet / yellow are accents. Deep green is reserved for the
     background and is intentionally skipped here. */
  const tints = [
    PALETTE.turquoise,
    PALETTE.violet,
    PALETTE.turquoise,
    PALETTE.yellow,
    PALETTE.white,
    PALETTE.turquoise,
    PALETTE.violet,
    PALETTE.yellow,
    PALETTE.turquoise,
    PALETTE.white,
    PALETTE.violet,
    PALETTE.turquoise,
    PALETTE.yellow,
    PALETTE.violet,
  ];

  /* --- Floating objects --- */
  const objects = [];
  const COUNT = isMobile ? 9 : 14;

  for (let i = 0; i < COUNT; i++) {
    const geoIndex = i % geos.length;
    const tintIndex = i % tints.length;
    const mat = glassMat(tints[tintIndex]);

    const mesh = new THREE.Mesh(geos[geoIndex], mat);

    // Fibonacci sphere — centered, with inner gap to leave room for logo
    const phi = Math.acos(1 - 2 * (i + 0.5) / COUNT);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const radius = 3.5 + Math.random() * 3;

    const basePos = new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi) * 0.4
    );

    mesh.position.copy(basePos);
    const s = 0.35 + Math.random() * 0.55;
    mesh.scale.setScalar(s);
    mesh.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
    scene.add(mesh);

    objects.push({
      mesh,
      basePos: basePos.clone(),
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

  /* --- Central 3D Logo (logo-3d.png as textured plane) --- */
  let logoMesh = null;
  const logoSize = isMobile ? 3 : 4;

  const loader = new THREE.TextureLoader();
  loader.load('logo-3d.png', (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    const img = texture.image;
    const aspect = img.width / img.height;
    const planeW = logoSize * aspect;
    const planeH = logoSize;

    const geo = new THREE.PlaneGeometry(planeW, planeH);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    logoMesh = new THREE.Mesh(geo, mat);
    logoMesh.position.set(0, 0, 0.5);
    scene.add(logoMesh);
  });

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
    color: PALETTE.turquoise,
    size: 0.04,
    transparent: true,
    opacity: 0.35,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  /* --- Mouse --- */
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

  /* --- Scroll --- */
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
    camera.fov = w < h ? 65 : 50;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  const ro = new ResizeObserver(() => resize());
  ro.observe(container);
  resize();

  /* --- Animation --- */
  const _tmpVec = new THREE.Vector3();
  const clock = new THREE.Clock();
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Smooth mouse
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    // Smooth scroll
    scrollProgress += (scrollTarget - scrollProgress) * 0.08;

    // Camera parallax
    camera.position.x = mouse.x * 1.5;
    camera.position.y = mouse.y * 1.0;
    camera.position.z = 10 + scrollProgress * 6;
    camera.lookAt(0, 0, 0);

    // Logo: gentle float + always face camera + slight tilt from mouse
    if (logoMesh) {
      logoMesh.lookAt(camera.position);
      logoMesh.position.y = Math.sin(t * 0.8) * 0.15;
      logoMesh.position.z = 0.5 + Math.cos(t * 0.6) * 0.1;
      const pulse = 1 + Math.sin(t * 1.5) * 0.02;
      logoMesh.scale.setScalar(pulse);
      logoMesh.material.opacity = 1 - scrollProgress * 0.6;
    }

    // Repulsion origin
    _tmpVec.set(mouse.x * 6, mouse.y * 4, 1.5);

    // Animate floating glass objects
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      const mesh = obj.mesh;

      const ft = t * obj.floatSpeed + obj.floatPhase;
      const floatY = Math.sin(ft) * obj.floatAmp;
      const floatX = Math.cos(ft * 0.7) * obj.floatAmp * 0.4;

      const spread = 1 + scrollProgress * 0.6;
      const targetX = obj.basePos.x * spread + floatX;
      const targetY = obj.basePos.y * spread + floatY;
      const targetZ = obj.basePos.z - scrollProgress * 4;

      // Mouse repulsion
      const dx = mesh.position.x - _tmpVec.x;
      const dy = mesh.position.y - _tmpVec.y;
      const dz = mesh.position.z - _tmpVec.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < 16 && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        const force = (1 - dist / 4) * 0.12;
        obj.velocity.x += (dx / dist) * force;
        obj.velocity.y += (dy / dist) * force;
        obj.velocity.z += (dz / dist) * force;
      }

      // Spring + damping
      obj.velocity.x += (targetX - mesh.position.x) * 0.025;
      obj.velocity.y += (targetY - mesh.position.y) * 0.025;
      obj.velocity.z += (targetZ - mesh.position.z) * 0.025;
      obj.velocity.multiplyScalar(0.9);
      mesh.position.add(obj.velocity);

      mesh.rotation.x += obj.rotSpeed.x;
      mesh.rotation.y += obj.rotSpeed.y;
      mesh.rotation.z += obj.rotSpeed.z;
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

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animId);
    else { clock.getDelta(); animate(); }
  });
})();

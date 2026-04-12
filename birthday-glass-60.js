/* ===================================================================
   BIRTHDAY — Glass "60" WebGL effect
   Uses MeshPhysicalMaterial with transmission (glass dispersion),
   inspired by kellymilligan/codrops-oct-2021-final
   =================================================================== */

import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

(function initGlass60() {
  const container = document.getElementById('glass-60');
  if (!container) return;

  /* ---------- Scene ---------- */
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: window.innerWidth > 768,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  /* ---------- Environment (needed for glass transmission reflections) ---------- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const roomEnv = new RoomEnvironment();
  scene.environment = pmrem.fromScene(roomEnv, 0.04).texture;
  roomEnv.dispose?.();

  /* ---------- Lights ---------- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));

  const keyLight = new THREE.PointLight(0x2cb0a8, 4, 25);
  keyLight.position.set(3, 2, 4);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0xccd4fd, 2.5, 25);
  rimLight.position.set(-4, -2, 3);
  scene.add(rimLight);

  const fill = new THREE.DirectionalLight(0xffffff, 0.4);
  fill.position.set(0, 5, 5);
  scene.add(fill);

  /* ---------- Glass Material ----------
     MeshPhysicalMaterial with transmission + IOR gives real glass dispersion.
     Iridescence adds the colorful edge glow seen in the codrops reference. */
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.02,
    transmission: 1.0,
    thickness: 1.4,
    ior: 1.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
    iridescence: 0.6,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [100, 800],
    attenuationColor: new THREE.Color(0x2cb0a8),
    attenuationDistance: 4.0,
    envMapIntensity: 1.8,
    side: THREE.DoubleSide,
  });

  // Optional dispersion if the Three.js build supports it (r157+).
  if ('dispersion' in glassMaterial) glassMaterial.dispersion = 1.5;

  /* ---------- Text "60" ---------- */
  let textMesh = null;
  const group = new THREE.Group();
  scene.add(group);

  const fontLoader = new FontLoader();
  fontLoader.load(
    'https://cdn.jsdelivr.net/npm/three@0.157.0/examples/fonts/helvetiker_bold.typeface.json',
    (font) => {
      const geometry = new TextGeometry('60', {
        font,
        size: 2.4,
        height: 0.7,
        curveSegments: 24,
        bevelEnabled: true,
        bevelThickness: 0.12,
        bevelSize: 0.06,
        bevelOffset: 0,
        bevelSegments: 10,
      });
      geometry.center();
      textMesh = new THREE.Mesh(geometry, glassMaterial);
      group.add(textMesh);
    },
    undefined,
    (err) => {
      console.warn('[glass-60] font failed to load, using fallback sphere:', err);
      const fallback = new THREE.Mesh(
        new THREE.TorusKnotGeometry(1, 0.3, 128, 16),
        glassMaterial
      );
      group.add(fallback);
      textMesh = fallback;
    }
  );

  /* ---------- Resize ---------- */
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    // Adjust camera distance based on aspect for nice fit
    camera.position.z = w < 500 ? 8 : 7;
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  /* ---------- Mouse parallax ---------- */
  let mouseX = 0, mouseY = 0;
  let targetRotX = 0, targetRotY = 0;

  window.addEventListener('pointermove', (e) => {
    const rect = container.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    mouseX = (e.clientX - cx) / window.innerWidth;
    mouseY = (e.clientY - cy) / window.innerHeight;
    targetRotY = mouseX * 0.6;
    targetRotX = -mouseY * 0.4;
  }, { passive: true });

  /* ---------- Animate ---------- */
  let animId;
  function animate() {
    animId = requestAnimationFrame(animate);

    // Smooth rotation toward target
    group.rotation.y += (targetRotY - group.rotation.y) * 0.06;
    group.rotation.x += (targetRotX - group.rotation.x) * 0.06;

    // Subtle auto-rotate + float
    const t = performance.now() * 0.001;
    group.rotation.y += 0.002;
    group.position.y = Math.sin(t * 0.8) * 0.08;

    renderer.render(scene, camera);
  }
  animate();

  /* ---------- Pause when tab hidden ---------- */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
    } else {
      animate();
    }
  });
})();

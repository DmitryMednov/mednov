/* ===== WEBGL ALBUM CAROUSEL ===== */
/* 3D carousel with wave distortion, drag/scroll navigation */
/* Inspired by supahfunk/webgl-carousel — pure Three.js (no React) */

(function () {
  const container = document.getElementById('album-carousel');
  if (!container || typeof THREE === 'undefined') return;

  /* --- Config --- */
  const ALBUMS = [
    {
      title: '45/20',
      artist: 'Сергей Меднов',
      url: 'https://music.apple.com/ru/album/45-20/1830794383?l=en-GB',
      gradient: ['#053B3A', '#2CB0A8'],
    },
    {
      title: '50/50',
      artist: 'Сергей Меднов',
      url: 'https://music.apple.com/ru/album/50-50/1831921447?l=en-GB',
      gradient: ['#0F2120', '#CCD4FD'],
    },
    {
      title: 'Between the Roads and the Waves',
      artist: 'Сергей Меднов · EP',
      url: 'https://music.apple.com/ru/album/between-the-roads-and-the-waves-ep/1847331974?l=en-GB',
      gradient: ['#2CB0A8', '#FAFFAF'],
    },
  ];

  const PLANE_W = 2.8;
  const PLANE_H = 2.8;
  const GAP = 0.6;
  const TOTAL_W = PLANE_W + GAP;

  /* --- Three.js Setup --- */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  /* --- Shaders --- */
  const vertexShader = `
    uniform float uProgress;
    uniform float uSpeed;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vec3 pos = position;

      // Wave distortion based on interaction speed
      float wave = sin(pos.x * 3.0 + uProgress * 2.0) * uSpeed * 0.15;
      wave += cos(pos.y * 2.0 + uProgress * 1.5) * uSpeed * 0.1;
      pos.z += wave;

      // Slight bend along scroll direction
      pos.z -= abs(uSpeed) * pos.x * pos.x * 0.03;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    uniform sampler2D uTexture;
    uniform float uOpacity;
    uniform float uSpeed;
    varying vec2 vUv;

    void main() {
      // Chromatic aberration based on speed
      float shift = uSpeed * 0.008;
      float r = texture2D(uTexture, vUv + vec2(shift, 0.0)).r;
      float g = texture2D(uTexture, vUv).g;
      float b = texture2D(uTexture, vUv - vec2(shift, 0.0)).b;
      float a = texture2D(uTexture, vUv).a;

      gl_FragColor = vec4(r, g, b, a * uOpacity);
    }
  `;

  /* --- Generate gradient textures --- */
  function createGradientTexture(colors, title) {
    const cvs = document.createElement('canvas');
    cvs.width = 512;
    cvs.height = 512;
    const ctx = cvs.getContext('2d');

    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, cvs.width, cvs.height);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    // Album title
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = 'bold 48px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Word wrap
    const words = title.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > 420) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);

    const lineH = 56;
    const startY = cvs.height / 2 - ((lines.length - 1) * lineH) / 2;
    lines.forEach((l, i) => {
      ctx.fillText(l, cvs.width / 2, startY + i * lineH);
    });

    // Subtle noise overlay
    const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 15;
      imgData.data[i] += noise;
      imgData.data[i + 1] += noise;
      imgData.data[i + 2] += noise;
    }
    ctx.putImageData(imgData, 0, 0);

    // Round corners (clip)
    const radius = 40;
    const cvs2 = document.createElement('canvas');
    cvs2.width = cvs.width;
    cvs2.height = cvs.height;
    const ctx2 = cvs2.getContext('2d');
    ctx2.beginPath();
    ctx2.roundRect(0, 0, cvs2.width, cvs2.height, radius);
    ctx2.clip();
    ctx2.drawImage(cvs, 0, 0);

    const tex = new THREE.CanvasTexture(cvs2);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /* --- Create planes --- */
  const planes = [];
  const geometry = new THREE.PlaneGeometry(PLANE_W, PLANE_H, 32, 32);

  ALBUMS.forEach((album, i) => {
    const texture = createGradientTexture(album.gradient, album.title);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTexture: { value: texture },
        uProgress: { value: 0 },
        uSpeed: { value: 0 },
        uOpacity: { value: 1.0 },
      },
      transparent: true,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = i * TOTAL_W;
    scene.add(mesh);

    planes.push({
      mesh,
      material,
      album,
      index: i,
    });
  });

  /* --- Navigation state --- */
  let progress = 0; // continuous scroll position
  let targetProgress = 0;
  let speed = 0;
  let isDragging = false;
  let dragStart = 0;
  let dragStartProgress = 0;

  // Center camera on middle album
  const centerOffset = ((ALBUMS.length - 1) * TOTAL_W) / 2;

  /* --- Input: wheel --- */
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    targetProgress += e.deltaY * 0.003;
    targetProgress = Math.max(0, Math.min(ALBUMS.length - 1, targetProgress));
  }, { passive: false });

  /* --- Input: drag --- */
  container.addEventListener('pointerdown', (e) => {
    isDragging = true;
    dragStart = e.clientX;
    dragStartProgress = targetProgress;
    container.style.cursor = 'grabbing';
    container.setPointerCapture(e.pointerId);
  });

  container.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart;
    const sensitivity = 0.004;
    targetProgress = dragStartProgress - dx * sensitivity;
    targetProgress = Math.max(0, Math.min(ALBUMS.length - 1, targetProgress));
  });

  const endDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    container.style.cursor = 'grab';
    // Snap to nearest album
    targetProgress = Math.round(targetProgress);
    targetProgress = Math.max(0, Math.min(ALBUMS.length - 1, targetProgress));
  };

  container.addEventListener('pointerup', endDrag);
  container.addEventListener('pointercancel', endDrag);

  /* --- Click to open album --- */
  container.addEventListener('click', (e) => {
    if (Math.abs(e.clientX - dragStart) > 10) return; // was a drag, not click

    // Raycast to find clicked plane
    const rect = container.getBoundingClientRect();
    const mouseNDC = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouseNDC, camera);
    const hits = raycaster.intersectObjects(planes.map(p => p.mesh));
    if (hits.length > 0) {
      const plane = planes.find(p => p.mesh === hits[0].object);
      if (plane) {
        window.open(plane.album.url, '_blank');
      }
    }
  });

  /* --- Info overlay (title/artist below carousel) --- */
  const infoEl = document.getElementById('album-info');

  function updateInfo() {
    if (!infoEl) return;
    const idx = Math.round(progress);
    const album = ALBUMS[Math.max(0, Math.min(idx, ALBUMS.length - 1))];
    const titleEl = infoEl.querySelector('.album-info-title');
    const artistEl = infoEl.querySelector('.album-info-artist');
    if (titleEl) titleEl.textContent = album.title;
    if (artistEl) artistEl.textContent = album.artist;
  }

  /* --- Resize --- */
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  const ro = new ResizeObserver(() => resize());
  ro.observe(container);
  resize();

  /* --- Dots navigation --- */
  const dotsEl = document.getElementById('carousel-dots');
  if (dotsEl) {
    ALBUMS.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'carousel-dot';
      dot.setAttribute('aria-label', `Album ${i + 1}`);
      dot.addEventListener('click', () => { targetProgress = i; });
      dotsEl.appendChild(dot);
    });
  }

  function updateDots() {
    if (!dotsEl) return;
    const active = Math.round(progress);
    dotsEl.querySelectorAll('.carousel-dot').forEach((d, i) => {
      d.classList.toggle('active', i === active);
    });
  }

  /* --- Animation loop --- */
  const clock = new THREE.Clock();
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);

    // Smooth lerp to target
    const prevProgress = progress;
    progress += (targetProgress - progress) * 0.08;
    speed = progress - prevProgress;

    // Update plane positions
    for (let i = 0; i < planes.length; i++) {
      const p = planes[i];
      const offset = i - progress;

      // X position
      p.mesh.position.x = offset * TOTAL_W;

      // Pyramidal Y: active item highest
      const dist = Math.abs(offset);
      p.mesh.position.y = -dist * 0.15;

      // Z depth: active item forward
      p.mesh.position.z = -dist * 0.8;

      // Rotation: slight angle away from center
      p.mesh.rotation.y = offset * 0.15;

      // Scale: active item larger
      const scale = 1.0 - dist * 0.12;
      p.mesh.scale.setScalar(Math.max(0.6, scale));

      // Opacity: fade distant items
      const opacity = 1.0 - dist * 0.3;
      p.material.uniforms.uOpacity.value = Math.max(0.3, opacity);

      // Pass speed for distortion
      p.material.uniforms.uSpeed.value = speed * 40;
      p.material.uniforms.uProgress.value = progress;
    }

    updateInfo();
    updateDots();
    renderer.render(scene, camera);
  }

  animate();

  // Set initial cursor
  container.style.cursor = 'grab';

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animId);
    else animate();
  });
})();

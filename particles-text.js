/* ===== INTERACTIVE PARTICLES TEXT ===== */
/* Text rendered as particles with curl noise and mouse interaction */
/* Inspired by tgcnzn/Interactive-Particles-Music-Visualizer */

(function () {
  const container = document.getElementById('particles-title');
  if (!container || typeof THREE === 'undefined') return;

  const text = container.dataset.text || 'Музыка';
  const isMobile = window.innerWidth < 768;

  /* --- Three.js --- */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 3;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'width:100%!important;height:100%!important;display:block;';

  /* --- Sample text to get particle positions --- */
  function sampleTextPositions(w, h) {
    const cvs = document.createElement('canvas');
    const scale = 2;
    cvs.width = w * scale;
    cvs.height = h * scale;
    const ctx = cvs.getContext('2d');

    // Fullscreen mode uses much bigger text
    const isFullscreen = container.classList.contains('particles-title-fullscreen');
    const maxSize = isFullscreen ? 320 : 120;
    const sizeRatio = isFullscreen ? 0.35 : 0.22;
    const fontSize = Math.min(w * sizeRatio, maxSize) * scale;
    ctx.font = `800 ${fontSize}px Montserrat, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Split text by lines
    const lines = text.split('\n');
    const lineH = fontSize * 1.2;
    const totalH = lines.length * lineH;
    const startY = cvs.height / 2 - totalH / 2 + lineH / 2;

    lines.forEach((line, i) => {
      ctx.fillText(line, cvs.width / 2, startY + i * lineH);
    });

    // Sample pixel positions
    const data = ctx.getImageData(0, 0, cvs.width, cvs.height).data;
    const positions = [];
    const step = isMobile ? 4 : 2; // fewer particles on mobile

    for (let y = 0; y < cvs.height; y += step) {
      for (let x = 0; x < cvs.width; x += step) {
        const idx = (y * cvs.width + x) * 4;
        if (data[idx + 3] > 128) {
          // Map to normalized coords centered at origin
          const nx = (x / cvs.width - 0.5) * (w / h) * 2.8;
          const ny = -(y / cvs.height - 0.5) * 2.8;
          positions.push(nx, ny, 0);
        }
      }
    }

    return new Float32Array(positions);
  }

  /* --- Shaders --- */
  const vertexShader = `
    uniform float uTime;
    uniform float uAmplitude;
    uniform vec2 uMouse;
    uniform float uMouseRadius;
    attribute vec3 aTarget; // original text position
    varying float vDist;
    varying float vAlpha;

    // Simplex noise helpers
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }

    // Curl noise for organic motion
    vec3 curl(vec3 p) {
      float e = 0.1;
      float n1, n2, a, b;
      vec3 c;

      n1 = snoise(p + vec3(0, e, 0));
      n2 = snoise(p - vec3(0, e, 0));
      a = (n1 - n2) / (2.0 * e);
      n1 = snoise(p + vec3(0, 0, e));
      n2 = snoise(p - vec3(0, 0, e));
      b = (n1 - n2) / (2.0 * e);
      c.x = a - b;

      n1 = snoise(p + vec3(0, 0, e));
      n2 = snoise(p - vec3(0, 0, e));
      a = (n1 - n2) / (2.0 * e);
      n1 = snoise(p + vec3(e, 0, 0));
      n2 = snoise(p - vec3(e, 0, 0));
      b = (n1 - n2) / (2.0 * e);
      c.y = a - b;

      n1 = snoise(p + vec3(e, 0, 0));
      n2 = snoise(p - vec3(e, 0, 0));
      a = (n1 - n2) / (2.0 * e);
      n1 = snoise(p + vec3(0, e, 0));
      n2 = snoise(p - vec3(0, e, 0));
      b = (n1 - n2) / (2.0 * e);
      c.z = a - b;

      return c;
    }

    void main() {
      vec3 pos = aTarget;

      // Curl noise displacement
      vec3 noisePos = pos * 1.5 + vec3(0.0, 0.0, uTime * 0.3);
      vec3 curlVal = curl(noisePos) * uAmplitude * 0.15;
      pos += curlVal;

      // Mouse repulsion
      vec2 diff = pos.xy - uMouse;
      float dist = length(diff);
      if (dist < uMouseRadius) {
        float force = (1.0 - dist / uMouseRadius);
        force = force * force * 0.5;
        pos.xy += normalize(diff) * force;
        pos.z += force * 0.3;
      }

      vDist = length(pos - aTarget);
      vAlpha = 1.0;

      vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = max(1.5, 3.0 * (1.0 / -mvPos.z));
      gl_Position = projectionMatrix * mvPos;
    }
  `;

  const fragmentShader = `
    precision highp float;
    varying float vDist;
    varying float vAlpha;
    uniform vec3 uColor1;
    uniform vec3 uColor2;

    void main() {
      // Circular particle
      float d = length(gl_PointCoord - 0.5) * 2.0;
      if (d > 1.0) discard;

      float alpha = smoothstep(1.0, 0.3, d) * vAlpha;

      // Color based on displacement distance
      float colorMix = clamp(vDist * 3.0, 0.0, 1.0);
      vec3 color = mix(uColor1, uColor2, colorMix);

      gl_FragColor = vec4(color, alpha * 0.9);
    }
  `;

  /* --- Create particle system --- */
  let points = null;
  let material = null;

  function buildParticles() {
    if (points) {
      scene.remove(points);
      points.geometry.dispose();
    }

    const w = container.offsetWidth;
    const h = container.offsetHeight;
    if (w === 0 || h === 0) return;

    const positions = sampleTextPositions(w, h);
    const count = positions.length / 3;
    if (count === 0) return;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
    geometry.setAttribute('aTarget', new THREE.BufferAttribute(positions, 3));

    if (!material) {
      material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uAmplitude: { value: 1.0 },
          uMouse: { value: new THREE.Vector2(0, -10) },
          uMouseRadius: { value: 0.5 },
          uColor1: { value: new THREE.Color(0x2CB0A8) }, // turquoise
          uColor2: { value: new THREE.Color(0xCCD4FD) }, // violet
        },
        transparent: true,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      });
    }

    points = new THREE.Points(geometry, material);
    scene.add(points);
  }

  /* --- Mouse --- */
  const mouse = { x: 0, y: -10, targetX: 0, targetY: -10 };

  container.addEventListener('pointermove', (e) => {
    const rect = container.getBoundingClientRect();
    const aspect = rect.width / rect.height;
    mouse.targetX = ((e.clientX - rect.left) / rect.width - 0.5) * aspect * 2.8;
    mouse.targetY = -((e.clientY - rect.top) / rect.height - 0.5) * 2.8;
  }, { passive: true });

  container.addEventListener('pointerleave', () => {
    mouse.targetX = 0;
    mouse.targetY = -10; // move mouse away
  });

  /* --- Resize --- */
  function resize() {
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    buildParticles();
  }

  const ro = new ResizeObserver(() => resize());
  ro.observe(container);
  resize();

  /* --- Animation --- */
  const clock = new THREE.Clock();
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Smooth mouse
    mouse.x += (mouse.targetX - mouse.x) * 0.08;
    mouse.y += (mouse.targetY - mouse.y) * 0.08;

    if (material) {
      material.uniforms.uTime.value = t;
      material.uniforms.uMouse.value.set(mouse.x, mouse.y);
      // Gentle ambient animation
      material.uniforms.uAmplitude.value = 0.5 + Math.sin(t * 0.5) * 0.3;
    }

    renderer.render(scene, camera);
  }

  animate();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animId);
    else animate();
  });
})();

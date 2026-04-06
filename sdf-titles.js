/* ===== SDF LENS BLUR TITLES ===== */
/* Inspired by guilanier/codrops-sdf-lensblur */
/* Renders heading text to canvas texture, applies lens blur via mouse proximity */

(function () {
  const titleEls = document.querySelectorAll('.sdf-title');
  if (!titleEls.length || typeof THREE === 'undefined') return;

  titleEls.forEach(el => initSdfTitle(el));

  function initSdfTitle(el) {
    const text = el.textContent.trim();
    const color = getComputedStyle(el).color || '#ffffff';
    const accentColor = '#2CB0A8';

    // Hide original text
    el.style.position = 'relative';
    el.style.color = 'transparent';
    el.style.userSelect = 'none';

    // Create canvas container
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;inset:0;z-index:1;pointer-events:none;';
    el.appendChild(container);

    // Three.js setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%!important;height:100%!important;display:block;';

    // Generate text texture
    function createTextTexture(w, h) {
      const cvs = document.createElement('canvas');
      const dpr = Math.min(window.devicePixelRatio, 2);
      cvs.width = w * dpr;
      cvs.height = h * dpr;
      const ctx = cvs.getContext('2d');
      ctx.scale(dpr, dpr);

      // Get computed font from the element
      const cs = getComputedStyle(el);
      const fontSize = parseFloat(cs.fontSize);
      const fontWeight = cs.fontWeight;
      const fontFamily = cs.fontFamily;

      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';

      // Handle line breaks
      const lines = text.split('\n');
      const lineH = fontSize * 1.15;
      const totalH = lines.length * lineH;
      const startY = h / 2 - totalH / 2 + lineH / 2;

      lines.forEach((line, i) => {
        ctx.fillText(line, 0, startY + i * lineH);
      });

      const tex = new THREE.CanvasTexture(cvs);
      tex.needsUpdate = true;
      return tex;
    }

    // Shader material
    const vertSrc = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragSrc = `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTexture;
      uniform vec2 uMouse;
      uniform vec2 uResolution;
      uniform float uPixelRatio;
      uniform vec3 uColor;
      uniform vec3 uAccent;
      uniform float uTime;

      // SDF lens blur: modulate text edge softness based on mouse distance
      void main() {
        vec2 st = vUv;
        vec2 pixel = 1.0 / uResolution;

        // Mouse position in UV space
        vec2 mouse = uMouse / uResolution;
        mouse.y = 1.0 - mouse.y;

        // Distance from current pixel to mouse (aspect-corrected)
        float aspect = uResolution.x / uResolution.y;
        vec2 diff = st - mouse;
        diff.x *= aspect;
        float dist = length(diff);

        // Lens parameters
        float lensRadius = 0.35;
        float lensEdge = 0.4;
        float lensFocus = smoothstep(lensRadius + lensEdge, lensRadius - 0.05, dist);

        // Sample text texture with varying blur
        // Sharp near mouse (small offset), blurry far away (large offset)
        float blurAmount = (1.0 - lensFocus) * 8.0; // blur in pixels
        vec2 blurPixel = pixel * blurAmount;

        // Box blur approximation (9 samples)
        vec4 col = vec4(0.0);
        col += texture2D(uTexture, st + vec2(-blurPixel.x, -blurPixel.y)) * 0.0625;
        col += texture2D(uTexture, st + vec2(0.0, -blurPixel.y)) * 0.125;
        col += texture2D(uTexture, st + vec2(blurPixel.x, -blurPixel.y)) * 0.0625;
        col += texture2D(uTexture, st + vec2(-blurPixel.x, 0.0)) * 0.125;
        col += texture2D(uTexture, st) * 0.25;
        col += texture2D(uTexture, st + vec2(blurPixel.x, 0.0)) * 0.125;
        col += texture2D(uTexture, st + vec2(-blurPixel.x, blurPixel.y)) * 0.0625;
        col += texture2D(uTexture, st + vec2(0.0, blurPixel.y)) * 0.125;
        col += texture2D(uTexture, st + vec2(blurPixel.x, blurPixel.y)) * 0.0625;

        // Text alpha
        float textAlpha = col.r;

        // Color: mix between white and accent near mouse
        float accentMix = lensFocus * 0.4;
        vec3 finalColor = mix(uColor, uAccent, accentMix);

        // Slight glow near mouse
        float glow = lensFocus * 0.15 * textAlpha;

        gl_FragColor = vec4(finalColor, textAlpha + glow);
      }
    `;

    let textTexture = null;
    const material = new THREE.ShaderMaterial({
      vertexShader: vertSrc,
      fragmentShader: fragSrc,
      uniforms: {
        uTexture: { value: null },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uPixelRatio: { value: window.devicePixelRatio },
        uColor: { value: new THREE.Color(1, 1, 1) },
        uAccent: { value: new THREE.Color(accentColor) },
        uTime: { value: 0 },
      },
      transparent: true,
      depthTest: false,
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    // Mouse tracking with damping
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    document.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      mouse.targetX = (e.clientX - rect.left) * Math.min(window.devicePixelRatio, 2);
      mouse.targetY = (e.clientY - rect.top) * Math.min(window.devicePixelRatio, 2);
    }, { passive: true });

    // Resize
    function resize() {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w === 0 || h === 0) return;
      const dpr = Math.min(window.devicePixelRatio, 2);
      renderer.setSize(w, h);
      material.uniforms.uResolution.value.set(w * dpr, h * dpr);

      // Recreate text texture at new size
      textTexture = createTextTexture(w, h);
      material.uniforms.uTexture.value = textTexture;
    }

    const ro = new ResizeObserver(() => resize());
    ro.observe(el);
    resize();

    // Animation
    const clock = new THREE.Clock();
    let animId;

    function animate() {
      animId = requestAnimationFrame(animate);

      // Smooth mouse
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      material.uniforms.uMouse.value.set(mouse.x, mouse.y);
      material.uniforms.uTime.value = clock.getElapsedTime();

      renderer.render(scene, camera);
    }

    animate();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(animId);
      else animate();
    });
  }
})();

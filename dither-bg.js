/* ===== BAYER DITHERING WebGL BACKGROUND ===== */
/* Based on zavalit/bayer-dithering-webgl-demo */
/* Ordered dithering with visible pixel grid, animated noise, click ripples */

(function () {
  const canvas = document.getElementById('dither-canvas');
  if (!canvas) return;

  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) return;

  /* --- Shaders --- */
  const vertSrc = `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  // Fragment shader: true Bayer ordered dithering with visible pixel grid
  const fragSrc = `
    precision highp float;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform vec2 uClickPos[6];
    uniform float uClickTimes[6];
    uniform float uNow;
    uniform float uPixelSize;

    // --- Bayer 8x8 ordered dithering ---
    // Returns threshold 0.0-1.0 based on position in 8x8 Bayer matrix
    float bayer8x8(vec2 pos) {
      // Bayer 8x8 matrix encoded as bit operations
      ivec2 p = ivec2(mod(pos, 8.0));
      int x = p.x;
      int y = p.y;

      // Classic Bayer 8x8 using recursive formula
      int v = 0;
      // 2x2 base
      int bx = x;
      int by = y;

      // Bit-reverse interleave to compute Bayer index
      // For 8x8: 3 levels of recursion
      int result = 0;
      for (int bit = 2; bit >= 0; bit--) {
        int mask = 1 << bit;
        int xbit = (bx & mask) >> bit;
        int ybit = (by & mask) >> bit;
        result = result * 4 + xbit * 2 + (xbit ^ ybit);
      }

      return float(result) / 64.0;
    }

    // --- Noise functions ---
    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f); // smoothstep

      float a = hash21(i);
      float b = hash21(i + vec2(1.0, 0.0));
      float c = hash21(i + vec2(0.0, 1.0));
      float d = hash21(i + vec2(1.0, 1.0));

      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    // FBM — 4 octaves
    float fbm(vec2 p) {
      float v = 0.0;
      float amp = 0.5;
      for (int i = 0; i < 4; i++) {
        v += amp * noise(p);
        p *= 2.0;
        p += vec2(1.7, 9.2);
        amp *= 0.5;
      }
      return v;
    }

    // --- Shape mask: square coverage within pixel ---
    float squareMask(vec2 uv, float coverage) {
      vec2 d = abs(uv - 0.5);
      float halfSize = coverage * 0.5;
      return step(d.x, halfSize) * step(d.y, halfSize);
    }

    void main() {
      float pixSize = uPixelSize;

      // Quantize coordinates to pixel grid
      vec2 pixCoord = floor(gl_FragCoord.xy / pixSize);
      vec2 pixUV = fract(gl_FragCoord.xy / pixSize); // position within pixel cell

      // Animated noise field
      float t = uTime * 0.12;
      float n = fbm(pixCoord * 0.035 + vec2(t, t * 0.7));
      n += 0.2 * fbm(pixCoord * 0.07 + vec2(-t * 0.8, t * 0.4));

      // Click ripples
      for (int i = 0; i < 6; i++) {
        if (uClickTimes[i] > 0.0) {
          float elapsed = uNow - uClickTimes[i];
          if (elapsed < 4.0 && elapsed > 0.0) {
            // Convert click pos to pixel grid coordinates
            vec2 clickPix = uClickPos[i] / pixSize;
            float dist = distance(pixCoord, clickPix);

            // Ring wave
            float wave = sin(dist * 0.3 - elapsed * 5.0);
            float envelope = exp(-elapsed * 0.8) * smoothstep(0.0, 3.0, elapsed);
            float decay = exp(-dist * 0.008);

            n += wave * 0.35 * envelope * decay;
          }
        }
      }

      // Clamp noise to valid range
      n = clamp(n, 0.0, 1.0);

      // Bayer threshold
      float threshold = bayer8x8(pixCoord);

      // Dither: binary decision per pixel
      float dither = step(threshold, n);

      // Square shape within each pixel cell (with small gap for grid visibility)
      float cellCoverage = 0.85; // 85% coverage = visible grid gaps
      float shape = squareMask(pixUV, cellCoverage);

      // Apply dithering through shape
      float pixel = dither * shape;

      // Colors
      vec3 bgColor = vec3(0.059, 0.129, 0.125);    // #0F2120
      vec3 inkColor = vec3(0.173, 0.69, 0.659);      // #2CB0A8

      // Intensity variation based on noise for richer look
      vec3 ink = mix(inkColor * 0.5, inkColor, n * 0.6 + 0.4);

      vec3 color = mix(bgColor, ink, pixel);

      // Subtle vignette
      vec2 uv = gl_FragCoord.xy / uResolution;
      float vig = 1.0 - smoothstep(0.4, 1.0, length(uv - 0.5) * 1.4);
      color *= 0.75 + vig * 0.25;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  /* --- Compile shaders --- */
  function createShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  const vert = createShader(gl.VERTEX_SHADER, vertSrc);
  const frag = createShader(gl.FRAGMENT_SHADER, fragSrc);
  if (!vert || !frag) return;

  const program = gl.createProgram();
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);

  /* --- Full-screen quad --- */
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  /* --- Uniforms --- */
  const uResolution = gl.getUniformLocation(program, 'uResolution');
  const uTime = gl.getUniformLocation(program, 'uTime');
  const uNow = gl.getUniformLocation(program, 'uNow');
  const uPixelSize = gl.getUniformLocation(program, 'uPixelSize');
  const uClickPos = [];
  const uClickTimes = [];
  for (let i = 0; i < 6; i++) {
    uClickPos.push(gl.getUniformLocation(program, `uClickPos[${i}]`));
    uClickTimes.push(gl.getUniformLocation(program, `uClickTimes[${i}]`));
  }

  /* --- Click handling --- */
  const clicks = [];
  let clickIdx = 0;
  const startTime = performance.now() / 1000;

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio, 2);
    const x = (e.clientX - rect.left) * dpr;
    const y = canvas.height - (e.clientY - rect.top) * dpr;
    const now = performance.now() / 1000 - startTime;
    clicks[clickIdx % 6] = { x, y, time: now };
    clickIdx++;
  });

  /* --- Resize --- */
  function resize() {
    const w = canvas.parentElement.offsetWidth;
    const h = canvas.parentElement.offsetHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas.parentElement);
  resize();

  // Pixel size: visible squares, adapts to DPR
  const dpr = Math.min(window.devicePixelRatio, 2);
  const pixelSize = Math.round(6 * dpr); // 6 CSS pixels per dither cell

  /* --- Render loop --- */
  let animId;

  function render() {
    animId = requestAnimationFrame(render);
    const now = performance.now() / 1000 - startTime;

    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uTime, now);
    gl.uniform1f(uNow, now);
    gl.uniform1f(uPixelSize, pixelSize);

    for (let i = 0; i < 6; i++) {
      const c = clicks[i];
      if (c) {
        gl.uniform2f(uClickPos[i], c.x, c.y);
        gl.uniform1f(uClickTimes[i], c.time);
      } else {
        gl.uniform2f(uClickPos[i], 0, 0);
        gl.uniform1f(uClickTimes[i], -10.0);
      }
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  render();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animId);
    else render();
  });
})();

/* ===== BAYER DITHERING — exact port from zavalit/bayer-dithering-webgl-demo ===== */

(function () {
  const canvas = document.getElementById('dither-canvas');
  if (!canvas) return;

  // Try WebGL2 first, fall back to WebGL1
  let gl = canvas.getContext('webgl2');
  const isWebGL2 = !!gl;
  if (!gl) gl = canvas.getContext('webgl');
  if (!gl) return;

  const MAX_CLICKS = 10;

  /* --- Shaders --- */
  const vertSrc = isWebGL2
    ? `#version 300 es
       in vec2 position;
       void main() { gl_Position = vec4(position, 0.0, 1.0); }`
    : `attribute vec2 position;
       void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

  // Fragment shader — direct port of the original
  const fragSrc = (isWebGL2 ? `#version 300 es\nprecision highp float;\nout vec4 fragColor;\n` : `precision highp float;\n`) + `

    uniform vec3  uColor;
    uniform vec2  uResolution;
    uniform float uTime;
    uniform float uPixelSize;
    uniform vec2  uClickPos[${MAX_CLICKS}];
    uniform float uClickTimes[${MAX_CLICKS}];

    // Bayer matrix
    float Bayer2(vec2 a) {
      a = floor(a);
      return fract(a.x / 2.0 + a.y * a.y * 0.75);
    }
    #define Bayer4(a) (Bayer2(0.5*(a))*0.25 + Bayer2(a))
    #define Bayer8(a) (Bayer4(0.5*(a))*0.25 + Bayer2(a))

    // Value noise
    float hash11(float n) { return fract(sin(n)*43758.5453); }

    float vnoise(vec3 p) {
      vec3 ip = floor(p);
      vec3 fp = fract(p);
      float n000 = hash11(dot(ip + vec3(0,0,0), vec3(1,57,113)));
      float n100 = hash11(dot(ip + vec3(1,0,0), vec3(1,57,113)));
      float n010 = hash11(dot(ip + vec3(0,1,0), vec3(1,57,113)));
      float n110 = hash11(dot(ip + vec3(1,1,0), vec3(1,57,113)));
      float n001 = hash11(dot(ip + vec3(0,0,1), vec3(1,57,113)));
      float n101 = hash11(dot(ip + vec3(1,0,1), vec3(1,57,113)));
      float n011 = hash11(dot(ip + vec3(0,1,1), vec3(1,57,113)));
      float n111 = hash11(dot(ip + vec3(1,1,1), vec3(1,57,113)));
      vec3 w = fp*fp*fp*(fp*(fp*6.0-15.0)+10.0);
      float x00 = mix(n000, n100, w.x);
      float x10 = mix(n010, n110, w.x);
      float x01 = mix(n001, n101, w.x);
      float x11 = mix(n011, n111, w.x);
      return mix(mix(x00, x10, w.y), mix(x01, x11, w.y), w.z) * 2.0 - 1.0;
    }

    // FBM
    float fbm2(vec2 uv, float t) {
      vec3 p = vec3(uv * 4.0, t);
      float amp = 1.0, freq = 1.0, sum = 1.0;
      for (int i = 0; i < 5; ++i) {
        sum += amp * vnoise(p * freq);
        freq *= 1.25;
        amp *= 1.0;
      }
      return sum * 0.5 + 0.5;
    }

    void main() {
      float pixelSize = uPixelSize;
      vec2 fragCoord = gl_FragCoord.xy - uResolution * 0.5;
      float aspectRatio = uResolution.x / uResolution.y;

      vec2 pixelId = floor(fragCoord / pixelSize);
      vec2 pixelUV = fract(fragCoord / pixelSize);

      float cellPixelSize = 8.0 * pixelSize;
      vec2 cellId = floor(fragCoord / cellPixelSize);
      vec2 cellCoord = cellId * cellPixelSize;
      vec2 uv = cellCoord / uResolution * vec2(aspectRatio, 1.0);

      // Animated noise
      float feed = fbm2(uv, uTime * 0.05);
      feed = feed * 0.5 - 0.65;

      // Click ripples
      for (int i = 0; i < ${MAX_CLICKS}; ++i) {
        vec2 pos = uClickPos[i];
        if (pos.x < -9000.0) continue;
        vec2 cuv = ((pos - uResolution * 0.5 - cellPixelSize * 0.5) / uResolution) * vec2(aspectRatio, 1.0);
        float t = max(uTime - uClickTimes[i], 0.0);
        float r = distance(uv, cuv);
        float waveR = 0.30 * t;
        float ring = exp(-pow((r - waveR) / 0.10, 2.0));
        float atten = exp(-1.0 * t) * exp(-10.0 * r);
        feed = max(feed, ring * atten);
      }

      // Bayer dither
      float bayer = Bayer8(fragCoord / uPixelSize) - 0.5;
      float bw = step(0.5, feed + bayer);

      // Square mask (default shape)
      float M = bw;

      vec3 color = uColor;
      ` + (isWebGL2 ? `fragColor = vec4(color, M);` : `gl_FragColor = vec4(color, M);`) + `
    }
  `;

  /* --- Compile --- */
  function createShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Dither shader error:', gl.getShaderInfoLog(s));
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
    console.error('Dither link error:', gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);

  /* --- Fullscreen quad --- */
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  // Enable alpha blending (shader outputs alpha)
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  /* --- Uniforms --- */
  const uResolution = gl.getUniformLocation(program, 'uResolution');
  const uTime = gl.getUniformLocation(program, 'uTime');
  const uPixelSize = gl.getUniformLocation(program, 'uPixelSize');
  const uColor = gl.getUniformLocation(program, 'uColor');
  const uClickPos = [];
  const uClickTimes = [];
  for (let i = 0; i < MAX_CLICKS; i++) {
    uClickPos.push(gl.getUniformLocation(program, `uClickPos[${i}]`));
    uClickTimes.push(gl.getUniformLocation(program, `uClickTimes[${i}]`));
  }

  /* --- Clicks --- */
  const clicks = [];
  let clickIdx = 0;
  const startTime = performance.now() / 1000;

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio, 2);
    const x = (e.clientX - rect.left) * dpr;
    const y = canvas.height - (e.clientY - rect.top) * dpr;
    clicks[clickIdx % MAX_CLICKS] = { x, y, time: performance.now() / 1000 - startTime };
    clickIdx++;
  });

  /* --- Resize --- */
  function resize() {
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.offsetWidth;
    const h = parent.offsetHeight;
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

  // Pixel size: ~6 CSS pixels per dither cell
  const dpr = Math.min(window.devicePixelRatio, 2);
  const pixelSize = Math.round(6 * dpr);

  // Turquoise color
  const inkR = 44 / 255, inkG = 176 / 255, inkB = 168 / 255;

  /* --- Render --- */
  let animId;
  function render() {
    animId = requestAnimationFrame(render);
    const now = performance.now() / 1000 - startTime;

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uTime, now);
    gl.uniform1f(uPixelSize, pixelSize);
    gl.uniform3f(uColor, inkR, inkG, inkB);

    for (let i = 0; i < MAX_CLICKS; i++) {
      const c = clicks[i];
      if (c) {
        gl.uniform2f(uClickPos[i], c.x, c.y);
        gl.uniform1f(uClickTimes[i], c.time);
      } else {
        gl.uniform2f(uClickPos[i], -99999, -99999);
        gl.uniform1f(uClickTimes[i], -10);
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

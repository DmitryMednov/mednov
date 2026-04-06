/* ===== BAYER DITHERING WebGL BACKGROUND ===== */
/* Animated dithering pattern for games hero section */

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

  const fragSrc = `
    precision highp float;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform vec2 uClickPos[6];
    uniform float uClickTimes[6];
    uniform float uNow;

    // Bayer 8x8 dithering matrix
    float bayer8(vec2 p) {
      ivec2 ip = ivec2(mod(p, 8.0));
      int idx = ip.x + ip.y * 8;
      // Bayer 8x8 threshold values (normalized 0-1)
      float m[64];
      m[0]=0.0; m[1]=32.0; m[2]=8.0; m[3]=40.0; m[4]=2.0; m[5]=34.0; m[6]=10.0; m[7]=42.0;
      m[8]=48.0; m[9]=16.0; m[10]=56.0; m[11]=24.0; m[12]=50.0; m[13]=18.0; m[14]=58.0; m[15]=26.0;
      m[16]=12.0; m[17]=44.0; m[18]=4.0; m[19]=36.0; m[20]=14.0; m[21]=46.0; m[22]=6.0; m[23]=38.0;
      m[24]=60.0; m[25]=28.0; m[26]=52.0; m[27]=20.0; m[28]=62.0; m[29]=30.0; m[30]=54.0; m[31]=22.0;
      m[32]=3.0; m[33]=35.0; m[34]=11.0; m[35]=43.0; m[36]=1.0; m[37]=33.0; m[38]=9.0; m[39]=41.0;
      m[40]=51.0; m[41]=19.0; m[42]=59.0; m[43]=27.0; m[44]=49.0; m[45]=17.0; m[46]=57.0; m[47]=25.0;
      m[48]=15.0; m[49]=47.0; m[50]=7.0; m[51]=39.0; m[52]=13.0; m[53]=45.0; m[54]=5.0; m[55]=37.0;
      m[56]=63.0; m[57]=31.0; m[58]=55.0; m[59]=23.0; m[60]=61.0; m[61]=29.0; m[62]=53.0; m[63]=21.0;

      float val = 0.0;
      for (int i = 0; i < 64; i++) {
        if (i == idx) { val = m[i]; break; }
      }
      return val / 64.0;
    }

    // Value noise
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    // Fractal Brownian Motion
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      vec2 shift = vec2(100.0);
      for (int i = 0; i < 4; i++) {
        v += a * vnoise(p);
        p = p * 2.0 + shift;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution;
      float pixelSize = 4.0;
      vec2 pixUV = floor(gl_FragCoord.xy / pixelSize);

      // Animated noise
      float t = uTime * 0.15;
      float noise = fbm(pixUV * 0.04 + vec2(t, t * 0.7));
      noise += 0.15 * fbm(pixUV * 0.08 - vec2(t * 1.3, t * 0.5));

      // Click ripples
      for (int i = 0; i < 6; i++) {
        float ct = uClickTimes[i];
        if (ct > 0.0) {
          float elapsed = uNow - ct;
          if (elapsed < 3.0) {
            vec2 cp = uClickPos[i];
            float dist = distance(gl_FragCoord.xy, cp);
            float ripple = sin(dist * 0.05 - elapsed * 4.0) * 0.3;
            float decay = exp(-elapsed * 1.2) * exp(-dist * 0.003);
            noise += ripple * decay;
          }
        }
      }

      // Bayer threshold
      float threshold = bayer8(gl_FragCoord.xy / pixelSize);
      float dither = step(threshold, noise);

      // Colors — site palette
      vec3 bgColor = vec3(0.059, 0.129, 0.125);    // #0F2120
      vec3 fgColor = vec3(0.173, 0.69, 0.659);      // #2CB0A8
      vec3 fgDim = vec3(0.02, 0.231, 0.228);        // #053B3A

      // Mix fg between bright and dim based on noise intensity
      vec3 fg = mix(fgDim, fgColor, noise * 0.6 + 0.2);
      vec3 color = mix(bgColor, fg, dither * 0.85);

      // Vignette
      float vig = 1.0 - smoothstep(0.3, 0.9, length(uv - 0.5) * 1.2);
      color *= 0.7 + vig * 0.3;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  /* --- Compile shaders --- */
  function createShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader error:', gl.getShaderInfoLog(s));
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
    console.error('Program error:', gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);

  /* --- Full-screen quad --- */
  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

  const posLoc = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  /* --- Uniforms --- */
  const uResolution = gl.getUniformLocation(program, 'uResolution');
  const uTime = gl.getUniformLocation(program, 'uTime');
  const uNow = gl.getUniformLocation(program, 'uNow');
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
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = canvas.height - (e.clientY - rect.top) * (canvas.height / rect.height);
    const now = performance.now() / 1000 - startTime;

    clicks[clickIdx % 6] = { x, y, time: now };
    clickIdx++;
  });

  /* --- Resize --- */
  function resize() {
    const w = canvas.parentElement.offsetWidth;
    const h = canvas.parentElement.offsetHeight;
    canvas.width = w * Math.min(window.devicePixelRatio, 2);
    canvas.height = h * Math.min(window.devicePixelRatio, 2);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas.parentElement);
  resize();

  /* --- Render loop --- */
  let animId;

  function render() {
    animId = requestAnimationFrame(render);
    const now = performance.now() / 1000 - startTime;

    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uTime, now);
    gl.uniform1f(uNow, now);

    for (let i = 0; i < 6; i++) {
      const c = clicks[i];
      if (c) {
        gl.uniform2f(uClickPos[i], c.x, c.y);
        gl.uniform1f(uClickTimes[i], c.time);
      } else {
        gl.uniform2f(uClickPos[i], 0, 0);
        gl.uniform1f(uClickTimes[i], 0);
      }
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  render();

  /* --- Pause on hidden --- */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animId);
    else render();
  });
})();

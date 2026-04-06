/* ===== INTERACTIVE DROPLETS — WebGL Metaballs ===== */
/* Ray-marched metaballs following mouse/touch, inspired by koji014/interactive-droplets */

(function () {
  const container = document.getElementById('droplets-canvas');
  if (!container) return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;display:block;';
  container.appendChild(canvas);

  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) return;

  /* --- Shaders --- */
  const vertSrc = `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `;

  const fragSrc = `
    precision highp float;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform vec2 uPointer[12];

    // Smooth min for metaball blending
    float smin(float a, float b, float k) {
      float h = max(k - abs(a - b), 0.0) / k;
      return min(a, b) - h * h * h * k * (1.0 / 6.0);
    }

    // SDF: sphere
    float sdSphere(vec3 p, vec3 center, float r) {
      return length(p - center) - r;
    }

    // Scene SDF: metaballs following pointer trail
    float scene(vec3 p) {
      float d = 1e10;
      float blend = 0.8;

      for (int i = 0; i < 12; i++) {
        vec2 pt = uPointer[i];
        // Scale radius: larger for recent, smaller for old
        float r = 0.35 - float(i) * 0.018;
        if (r < 0.05) r = 0.05;

        vec3 center = vec3(pt.x, pt.y, 0.0);
        d = smin(d, sdSphere(p, center, r), blend);
      }

      return d;
    }

    // Compute normal via finite differences
    vec3 calcNormal(vec3 p) {
      float e = 0.001;
      return normalize(vec3(
        scene(p + vec3(e,0,0)) - scene(p - vec3(e,0,0)),
        scene(p + vec3(0,e,0)) - scene(p - vec3(0,e,0)),
        scene(p + vec3(0,0,e)) - scene(p - vec3(0,0,e))
      ));
    }

    // Simple noise for iridescence
    float hash(float n) { return fract(sin(n) * 43758.5453); }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);

      // Ray setup (orthographic)
      vec3 ro = vec3(uv, 2.0);
      vec3 rd = vec3(0.0, 0.0, -1.0);

      // Ray march
      float t = 0.0;
      float d;
      bool hit = false;

      for (int i = 0; i < 32; i++) {
        vec3 p = ro + rd * t;
        d = scene(p);
        if (d < 0.001) { hit = true; break; }
        if (t > 5.0) break;
        t += d;
      }

      if (!hit) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
      }

      vec3 p = ro + rd * t;
      vec3 n = calcNormal(p);

      // Lighting
      vec3 lightDir = normalize(vec3(0.3, 0.5, 1.0));
      float diff = max(dot(n, lightDir), 0.0);
      float spec = pow(max(dot(reflect(-lightDir, n), -rd), 0.0), 32.0);

      // Fresnel for edge glow
      float fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);

      // Iridescent color based on normal and time
      float hue = dot(n, vec3(0.3, 0.6, 0.1)) * 2.0 + uTime * 0.2;
      vec3 iridescent = vec3(
        0.5 + 0.5 * cos(hue),
        0.5 + 0.5 * cos(hue + 2.094),
        0.5 + 0.5 * cos(hue + 4.189)
      );

      // Base color: turquoise tint
      vec3 baseColor = vec3(0.17, 0.69, 0.66); // #2CB0A8

      // Mix
      vec3 color = mix(baseColor, iridescent, 0.3);
      color = color * (0.3 + diff * 0.5) + vec3(spec * 0.4);
      color += fresnel * vec3(0.2, 0.5, 0.5) * 0.6;

      // Gamma
      color = pow(color, vec3(1.0 / 2.2));

      float alpha = 0.85;

      gl_FragColor = vec4(color, alpha);
    }
  `;

  /* --- Compile --- */
  function createShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Droplets shader:', gl.getShaderInfoLog(s));
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
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  // Quad
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  // Enable blending for transparency
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // Uniforms
  const uResolution = gl.getUniformLocation(program, 'uResolution');
  const uTime = gl.getUniformLocation(program, 'uTime');
  const uPointer = [];
  for (let i = 0; i < 12; i++) {
    uPointer.push(gl.getUniformLocation(program, `uPointer[${i}]`));
  }

  // Pointer trail (NDC coords)
  const trail = [];
  for (let i = 0; i < 12; i++) trail.push([0, -5]); // offscreen initially

  let pointerX = 0, pointerY = -5;

  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    const aspect = rect.width / rect.height;
    const mx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const my = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
    pointerX = mx * (rect.width > rect.height ? aspect : 1);
    pointerY = my * (rect.width > rect.height ? 1 : 1 / aspect);
  }

  canvas.addEventListener('pointermove', onPointerMove, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      onPointerMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
    }
  }, { passive: true });

  /* --- Resize --- */
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    const dpr = Math.min(window.devicePixelRatio, 1.5); // lower for perf (ray marching is expensive)
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  const ro = new ResizeObserver(() => resize());
  ro.observe(container);
  resize();

  /* --- Render --- */
  const startTime = performance.now() / 1000;
  let animId;

  function render() {
    animId = requestAnimationFrame(render);
    const now = performance.now() / 1000 - startTime;

    // Update trail: shift and insert new position
    trail.pop();
    trail.unshift([pointerX, pointerY]);

    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uTime, now);
    for (let i = 0; i < 12; i++) {
      gl.uniform2f(uPointer[i], trail[i][0], trail[i][1]);
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  render();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animId);
    else render();
  });
})();

/* ===== PIXEL DISSOLVE TRANSITION — 100K PARTICLES ===== */
/* Full-screen dissolve to black, then reassemble. Uses Canvas ImageData for speed. */

(function () {
  const slides = document.querySelectorAll('.slide');
  if (slides.length < 2) return;

  // Create overlay canvas
  const cvs = document.createElement('canvas');
  cvs.style.cssText = 'position:fixed;inset:0;z-index:998;pointer-events:none;';
  document.body.appendChild(cvs);
  const ctx = cvs.getContext('2d', { willReadFrequently: false });

  let W, H;
  function resize() {
    W = cvs.width = window.innerWidth;
    H = cvs.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // --- Particle system (100k) ---
  const COUNT = 100000;
  const PIXEL_SIZE = 2; // each particle = 2x2 px

  // Pre-allocate typed arrays for performance
  const px = new Float32Array(COUNT); // x position
  const py = new Float32Array(COUNT); // y position
  const vx = new Float32Array(COUNT); // velocity x
  const vy = new Float32Array(COUNT); // velocity y
  const delay = new Float32Array(COUNT); // stagger delay 0-1
  const cr = new Uint8Array(COUNT); // color r
  const cg = new Uint8Array(COUNT); // color g
  const cb = new Uint8Array(COUNT); // color b

  // Site palette
  const PALETTE = [
    [44, 176, 168],   // turquoise
    [5, 59, 58],      // deep-green
    [15, 33, 32],     // dark-green
    [204, 212, 253],  // violet
    [250, 255, 175],  // yellow
    [44, 176, 168],   // turquoise again (weighted)
  ];

  function initParticles() {
    for (let i = 0; i < COUNT; i++) {
      // Start grid position (fills screen)
      px[i] = Math.random() * W;
      py[i] = Math.random() * H;

      // Random velocity for scatter
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      vx[i] = Math.cos(angle) * speed;
      vy[i] = Math.sin(angle) * speed;

      // Stagger from center
      const cx = W / 2, cy = H / 2;
      const dx = px[i] - cx, dy = py[i] - cy;
      const maxDist = Math.sqrt(cx * cx + cy * cy);
      delay[i] = Math.sqrt(dx * dx + dy * dy) / maxDist + Math.random() * 0.1;

      // Color
      const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      cr[i] = c[0];
      cg[i] = c[1];
      cb[i] = c[2];
    }
  }

  // --- Transition state ---
  let transitioning = false;
  let transStart = 0;
  const DURATION = 900; // total ms
  let lastSlide = -1;

  function triggerTransition() {
    if (transitioning) return;
    transitioning = true;
    transStart = performance.now();
    initParticles();
    requestAnimationFrame(renderTransition);
  }

  function renderTransition() {
    if (!transitioning) return;

    const elapsed = performance.now() - transStart;
    const t = Math.min(elapsed / DURATION, 1.0);

    // Phase 1 (0-0.5): scatter to black
    // Phase 2 (0.5-1): reassemble from black
    const half = 0.5;
    let phase, scatter;
    if (t < half) {
      phase = t / half; // 0 -> 1 (dissolving)
      scatter = phase;
    } else {
      phase = (t - half) / half; // 0 -> 1 (assembling)
      scatter = 1 - phase;
    }

    // Easing
    const eased = scatter < 0.5
      ? 2 * scatter * scatter
      : 1 - Math.pow(-2 * scatter + 2, 2) / 2;

    // Black fill — peaks at midpoint
    const blackAlpha = t < half
      ? eased
      : (1 - phase) * (1 - phase); // fade out black

    ctx.clearRect(0, 0, W, H);

    // Draw black background
    if (blackAlpha > 0.01) {
      ctx.globalAlpha = Math.min(blackAlpha * 1.2, 1);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
    }

    // Draw particles
    const imageData = ctx.getImageData(0, 0, W, H);
    const data = imageData.data;

    for (let i = 0; i < COUNT; i++) {
      // Staggered progress for this particle
      const p = Math.max(0, Math.min(1, (eased - delay[i] * 0.3) / 0.7));
      if (p < 0.01) continue;

      // Current position: lerp between grid and scattered
      const scatterX = px[i] + vx[i] * p * 30;
      const scatterY = py[i] + vy[i] * p * 30 + p * p * 40; // gravity

      const drawX = Math.round(scatterX);
      const drawY = Math.round(scatterY);

      // Bounds check
      if (drawX < 0 || drawX >= W - PIXEL_SIZE || drawY < 0 || drawY >= H - PIXEL_SIZE) continue;

      // Alpha based on particle progress
      const alpha = Math.round(p * 220);

      // Draw 2x2 pixel block directly into ImageData
      for (let dy = 0; dy < PIXEL_SIZE; dy++) {
        for (let dx = 0; dx < PIXEL_SIZE; dx++) {
          const idx = ((drawY + dy) * W + (drawX + dx)) * 4;
          // Additive blend
          data[idx] = Math.min(255, data[idx] + cr[i]);
          data[idx + 1] = Math.min(255, data[idx + 1] + cg[i]);
          data[idx + 2] = Math.min(255, data[idx + 2] + cb[i]);
          data[idx + 3] = Math.min(255, data[idx + 3] + alpha);
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    ctx.globalAlpha = 1;

    if (t >= 1) {
      transitioning = false;
      ctx.clearRect(0, 0, W, H);
      return;
    }

    requestAnimationFrame(renderTransition);
  }

  // --- Detect slide changes ---
  const slideMap = new Map();
  slides.forEach((s, i) => slideMap.set(s, i));

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.4) {
        const idx = slideMap.get(entry.target);
        if (idx !== undefined && idx !== lastSlide) {
          if (lastSlide >= 0) triggerTransition();
          lastSlide = idx;
        }
      }
    });
  }, { threshold: [0.4, 0.6] });

  slides.forEach(s => obs.observe(s));
})();

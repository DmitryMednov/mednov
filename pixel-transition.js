/* ===== PIXEL DISSOLVE TRANSITIONS BETWEEN SECTIONS ===== */
/* Inspired by Codrops Pixel-Voxel-Drop — pixelation effect on scroll transitions */

(function () {
  const sections = document.querySelectorAll('.hero, .section, .marquee-wrap');
  if (sections.length < 2) return;

  // Create overlay canvas
  const overlay = document.createElement('canvas');
  overlay.id = 'pixel-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:999;pointer-events:none;';
  document.body.appendChild(overlay);

  const ctx = overlay.getContext('2d');
  let w, h;

  function resize() {
    w = overlay.width = window.innerWidth;
    h = overlay.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // Transition state
  let transitioning = false;
  let transProgress = 0; // 0 = no effect, 1 = full pixelation
  let transDirection = 0; // 1 = entering, -1 = leaving
  let transStartTime = 0;
  const TRANS_DURATION = 600; // ms

  // Pixel grid config
  const BASE_PIXEL = 40; // max pixel block size
  const COLS_COUNT = () => Math.ceil(w / BASE_PIXEL);
  const ROWS_COUNT = () => Math.ceil(h / BASE_PIXEL);

  // Track which section is in view
  let lastSection = -1;
  let scrollTicking = false;

  // Colors from site palette
  const COLORS = [
    [15, 33, 32],    // --dark-green
    [5, 59, 58],     // --deep-green
    [44, 176, 168],  // --turquoise
  ];

  function pickColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
  }

  // Generate staggered delay grid (ripple from center)
  function makeDelayGrid(cols, rows) {
    const cx = cols / 2;
    const cy = rows / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    const grid = [];

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        // Normalize to 0-1 with some randomness
        grid.push(dist / maxDist + (Math.random() * 0.15));
      }
    }
    return grid;
  }

  // Pixel grid with per-cell state
  let pixelGrid = null;

  function initGrid() {
    const cols = COLS_COUNT();
    const rows = ROWS_COUNT();
    const delays = makeDelayGrid(cols, rows);
    pixelGrid = [];

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        const color = pickColor();
        pixelGrid.push({
          x: x * BASE_PIXEL,
          y: y * BASE_PIXEL,
          delay: delays[idx],
          color: color,
          alpha: 0,
        });
      }
    }
  }

  function triggerTransition(dir) {
    if (transitioning) return;
    transitioning = true;
    transDirection = dir;
    transStartTime = performance.now();
    initGrid();
    animateTransition();
  }

  function animateTransition() {
    if (!transitioning) return;

    const elapsed = performance.now() - transStartTime;
    const halfDur = TRANS_DURATION / 2;

    // Phase 1: pixelate in (0 to halfDur)
    // Phase 2: pixelate out (halfDur to TRANS_DURATION)
    let phase;
    if (elapsed < halfDur) {
      phase = elapsed / halfDur; // 0 -> 1
    } else {
      phase = 1 - (elapsed - halfDur) / halfDur; // 1 -> 0
    }
    phase = Math.max(0, Math.min(1, phase));

    // Easing
    const eased = phase < 0.5
      ? 4 * phase * phase * phase
      : 1 - Math.pow(-2 * phase + 2, 3) / 2;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    if (pixelGrid && eased > 0.01) {
      for (let i = 0; i < pixelGrid.length; i++) {
        const p = pixelGrid[i];
        // Staggered: cells with lower delay appear first
        const cellProgress = Math.max(0, Math.min(1, (eased - p.delay * 0.4) / 0.6));

        if (cellProgress > 0.01) {
          const size = BASE_PIXEL * cellProgress;
          const offset = (BASE_PIXEL - size) / 2;
          const alpha = cellProgress * 0.92;

          ctx.fillStyle = `rgba(${p.color[0]},${p.color[1]},${p.color[2]},${alpha})`;
          ctx.fillRect(p.x + offset, p.y + offset, size, size);
        }
      }
    }

    if (elapsed >= TRANS_DURATION) {
      transitioning = false;
      ctx.clearRect(0, 0, w, h);
      return;
    }

    requestAnimationFrame(animateTransition);
  }

  // Detect section changes via IntersectionObserver
  const sectionIndices = new Map();
  sections.forEach((s, i) => sectionIndices.set(s, i));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
        const idx = sectionIndices.get(entry.target);
        if (idx !== undefined && idx !== lastSection) {
          const dir = idx > lastSection ? 1 : -1;
          if (lastSection >= 0) {
            triggerTransition(dir);
          }
          lastSection = idx;
        }
      }
    });
  }, { threshold: [0.3, 0.5] });

  sections.forEach(s => observer.observe(s));
})();

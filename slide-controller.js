/* ===== FULLSCREEN SLIDE CONTROLLER ===== */
/* Locks each slide to 100vh. Scroll/swipe/keyboard navigates between slides. */

(function () {
  const slides = document.querySelectorAll('.slide');
  if (slides.length === 0) return;

  // Wrap slides in container if not already
  let container = document.querySelector('.slides-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'slides-container';
    const parent = slides[0].parentNode;
    // Move all slides + footer into container
    const els = document.querySelectorAll('.slide');
    els.forEach(el => container.appendChild(el));
    parent.appendChild(container);
  }

  const count = slides.length;
  let current = 0;
  let isAnimating = false;
  const DURATION = 800; // ms — matches CSS transition

  // Position all slides: stack them vertically
  function layout() {
    slides.forEach((slide, i) => {
      slide.style.transform = `translateY(${(i - current) * 100}vh)`;
    });
  }

  function goTo(index) {
    if (isAnimating || index < 0 || index >= count || index === current) return;
    isAnimating = true;
    current = index;

    slides.forEach((slide, i) => {
      slide.style.transform = `translateY(${(i - current) * 100}vh)`;
    });

    updateIndicators();

    setTimeout(() => { isAnimating = false; }, DURATION);
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  // --- Wheel ---
  let wheelAccum = 0;
  let wheelTimer = null;
  const WHEEL_THRESHOLD = 50;

  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (isAnimating) return;

    wheelAccum += e.deltaY;

    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { wheelAccum = 0; }, 200);

    if (Math.abs(wheelAccum) > WHEEL_THRESHOLD) {
      if (wheelAccum > 0) next();
      else prev();
      wheelAccum = 0;
    }
  }, { passive: false });

  // --- Touch swipe ---
  let touchStartY = 0;
  let touchDelta = 0;

  container.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    touchDelta = 0;
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    touchDelta = touchStartY - e.touches[0].clientY;
  }, { passive: true });

  container.addEventListener('touchend', () => {
    if (isAnimating) return;
    if (touchDelta > 60) next();
    else if (touchDelta < -60) prev();
    touchDelta = 0;
  });

  // --- Keyboard ---
  document.addEventListener('keydown', (e) => {
    if (isAnimating) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      prev();
    } else if (e.key === 'Home') {
      e.preventDefault();
      goTo(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      goTo(count - 1);
    }
  });

  // --- Slide indicators (dots on right side) ---
  const dotsWrap = document.createElement('div');
  dotsWrap.className = 'slide-dots';
  dotsWrap.style.cssText = `
    position:fixed; right:20px; top:50%; transform:translateY(-50%);
    z-index:1001; display:flex; flex-direction:column; gap:10px;
  `;

  for (let i = 0; i < count; i++) {
    const dot = document.createElement('button');
    dot.style.cssText = `
      width:8px; height:8px; border-radius:50%; border:none; cursor:pointer;
      background:rgba(255,255,255,0.2); transition:all 0.3s;
      padding:0;
    `;
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  }
  document.body.appendChild(dotsWrap);

  function updateIndicators() {
    const dots = dotsWrap.children;
    for (let i = 0; i < dots.length; i++) {
      dots[i].style.background = i === current ? '#2CB0A8' : 'rgba(255,255,255,0.2)';
      dots[i].style.transform = i === current ? 'scale(1.5)' : 'scale(1)';
    }
  }

  // --- Init ---
  layout();
  updateIndicators();

  // Handle hash navigation
  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) {
      const idx = Array.from(slides).indexOf(target);
      if (idx >= 0) {
        current = idx;
        layout();
        updateIndicators();
      }
    }
  }
})();

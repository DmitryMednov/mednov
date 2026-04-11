/* ===== FULLSCREEN SLIDE CONTROLLER ===== */
/* Pixel-based transforms using measured viewport height.
   Defers to inner-scrollable elements. Responds to resize. */

(function () {
  const slides = document.querySelectorAll('.slide');
  if (slides.length === 0) return;

  // Wrap slides in container if not already
  let container = document.querySelector('.slides-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'slides-container';
    const parent = slides[0].parentNode;
    const els = document.querySelectorAll('.slide');
    els.forEach(el => container.appendChild(el));
    parent.appendChild(container);
  }

  const count = slides.length;
  let current = 0;
  let isAnimating = false;
  const DURATION = 800;

  /* --- Viewport height measurement (handles mobile URL bar) --- */
  let vh = window.innerHeight;
  function measureVh() {
    // Prefer visualViewport (accounts for URL bar / keyboard)
    vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    document.documentElement.style.setProperty('--vh', (vh * 0.01) + 'px');
    document.documentElement.style.setProperty('--app-h', vh + 'px');
  }
  measureVh();

  /* --- Layout: pixel-based translateY --- */
  function layout(animate) {
    slides.forEach((slide, i) => {
      slide.style.height = vh + 'px';
      if (!animate) {
        slide.style.transition = 'none';
        slide.offsetHeight; // reflow
      }
      slide.style.transform = `translate3d(0, ${(i - current) * vh}px, 0)`;
      if (!animate) {
        // restore CSS transition next frame
        requestAnimationFrame(() => { slide.style.transition = ''; });
      }
    });
    syncProgressBar();
  }

  function goTo(index) {
    if (isAnimating || index < 0 || index >= count || index === current) return;
    isAnimating = true;
    current = index;
    slides.forEach((slide, i) => {
      slide.style.transform = `translate3d(0, ${(i - current) * vh}px, 0)`;
    });
    updateIndicators();
    syncProgressBar();
    setTimeout(() => { isAnimating = false; }, DURATION);
    window.dispatchEvent(new CustomEvent('slidechange', { detail: { current, count } }));
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  /* --- Progress bar sync (replaces dead scrollY-based one) --- */
  function syncProgressBar() {
    const bar = document.querySelector('.scroll-progress');
    if (bar) {
      const p = count > 1 ? current / (count - 1) : 0;
      bar.style.transform = `scaleX(${p})`;
    }
  }

  /* --- Detect if inner scrollable can handle the wheel/touch --- */
  function findInnerScroller(startEl, deltaY) {
    let el = startEl;
    while (el && el !== container && el !== document.body) {
      if (el.scrollHeight > el.clientHeight + 1) {
        // Can scroll in requested direction?
        if (deltaY > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return el;
        if (deltaY < 0 && el.scrollTop > 0) return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  /* --- Block navigation when a modal/overlay is open or nav menu is open --- */
  function isBlocked() {
    if (document.querySelector('.nav-links.open')) return true;
    if (document.querySelector('.carousel-overlay.active')) return true;
    return false;
  }

  /* --- Wheel --- */
  let wheelAccum = 0;
  let wheelTimer = null;
  const WHEEL_THRESHOLD = 50;

  container.addEventListener('wheel', (e) => {
    if (isBlocked()) return;
    // If target is inside a scrollable element that can still scroll, let it
    if (findInnerScroller(e.target, e.deltaY)) return;

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

  /* --- Touch swipe --- */
  let touchStartY = 0;
  let touchStartX = 0;
  let touchDelta = 0;
  let touchDeltaX = 0;
  let touchTarget = null;
  let touchScroller = null;

  container.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    touchDelta = 0;
    touchDeltaX = 0;
    touchTarget = e.target;
    touchScroller = null;
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    touchDelta = touchStartY - e.touches[0].clientY;
    touchDeltaX = touchStartX - e.touches[0].clientX;
    // Identify inner scroller once we have a dominant vertical direction
    if (Math.abs(touchDelta) > Math.abs(touchDeltaX) && !touchScroller) {
      touchScroller = findInnerScroller(touchTarget, touchDelta);
    }
  }, { passive: true });

  container.addEventListener('touchend', () => {
    if (isBlocked() || isAnimating) { touchDelta = 0; return; }
    if (touchScroller) { touchDelta = 0; return; }
    // Only navigate when vertical swipe dominates horizontal
    if (Math.abs(touchDelta) > Math.abs(touchDeltaX) * 1.2) {
      if (touchDelta > 60) next();
      else if (touchDelta < -60) prev();
    }
    touchDelta = 0;
    touchDeltaX = 0;
  });

  /* --- Keyboard --- */
  document.addEventListener('keydown', (e) => {
    if (isBlocked() || isAnimating) return;
    // Skip navigation if user is typing in an input
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault(); next();
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault(); prev();
    } else if (e.key === 'Home') {
      e.preventDefault(); goTo(0);
    } else if (e.key === 'End') {
      e.preventDefault(); goTo(count - 1);
    }
  });

  /* --- Slide indicators (dots) --- */
  const dotsWrap = document.createElement('div');
  dotsWrap.className = 'slide-dots';
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('button');
    dot.className = 'slide-dot';
    dot.setAttribute('aria-label', `Slide ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  }
  document.body.appendChild(dotsWrap);

  function updateIndicators() {
    const dots = dotsWrap.children;
    for (let i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('active', i === current);
    }
  }

  /* --- Resize listener (handles orientation/rotation/URL bar) --- */
  let resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      measureVh();
      layout(false);
    }, 100);
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onResize);
  }

  /* --- Init --- */
  layout(false);
  updateIndicators();

  // Hash navigation
  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) {
      const idx = Array.from(slides).indexOf(target);
      if (idx >= 0) { current = idx; layout(false); updateIndicators(); }
    }
  }

  // Expose for debugging / external access
  window.__slideController = { goTo, next, prev, get current() { return current; } };
})();

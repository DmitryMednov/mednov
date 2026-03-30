/* ===== MEDNOV FAMILY OFFICE ===== */

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveal();
  initCursorGlow();
  initCounters();
  initInfiniteScrolls();
  initGamesBg();
});

/* --- Nav --- */
function initNav() {
  const nav = document.querySelector('.nav');
  const burger = document.querySelector('.nav-burger');
  const links = document.querySelector('.nav-links');

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });

  if (burger) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('open');
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => {
        burger.classList.remove('open');
        links.classList.remove('open');
      })
    );
  }
}

/* --- Scroll Reveal --- */
function initReveal() {
  const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .stagger');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => obs.observe(el));
}

/* --- Cursor Glow --- */
function initCursorGlow() {
  const g = document.querySelector('.cursor-glow');
  if (!g || window.innerWidth < 768) return;
  document.addEventListener('mousemove', e => {
    g.style.left = e.clientX + 'px';
    g.style.top = e.clientY + 'px';
  });
}

/* --- Counters --- */
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { animateNum(e.target); obs.unobserve(e.target); }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => obs.observe(c));
}

function animateNum(el) {
  const target = parseInt(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  const dur = 1800;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 4);
    el.textContent = Math.round(eased * target) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* --- Infinite Horizontal Scrolls --- */
function initInfiniteScrolls() {
  document.querySelectorAll('.scroll-strip').forEach(strip => {
    const items = Array.from(strip.children);
    if (!items.length) return;

    // Clone all items to fill the strip for seamless looping
    items.forEach(item => {
      const clone = item.cloneNode(true);
      strip.appendChild(clone);
    });

    // Auto-scroll animation
    let scrollPos = 0;
    const speed = 0.5; // px per frame
    const totalOrigWidth = items.reduce((s, i) => s + i.offsetWidth + 24, 0); // 24 = gap approx

    let paused = false;
    strip.addEventListener('mouseenter', () => paused = true);
    strip.addEventListener('mouseleave', () => paused = false);
    strip.addEventListener('touchstart', () => paused = true, { passive: true });
    strip.addEventListener('touchend', () => paused = false);

    function step() {
      if (!paused) {
        scrollPos += speed;
        if (scrollPos >= totalOrigWidth) scrollPos -= totalOrigWidth;
        strip.scrollLeft = scrollPos;
      } else {
        // When user scrolls manually, sync our position
        scrollPos = strip.scrollLeft;
        if (scrollPos >= totalOrigWidth) {
          scrollPos -= totalOrigWidth;
          strip.scrollLeft = scrollPos;
        }
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

/* --- Games Canvas Background --- */
function initGamesBg() {
  const canvas = document.getElementById('games-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, particles = [];

  function resize() {
    w = canvas.width = canvas.parentElement.offsetWidth;
    h = canvas.height = canvas.parentElement.offsetHeight;
  }
  function create() {
    particles = [];
    const count = Math.floor((w * h) / 18000);
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 1.5 + 0.5, opacity: Math.random() * 0.25 + 0.05,
      });
    }
  }
  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(44,176,168,${p.opacity})`;
      ctx.fill();
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dx = p.x - q.x, dy = p.y - q.y;
        const d = dx * dx + dy * dy;
        if (d < 12000) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(44,176,168,${0.04 * (1 - d / 12000)})`;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  resize(); create(); draw();
  window.addEventListener('resize', () => { resize(); create(); });
}

/* --- Hero parallax --- */
window.addEventListener('scroll', () => {
  const hero = document.querySelector('.hero-content');
  if (hero) {
    const y = window.scrollY;
    hero.style.transform = `translateY(${y * 0.12}px)`;
    hero.style.opacity = Math.max(1 - y / 700, 0);
  }
}, { passive: true });

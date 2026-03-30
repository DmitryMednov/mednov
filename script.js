/* ===== MEDNOV FAMILY OFFICE — v2.0 ===== */

document.addEventListener('DOMContentLoaded', () => {
  initScrollProgress();
  initNav();
  initReveal();
  initSplitText();
  initCursorGlow();
  initMagneticButtons();
  initCounters();
  initScrollStrips();
  initGamesBg();
});

/* --- Scroll Progress Bar --- */
function initScrollProgress() {
  const bar = document.querySelector('.scroll-progress');
  if (!bar) return;
  const update = () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    if (h > 0) bar.style.transform = `scaleX(${window.scrollY / h})`;
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

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
  if (!els.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => obs.observe(el));
}

/* --- Split Text Typography Animations --- */
function initSplitText() {
  // Word split
  document.querySelectorAll('.split-words').forEach(el => {
    if (el.dataset.split) return; // already split
    el.dataset.split = '1';
    const html = el.innerHTML;
    // Split by words, preserving HTML tags like <span> and <br>
    const text = el.textContent;
    const words = text.split(/\s+/).filter(w => w.length > 0);
    let newHtml = '';
    let wordIndex = 0;
    // Simple approach: wrap each text node word
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach(node => {
      const nodeWords = node.textContent.split(/(\s+)/);
      let replacement = '';
      nodeWords.forEach(part => {
        if (part.trim().length > 0) {
          replacement += `<span class="word" style="--word-i:${wordIndex}"><span class="word-inner">${part}</span></span>`;
          wordIndex++;
        } else {
          replacement += part;
        }
      });
      const span = document.createElement('span');
      span.innerHTML = replacement;
      node.parentNode.replaceChild(span, node);
    });
  });

  // Character split
  document.querySelectorAll('.split-chars').forEach(el => {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    let charIndex = 0;
    textNodes.forEach(node => {
      const chars = node.textContent.split('');
      let replacement = '';
      chars.forEach(ch => {
        if (ch === ' ') {
          replacement += ' ';
        } else {
          replacement += `<span class="char" style="--char-i:${charIndex}">${ch}</span>`;
          charIndex++;
        }
      });
      const span = document.createElement('span');
      span.innerHTML = replacement;
      node.parentNode.replaceChild(span, node);
    });
  });

  // Line split
  document.querySelectorAll('.split-lines').forEach(el => {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    const lines = el.innerHTML.split(/<br\s*\/?>/gi);
    el.innerHTML = lines.map((line, i) =>
      `<span class="line" style="--line-i:${i}"><span class="line-inner">${line.trim()}</span></span>`
    ).join('');
  });

  // Observe all split-text elements
  const splitEls = document.querySelectorAll('.split-words, .split-chars, .split-lines');
  if (!splitEls.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -30px 0px' });
  splitEls.forEach(el => obs.observe(el));
}

/* --- Cursor Glow --- */
function initCursorGlow() {
  const g = document.querySelector('.cursor-glow');
  if (!g || window.innerWidth < 768) return;
  document.addEventListener('mousemove', e => {
    g.style.left = e.clientX + 'px';
    g.style.top = e.clientY + 'px';
  }, { passive: true });
}

/* --- Magnetic Buttons --- */
function initMagneticButtons() {
  if (window.innerWidth < 768) return;
  document.querySelectorAll('.hero-cta, .scroll-btn').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
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

/* --- Scroll Strips with Navigation Buttons --- */
function initScrollStrips() {
  document.querySelectorAll('.scroll-strip').forEach(strip => {
    const wrap = strip.closest('.scroll-strip-wrap') || strip.parentElement;

    // Create navigation buttons
    const prevBtn = document.createElement('button');
    prevBtn.className = 'scroll-btn scroll-btn-prev';
    prevBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>';
    prevBtn.setAttribute('aria-label', 'Previous');

    const nextBtn = document.createElement('button');
    nextBtn.className = 'scroll-btn scroll-btn-next';
    nextBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>';
    nextBtn.setAttribute('aria-label', 'Next');

    wrap.style.position = 'relative';
    wrap.appendChild(prevBtn);
    wrap.appendChild(nextBtn);

    // Scroll amount = width of first card + gap
    const getScrollAmount = () => {
      const firstChild = strip.children[0];
      if (!firstChild) return 300;
      return firstChild.offsetWidth + 24; // 24 = 1.5rem gap approx
    };

    prevBtn.addEventListener('click', () => {
      strip.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
    });
    nextBtn.addEventListener('click', () => {
      strip.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
    });

    // Update button visibility
    function updateButtons() {
      const atStart = strip.scrollLeft <= 5;
      const atEnd = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 5;
      prevBtn.classList.toggle('active', !atStart);
      nextBtn.classList.toggle('active', !atEnd);
    }

    strip.addEventListener('scroll', updateButtons, { passive: true });
    // Initial check after layout
    requestAnimationFrame(() => {
      updateButtons();
      // Re-check after images load
      setTimeout(updateButtons, 500);
    });

    // Clone items for infinite feel
    const items = Array.from(strip.children);
    if (items.length > 0) {
      items.forEach(item => {
        const clone = item.cloneNode(true);
        strip.appendChild(clone);
      });
    }

    // Auto-scroll
    let scrollPos = 0;
    const speed = 0.4;
    const totalOrigWidth = items.reduce((s, i) => s + i.offsetWidth + 24, 0);

    let paused = false;
    strip.addEventListener('mouseenter', () => paused = true);
    strip.addEventListener('mouseleave', () => { paused = false; scrollPos = strip.scrollLeft; });
    strip.addEventListener('touchstart', () => paused = true, { passive: true });
    strip.addEventListener('touchend', () => { paused = false; scrollPos = strip.scrollLeft; });

    function step() {
      if (!paused && totalOrigWidth > 0) {
        scrollPos += speed;
        if (scrollPos >= totalOrigWidth) scrollPos -= totalOrigWidth;
        strip.scrollLeft = scrollPos;
      } else {
        scrollPos = strip.scrollLeft;
        if (totalOrigWidth > 0 && scrollPos >= totalOrigWidth) {
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
  let animId;

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
    animId = requestAnimationFrame(draw);
  }

  // Use ResizeObserver for better perf
  let resizeTimeout;
  const ro = new ResizeObserver(() => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => { resize(); create(); }, 150);
  });
  ro.observe(canvas.parentElement);

  resize(); create(); draw();
}

/* --- Hero parallax --- */
(function() {
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const hero = document.querySelector('.hero-content');
        if (hero) {
          const y = window.scrollY;
          hero.style.transform = `translateY(${y * 0.12}px)`;
          hero.style.opacity = Math.max(1 - y / 700, 0);
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();

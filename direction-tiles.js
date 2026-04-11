/* ===== DIRECTION TILES — Animated backgrounds ===== */
/* Canvas animations for Music (audio bars) and Games (tetris blocks) */

(function () {
  const canvases = document.querySelectorAll('.direction-anim');
  if (!canvases.length) return;

  canvases.forEach(canvas => {
    const type = canvas.dataset.anim;
    if (type === 'music') initMusicAnim(canvas);
    else if (type === 'games') initGamesAnim(canvas);
  });

  /* ── Helper: resize canvas to parent ── */
  function fit(canvas) {
    const parent = canvas.parentElement;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    canvas.width = Math.max(1, w * dpr);
    canvas.height = Math.max(1, h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    return dpr;
  }

  /* ══════════════════════════════════════════════════════
     MUSIC ANIMATION — dancing audio spectrum bars
     ══════════════════════════════════════════════════════ */
  function initMusicAnim(canvas) {
    const ctx = canvas.getContext('2d');
    let dpr = fit(canvas);
    let w = canvas.width, h = canvas.height;
    let animId;
    const startTime = performance.now();

    // Generate bars — each has own frequency and phase
    const BAR_COUNT = 64;
    const bars = [];
    for (let i = 0; i < BAR_COUNT; i++) {
      bars.push({
        freq: 1.5 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
        baseHeight: 0.3 + Math.random() * 0.4,
        amp: 0.2 + Math.random() * 0.3,
      });
    }

    // Floating music notes
    const notes = [];
    for (let i = 0; i < 8; i++) {
      notes.push({
        x: Math.random(),
        y: Math.random() * 0.4 + 0.1,
        vx: (Math.random() - 0.5) * 0.0003,
        vy: -0.0001 - Math.random() * 0.0001,
        size: 0.5 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }

    function draw() {
      animId = requestAnimationFrame(draw);
      const t = (performance.now() - startTime) * 0.001;

      // Background with subtle gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, 'rgba(5, 59, 58, 0.0)');
      bgGrad.addColorStop(1, 'rgba(44, 176, 168, 0.08)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Draw spectrum bars
      const barW = w / BAR_COUNT;
      const baseY = h * 0.85;
      const maxBarH = h * 0.55;

      for (let i = 0; i < BAR_COUNT; i++) {
        const bar = bars[i];
        // Combine multiple sine waves for organic motion
        const noise = Math.sin(t * bar.freq + bar.phase) * 0.5
                   + Math.sin(t * bar.freq * 1.7 + bar.phase * 2) * 0.3
                   + Math.sin(t * 0.5 + i * 0.3) * 0.4;
        const height = (bar.baseHeight + bar.amp * noise + 0.3) * maxBarH;
        const x = i * barW + barW * 0.15;
        const barWidth = barW * 0.7;

        // Gradient fill: turquoise to violet
        const grad = ctx.createLinearGradient(0, baseY, 0, baseY - height);
        grad.addColorStop(0, 'rgba(44, 176, 168, 0.9)');
        grad.addColorStop(0.6, 'rgba(44, 176, 168, 0.5)');
        grad.addColorStop(1, 'rgba(204, 212, 253, 0.3)');
        ctx.fillStyle = grad;

        // Rounded top bars
        const r = Math.min(barWidth / 2, 4 * dpr);
        const topY = baseY - height;
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.lineTo(x, topY + r);
        ctx.quadraticCurveTo(x, topY, x + r, topY);
        ctx.lineTo(x + barWidth - r, topY);
        ctx.quadraticCurveTo(x + barWidth, topY, x + barWidth, topY + r);
        ctx.lineTo(x + barWidth, baseY);
        ctx.closePath();
        ctx.fill();
      }

      // Baseline glow line
      const lineGrad = ctx.createLinearGradient(0, 0, w, 0);
      lineGrad.addColorStop(0, 'rgba(44, 176, 168, 0)');
      lineGrad.addColorStop(0.5, 'rgba(44, 176, 168, 0.6)');
      lineGrad.addColorStop(1, 'rgba(44, 176, 168, 0)');
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(0, baseY + 1);
      ctx.lineTo(w, baseY + 1);
      ctx.stroke();

      // Floating music notes
      ctx.font = `${24 * dpr}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      notes.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;
        n.phase += 0.02;
        if (n.y < -0.05) {
          n.x = Math.random();
          n.y = 0.9;
          n.phase = Math.random() * Math.PI * 2;
        }
        const px = n.x * w + Math.sin(n.phase) * 10 * dpr;
        const py = n.y * h;
        const opacity = 0.15 + Math.sin(n.phase * 0.5) * 0.1;
        ctx.fillStyle = `rgba(44, 176, 168, ${opacity})`;
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(n.size, n.size);
        ctx.fillText('♪', 0, 0);
        ctx.restore();
      });
    }

    const ro = new ResizeObserver(() => {
      dpr = fit(canvas);
      w = canvas.width; h = canvas.height;
    });
    ro.observe(canvas.parentElement);

    draw();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(animId);
      else draw();
    });
  }

  /* ══════════════════════════════════════════════════════
     GAMES ANIMATION — falling tetris-style blocks
     ══════════════════════════════════════════════════════ */
  function initGamesAnim(canvas) {
    const ctx = canvas.getContext('2d');
    let dpr = fit(canvas);
    let w = canvas.width, h = canvas.height;
    let animId;

    // Grid
    let CELL = 24 * dpr;
    let cols, rows;
    let blocks = [];
    let stack = []; // landed blocks

    function rebuild() {
      CELL = Math.max(18, Math.min(w, h) * 0.06);
      cols = Math.floor(w / CELL);
      rows = Math.floor(h / CELL);
      blocks = [];
      stack = [];
      // Spawn a few initial blocks
      for (let i = 0; i < 3; i++) {
        spawnBlock(-Math.random() * rows);
      }
    }

    // Tetris colors (site palette)
    const COLORS = [
      'rgba(44, 176, 168, 0.85)',   // turquoise
      'rgba(204, 212, 253, 0.75)',  // violet
      'rgba(250, 255, 175, 0.65)',  // yellow
      'rgba(44, 176, 168, 0.5)',
    ];

    // Tetris shapes (4x4 bitmaps)
    const SHAPES = [
      [[1,1,1,1]],                 // I
      [[1,1],[1,1]],               // O
      [[0,1,0],[1,1,1]],           // T
      [[1,0,0],[1,1,1]],           // J
      [[0,0,1],[1,1,1]],           // L
      [[0,1,1],[1,1,0]],           // S
      [[1,1,0],[0,1,1]],           // Z
    ];

    function spawnBlock(startRow) {
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const colorIdx = Math.floor(Math.random() * COLORS.length);
      const col = Math.floor(Math.random() * Math.max(1, cols - shape[0].length));
      blocks.push({
        shape,
        col,
        row: startRow !== undefined ? startRow : -shape.length,
        fallSpeed: 0.04 + Math.random() * 0.03,
        color: COLORS[colorIdx],
      });
    }

    function canFit(shape, col, row) {
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[0].length; c++) {
          if (!shape[r][c]) continue;
          const nr = Math.floor(row + r);
          const nc = col + c;
          if (nc < 0 || nc >= cols) return false;
          if (nr >= rows) return false;
          if (nr >= 0 && stack[nr] && stack[nr][nc]) return false;
        }
      }
      return true;
    }

    function lockBlock(block) {
      for (let r = 0; r < block.shape.length; r++) {
        for (let c = 0; c < block.shape[0].length; c++) {
          if (!block.shape[r][c]) continue;
          const nr = Math.floor(block.row + r);
          const nc = block.col + c;
          if (nr < 0 || nr >= rows) continue;
          if (!stack[nr]) stack[nr] = [];
          stack[nr][nc] = block.color;
        }
      }
    }

    function clearFullRows() {
      for (let r = rows - 1; r >= 0; r--) {
        if (!stack[r]) continue;
        let filled = 0;
        for (let c = 0; c < cols; c++) {
          if (stack[r][c]) filled++;
        }
        if (filled >= cols) {
          stack.splice(r, 1);
          stack.unshift([]);
        }
      }
    }

    function drawCell(x, y, color) {
      ctx.fillStyle = color;
      const m = CELL * 0.08;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x + m, y + m, CELL - m * 2, CELL - m * 2, CELL * 0.15);
      } else {
        ctx.rect(x + m, y + m, CELL - m * 2, CELL - m * 2);
      }
      ctx.fill();

      // Inner highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(x + m + 2, y + m + 2, CELL - m * 2 - 4, 2);
    }

    function draw() {
      animId = requestAnimationFrame(draw);

      // Fade background (trail effect)
      ctx.fillStyle = 'rgba(15, 33, 32, 0.15)';
      ctx.fillRect(0, 0, w, h);

      // Background grid
      ctx.strokeStyle = 'rgba(44, 176, 168, 0.06)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= cols; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CELL, 0);
        ctx.lineTo(x * CELL, rows * CELL);
        ctx.stroke();
      }
      for (let y = 0; y <= rows; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * CELL);
        ctx.lineTo(cols * CELL, y * CELL);
        ctx.stroke();
      }

      // Draw landed stack
      for (let r = 0; r < rows; r++) {
        if (!stack[r]) continue;
        for (let c = 0; c < cols; c++) {
          if (stack[r][c]) {
            drawCell(c * CELL, r * CELL, stack[r][c]);
          }
        }
      }

      // Update + draw falling blocks
      for (let i = blocks.length - 1; i >= 0; i--) {
        const b = blocks[i];
        const nextRow = b.row + b.fallSpeed;
        if (canFit(b.shape, b.col, nextRow)) {
          b.row = nextRow;
        } else {
          lockBlock(b);
          blocks.splice(i, 1);
          continue;
        }

        // Draw falling
        for (let r = 0; r < b.shape.length; r++) {
          for (let c = 0; c < b.shape[0].length; c++) {
            if (!b.shape[r][c]) continue;
            const px = (b.col + c) * CELL;
            const py = (b.row + r) * CELL;
            if (py > -CELL) drawCell(px, py, b.color);
          }
        }
      }

      clearFullRows();

      // Spawn new block if needed
      if (blocks.length < 3 && Math.random() < 0.03) {
        spawnBlock();
      }

      // Reset if stack overflows top
      if (stack[2] && stack[2].some(c => c)) {
        // Fade out + reset
        stack = [];
        blocks = [];
        for (let i = 0; i < 2; i++) spawnBlock(-Math.random() * rows);
      }
    }

    const ro = new ResizeObserver(() => {
      dpr = fit(canvas);
      w = canvas.width; h = canvas.height;
      rebuild();
    });
    ro.observe(canvas.parentElement);

    rebuild();
    draw();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(animId);
      else draw();
    });
  }
})();

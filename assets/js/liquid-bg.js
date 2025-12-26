/* =========================================================
   Tavas World - Living Water Background
   Runs ONLY on interaction, low-res for smooth performance
   ========================================================= */

(() => {
  const canvas = document.getElementById("tw-liquid-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });

  // Low resolution internal buffer for performance (scaled to screen)
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0, h = 0;

  // Interaction state
  let active = false;
  let rafId = null;
  let lastMove = 0;

  // Cursor influence (0..1)
  let mx = 0.5, my = 0.5;
  let vx = 0, vy = 0;

  // Animation time
  let t = 0;

  // Resize canvas to viewport
  function resize() {
    // Render at low res but scale up to fill screen smoothly
    const scale = 0.28; // lower = faster and smoother
    w = Math.max(320, Math.floor(window.innerWidth * scale));
    h = Math.max(220, Math.floor(window.innerHeight * scale));

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Stretch to screen via CSS
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
  }

  // Simple smooth noise (value noise)
  function hash(x, y) {
    // deterministic pseudo-random
    let n = x * 374761393 + y * 668265263;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967295;
  }

  function lerp(a, b, u) {
    return a + (b - a) * u;
  }

  function smoothstep(u) {
    return u * u * (3 - 2 * u);
  }

  function noise(x, y) {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = x0 + 1, y1 = y0 + 1;

    const sx = smoothstep(x - x0);
    const sy = smoothstep(y - y0);

    const n00 = hash(x0, y0);
    const n10 = hash(x1, y0);
    const n01 = hash(x0, y1);
    const n11 = hash(x1, y1);

    const ix0 = lerp(n00, n10, sx);
    const ix1 = lerp(n01, n11, sx);
    return lerp(ix0, ix1, sy);
  }

  // Paint “water” using layered noise + cursor influence
  function draw() {
    t += 0.012;

    // Ease cursor motion a bit for “liquid” feel
    vx += (mx - vx) * 0.08;
    vy += (my - vy) * 0.08;

    const img = ctx.createImageData(w, h);
    const data = img.data;

    // Cursor center in pixel coords
    const cx = vx * w;
    const cy = vy * h;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;

        // distance falloff from cursor (subtle)
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(0, 1 - dist / (Math.min(w, h) * 0.55));

        // layered noise (slow flow)
        const n1 = noise(x * 0.035 + t * 0.9, y * 0.035 + t * 0.55);
        const n2 = noise(x * 0.018 - t * 0.35, y * 0.028 + t * 0.25);
        const n3 = noise(x * 0.060 + t * 0.25, y * 0.022 - t * 0.20);

        // river-like blend
        const v = (n1 * 0.55 + n2 * 0.30 + n3 * 0.15);

        // cursor adds “refraction”
        const ripple = v + influence * 0.20;

        // Color palette (calm river dusk)
        // You can tune these to be more ocean or more emerald
        const r = Math.floor(18 + ripple * 45);
        const g = Math.floor(55 + ripple * 90);
        const b = Math.floor(70 + ripple * 110);

        data[i + 0] = r;
        data[i + 1] = g;
        data[i + 2] = b;

        // alpha: slightly stronger near cursor
        data[i + 3] = Math.floor(165 + influence * 35);
      }
    }

    ctx.putImageData(img, 0, 0);

    // keep running only while active OR briefly after movement
    const now = Date.now();
    const recentlyMoved = (now - lastMove) < 700;
    if (active || recentlyMoved) {
      rafId = requestAnimationFrame(draw);
    } else {
      rafId = null;
    }
  }

  function start() {
    if (rafId) return;
    rafId = requestAnimationFrame(draw);
  }

  // Activation rules: ONLY run on interaction
  function onMove(e) {
    lastMove = Date.now();
    const rect = document.documentElement.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    mx = Math.max(0, Math.min(1, px / window.innerWidth));
    my = Math.max(0, Math.min(1, py / window.innerHeight));
    start();
  }

  function onEnter() {
    active = true;
    start();
  }

  function onLeave() {
    active = false;
    // draw() loop will stop after the “recentlyMoved” window ends
  }

  // Setup
  resize();
  window.addEventListener("resize", resize, { passive: true });

  // Hover intent (desktop)
  document.addEventListener("mouseenter", onEnter, { passive: true });
  document.addEventListener("mouseleave", onLeave, { passive: true });
  document.addEventListener("mousemove", onMove, { passive: true });

  // Touch intent (mobile)
  document.addEventListener("touchstart", () => { active = true; start(); }, { passive: true });
  document.addEventListener("touchmove", (e) => {
    if (!e.touches || !e.touches[0]) return;
    lastMove = Date.now();
    mx = e.touches[0].clientX / window.innerWidth;
    my = e.touches[0].clientY / window.innerHeight;
    start();
  }, { passive: true });
  document.addEventListener("touchend", () => { active = false; }, { passive: true });

  // Start at rest (no animation until you move mouse)
  // If you want a one-time render on load:
  start();
})();


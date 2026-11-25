/* Sailing International Trade - 3D market globe on the About page.
 *
 * A dotted globe drawn on a <canvas> (no libraries). Land dots come from
 * assets/img/site/land-mask.png (made by _src/make_land_mask.py). Arcs run from the
 * hub market (the first one in content/pages/about.json, Asia) to every other market.
 * The globe turns slowly, can be dragged, and flies to a market chosen in the list.
 * Market names and the list are written by site.js; this file only draws and places labels.
 */
(() => {
  const wrap = document.querySelector('.globe-wrap');
  if (!wrap) return;
  const canvas = wrap.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const labelsBox = wrap.querySelector('.globe-labels');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RAD = Math.PI / 180;

  // where each market sits on the globe: [latitude, longitude]
  const PLACES = {
    asia: [31, 114],
    canada: [43.65, -79.38], // Toronto
    usa: [38, -97],
    europe: [49, 10],
    africa: [4, 21],
    'south-america': [-13, -57],
    australia: [-25, 134],
  };
  // palette: Lavender Mist EDE7F3 for land and markets, Soft Fawn C9A56A for the hub and the selected route
  const COLORS = { dot: [222, 212, 238], arc: 'rgba(217, 205, 232, .42)', hub: '#C9A56A', market: '#EDE7F3' };

  const vec = (lat, lon) => [Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD), Math.cos(lat * RAD) * Math.cos(lon * RAD)];

  let W = 0, H = 0, R = 0, cx = 0, cy = 0, dpr = 1;
  let lon0 = 78 * RAD, lat0 = 20 * RAD; // the point facing the viewer (starts with Asia and Europe in view)
  let dots = null;                      // Float32Array of x, y, z on the unit sphere
  let markets = [];                     // [{ id, v, hub, arc: [[x,y,z], ...], phase }]
  let focusId = null;
  let fly = null;                       // { from: [lon, lat], to: [lon, lat], t0, dur }
  let drag = null, velocity = 0, idleUntil = 0, visible = false, raf = 0, last = 0;

  /* ---------- rotation and projection ---------- */
  let cosL = 1, sinL = 0, cosP = 1, sinP = 0;
  function setView() { cosL = Math.cos(lon0); sinL = Math.sin(lon0); cosP = Math.cos(lat0); sinP = Math.sin(lat0); }
  // world vector -> view vector [x right, y up, z towards the viewer]
  function rot(x, y, z) {
    const x1 = x * cosL - z * sinL;
    const z1 = z * cosL + x * sinL;
    return [x1, y * cosP - z1 * sinP, y * sinP + z1 * cosP];
  }

  /* ---------- data ---------- */
  function buildDots(img) {
    const m = document.createElement('canvas');
    m.width = img.naturalWidth; m.height = img.naturalHeight;
    const mc = m.getContext('2d');
    mc.drawImage(img, 0, 0);
    const px = mc.getImageData(0, 0, m.width, m.height).data;
    const N = window.innerWidth < 700 ? 12000 : 16000; // evenly spaced points (Fibonacci sphere)
    const golden = Math.PI * (3 - Math.sqrt(5));
    const out = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (2 * (i + 0.5)) / N;
      const r = Math.sqrt(1 - y * y);
      const a = golden * i;
      const x = r * Math.sin(a), z = r * Math.cos(a);
      const lat = Math.asin(y) / RAD, lon = Math.atan2(x, z) / RAD;
      const u = Math.min(m.width - 1, Math.floor(((lon + 180) / 360) * m.width));
      const v = Math.min(m.height - 1, Math.floor(((90 - lat) / 180) * m.height));
      if (px[(v * m.width + u) * 4] > 127) out.push(x, y, z);
    }
    dots = new Float32Array(out);
  }

  function buildMarkets() {
    const ids = [...labelsBox.querySelectorAll('[data-market]')].map((el) => el.dataset.market).filter((id) => PLACES[id]);
    const hubId = (labelsBox.querySelector('.hub') || {}).dataset?.market || 'asia';
    const hub = vec(...(PLACES[hubId] || PLACES.asia));
    markets = ids.map((id, i) => {
      const v = vec(...PLACES[id]);
      let arc = null;
      if (id !== hubId) {
        // great-circle path from the hub, lifted above the surface in the middle
        const dot = Math.max(-1, Math.min(1, hub[0] * v[0] + hub[1] * v[1] + hub[2] * v[2]));
        const ang = Math.acos(dot), s = Math.sin(ang) || 1;
        const lift = 0.06 + 0.2 * (ang / Math.PI);
        arc = [];
        for (let k = 0; k <= 72; k++) {
          const t = k / 72;
          const a = Math.sin((1 - t) * ang) / s, b = Math.sin(t * ang) / s;
          const h = 1 + lift * Math.sin(Math.PI * t);
          arc.push([(a * hub[0] + b * v[0]) * h, (a * hub[1] + b * v[1]) * h, (a * hub[2] + b * v[2]) * h]);
        }
      }
      return { id, v, hub: id === hubId, arc, phase: (i * 0.37) % 1 };
    });
  }

  /* ---------- drawing ---------- */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    W = Math.round(w * dpr); H = Math.round(h * dpr);
    canvas.width = W; canvas.height = H;
    cx = W / 2; cy = H / 2;
    R = Math.min(W, H) * 0.37; // leaves room for the arcs and the glow inside the canvas
    measureLabels();
    draw(performance.now());
  }

  function draw(now) {
    if (!W) return;
    setView();
    ctx.clearRect(0, 0, W, H);

    // atmosphere glow and the body of the globe
    let g = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, Math.min(W, H) * 0.5);
    g.addColorStop(0, 'rgba(140, 116, 176, .34)');
    g.addColorStop(1, 'rgba(140, 116, 176, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    g.addColorStop(0, 'rgba(110, 78, 160, .6)');
    g.addColorStop(1, 'rgba(37, 30, 52, .94)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(237, 231, 243, .3)';
    ctx.lineWidth = 1.2 * dpr;
    ctx.stroke();

    // land dots: faint on the far side (seen through the globe), brighter and bigger towards the viewer
    if (dots) {
      const buckets = 7;
      const paths = Array.from({ length: buckets }, () => new Path2D());
      const back = new Path2D();
      const base = R / 210;
      for (let i = 0; i < dots.length; i += 3) {
        const p = rot(dots[i], dots[i + 1], dots[i + 2]);
        const x = cx + p[0] * R, y = cy - p[1] * R;
        if (p[2] < 0) {
          if (p[2] < -0.25) back.rect(x - base * 0.55, y - base * 0.55, base * 1.1, base * 1.1);
          continue;
        }
        const b = Math.min(buckets - 1, Math.floor(p[2] * buckets));
        const s = base * (1 + 0.9 * p[2]);
        paths[b].rect(x - s / 2, y - s / 2, s, s);
      }
      const [r, gg, bb] = COLORS.dot;
      ctx.fillStyle = `rgba(${r}, ${gg}, ${bb}, .07)`;
      ctx.fill(back);
      paths.forEach((p, b) => { ctx.fillStyle = `rgba(${r}, ${gg}, ${bb}, ${0.22 + 0.68 * ((b + 0.5) / buckets)})`; ctx.fill(p); });
    }

    // arcs from the hub, with a light running along each one
    const shown = (p) => p[2] > 0 || p[0] * p[0] + p[1] * p[1] > 1; // in front, or lifted past the edge of the globe
    ctx.lineCap = 'round';
    markets.forEach((m) => {
      if (!m.arc) return;
      const pts = m.arc.map((v) => rot(v[0], v[1], v[2]));
      const sel = focusId === m.id;
      ctx.strokeStyle = sel ? 'rgba(201, 165, 106, .9)' : COLORS.arc;
      ctx.lineWidth = (sel ? 1.8 : 1.15) * dpr;
      ctx.beginPath();
      let pen = false;
      pts.forEach((p) => {
        if (!shown(p)) { pen = false; return; }
        const x = cx + p[0] * R, y = cy - p[1] * R;
        if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        pen = true;
      });
      ctx.stroke();
      if (reduce) return;
      // running light: a short bright tail that travels from the hub to the market
      const t = ((now / 2800) + m.phase) % 1;
      const head = Math.floor(t * (pts.length - 1));
      const tail = Math.max(0, head - 12);
      for (let k = tail; k < head; k++) {
        const a = pts[k], b = pts[k + 1];
        if (!shown(a) || !shown(b)) continue;
        const f = (k - tail + 1) / (head - tail);
        ctx.strokeStyle = `rgba(236, 214, 172, ${0.9 * f})`;
        ctx.lineWidth = (1 + 1.6 * f) * dpr;
        ctx.beginPath(); ctx.moveTo(cx + a[0] * R, cy - a[1] * R); ctx.lineTo(cx + b[0] * R, cy - b[1] * R); ctx.stroke();
      }
    });

    // market points with a pulsing ring
    const places = {};
    markets.forEach((m) => {
      const p = rot(m.v[0], m.v[1], m.v[2]);
      places[m.id] = p;
      if (p[2] < 0) return;
      const x = cx + p[0] * R, y = cy - p[1] * R;
      const color = m.hub ? COLORS.hub : COLORS.market;
      const size = (m.hub ? 4.6 : 3.4) * dpr * (0.75 + 0.25 * p[2]);
      if (!reduce) {
        const k = ((now / 1900) + m.phase) % 1;
        ctx.strokeStyle = m.hub ? `rgba(201, 165, 106, ${0.75 * (1 - k)})` : `rgba(237, 231, 243, ${0.6 * (1 - k)})`;
        ctx.lineWidth = 1.2 * dpr;
        ctx.beginPath(); ctx.arc(x, y, size + k * 14 * dpr, 0, Math.PI * 2); ctx.stroke();
      }
      const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 3.2);
      glow.addColorStop(0, m.hub ? 'rgba(201, 165, 106, .6)' : 'rgba(237, 231, 243, .45)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(x, y, size * 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
    });

    // labels follow their points and fade out towards the edge of the globe;
    // near the right edge they sit on the left of their point so they are not cut off
    labelsBox.querySelectorAll('[data-market]').forEach((el) => {
      const p = places[el.dataset.market];
      if (!p) { el.style.opacity = 0; return; }
      const op = Math.max(0, Math.min(1, (p[2] - 0.12) * 4));
      el.style.opacity = op;
      const x = (cx + p[0] * R) / dpr, y = (cy - p[1] * R) / dpr;
      const w = labelW[el.dataset.market] || 0;
      const left = x + 12 + w > W / dpr - 4;
      el.style.transform = `translate(${left ? x - 12 - w : x + 12}px, ${y - 11}px)`;
      el.classList.toggle('on', focusId === el.dataset.market);
    });
  }
  // label widths, measured once (not every frame) after the labels change
  let labelW = {};
  function measureLabels() {
    labelW = {};
    labelsBox.querySelectorAll('[data-market]').forEach((el) => { labelW[el.dataset.market] = el.offsetWidth; });
  }

  /* ---------- motion ---------- */
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const TILT_MIN = -35 * RAD, TILT_MAX = 50 * RAD;
  const clampTilt = (v) => Math.max(TILT_MIN, Math.min(TILT_MAX, v));

  function frame(now) {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (fly) {
      const t = Math.min(1, (now - fly.t0) / fly.dur);
      const e = ease(t);
      lon0 = fly.from[0] + (fly.to[0] - fly.from[0]) * e;
      lat0 = fly.from[1] + (fly.to[1] - fly.from[1]) * e;
      if (t >= 1) fly = null;
    } else if (!drag) {
      if (Math.abs(velocity) > 0.0001) { lon0 += velocity * dt; velocity *= Math.pow(0.06, dt); }
      else if (now > idleUntil && !reduce) lon0 -= 0.09 * dt; // slow turn, the way the Earth spins
    }
    draw(now);
    if (visible && !document.hidden && !reduce) raf = requestAnimationFrame(frame);
    else if (visible && (fly || drag || Math.abs(velocity) > 0.0001)) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); } }

  function flyTo(id) {
    const m = markets.find((x) => x.id === id);
    if (!m) return;
    focusId = id;
    const [lat, lon] = PLACES[id];
    let target = lon * RAD;
    // take the short way round
    while (target - lon0 > Math.PI) target -= Math.PI * 2;
    while (target - lon0 < -Math.PI) target += Math.PI * 2;
    fly = { from: [lon0, lat0], to: [target, clampTilt(lat * RAD * 0.8)], t0: performance.now(), dur: reduce ? 1 : 1300 };
    velocity = 0;
    idleUntil = performance.now() + 6000;
    document.querySelectorAll('#market-list [data-market]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.market === id)));
    labelsBox.querySelectorAll('[data-market]').forEach((el) => el.classList.toggle('on', el.dataset.market === id)); // highlight now, not on the next frame
    kick();
  }

  /* ---------- input ---------- */
  wrap.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, t: performance.now() };
    fly = null; velocity = 0;
    wrap.classList.add('dragging');
    wrap.setPointerCapture(e.pointerId);
    kick();
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = R / dpr || 200;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    const ms = Math.max(1, performance.now() - drag.t);
    lon0 -= dx / r;
    lat0 = clampTilt(lat0 + dy / r);
    velocity = (-dx / r) / (ms / 1000);
    drag = { x: e.clientX, y: e.clientY, t: performance.now() };
    if (reduce) draw(performance.now());
  });
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    wrap.classList.remove('dragging');
    velocity = Math.max(-3, Math.min(3, velocity));
    idleUntil = performance.now() + 2500;
    kick();
  };
  wrap.addEventListener('pointerup', endDrag);
  wrap.addEventListener('pointercancel', endDrag);
  document.addEventListener('click', (e) => {
    const b = e.target instanceof Element && e.target.closest('#market-list [data-market]');
    if (b) flyTo(b.dataset.market);
  });

  /* ---------- start ---------- */
  // site.js writes the labels (and rewrites them when the language changes)
  new MutationObserver(() => { buildMarkets(); measureLabels(); draw(performance.now()); }).observe(labelsBox, { childList: true });
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(wrap); else window.addEventListener('resize', resize);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); }, { rootMargin: '80px' }).observe(wrap);
  } else visible = true;
  document.addEventListener('visibilitychange', kick);

  const img = new Image();
  img.onload = () => { buildDots(img); draw(performance.now()); kick(); };
  img.onerror = () => { if (window.__siteErrors) window.__siteErrors.push('globe: land mask did not load'); };
  img.src = 'assets/img/site/land-mask.png';
  buildMarkets();
  resize();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureLabels); // widths change once the web font loads
})();

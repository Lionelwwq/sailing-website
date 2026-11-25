/* Sailing International Trade - Product Catalogue page: flipbook, chapter links and counters.
 *
 * The flipbook shows the catalogue pages made by _src/make_catalogue.py (assets/catalogue/pages.json).
 * Wide screens show an open book (two pages); phones show one page at a time.
 * Turn pages by clicking a page, dragging its corner, the arrow buttons or keys, the slider,
 * the page thumbnails or the chapter cards. No libraries: 3D CSS transforms driven by JavaScript.
 * Texts (labels, chapters) are written by site.js in the page language; site.js also picks the
 * catalogue edition (English, French or Spanish) and hands its pages over with the 'sit:catalogue' event.
 */
(() => {
  const stage = document.querySelector('.fb-stage');
  if (!stage) return;
  const area = stage.querySelector('.fb-area');
  const fb = stage.querySelector('.fb');
  const book = stage.querySelector('.fb-book');
  const prevBtn = stage.querySelector('.fb-prev');
  const nextBtn = stage.querySelector('.fb-next');
  const countEl = stage.querySelector('.fb-count');
  const range = stage.querySelector('.fb-range');
  const live = stage.querySelector('.fb-live');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RATIO = 8.5 / 11; // US Letter page
  const TURN_MS = reduce ? 1 : 900;

  let pages = [];
  let mode = '';      // 'spread' (two pages) or 'single'
  let leaves = [];    // each leaf: { el, angle }
  let s = 0;          // how many leaves are turned
  let maxS = 0;
  let pw = 0;         // page width in px
  let running = 0;    // page turns in progress
  let drag = null;

  const label = (n) => ((document.getElementById('fb-page-label') || {}).textContent || 'Page {n}').replace('{n}', n);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------------- building ---------------- */
  function face(p, side) {
    const inner = p ? `<img src="${p.image}" data-hd="${p.hd}" alt="${label(p.page)}" draggable="false" data-page="${p.page}">` : '<div class="fb-blank"></div>';
    return `<div class="fb-face ${side}">${inner}<i class="fb-shade"></i></div>`;
  }
  function build() {
    const keep = currentPage();
    mode = window.innerWidth < 760 ? 'single' : 'spread';
    fb.classList.toggle('single', mode === 'single');
    leaves = [];
    let html = '';
    if (mode === 'spread') {
      for (let i = 0; i < pages.length; i += 2) html += `<div class="fb-leaf">${face(pages[i], 'front')}${face(pages[i + 1], 'back')}</div>`;
    } else {
      pages.forEach((p) => { html += `<div class="fb-leaf">${face(p, 'front')}</div>`; });
    }
    book.innerHTML = html;
    leaves = [...book.children].map((el) => ({ el, angle: 0 }));
    maxS = mode === 'spread' ? (pages.length % 2 === 0 ? leaves.length : leaves.length - 1) : leaves.length - 1;
    s = clamp(mode === 'spread' ? Math.floor(keep / 2) : keep - 1, 0, maxS);
    layout();
    place();
    update();
  }
  function layout() {
    const W = area.clientWidth;
    const H = area.clientHeight;
    pw = Math.floor(mode === 'spread' ? Math.min(H * RATIO, (W - 8) / 2) : Math.min(W, H * RATIO));
    const ph = Math.round(pw / RATIO);
    book.style.width = `${mode === 'spread' ? pw * 2 : pw}px`;
    book.style.height = `${ph}px`;
    leaves.forEach((l) => { l.el.style.width = `${pw}px`; l.el.style.left = mode === 'spread' ? `${pw}px` : '0'; });
    shift();
  }

  /* ---------------- state ---------------- */
  function currentPage() {
    if (!leaves.length) return 1;
    return mode === 'spread' ? Math.max(1, 2 * s) : s + 1;
  }
  function shown() {
    if (mode === 'single') return [s + 1];
    return [2 * s, 2 * s + 1].filter((n) => n >= 1 && n <= pages.length);
  }
  function setAngle(k, a) {
    const l = leaves[k];
    l.angle = a;
    // each leaf has its own perspective so the pages still stack by z-index (a shared 3D scene would ignore it)
    l.el.style.transform = `perspective(${Math.round(pw * 4.2)}px) rotateY(${a}deg)`;
    l.el.style.setProperty('--lift', Math.sin((Math.abs(a) * Math.PI) / 180).toFixed(3));
  }
  const zFor = (k) => (k < s ? k + 1 : leaves.length - k);
  function place() {
    leaves.forEach((l, k) => { setAngle(k, k < s ? -180 : 0); l.el.style.zIndex = zFor(k); l.el.classList.remove('turning'); });
    shift();
  }
  function shift() {
    // a closed book sits in the middle: only the cover (or back cover) is showing
    let x = 0;
    if (mode === 'spread' && s === 0) x = -pw / 2;
    if (mode === 'spread' && s === leaves.length) x = pw / 2;
    book.style.setProperty('--shift', `${x}px`);
    fb.classList.toggle('closed', mode === 'spread' && (s === 0 || s === leaves.length));
  }
  function update() {
    const v = shown();
    const total = pages.length;
    if (countEl) countEl.textContent = `${v.join('–')} / ${total}`;
    if (range) { range.max = String(total); range.value = String(v[0]); }
    if (prevBtn) prevBtn.disabled = s <= 0;
    if (nextBtn) nextBtn.disabled = s >= maxS;
    document.querySelectorAll('[data-fb-goto]').forEach((b) => {
      if (b.closest('.fb-thumbs')) b.setAttribute('aria-current', String(v.includes(Number(b.dataset.fbGoto))));
    });
    const cur = document.querySelector('.fb-thumbs [aria-current="true"]');
    if (cur && cur.parentElement.offsetParent) cur.parentElement.scrollTo({ left: cur.offsetLeft - cur.parentElement.clientWidth / 2 + cur.offsetWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
    if (live) live.textContent = v.map(label).join(', ');
    sharpen();
  }
  function sharpen() {
    // swap in the sharp page pictures around the pages on show (and a few ahead)
    const v = shown();
    const lo = Math.max(1, v[0] - 3);
    const hi = Math.min(pages.length, v[v.length - 1] + 4);
    book.querySelectorAll('img[data-hd]').forEach((img) => {
      const n = Number(img.dataset.page);
      if (n < lo || n > hi || img.dataset.sharp) return;
      img.dataset.sharp = '1';
      const pre = new Image();
      pre.onload = () => { img.src = img.dataset.hd; };
      pre.src = img.dataset.hd;
    });
  }

  /* ---------------- turning ---------------- */
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function animate(k, from, to, ds, ms) {
    const l = leaves[k];
    if (ds) { s += ds; shift(); update(); }
    running += 1;
    l.el.classList.add('turning');
    l.el.style.zIndex = String(leaves.length * 2 + (ds > 0 ? leaves.length - k : k));
    const dur = Math.max(1, ms * Math.max(0.3, Math.abs(to - from) / 180));
    const token = {};
    l.anim = token; // a newer turn of the same leaf (e.g. "back" pressed mid-turn) takes over
    return new Promise((done) => {
      const t0 = performance.now();
      const step = (now) => {
        if (l.anim !== token) { running -= 1; done(); return; }
        const t = Math.min(1, (now - t0) / dur);
        setAngle(k, from + (to - from) * easeInOut(t));
        if (t < 1) { requestAnimationFrame(step); return; }
        l.el.classList.remove('turning');
        l.el.style.zIndex = String(zFor(k));
        running -= 1;
        done();
      };
      requestAnimationFrame(step);
    });
  }
  function next(ms = TURN_MS) { if (s < maxS && !drag) animate(s, leaves[s].angle, -180, 1, ms); }
  function prev(ms = TURN_MS) { if (s > 0 && !drag) animate(s - 1, leaves[s - 1].angle, 0, -1, ms); }
  function goTo(page) {
    const target = clamp(mode === 'spread' ? Math.floor(page / 2) : page - 1, 0, maxS);
    const n = Math.abs(target - s);
    if (!n) return;
    const dir = target > s ? 1 : -1;
    const fast = n > 2;
    const gap = n > 6 ? 55 : 110;
    for (let i = 0; i < n; i += 1) {
      setTimeout(() => (dir > 0 ? next(fast ? 560 : TURN_MS) : prev(fast ? 560 : TURN_MS)), reduce ? 0 : i * gap);
    }
  }

  /* ---------------- input ---------------- */
  fb.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || running) return;
    const r = book.getBoundingClientRect();
    // open book: the side you press decides the direction; single page: tapping the left third goes back
    const dir = mode === 'spread' ? (e.clientX > r.left + r.width / 2 ? 1 : -1) : (e.clientX > r.left + r.width * 0.35 ? 1 : -1);
    drag = { x0: e.clientX, tapDir: dir, dir: 0, k: -1, moved: false, rect: r, last: e.clientX, v: 0, t: performance.now() };
    fb.setPointerCapture(e.pointerId);
  });
  const usable = (dir) => (dir > 0 && s < maxS) || (dir < 0 && s > 0);
  fb.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x0;
    if (!drag.moved && Math.abs(dx) < 7) return;
    if (!drag.moved) {
      drag.moved = true;
      fb.classList.add('dragging');
      // single page: a swipe to the left turns forward, to the right goes back, wherever it starts
      const dir = mode === 'spread' ? drag.tapDir : (dx < 0 ? 1 : -1);
      if (usable(dir)) {
        drag.dir = dir;
        drag.k = dir > 0 ? s : s - 1;
        const l = leaves[drag.k];
        l.el.classList.add('turning');
        l.el.style.zIndex = String(leaves.length * 3);
      }
    }
    const now = performance.now();
    drag.v = (e.clientX - drag.last) / Math.max(1, now - drag.t);
    drag.last = e.clientX;
    drag.t = now;
    if (!drag.dir) return;
    let a;
    if (mode === 'spread') {
      // the page edge follows the pointer: angle from the spine
      const rel = clamp((e.clientX - (drag.rect.left + drag.rect.width / 2)) / pw, -1, 1);
      a = (-Math.acos(rel) * 180) / Math.PI;
    } else {
      const rel = dx / pw;
      a = drag.dir > 0 ? clamp(rel * 180, -180, 0) : clamp(-180 + rel * 180, -180, 0);
    }
    setAngle(drag.k, a);
  });
  function endDrag() {
    if (!drag) return;
    const d = drag;
    drag = null;
    fb.classList.remove('dragging');
    if (!d.moved) { if (d.tapDir > 0) next(); else prev(); return; }   // a tap turns one page
    if (!d.dir) return;
    const a = leaves[d.k].angle;
    const flick = Math.abs(d.v) > 0.5 ? Math.sign(d.v) : 0;   // a quick swipe counts even if it is short
    if (d.dir > 0) {
      // turning forward: finish if swiped left, or if the page is past halfway
      const finish = flick < 0 || (flick === 0 && a < -90);
      animate(d.k, a, finish ? -180 : 0, finish ? 1 : 0, TURN_MS * (finish ? 0.8 : 0.6));
    } else {
      const finish = flick > 0 || (flick === 0 && a > -90);
      animate(d.k, a, finish ? 0 : -180, finish ? -1 : 0, TURN_MS * (finish ? 0.8 : 0.6));
    }
  }
  fb.addEventListener('pointerup', endDrag);
  fb.addEventListener('pointercancel', () => {
    // the browser took over (e.g. the page scrolled): put a half-turned page back
    if (!drag) return;
    const d = drag;
    drag = null;
    fb.classList.remove('dragging');
    if (d.moved && d.dir) animate(d.k, leaves[d.k].angle, d.dir > 0 ? 0 : -180, 0, TURN_MS * 0.5);
  });
  fb.addEventListener('dragstart', (e) => e.preventDefault());

  prevBtn && prevBtn.addEventListener('click', () => prev());
  nextBtn && nextBtn.addEventListener('click', () => next());
  if (range) {
    let tm = 0;
    range.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => goTo(Number(range.value)), 120); });
  }
  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
    const r = stage.getBoundingClientRect();
    if (r.bottom < 120 || r.top > window.innerHeight - 120) return; // only while the book is on screen
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    else if (e.key === 'Home') goTo(1);
    else if (e.key === 'End') goTo(pages.length);
  });
  document.addEventListener('click', (e) => {
    const b = e.target instanceof Element && e.target.closest('[data-fb-goto]');
    if (!b) return;
    const page = Number(b.dataset.fbGoto);
    const r = stage.getBoundingClientRect();
    const visible = r.top > -r.height * 0.35 && r.top < window.innerHeight * 0.4;
    if (!visible) {
      stage.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      setTimeout(() => goTo(page), reduce ? 0 : 650);
    } else goTo(page);
  });

  // thumbnails drawer and full screen
  const thumbsBtn = stage.querySelector('.fb-thumbs-btn');
  const thumbs = stage.querySelector('.fb-thumbs');
  thumbsBtn && thumbsBtn.addEventListener('click', () => {
    const open = thumbsBtn.getAttribute('aria-expanded') !== 'true';
    thumbsBtn.setAttribute('aria-expanded', String(open));
    thumbs.hidden = !open;
    stage.classList.toggle('thumbs-open', open);
    requestAnimationFrame(() => { layout(); update(); });
  });
  const fsBtn = stage.querySelector('.fb-fs');
  if (fsBtn) {
    if (!document.fullscreenEnabled) fsBtn.hidden = true;
    fsBtn.addEventListener('click', () => (document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen()).catch(() => {}));
    document.addEventListener('fullscreenchange', () => {
      stage.classList.toggle('is-fs', document.fullscreenElement === stage);
      setTimeout(() => { layout(); update(); }, 60);
    });
  }

  // a gentle 3D tilt that follows the mouse while the book is idle
  if (!reduce && window.matchMedia('(hover: hover)').matches) {
    stage.addEventListener('pointermove', (e) => {
      if (drag || running) return;
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      fb.style.setProperty('--tx', `${(-y * 5).toFixed(2)}deg`);
      fb.style.setProperty('--ty', `${(x * 7).toFixed(2)}deg`);
    });
    stage.addEventListener('pointerleave', () => { fb.style.setProperty('--tx', '0deg'); fb.style.setProperty('--ty', '0deg'); });
  }

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const want = window.innerWidth < 760 ? 'single' : 'spread';
      if (want !== mode) build(); else { layout(); }
    }, 120);
  });

  // site.js writes the texts and picks the edition (English, French or Spanish) when the page loads,
  // the language changes or another edition is chosen; the book is built from that edition's pages
  let edition = '';
  function onCatalogue(d) {
    if (!d || !d.pages || !d.pages.length) return;
    if (d.edition === edition) {
      book.querySelectorAll('img[data-page]').forEach((img) => { img.alt = label(img.dataset.page); });
      update();
      return;
    }
    const first = !edition;
    edition = d.edition;
    pages = d.pages;
    if (first) { start(); return; }
    // another edition: fade the book out, swap the pages at the same place, fade back in
    fb.classList.add('swapping');
    setTimeout(() => {
      leaves.forEach((l) => { l.anim = null; });   // stop page turns in progress (each one counts itself out)
      build();
      requestAnimationFrame(() => fb.classList.remove('swapping'));
    }, reduce ? 0 : 220);
  }
  document.addEventListener('sit:catalogue', (e) => onCatalogue(e.detail));

  /* ---------------- counters ---------------- */
  function countUp(el) {
    const raw = el.dataset.count || el.textContent;
    const m = raw.match(/^(\D*)(\d+)(.*)$/);
    if (!m || reduce) return;
    const end = Number(m[2]);
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / 1400);
      el.textContent = `${m[1]}${Math.round(end * (1 - Math.pow(1 - t, 3)))}${m[3]}`;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((ens) => ens.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.querySelectorAll('[data-count]').forEach(countUp);
      io.unobserve(en.target);
    }), { threshold: 0.4 });
    const watch = () => document.querySelectorAll('.cat-stats').forEach((el) => io.observe(el));
    document.addEventListener('sit:catalogue', watch);
  }

  /* ---------------- start ---------------- */
  function start() {
    build();
    stage.classList.add('ready');
    // invite a first turn: lift the cover corner a little, then let it fall back
    if (!reduce) {
      setTimeout(() => {
        if (s !== 0 || running || drag || !leaves[0]) return;
        animate(0, 0, -34, 0, 1400).then(() => { if (s === 0 && !drag) animate(0, leaves[0].angle, 0, 0, 1400); });
      }, 1300);
    }
  }
  if (window.__sitCatalogue) onCatalogue(window.__sitCatalogue);   // site.js got there first

  window.SailingFlipbook = { next, prev, goTo, page: () => shown(), edition: () => edition };
})();

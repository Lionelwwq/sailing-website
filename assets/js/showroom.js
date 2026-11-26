/* Sailing International Trade - showroom (showroom.html).
 *
 * The main photo of the showroom, seen from the entrance (where the home page's door walk-in ends), with a gold
 * point on every product. The area buttons, a double-click on an area, or the number keys walk you into a closer
 * photo of that area with its own points; "Whole showroom", the back arrow, Esc or Backspace walk you back.
 * Drag / swipe to look around; mouse wheel, pinch or + / - to zoom. A gold point glides in on its product and opens a
 * card: photo, a few words, add to quote list, the product page, previous / next.
 * Photos and points: assets/img/showroom/showroom.json (made with _src/make_showroom.py); texts from site.js.
 */
(() => {
  const view = document.getElementById('sr-view');
  if (!view) return;
  const BASE = 'assets/img/showroom/';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const msg = document.getElementById('sr-msg');
  const MAX_ZOOM = 3;
  const WALK_MS = 850;
  let data = null;         // { scene, names, products, texts, inQuote } from site.js
  const scenes = {};       // id -> { id, el, stage, img, iw, ih, bw, bh, s: { x, y, z }, points, loaded }
  let cur = null;          // the photo on screen
  let walking = false;
  let tween = 0;
  let zoomBox = null;

  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  function say(text) { msg.textContent = text; msg.hidden = !text; }
  const big = () => window.matchMedia('(min-width: 900px)').matches && (window.screen.width * (window.devicePixelRatio || 1)) > 1800;

  // ---- the photos (scenes)
  function def(id) {
    const S = data.scene;
    if (id === 'overview') return { w: S.image.width, h: S.image.height, src: big() ? S.image.desktop : S.image.phone, phone: S.image.phone, points: S.points || [] };
    const v = (S.views || []).find((x) => x.id === id);
    return v && { w: v.width, h: v.height, src: big() ? v.desktop : v.phone, phone: v.phone, points: v.points || [] };
  }
  const hasScene = (id) => !!def(id);
  function pointHtml(pt) {
    const p = data.products[pt.product];
    return `<a class="sr-point" href="${esc(p.href)}" style="left:${pt.x}%;top:${pt.y}%" data-sr-product="${esc(pt.product)}" aria-label="${esc(`${p.name} – ${data.texts.view_product}`)}">`
      + `<span class="sr-dot"></span><span class="sr-name">${esc(p.name)}<small>${esc(data.texts.view_product)} →</small></span></a>`;
  }
  function scene(id) {
    if (scenes[id]) return scenes[id];
    const d = def(id);
    const points = d.points.filter((pt) => data.products[pt.product]);
    const el = document.createElement('div');
    el.className = 'sr-scene';
    el.dataset.scene = id;
    el.hidden = true;
    el.innerHTML = `<div class="sr-stage"><img class="sr-img" alt="${esc(id === 'overview' ? data.texts.photo_alt : `${data.texts.photo_alt} – ${data.names[id] || id}`)}" draggable="false">`
      + `<div class="sr-points">${points.map(pointHtml).join('')}</div></div>`;
    view.insertBefore(el, zoomBox);
    const sc = { id, el, stage: el.querySelector('.sr-stage'), img: el.querySelector('.sr-img'), iw: d.w, ih: d.h, bw: 0, bh: 0, s: { x: 0, y: 0, z: 1 }, points };
    sc.loaded = new Promise((resolve) => {
      sc.img.addEventListener('load', () => { el.classList.add('ready'); resolve(true); }, { once: true });
      sc.img.addEventListener('error', () => resolve(false), { once: true });
    });
    sc.img.src = BASE + d.phone;
    if (d.src !== d.phone) {
      sc.loaded.then((ok) => {
        if (!ok) return;
        const hi = new Image();
        hi.src = BASE + d.src;
        (hi.decode ? hi.decode() : Promise.resolve()).then(() => { sc.img.src = hi.src; }).catch(() => { /* keep the small one */ });
      });
    }
    scenes[id] = sc;
    return sc;
  }

  // ---- placing a photo: it covers the viewer at zoom 1
  function size(sc) {
    sc.bw = Math.max(view.clientWidth, view.clientHeight * (sc.iw / sc.ih));
    sc.bh = sc.bw * (sc.ih / sc.iw);
  }
  function centre(sc) {
    size(sc);
    sc.s = { z: 1, x: (view.clientWidth - sc.bw) / 2, y: (view.clientHeight - sc.bh) / 2 };
  }
  function clamp(sc) {
    const s = sc.s;
    s.z = Math.min(MAX_ZOOM, Math.max(1, s.z));
    s.x = Math.min(0, Math.max(view.clientWidth - sc.bw * s.z, s.x));
    s.y = Math.min(0, Math.max(view.clientHeight - sc.bh * s.z, s.y));
  }
  function draw(sc = cur) {
    if (!sc) return;
    clamp(sc);
    sc.stage.style.width = `${sc.bw}px`;
    sc.stage.style.height = `${sc.bh}px`;
    sc.stage.style.transform = `translate3d(${sc.s.x}px, ${sc.s.y}px, 0) scale(${sc.s.z})`;
    sc.stage.style.setProperty('--z', sc.s.z);
    if (sc === cur) view.classList.toggle('near', sc.s.z >= 1.8);
  }
  // point (px in the viewer) stays put while zooming
  function zoomAt(z, px, py) {
    stop();
    const s = cur.s;
    const k = Math.min(MAX_ZOOM, Math.max(1, z)) / s.z;
    s.x = px - (px - s.x) * k;
    s.y = py - (py - s.y) * k;
    s.z *= k;
    draw();
  }
  function stop() { if (tween) cancelAnimationFrame(tween); tween = 0; }
  // where a place in the photo (x, y in %) must go to sit at sx, sy on screen at zoom z
  function target(sc, xp, yp, z, sx, sy) {
    const t = { z, x: (sx == null ? view.clientWidth / 2 : sx) - (xp / 100) * sc.bw * z, y: (sy == null ? view.clientHeight / 2 : sy) - (yp / 100) * sc.bh * z };
    const keep = sc.s;
    sc.s = t;
    clamp(sc);
    const end = sc.s;
    sc.s = keep;
    return end;
  }
  // glide a photo to a place (x, y in % of the photo) at zoom z
  function glide(sc, xp, yp, z, sx, sy, ms = 650) {
    stop();
    const end = target(sc, xp, yp, z, sx, sy);
    if (reduce) { sc.s = end; draw(sc); return; }
    const from = { ...sc.s };
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - t, 3);
      sc.s = { x: from.x + (end.x - from.x) * e, y: from.y + (end.y - from.y) * e, z: from.z + (end.z - from.z) * e };
      draw(sc);
      tween = t < 1 ? requestAnimationFrame(step) : 0;
    };
    tween = requestAnimationFrame(step);
  }

  // ---- walking between the main photo and the closer photos
  const areaOf = (id) => (data.scene.areas || []).find((a) => a.id === id);
  function mark() {
    document.querySelectorAll('[data-sr-go]').forEach((b) => b.setAttribute('aria-pressed', String(!!cur && b.dataset.srGo === cur.id)));
    const back = view.querySelector('[data-sr-back]');
    if (back) back.hidden = !cur || cur.id === 'overview';
  }
  function show(sc) {
    cur = sc;
    sc.el.hidden = false;
    sc.el.classList.add('on');
    mark();
    const url = `${window.location.pathname}${window.location.search}${sc.id === 'overview' ? '' : `#${sc.id}`}`;
    if (window.history.replaceState) window.history.replaceState(null, '', url);
  }
  function settle(sc, styles) { Object.assign(sc.el.style, styles); }
  async function walkTo(id) {
    if (walking || !cur || !hasScene(id)) return;
    closeCard();
    if (cur.id === id) { glide(cur, 50, 50, 1); return; }
    walking = true;
    const from = cur;
    const to = scene(id);
    view.classList.add('loading');
    const ok = await Promise.race([to.loaded, wait(15000).then(() => false)]);
    view.classList.remove('loading');
    if (!ok) { walking = false; say(data.texts.no_image); setTimeout(() => say(''), 4000); return; }
    stop();
    const forward = from.id === 'overview';
    const back = id === 'overview';
    const a = areaOf(forward ? id : from.id);
    if (back && a) { size(to); to.s = target(to, a.x, a.y, 2.2); } else centre(to);
    draw(to);
    if (reduce) {
      from.el.hidden = true; from.el.classList.remove('on');
      show(to);
      if (back) { centre(to); draw(to); }
      walking = false;
      return;
    }
    // the new photo grows in (walking on) or settles back (walking back) while the old one fades
    settle(to, { transition: 'none', opacity: '0', transform: `scale(${back ? 1.12 : 0.88})` });
    to.el.hidden = false;
    void to.el.offsetWidth;
    settle(to, { transition: `opacity ${WALK_MS * 0.6}ms ease ${WALK_MS * 0.25}ms, transform ${WALK_MS}ms cubic-bezier(.2, .7, .2, 1)`, opacity: '1', transform: 'none' });
    settle(from, { transition: `opacity ${WALK_MS * 0.55}ms ease ${WALK_MS * 0.3}ms, transform ${WALK_MS}ms cubic-bezier(.2, .7, .2, 1)`, opacity: '0', transform: back ? 'scale(0.88)' : 'none' });
    if (forward && a) glide(from, a.x, a.y, 2.4, null, null, WALK_MS);
    show(to);
    if (back) glide(to, 50, 50, 1, null, null, WALK_MS);
    await wait(WALK_MS + 50);
    from.el.hidden = true;
    from.el.classList.remove('on');
    settle(from, { transition: '', opacity: '', transform: '' });
    settle(to, { transition: '', opacity: '', transform: '' });
    walking = false;
  }
  function go(id) {
    if (!cur) return;
    if (hasScene(id)) { walkTo(id); return; }
    const a = areaOf(id);                                // an area without a closer photo: zoom in on it
    closeCard();
    if (cur.id !== 'overview') { walkTo('overview'); return; }
    if (a) glide(cur, a.x, a.y, a.zoom);
  }

  // ---- product card: a gold point glides in close on its product and shows its card
  let card = null;
  let cardKey = null;
  function cardPhoto(key) {
    const c = (data.scene.closeups || {})[key];        // a close-up from the showroom, once made
    return c ? BASE + c : data.products[key].photo;
  }
  function quoteLabel(btn, key) {
    const on = data.inQuote ? data.inQuote(key) : false;
    btn.setAttribute('aria-pressed', String(on));
    btn.textContent = on ? `✓ ${data.texts.in_quote}` : `+ ${data.texts.add_to_quote}`;
  }
  function fillCard() {
    const p = data.products[cardKey];
    const i = cur.points.findIndex((pt) => pt.product === cardKey);
    const im = card.querySelector('.sr-card-img img');
    im.src = cardPhoto(cardKey);
    im.alt = p.name;
    card.querySelector('.sr-card-name').textContent = p.name;
    card.querySelector('.sr-card-short').textContent = p.short || '';
    const add = card.querySelector('[data-add]');
    add.dataset.add = cardKey;
    quoteLabel(add, cardKey);
    const more = card.querySelector('.sr-card-more');
    more.href = p.href;
    more.textContent = `${data.texts.view_product} →`;
    card.querySelector('.sr-card-count').textContent = `${i + 1} / ${cur.points.length}`;
    card.setAttribute('aria-label', p.name);
    card.querySelector('[data-sr-card="close"]').setAttribute('aria-label', data.texts.card_close);
    card.querySelector('[data-sr-card="prev"]').setAttribute('aria-label', data.texts.card_prev);
    card.querySelector('[data-sr-card="next"]').setAttribute('aria-label', data.texts.card_next);
  }
  function openCard(key, focus) {
    const pt = cur.points.find((x) => x.product === key);
    if (!pt) return;
    cardKey = key;
    fillCard();
    card.hidden = false;
    view.parentElement.classList.add('card-open');
    requestAnimationFrame(() => card.classList.add('open'));
    cur.el.querySelectorAll('.sr-point').forEach((el) => el.classList.toggle('active', el.dataset.srProduct === key));
    const [vw, vh] = [view.clientWidth, view.clientHeight];
    const wide = vw >= 760;                              // the card sits on the right; on phones at the bottom
    glide(cur, pt.x, pt.y, Math.max(cur.s.z, cur.id === 'overview' ? 2.4 : 1.6), wide ? (vw - card.offsetWidth - 20) / 2 : vw / 2, wide ? vh / 2 : vh * 0.3);
    if (focus) card.querySelector('[data-sr-card="close"]').focus({ preventScroll: true });
  }
  function closeCard() {
    if (!card || !cardKey) return;
    cardKey = null;
    card.classList.remove('open');
    view.parentElement.classList.remove('card-open');
    view.querySelectorAll('.sr-point.active').forEach((el) => el.classList.remove('active'));
    setTimeout(() => { if (!cardKey) card.hidden = true; }, reduce ? 0 : 250);
  }
  function stepCard(d) {
    const list = cur.points;
    const i = list.findIndex((pt) => pt.product === cardKey);
    openCard(list[(i + d + list.length) % list.length].product);
  }
  function makeCard() {
    card = document.createElement('aside');
    card.className = 'sr-card';
    card.hidden = true;
    card.innerHTML = `<button class="sr-card-x" type="button" data-sr-card="close" aria-label="${esc(data.texts.card_close)}">×</button>`
      + '<div class="sr-card-img"><img alt="">'
      + `<button class="sr-card-step prev" type="button" data-sr-card="prev" aria-label="${esc(data.texts.card_prev)}">‹</button>`
      + `<button class="sr-card-step next" type="button" data-sr-card="next" aria-label="${esc(data.texts.card_next)}">›</button><span class="sr-card-count"></span></div>`
      + '<div class="sr-card-body"><h2 class="sr-card-name"></h2><p class="sr-card-short"></p>'
      + `<div class="sr-card-actions"><button type="button" class="btn btn-brand btn-block" data-add="">+ ${esc(data.texts.add_to_quote)}</button>`
      + `<a class="btn btn-outline btn-block sr-card-more" href="showroom.html">${esc(data.texts.view_product)} →</a></div></div>`;
    view.parentElement.appendChild(card);
    card.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sr-card]');
      if (b) {
        if (b.dataset.srCard === 'close') closeCard();
        else stepCard(b.dataset.srCard === 'next' ? 1 : -1);
        return;
      }
      if (e.target.closest('[data-add]')) setTimeout(() => quoteLabel(card.querySelector('[data-add]'), cardKey), 0);
      if (e.target.closest('.sr-card-more')) { try { sessionStorage.setItem('sit-arrive', '1'); } catch (err) { /* ignore */ } }
    });
  }

  function build() {
    const t = data.texts;
    view.innerHTML = `<div class="sr-zoom"><button type="button" data-sr-zoom="1" aria-label="${esc(t.zoom_in)}" title="${esc(t.zoom_in)}">+</button>`
      + `<button type="button" data-sr-zoom="-1" aria-label="${esc(t.zoom_out)}" title="${esc(t.zoom_out)}">−</button></div>`
      + `<button type="button" class="sr-back" data-sr-back hidden title="${esc(data.names.overview)}">← ${esc(t.back)}</button>`;
    zoomBox = view.querySelector('.sr-zoom');
    makeCard();
    const wanted = window.location.hash.slice(1);
    const first = scene(wanted && wanted !== 'overview' && hasScene(wanted) ? wanted : 'overview');
    if (first.id !== 'overview') view.style.backgroundImage = 'none';
    first.loaded.then((ok) => { if (!ok) say(t.no_image); else view.style.backgroundImage = 'none'; });
    centre(first);
    draw(first);
    show(first);
    window.SailingShowroom = {
      go, walk: walkTo, zoomAt, scene: () => cur.id, walking: () => walking, view: () => ({ ...cur.s }),
      points: () => cur.el.querySelectorAll('.sr-point').length, card: () => cardKey,
    };
  }

  // ---- dragging, pinching, wheel, double-click
  const ptrs = new Map();
  let moved = 0;
  let pinch = null;
  view.addEventListener('pointerdown', (e) => {
    if (!cur || walking || e.target.closest('.sr-zoom, .sr-back')) return;
    stop();
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) moved = 0;
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: cur.s.z };
    }
    view.classList.add('dragging');
  });
  view.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p || walking) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (ptrs.size === 2 && pinch) {
      const [a, b] = [...ptrs.values()];
      const r = view.getBoundingClientRect();
      zoomAt(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      moved += 10;
      return;
    }
    moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 4 && !view.hasPointerCapture(e.pointerId)) view.setPointerCapture(e.pointerId);
    cur.s.x += dx;
    cur.s.y += dy;
    draw();
  });
  const up = (e) => {
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (!ptrs.size) view.classList.remove('dragging');
  };
  view.addEventListener('pointerup', up);
  view.addEventListener('pointercancel', up);
  // a drag that ends on a point is not a click on it
  view.addEventListener('click', (e) => { if (moved > 6 && e.target.closest('.sr-point')) e.preventDefault(); }, true);
  view.addEventListener('click', (e) => {
    if (!cur) return;
    const z = e.target.closest('[data-sr-zoom]');
    if (z) zoomAt(cur.s.z * (z.dataset.srZoom === '1' ? 1.5 : 1 / 1.5), view.clientWidth / 2, view.clientHeight / 2);
    if (e.target.closest('[data-sr-back]')) { walkTo('overview'); return; }
    const pt = e.target.closest('.sr-point');
    // a point opens its card (Ctrl / Cmd / Shift click still opens the product page in a new tab or window)
    if (pt && !e.defaultPrevented && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      if (!walking) openCard(pt.dataset.srProduct, e.detail === 0);
    } else if (!pt && !z && moved <= 6 && !e.target.closest('.sr-zoom')) {
      if (cardKey) { closeCard(); return; }                // a tap on the photo puts the card away
      const id = !walking && areaAt(e);
      if (id) { if (tip) tip.hidden = true; walkTo(id); }
    }
  });
  // where on the photo (in %) a pointer is, and which area of the main photo is there (to walk to it)
  function spotAt(e) {
    const r = view.getBoundingClientRect();
    return [((e.clientX - r.left - cur.s.x) / (cur.bw * cur.s.z)) * 100, ((e.clientY - r.top - cur.s.y) / (cur.bh * cur.s.z)) * 100];
  }
  function areaAt(e) {
    if (!cur || cur.id !== 'overview') return null;
    const [xp, yp] = spotAt(e);
    let best = null;
    (data.scene.areas || []).forEach((a) => {
      const d = Math.hypot(a.x - xp, (a.y - yp) * 0.6);
      if (hasScene(a.id) && d < 16 && (!best || d < best.d)) best = { id: a.id, d };
    });
    return best && best.id;
  }
  // double-click: zoom in on the spot (or back out); on the main photo a single click already walks to an area
  view.addEventListener('dblclick', (e) => {
    if (!cur || walking || e.target.closest('.sr-point, .sr-zoom') || areaAt(e)) return;
    const [xp, yp] = spotAt(e);
    if (cur.s.z > 1.9) glide(cur, 50, 50, 1);
    else glide(cur, xp, yp, 2.2);
  });
  // on a computer, a label follows the pointer over an area of the main photo: "Walk to Mirrors"
  let tip = null;
  view.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !data) return;
    const id = !ptrs.size && !walking && !e.target.closest('.sr-point, .sr-zoom') ? areaAt(e) : null;
    view.classList.toggle('over-area', !!id);
    if (!id) { if (tip) tip.hidden = true; return; }
    if (!tip) { tip = document.createElement('div'); tip.className = 'sr-walk-tip'; tip.setAttribute('aria-hidden', 'true'); view.appendChild(tip); }
    const r = view.getBoundingClientRect();
    tip.textContent = `${(data.texts.walk_to || '{name}').replace('{name}', data.names[id] || id)} →`;
    tip.style.left = `${e.clientX - r.left + 16}px`;
    tip.style.top = `${e.clientY - r.top + 18}px`;
    tip.hidden = false;
  });
  view.addEventListener('pointerleave', () => { if (tip) tip.hidden = true; view.classList.remove('over-area'); });
  // the wheel zooms; zoomed all the way out, scrolling down scrolls the page on as usual
  view.addEventListener('wheel', (e) => {
    if (!cur || walking || (e.deltaY > 0 && cur.s.z <= 1.001)) return;
    e.preventDefault();
    const r = view.getBoundingClientRect();
    zoomAt(cur.s.z * Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  window.addEventListener('resize', () => {
    Object.values(scenes).forEach((sc) => {
      const cx = (view.clientWidth / 2 - sc.s.x) / (sc.bw * sc.s.z || 1);
      const cy = (view.clientHeight / 2 - sc.s.y) / (sc.bh * sc.s.z || 1);
      size(sc);
      sc.s.x = view.clientWidth / 2 - cx * sc.bw * sc.s.z;
      sc.s.y = view.clientHeight / 2 - cy * sc.bh * sc.s.z;
      draw(sc);
    });
  });

  // texts (and the first start) come from site.js; a language change only rewrites the words
  function onShowroom(d) {
    if (!d) return;
    const first = !data;
    data = d;
    if (first) { build(); return; }
    view.querySelectorAll('[data-sr-product]').forEach((el) => {
      const p = data.products[el.dataset.srProduct];
      if (!p) return;
      el.querySelector('.sr-name').innerHTML = `${esc(p.name)}<small>${esc(data.texts.view_product)} →</small>`;
      el.setAttribute('aria-label', `${p.name} – ${data.texts.view_product}`);
    });
    Object.values(scenes).forEach((sc) => { sc.img.alt = sc.id === 'overview' ? data.texts.photo_alt : `${data.texts.photo_alt} – ${data.names[sc.id] || sc.id}`; });
    view.querySelectorAll('[data-sr-zoom]').forEach((b) => {
      const t = b.dataset.srZoom === '1' ? data.texts.zoom_in : data.texts.zoom_out;
      b.setAttribute('aria-label', t);
      b.title = t;
    });
    const back = view.querySelector('[data-sr-back]');
    if (back) { back.textContent = `← ${data.texts.back}`; back.title = data.names.overview; }
    if (!msg.hidden) say(data.texts.no_image);
    if (cardKey) fillCard();
    mark();
  }
  document.addEventListener('sit:showroom', (e) => onShowroom(e.detail));
  if (window.__sitShowroom) onShowroom(window.__sitShowroom);

  document.addEventListener('click', (e) => {
    const b = e.target instanceof Element && e.target.closest('[data-sr-go]');
    if (b && data) go(b.dataset.srGo);
  });
  // start loading an area's photo as soon as the pointer is on its button
  document.addEventListener('pointerover', (e) => {
    const b = e.target instanceof Element && e.target.closest('[data-sr-go]');
    if (b && data && cur && hasScene(b.dataset.srGo)) scene(b.dataset.srGo);
  });
  document.addEventListener('keydown', (e) => {
    if (!cur || e.altKey || e.ctrlKey || e.metaKey || (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]'))) return;
    const r = view.getBoundingClientRect();
    if (r.bottom < 100 || r.top > window.innerHeight - 100) return;   // only while the showroom is on screen
    const k = e.key;
    if (k === 'Escape') { if (cardKey) closeCard(); else if (cur.id !== 'overview') walkTo('overview'); return; }
    if (k === 'Backspace' && cur.id !== 'overview') { e.preventDefault(); walkTo('overview'); return; }
    if (walking) return;
    const cx = view.clientWidth / 2;
    const cy = view.clientHeight / 2;
    const pan = (dx, dy) => { e.preventDefault(); stop(); cur.s.x += dx; cur.s.y += dy; draw(); };
    if (k === 'ArrowLeft' || k === 'a') pan(120, 0);
    else if (k === 'ArrowRight' || k === 'd') pan(-120, 0);
    else if (k === 'ArrowUp' || k === 'w') pan(0, 100);
    else if (k === 'ArrowDown' || k === 's') pan(0, -100);
    else if (k === '+' || k === '=') zoomAt(cur.s.z * 1.4, cx, cy);
    else if (k === '-') zoomAt(cur.s.z / 1.4, cx, cy);
    else if (k === '0') go('overview');
    else if (/^[1-9]$/.test(k)) {
      const b = document.querySelectorAll('[data-sr-go]')[Number(k) - 1];
      if (b) go(b.dataset.srGo);
    }
  });
})();

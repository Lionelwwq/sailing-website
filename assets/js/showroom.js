/* Sailing International Trade - 360° showroom (showroom.html).
 *
 * One Pannellum scene per showroom spot (assets/img/showroom/showroom.json). Walk arrows are worked out from the
 * floor plan: each spot has x (east) / y (north) in metres, and in every picture north is at the centre (or at
 * "north" degrees if a picture is turned). Product points link to the product pages.
 * Controls: drag / swipe to look, the arrows or W and S to walk, A and D (or the arrow keys) to turn,
 * 1-8 or the area buttons to jump. Texts come from site.js ('sit:showroom' event) in the page language.
 */
(() => {
  const view = document.getElementById('sr-view');
  if (!view) return;
  const BASE = 'assets/img/showroom/';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const msg = document.getElementById('sr-msg');
  let data = null;      // { scene, names, products, texts } from site.js
  let viewer = null;
  const trail = [];     // spots visited, for "walk back"

  // Big pictures only where the graphics card takes them (phones usually stop at 4096 px)
  const maxTexture = (() => {
    try { const c = document.createElement('canvas'); const g = c.getContext('webgl') || c.getContext('experimental-webgl'); return g ? g.getParameter(g.MAX_TEXTURE_SIZE) : 0; } catch (e) { return 0; }
  })();
  const big = maxTexture >= 8192 && Math.min(window.screen.width, window.screen.height) >= 700;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (a) => ((a % 360) + 540) % 360 - 180;
  const spots = () => data.scene.spots;
  const spot = (id) => spots().find((s) => s.id === id);
  const bearing = (a, b) => (Math.atan2(b.x - a.x, b.y - a.y) * 180) / Math.PI;   // 0 = north, 90 = east
  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m0 0-6 6m6-6 6 6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function say(text) { msg.textContent = text; msg.hidden = !text; }

  function walkTip(div, id) {
    div.innerHTML = `<span class="sr-arrow">${ARROW}</span><span class="sr-name" data-sr-spot-name="${esc(id)}">${esc(data.names[id] || id)}</span>`;
    div.title = data.texts.walk_to.replace('{name}', data.names[id] || id);
  }
  function pointTip(div, key) {
    const p = data.products[key];
    div.innerHTML = `<span class="sr-dot"></span><span class="sr-name" data-sr-product="${esc(key)}">${esc(p.name)}<small>${esc(data.texts.view_product)} →</small></span>`;
  }
  function openProduct(e, key) {
    const p = data.products[key];
    if (!p) return;
    try { sessionStorage.setItem('sit-arrive', '1'); } catch (err) { /* ignore */ }   // the product page fades in
    window.location.href = p.href;
  }

  function hotSpots(s) {
    const hs = [];
    (s.links || []).forEach((id) => {
      const t = spot(id);
      if (!t) return;
      hs.push({ id: `walk-${id}`, type: 'scene', sceneId: id, yaw: norm(bearing(s, t) + (s.north || 0)), pitch: -16, targetYaw: 'sameAzimuth',
        cssClass: 'sr-walk', createTooltipFunc: walkTip, createTooltipArgs: id });
    });
    (s.points || []).forEach((pt, i) => {
      if (!data.products[pt.product]) return;
      hs.push({ id: `point-${i}`, yaw: pt.yaw, pitch: pt.pitch, cssClass: 'sr-point', createTooltipFunc: pointTip, createTooltipArgs: pt.product,
        clickHandlerFunc: openProduct, clickHandlerArgs: pt.product });
    });
    return hs;
  }

  function mark(id) {
    document.querySelectorAll('[data-sr-go]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.srGo === id)));
    if (window.history.replaceState) window.history.replaceState(null, '', `#${id}`);
  }
  function go(id) {
    if (!viewer || !spot(id) || viewer.getScene() === id) return;
    viewer.loadScene(id, 'same', 'sameAzimuth');
  }
  let current = null;
  let goingBack = false;
  function arrived(id) {     // every change of spot (arrows in the picture, buttons, keys) is remembered for S / back
    if (!goingBack && current && current !== id) trail.push(current);
    goingBack = false;
    current = id;
    mark(id);
  }
  function back() {
    const prev = trail.pop();
    if (prev && viewer) { goingBack = true; viewer.loadScene(prev, 'same', 'sameAzimuth'); }
  }
  // the next area in a direction (yaw in the picture), if one is roughly that way
  function areaToward(yaw, within) {
    const s = spot(viewer.getScene());
    let best = null;
    (s.links || []).forEach((id) => {
      const t = spot(id);
      const d = Math.abs(norm(bearing(s, t) + (s.north || 0) - yaw));
      if (d < within && (!best || d < best.d)) best = { id, d };
    });
    return best && best.id;
  }
  // W: walk towards the arrow nearest the middle of the view
  function forward() {
    const id = areaToward(viewer.getYaw(), 70);
    if (id) go(id);
  }
  // double-click / double-tap: walk on in that direction, or turn to look there if no area is that way
  view.addEventListener('dblclick', (e) => {
    if (!viewer || e.target.closest('.pnlm-hotspot-base, .pnlm-controls-container')) return;
    const [, yaw] = viewer.mouseEventToCoords(e);
    const id = areaToward(yaw, 50);
    if (id) go(id);
    else viewer.setYaw(norm(yaw), reduce ? false : 450);
  });

  function build() {
    if (!window.pannellum) { say(data.texts.no_webgl); return; }
    if (!maxTexture) { say(data.texts.no_webgl); return; }
    const scenes = {};
    spots().forEach((s) => {
      scenes[s.id] = { type: 'equirectangular', panorama: `${BASE}${s.id}${big ? '' : '-m'}.jpg`, northOffset: -(s.north || 0),
        hfov: window.innerWidth < 760 ? 90 : 100, minHfov: 40, maxHfov: 115, yaw: s.north || 0, pitch: -3, hotSpots: hotSpots(s) };
    });
    const wanted = window.location.hash.slice(1);
    const first = spot(wanted) ? wanted : data.scene.start;
    viewer = window.pannellum.viewer(view, {
      default: { firstScene: first, autoLoad: true, sceneFadeDuration: reduce ? 0 : 650, showControls: true, showFullscreenCtrl: true,
        disableKeyboardCtrl: true, compass: false, strings: { loadingLabel: data.texts.loading } },
      scenes,
    });
    viewer.on('scenechange', (id) => arrived(id));
    viewer.on('error', () => say(data.texts.no_webgl));
    arrived(first);
    window.SailingShowroom = { viewer, go, back, forward, spot: () => viewer.getScene() };
  }

  // texts (and the first start) come from site.js; a language change only rewrites the words
  function onShowroom(d) {
    if (!d) return;
    const first = !data;
    data = d;
    if (first) { build(); return; }
    view.querySelectorAll('[data-sr-spot-name]').forEach((el) => { el.textContent = data.names[el.dataset.srSpotName] || ''; });
    view.querySelectorAll('[data-sr-product]').forEach((el) => {
      const p = data.products[el.dataset.srProduct];
      if (p) el.innerHTML = `${esc(p.name)}<small>${esc(data.texts.view_product)} →</small>`;
    });
    if (!msg.hidden) say(data.texts.no_webgl);
    if (viewer) mark(viewer.getScene());
  }
  document.addEventListener('sit:showroom', (e) => onShowroom(e.detail));
  if (window.__sitShowroom) onShowroom(window.__sitShowroom);

  document.addEventListener('click', (e) => {
    const b = e.target instanceof Element && e.target.closest('[data-sr-go]');
    if (b) go(b.dataset.srGo);
  });
  document.addEventListener('keydown', (e) => {
    if (!viewer || e.altKey || e.ctrlKey || e.metaKey || (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]'))) return;
    const r = view.getBoundingClientRect();
    if (r.bottom < 100 || r.top > window.innerHeight - 100) return;   // only while the viewer is on screen
    const k = e.key.toLowerCase();
    const turn = (deg) => viewer.setYaw(norm(viewer.getYaw() + deg), reduce ? false : 350);
    if (k === 'w' || k === 'arrowup') { e.preventDefault(); forward(); }
    else if (k === 's' || k === 'arrowdown') { e.preventDefault(); back(); }
    else if (k === 'a' || k === 'arrowleft') { e.preventDefault(); turn(-30); }
    else if (k === 'd' || k === 'arrowright') { e.preventDefault(); turn(30); }
    else if (k === '+' || k === '=') viewer.setHfov(viewer.getHfov() - 10);
    else if (k === '-') viewer.setHfov(viewer.getHfov() + 10);
    else if (/^[1-9]$/.test(k) && spots()[Number(k) - 1]) go(spots()[Number(k) - 1].id);
  });
})();

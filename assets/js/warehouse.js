/* Warehouse tour (top of the home page).
   Outside view → the door rolls up and the camera walks in → click an area to see a close-up with
   clickable products (a product click zooms in and opens its page). Pictures, marker positions and product spots all come from
   assets/img/warehouse/scene.json, so pictures can be swapped without touching this file. */
(() => {
  const root = document.getElementById('wh');
  if (!root) return;
  const BASE = 'assets/img/warehouse/';

  const ZONES = [
    { id: 'glass', href: 'glass.html', picks: ['glass:clear-float', 'glass:tempered', 'glass:patterned'],
      name: { en: 'Glass', zh: '玻璃', fr: 'Verre' },
      text: { en: 'Float, low-iron, tinted, tempered, laminated, insulated, coated, patterned and acid etched glass, cut and processed to your size.',
              zh: '浮法、超白、着色、钢化、夹胶、中空、镀膜、压花、酸蚀等玻璃，按您的尺寸切割加工。',
              fr: 'Verre flotté, extra-clair, teinté, trempé, feuilleté, isolant, à couche, imprimé et gravé, coupé et façonné sur mesure.' } },
    { id: 'mirrors', href: 'mirrors.html', picks: ['mirrors:silver-mirror', 'mirrors:tinted-mirror', 'mirrors:antique-mirror'],
      name: { en: 'Mirrors', zh: '镜子', fr: 'Miroirs' },
      text: { en: 'Silver, tinted and antique mirrors and back-painted glass, cut to size, with optional safety backing.',
              zh: '银镜、彩色镜、仿古镜和烤漆玻璃，按尺寸切割，可加安全背膜。',
              fr: 'Miroirs argent, teintés et antiques et verre laqué, coupés sur mesure, avec endos de sécurité en option.' } },
    { id: 'curved', href: 'glass.html#curved', picks: ['glass:curved', 'glass:laminated', 'glass:insulated'],
      name: { en: 'Curved glass', zh: '弧形玻璃', fr: 'Verre bombé' },
      text: { en: 'Heat-bent to your drawings, also as curved tempered, laminated or insulated glass.',
              zh: '按图纸热弯成形，也可以做成弧形钢化、夹胶或中空玻璃。',
              fr: 'Cintré à chaud selon vos plans, aussi en verre bombé trempé, feuilleté ou isolant.' } },
    { id: 'solar', href: 'glass.html#solar', picks: ['glass:solar', 'glass:low-iron', 'glass:coated'],
      name: { en: 'Solar (PV) glass', zh: '光伏玻璃', fr: 'Verre photovoltaïque' },
      text: { en: 'From rooftop solar panels to solar glass built into the building itself.',
              zh: '从屋顶上的太阳能板，到与建筑融为一体的光伏玻璃。',
              fr: 'Des panneaux solaires sur le toit au verre solaire intégré au bâtiment.' } },
    { id: 'accessories', href: 'accessories.html', picks: ['accessories:silicone-adhesive', 'accessories:aluminum-spacer', 'accessories:grinding-wheels'],
      name: { en: 'Accessories', zh: '配件', fr: 'Accessoires' },
      text: { en: 'IG materials, films, sealants, grinding wheels and polishing supplies: everything glass fabrication needs.',
              zh: '中空玻璃材料、胶片、密封胶、磨轮和抛光材料，玻璃加工所需一站配齐。',
              fr: 'Matériaux pour unités scellées, pellicules, scellants, meules et produits de polissage : tout pour la transformation du verre.' } },
    { id: 'racks', href: 'accessories.html#custom-rack', picks: ['accessories:custom-rack', 'accessories:removable-shelf', 'accessories:glass-sling'],
      name: { en: 'Racks & handling', zh: '玻璃架与搬运', fr: 'Chevalets et manutention' },
      text: { en: 'Glass racks, cork pads and slings to store and move glass safely.',
              zh: '玻璃架、软木垫和吊带，让玻璃安全存放和运输。',
              fr: 'Chevalets, tampons de liège et élingues pour entreposer et déplacer le verre en toute sécurité.' } },
    { id: 'quote', href: 'contact.html#quote', picks: [],
      name: { en: 'Get a quote', zh: '询价台', fr: 'Soumission' },
      text: { en: 'Found what you need? Tell us sizes, quantities and timing, and we will send you a free quote.',
              zh: '选好产品后，告诉我们尺寸、数量和交货时间，我们为您免费报价。',
              fr: 'Vous avez trouvé ? Indiquez dimensions, quantités et délais, et nous vous enverrons une soumission gratuite.' } },
  ];

  const T = {
    eyebrow: { en: 'Virtual warehouse', zh: '虚拟仓库', fr: 'Entrepôt virtuel' },
    title: { en: 'Step into our warehouse', zh: '走进我们的仓库', fr: 'Entrez dans notre entrepôt' },
    hint: { en: 'Choose an area to explore its products', zh: '选择一个区域，查看对应的产品', fr: 'Choisissez une zone pour découvrir ses produits' },
    enter: { en: 'Enter the warehouse', zh: '进入仓库', fr: "Entrer dans l'entrepôt" },
    scroll: { en: 'or scroll down', zh: '或向下滚动', fr: 'ou faites défiler' },
    view: { en: 'View all products', zh: '查看全部产品', fr: 'Voir tous les produits' },
    quote: { en: 'Request a quote', zh: '获取报价', fr: 'Demander une soumission' },
    prev: { en: 'Previous area', zh: '上一区域', fr: 'Zone précédente' },
    next: { en: 'Next area', zh: '下一区域', fr: 'Zone suivante' },
    close: { en: 'Back to warehouse', zh: '返回仓库', fr: "Retour à l'entrepôt" },
    tour: { en: 'Auto tour', zh: '自动导览', fr: 'Visite auto' },
    stop: { en: 'Stop tour', zh: '停止导览', fr: 'Arrêter' },
    spotsHint: { en: 'Click a product in the picture to open it', zh: '点击画面中的产品，进入产品页', fr: 'Cliquez sur un produit dans l’image pour l’ouvrir' },
  };

  const $ = (s, el = root) => el.querySelector(s);
  const $$ = (s, el = root) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lang = () => { const l = document.documentElement.lang || 'en'; return l.startsWith('zh') ? 'zh' : l.startsWith('fr') ? 'fr' : 'en'; };
  const tr = (o) => (o ? o[lang()] || o.en : '');
  const num = (i) => String(i + 1).padStart(2, '0');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));

  const viewport = $('.wh-viewport');
  const pan = $('.wh-pan');
  const scene = $('.wh-scene');
  const panel = $('.wh-panel');
  const detail = $('.wh-detail');
  const products = {};
  let cfg = { width: 1600, height: 900, zoom: 1.25, hotspots: {} };
  let active = null;        // open area
  let lastFocus = null;
  let detailTimer = 0;
  let tourTimer = 0;
  let touring = false;
  let atDoor = false;
  let enter = null;          // walks in from the door (set when there is an entrance)

  const narrow = () => viewport.clientWidth < 760;
  const cover = (w, h) => {
    const W = viewport.clientWidth, H = viewport.clientHeight;
    const s = Math.max(W / w, H / h);
    return { s, x: (W - w * s) / 2, y: (H - h * s) / 2, W, H };
  };
  // size a picture box so it covers the viewport (keeps % positions on the picture exact)
  function fit(el, w, h) {
    const c = cover(w, h);
    Object.assign(el.style, { width: `${w * c.s}px`, height: `${h * c.s}px`, left: `${c.x}px`, top: `${c.y}px` });
  }

  /* ---------------- text ---------------- */
  function texts() {
    $('.wh-eyebrow').textContent = tr(T.eyebrow);
    $('.wh-title').textContent = tr(T.title);
    $('.wh-hint').textContent = tr(T.hint);
    const tb = $('.wh-tour');
    tb.innerHTML = `<span class="wh-tour-ic" aria-hidden="true">${touring ? '❚❚' : '▶'}</span>${esc(tr(touring ? T.stop : T.tour))}`;
    tb.setAttribute('aria-pressed', String(touring));
    $$('.wh-dot').forEach((b) => {
      const i = ZONES.findIndex((x) => x.id === b.dataset.zone);
      b.querySelector('.wh-label').innerHTML = `<span>${num(i)}</span>${esc(tr(ZONES[i].name))}`;
      b.setAttribute('aria-label', tr(ZONES[i].name));
    });
    $$('.wh-spot').forEach((b) => {
      const p = products[b.dataset.product];
      const name = p ? tr(p.name) : '';
      b.querySelector('.wh-spot-label').textContent = name;
      b.setAttribute('aria-label', name);
    });
    $$('[data-wh-enter]').forEach((b) => { b.textContent = tr(T.enter); });
    const hint = $('.wh-door-hint');
    if (hint) hint.textContent = tr(T.scroll);
    if (active) render();
  }

  /* ---------------- info card ---------------- */
  function render() {
    const z = active;
    const i = ZONES.indexOf(z);
    const picks = z.picks.map((k) => products[k]).filter(Boolean);
    const hasSpots = ((cfg.spots || {})[z.id] || []).length > 0 && !!(cfg.details || {})[z.id];
    panel.innerHTML = `
      <div class="wh-card-head"><span class="wh-kicker">${num(i)} / ${num(ZONES.length - 1)}</span>
        <button class="wh-x" type="button" data-wh-back aria-label="${esc(tr(T.close))}">×</button></div>
      <h2 tabindex="-1">${esc(tr(z.name))}</h2>
      <p>${esc(tr(z.text))}</p>
      ${hasSpots ? `<p class="wh-tip">${esc(tr(T.spotsHint))}</p>` : ''}
      ${picks.length ? `<div class="wh-picks">${picks.map((p) => `<a class="wh-pick" href="${p.href}"><img src="${esc(p.photo)}" alt="" loading="lazy"><span>${esc(tr(p.name))}</span></a>`).join('')}</div>` : ''}
      <a class="btn btn-brand btn-block btn-sm" href="${z.href}">${esc(tr(z.id === 'quote' ? T.quote : T.view))}</a>
      <div class="wh-steps">
        <button type="button" data-wh-step="-1">‹ ${esc(tr(T.prev))}</button>
        <button type="button" data-wh-step="1">${esc(tr(T.next))} ›</button>
      </div>
      <div class="wh-progress" aria-hidden="true"><i></i></div>`;
  }

  function focusTitle() { requestAnimationFrame(() => { const h = panel.querySelector('h2'); if (h && !touring) h.focus({ preventScroll: true }); }); }

  /* ---------------- camera ---------------- */
  function layout(animate = true, extra = 1) {
    const c = cover(cfg.width, cfg.height);
    let s = c.s * extra;
    let tx = (c.W - cfg.width * s) / 2;
    let ty = (c.H - cfg.height * s) / 2;
    if (active && active.x != null) {
      s = c.s * ((cfg.details || {})[active.id] ? cfg.zoom : cfg.zoomNoDetail || 1.5);
      const pw = narrow() ? 0 : Math.min(360, c.W * 0.36) + 40;
      const left = root.classList.contains('panel-left');
      const gx = narrow() ? c.W / 2 : left ? pw + (c.W - pw) / 2 : (c.W - pw) / 2;
      tx = Math.min(0, Math.max(c.W - cfg.width * s, gx - active.x * s));
      ty = Math.min(0, Math.max(c.H - cfg.height * s, c.H / 2 - active.y * s));
    }
    scene.classList.toggle('no-anim', !animate);
    scene.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
    scene.style.setProperty('--inv', String(1 / s));
    if (!active) {
      // markers near the right edge show their label on the left (only decided while they are visible)
      $$('.wh-dot').forEach((b) => {
        const z = ZONES.find((x) => x.id === b.dataset.zone);
        b.classList.toggle('flip', tx + z.x * s > c.W - 190);
      });
    }
    fit($('.wh-detail-stage'), cfg.width, cfg.height);
    const door = $('.wh-door-stage');
    if (door) fit(door, cfg.entrance.width || cfg.width, cfg.entrance.height || cfg.height);
  }

  /* ---------------- close-up ---------------- */
  function showDetail(z) {
    clearTimeout(detailTimer);
    const file = (cfg.details || {})[z.id];
    detail.classList.remove('on');
    if (!file) return;
    detailTimer = setTimeout(() => {
      const stage = $('.wh-detail-stage');
      stage.querySelector('img').src = BASE + file;
      const spots = (cfg.spots || {})[z.id] || [];
      stage.querySelector('.wh-spots').innerHTML = spots.map((sp, i) => `
        <button class="wh-spot${sp.x / cfg.width > 0.8 ? ' flip' : ''}" type="button" data-product="${esc(sp.product)}" style="left:${(sp.x / cfg.width) * 100}%;top:${(sp.y / cfg.height) * 100}%;--i:${i}">
          <span class="wh-spot-dot" aria-hidden="true"></span><span class="wh-spot-label"></span></button>`).join('');
      texts();
      detail.classList.remove('kb');
      void detail.offsetWidth;
      detail.classList.add('on', 'kb');
    }, reduced ? 0 : 380);
  }
  function hideDetail() { clearTimeout(detailTimer); detail.classList.remove('on', 'kb'); }

  /* ---------------- open / close ---------------- */
  function open(id, from, keepTour) {
    const z = ZONES.find((x) => x.id === id);
    if (!z || atDoor) return;
    if (!keepTour) stopTour();
    if (!active) lastFocus = from || document.activeElement;
    active = z;
    root.classList.add('zoomed');
    root.classList.toggle('panel-left', z.x / cfg.width > 0.62);
    $$('[data-zone]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.zone === id)));
    render();
    panel.hidden = false;
    panel.classList.remove('in'); void panel.offsetWidth; panel.classList.add('in');
    layout();
    showDetail(z);
    focusTitle();
    if (narrow() && !keepTour) setTimeout(() => panel.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' }), 50);
  }

  function close() {
    if (!active) return;
    stopTour();
    active = null;
    root.classList.remove('zoomed');
    $$('[data-zone]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    panel.hidden = true;
    hideDetail();
    layout();
    if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
  }

  function step(d, keepTour) {
    const i = active ? ZONES.indexOf(active) : -1;
    open(ZONES[(i + d + ZONES.length) % ZONES.length].id, null, keepTour);
  }

  /* ---------------- auto tour ---------------- */
  const TOUR_MS = 6500;
  function tick() {
    step(1, true);
    const bar = panel.querySelector('.wh-progress i');
    if (bar) { bar.style.transition = 'none'; bar.style.width = '0'; void bar.offsetWidth; bar.style.transition = `width ${TOUR_MS}ms linear`; bar.style.width = '100%'; }
    tourTimer = setTimeout(tick, TOUR_MS);
  }
  function startTour() { touring = true; root.classList.add('touring'); texts(); tick(); }
  function stopTour() {
    if (!touring) return;
    touring = false; clearTimeout(tourTimer); root.classList.remove('touring'); texts();
  }

  /* ---------------- entrance: door rolls up, camera walks in ---------------- */
  function setupEntrance(e) {
    atDoor = true;
    root.classList.add('at-door');
    const d = e.door || [31.3, 55, 68.8, 89];   // door opening in % of the picture: left, top, right, bottom
    const f = e.focus || [50, 70];
    // through the opening we show the real inside picture, so walking in flows straight into the inside view
    const rect = `left:${d[0]}%;top:${d[1]}%;width:${d[2] - d[0]}%;height:${d[3] - d[1]}%`;
    const inside = /\.svg$/i.test(cfg.image) ? BASE + e.image : BASE + cfg.image;
    const box = document.createElement('div');
    box.className = 'wh-door';
    box.innerHTML = `
      <div class="wh-door-stage" style="transform-origin:${f[0]}% ${f[1]}%">
        <div class="wh-door-inner">${e.closed ? `
          <img class="wh-door-closed" src="${esc(BASE + e.closed)}" alt="">
          <div class="wh-door-inside" style="${rect}"><img src="${esc(inside)}" alt=""></div>
          <i class="wh-door-edge" style="left:${d[0]}%;width:${d[2] - d[0]}%;--t:${d[1]}%;--b:${d[3]}%"></i>` : `
          <img class="wh-door-closed" src="${esc(BASE + e.image)}" alt="">`}
        </div>
      </div>`;
    box.style.setProperty('--door-zoom', String(e.zoom || 2.5));
    if (!e.closed) box.classList.add('no-roll');
    viewport.appendChild(box);
    const go = async () => {
      if (!atDoor || box.classList.contains('go')) return;
      box.classList.add('go');                         // hide the words and roll the door up
      root.classList.add('entering');
      await wait(e.closed ? 1150 : 100);
      box.classList.add('walk');                       // camera moves into the doorway
      await wait(1250);
      layout(false, e.arrive || 1.1);                  // same framing as the doorway at the end of the walk, then settles
      atDoor = false;
      root.classList.remove('at-door');
      box.classList.add('gone');
      requestAnimationFrame(() => requestAnimationFrame(() => layout(true)));
      root.classList.add('arrived', 'inside');
      root.classList.remove('entering');
      await wait(700);
      box.remove();
    };
    enter = go;
    root.addEventListener('wheel', (ev) => { if (atDoor && ev.deltaY > 0) { ev.preventDefault(); go(); } }, { passive: false });
    document.addEventListener('keydown', (ev) => { if (atDoor && (ev.key === 'ArrowDown' || ev.key === 'PageDown')) { ev.preventDefault(); go(); } });
  }

  /* ---------------- events ---------------- */
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-wh-enter]')) { if (enter) enter(); return; }
    if (e.target.closest('.wh-tour')) { if (touring) stopTour(); else startTour(); return; }
    const z = e.target.closest('[data-zone]');
    if (z) { open(z.dataset.zone, z); return; }
    const sp = e.target.closest('.wh-spot');
    if (sp) {
      const p = products[sp.dataset.product];
      if (p) { sp.classList.add('on'); dive(p.href, sp.style.left, sp.style.top); }
      return;
    }
    const pick = e.target.closest('.wh-pick');
    if (pick && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) { e.preventDefault(); dive(pick.getAttribute('href')); return; }
    const st = e.target.closest('[data-wh-step]');
    if (st) { step(Number(st.dataset.whStep)); return; }
    if (e.target.closest('[data-wh-back]')) { close(); return; }
    if (active && e.target.closest('.wh-viewport') && !e.target.closest('.wh-panel, .wh-door')) close();
  });
  /* ---------------- dive into a product, then open its page ---------------- */
  const veil = document.createElement('div');
  veil.className = 'wh-veil';
  root.appendChild(veil);
  let diving = false;
  function dive(href, ox, oy) {
    if (diving) return;
    diving = true;
    stopTour();
    try {
      sessionStorage.setItem('sit-tour-return', active ? active.id : '');   // Back brings the visitor to this area again
      sessionStorage.setItem('sit-arrive', '1');                             // the product page fades in to match
    } catch (err) { /* private mode: just open the page */ }
    const stage = $('.wh-detail-stage');
    if (ox && detail.classList.contains('on')) {
      stage.style.transformOrigin = `${ox} ${oy}`;
      detail.classList.add('dive');
    }
    root.classList.add('diving');
    setTimeout(() => { window.location.href = href; }, reduced ? 0 : 900);
  }
  // returning with Back from the product page (page kept in memory): undo the dive at once
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted || !diving) return;
    diving = false;
    try { sessionStorage.removeItem('sit-tour-return'); } catch (err) { /* ignore */ }
    const stage = $('.wh-detail-stage');
    stage.style.transition = 'none';
    detail.classList.remove('dive');
    root.classList.remove('diving');
    $$('.wh-spot.on').forEach((b) => b.classList.remove('on'));
    void stage.offsetWidth;
    stage.style.transition = '';
  });

  // hovering an area in the list highlights its marker, and the other way round
  root.addEventListener('pointerover', (e) => {
    const b = e.target.closest('[data-zone]');
    $$('[data-zone]').forEach((x) => x.classList.toggle('hl', !!b && x.dataset.zone === b.dataset.zone));
  });
  document.addEventListener('keydown', (e) => {
    if (!active || (e.target instanceof Element && e.target.closest('input, textarea, select'))) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  });
  // gentle depth: the picture follows the mouse a few pixels
  if (finePointer && !reduced) {
    viewport.addEventListener('pointermove', (e) => {
      if (active || atDoor) return;
      const r = viewport.getBoundingClientRect();
      pan.style.setProperty('--px', `${((e.clientX - r.left) / r.width - 0.5) * -14}px`);
      pan.style.setProperty('--py', `${((e.clientY - r.top) / r.height - 0.5) * -8}px`);
    });
    viewport.addEventListener('pointerleave', () => { pan.style.setProperty('--px', '0px'); pan.style.setProperty('--py', '0px'); });
  }
  let rz = 0;
  window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => layout(false)); });
  new MutationObserver(texts).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  /* ---------------- load ---------------- */
  async function loadScene() {
    cfg = Object.assign(cfg, await fetch(`${BASE}scene.json`).then((r) => r.json()));
    scene.style.width = `${cfg.width}px`;
    scene.style.height = `${cfg.height}px`;
    ZONES.forEach((z) => { const p = cfg.hotspots[z.id]; if (p) { z.x = p[0]; z.y = p[1]; } });
    if (/\.svg$/i.test(cfg.image)) {
      scene.insertAdjacentHTML('afterbegin', await fetch(BASE + cfg.image).then((r) => r.text()));   // inline: stays sharp when zoomed
    } else {
      await new Promise((res) => {
        const img = new Image();
        img.className = 'wh-photo'; img.alt = ''; img.onload = img.onerror = res; img.src = BASE + cfg.image;
        scene.prepend(img);
      });
    }
    scene.insertAdjacentHTML('beforeend', ZONES.filter((z) => z.x != null).map((z, i) => `
      <button class="wh-dot" type="button" data-zone="${z.id}" style="left:${z.x}px;top:${z.y}px;--i:${i}">
        <span class="wh-ring" aria-hidden="true"></span><span class="wh-label"></span>
      </button>`).join(''));
    let back = null;
    try { back = sessionStorage.getItem('sit-tour-return'); sessionStorage.removeItem('sit-tour-return'); } catch (err) { /* ignore */ }
    if (cfg.entrance && cfg.entrance.image && !narrow() && back === null) setupEntrance(cfg.entrance);   // phones go straight inside
    else root.classList.add('arrived', 'inside');
    texts();
    layout(false);
    root.classList.add('loaded');
    if (back) setTimeout(() => open(back), 60);
    // warm the cache for close-ups once the first picture is on screen
    setTimeout(() => Object.values(cfg.details || {}).forEach((f) => { const i = new Image(); i.src = BASE + f; }), 1200);
  }

  // product names, photos and descriptions come from the same files as the product pages
  Promise.all(['glass', 'mirrors', 'accessories'].map((k) => fetch(`content/${k}.json`).then((r) => r.json()).then((d) => {
    d.items.forEach((it) => {
      const key = `${k}:${it.id}`;
      products[key] = { name: it.name, photo: it.photo, href: `${k}.html#${it.id}` };
    });
  }))).then(() => { texts(); }).catch(() => {});

  texts();
  loadScene().catch(() => root.classList.add('loaded', 'arrived', 'inside'));
})();

/* ==========================================================================
   Sailing International Trade — site behaviour
   Shared on every page: header, menu, quote list, footer, animations.
   Page modules at the bottom run on the page named in <body data-page="…">.
   ========================================================================== */
(function () {
  'use strict';

  const { CATEGORIES, PRODUCTS, APPLICATIONS, GLASS, CREDITS } = window.SIT_DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const catById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
  const prodById = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
  const appById = Object.fromEntries(APPLICATIONS.map((a) => [a.id, a]));
  const glassById = Object.fromEntries(GLASS.map((g) => [g.id, g]));
  const pad2 = (n) => String(n).padStart(2, '0');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const smooth = reduceMotion ? 'auto' : 'smooth';
  const EMAIL = 'info@sailingintltrade.com';
  const page = document.body.dataset.page;
  const productUrl = (id) => `product.html?id=${id}`;

  // old single-page links (#product/cork-pads) now go to the product page
  const legacy = location.hash.match(/^#product\/([\w-]+)$/);
  if (legacy && prodById[legacy[1]]) { location.replace(productUrl(legacy[1])); return; }

  const icon = (paths, cls = '') =>
    `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const I = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    list: '<path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z"/><path d="M8 6H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2"/><path d="M9 12h6M9 16h4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  };
  const countIn = (cat) => PRODUCTS.filter((p) => p.cat === cat).length;
  const creditHtml = (src) => {
    const c = CREDITS[src];
    if (!c) return '';
    const lic = c.licenseUrl ? `<a href="${c.licenseUrl}" target="_blank" rel="noopener">${c.license}</a>` : c.license;
    return ` · Photo: <a href="${c.source}" target="_blank" rel="noopener">${esc(c.author)}</a>, ${lic}`;
  };

  /* ======================================================================
     Quote list (kept in this browser, shared by every page)
     ====================================================================== */
  function itemInfo(id) {
    if (prodById[id]) { const p = prodById[id], c = catById[p.cat]; return { name: p.name, photo: p.photo, sub: c.name, url: productUrl(id) }; }
    if (glassById[id]) { const g = glassById[id]; return { name: g.name, photo: g.photo, sub: 'Glass products', url: `products.html#${id}` }; }
    return null;
  }
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };
  const quote = new Set(store.get('sit-quote-v1', []).filter((id) => itemInfo(id)));
  const saveQuote = () => store.set('sit-quote-v1', Array.from(quote));

  const addLabel = (on, big) => big
    ? (on ? `${icon(I.check)}In your quote list` : `${icon(I.plus)}Add to quote list`)
    : (on ? `${icon(I.check)}Added` : `${icon(I.plus)}Add to quote`);
  const addBtn = (id, color) => `<button class="add-btn" type="button" data-add="${id}" aria-pressed="${quote.has(id)}"${color ? ` style="--accent:${color}"` : ''}>${addLabel(quote.has(id))}</button>`;

  const drawer = $('#drawer');
  const overlay = $('#overlay');
  const fab = $('#fab');
  let drawerReturn = null;

  function lockScroll(on) {
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.classList.toggle('locked', on);
    document.body.style.paddingRight = on && sbw > 0 ? `${sbw}px` : '';
  }
  function trapTab(e, root) {
    const f = $$('a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])', root)
      .filter((el) => el.offsetParent !== null && !el.closest('[hidden]'));
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function openDrawer() {
    drawerReturn = document.activeElement;
    drawer.classList.add('open');
    overlay.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    lockScroll(true);
    setTimeout(() => $('.icon-btn', drawer).focus({ preventScroll: true }), 60);
  }
  function closeDrawer(restoreFocus = true) {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    lockScroll(false);
    if (restoreFocus && drawerReturn && document.contains(drawerReturn)) drawerReturn.focus({ preventScroll: true });
  }
  function renderDrawer() {
    const list = $('#drawer-list');
    $('#drawer-count').textContent = quote.size;
    if (!quote.size) {
      list.innerHTML = `<li class="d-empty"><span class="ill">${icon(I.list)}</span><strong>Your list is empty</strong><span>Add glass or accessories as you browse, then request one combined quote.</span>
        <span class="d-links"><a href="products.html">Glass products</a><a href="accessories.html">Accessories</a></span></li>`;
      return;
    }
    list.innerHTML = Array.from(quote).map((id) => {
      const it = itemInfo(id);
      return `<li class="d-item">
        <a class="d-thumb" href="${it.url}" aria-label="View ${esc(it.name)}"><img src="${it.photo}" alt="" loading="lazy"></a>
        <span class="d-info"><a href="${it.url}"><b>${it.name}</b></a><small>${it.sub}</small></span>
        <button class="icon-btn" type="button" data-remove="${id}" aria-label="Remove ${esc(it.name)}">${icon(I.x)}</button>
      </li>`;
    }).join('');
  }
  let toastTimer;
  function toast(html) {
    const t = $('#toast');
    $('#toast-msg').innerHTML = html;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3400);
  }
  const quoteListeners = [];
  function syncQuote() {
    $$('[data-add]').forEach((b) => {
      const id = b.dataset.add;
      if (!id) return;
      const on = quote.has(id);
      b.setAttribute('aria-pressed', String(on));
      b.innerHTML = addLabel(on, b.classList.contains('btn'));
    });
    $('#fab-count').textContent = quote.size;
    fab.setAttribute('aria-label', `Open quote list, ${quote.size} selected`);
    renderDrawer();
    quoteListeners.forEach((fn) => fn());
    updateFab();
  }
  function toggleQuote(id) {
    const adding = !quote.has(id);
    if (adding) quote.add(id); else quote.delete(id);
    saveQuote();
    syncQuote();
    if (adding) {
      toast(`<b>${esc(itemInfo(id).name)}</b> added to your quote list`);
      fab.classList.remove('bump');
      void fab.offsetWidth;
      fab.classList.add('bump');
    }
  }
  // keep every open tab in step
  window.addEventListener('storage', (e) => {
    if (e.key !== 'sit-quote-v1') return;
    quote.clear();
    store.get('sit-quote-v1', []).filter((id) => itemInfo(id)).forEach((id) => quote.add(id));
    syncQuote();
  });

  /* ======================================================================
     Shared renderers
     ====================================================================== */
  function cardHtml(p, i) {
    const c = catById[p.cat];
    const url = productUrl(p.id);
    return `
    <article class="card reveal" data-id="${p.id}" style="--accent:${c.color};--d:${(i % 3) * 70}ms">
      <a class="card-media" href="${url}" aria-label="View details for ${esc(p.name)}">
        <img src="${p.photo}" alt="${esc(p.name)}" loading="lazy" width="800" height="800">
        <span class="card-num">${pad2(PRODUCTS.indexOf(p) + 1)}</span>
        <span class="card-view">${icon(I.eye)}View details</span>
      </a>
      <div class="card-body">
        <span class="card-cat"><i></i>${c.name}</span>
        <h3><a href="${url}">${p.name}</a></h3>
        <p>${p.short}</p>
        <ul class="card-uses">${p.uses.map((u) => `<li>${u}</li>`).join('')}</ul>
        <dl class="card-specs">${p.specs.slice(0, 4).map(([k, v], j) => `<div${j > 1 ? ' class="x"' : ''}><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
        <ul class="tags">${p.tags.map((t) => `<li>${t}</li>`).join('')}</ul>
        <div class="card-actions">
          <a class="link-btn" href="${url}">Details ${icon(I.arrow)}</a>
          ${addBtn(p.id)}
        </div>
      </div>
    </article>`;
  }
  function appTileHtml(a, i) {
    const c = CREDITS[a.img];
    return `
    <article class="app reveal" style="--d:${(i % 3) * 80}ms">
      <img src="${a.img}" alt="" loading="lazy">
      ${c ? `<a class="credit-tag" href="${c.source}" target="_blank" rel="noopener">Photo: ${esc(c.author)} · ${c.license}</a>` : ''}
      <h3><a href="applications.html#${a.id}">${a.name}</a></h3>
      <p>${a.text}</p>
      <div class="app-products">${a.products.map((id) => `<a class="app-chip" href="${productUrl(id)}"><img src="${prodById[id].photo}" alt="" loading="lazy">${prodById[id].name}</a>`).join('')}</div>
      <a class="app-all" href="accessories.html?app=${a.id}">Show these in the catalogue ${icon(I.arrow)}</a>
    </article>`;
  }
  function renderCategoryTiles(el) {
    el.innerHTML = CATEGORIES.map((c, i) => `
      <a class="cat-tile reveal" href="accessories.html?cat=${c.id}" data-filter="${c.id}" style="--accent:${c.color};--d:${i * 80}ms">
        <div class="cat-collage">
          ${c.covers.map((id) => `<img src="${prodById[id].photo}" alt="" loading="lazy">`).join('')}
          <span class="cat-count">${countIn(c.id)} items</span>
        </div>
        <div class="cat-head"><span class="cat-ic">${icon(c.icon)}</span><h3>${c.name}</h3></div>
        <p>${c.blurb}</p>
        <span class="cat-go">Browse ${c.short.toLowerCase()} ${icon(I.arrow)}</span>
      </a>`).join('');
  }

  // footer, on every page
  $('#footer-cats').innerHTML = CATEGORIES.map((c) => `<li><a href="accessories.html?cat=${c.id}" data-filter="${c.id}">${c.name}</a></li>`).join('');
  $('#credits-list').innerHTML = Object.values(CREDITS).map((c) =>
    `<li>“${esc(c.title)}” by ${esc(c.author)}, <a href="${c.source}" target="_blank" rel="noopener">Wikimedia Commons</a>, ${c.licenseUrl ? `<a href="${c.licenseUrl}" target="_blank" rel="noopener">${c.license}</a>` : c.license}</li>`).join('');
  $('#year').textContent = new Date().getFullYear();

  /* ======================================================================
     Header, menu, progress bar, floating button
     ====================================================================== */
  const header = $('#site-header');
  const hero = $('.hero, .page-hero');
  const progress = $('#progress');
  const menuBtn = $('.menu-btn');
  const mnav = $('#mobile-nav');
  function updateHeader() {
    const y = window.scrollY;
    const heroEnd = hero ? hero.offsetTop + hero.offsetHeight - header.offsetHeight : 0;
    const menuOpen = mnav.classList.contains('open');
    header.classList.toggle('scrolled', y > 8 || menuOpen);
    header.classList.toggle('light', y > heroEnd && !menuOpen);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
  }
  function updateFab() {
    const past = hero ? window.scrollY > hero.offsetTop + hero.offsetHeight * 0.6 : true;
    fab.classList.toggle('show', quote.size > 0 || past);
  }
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mnav.classList.toggle('open', open);
    updateHeader();
  }
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { updateHeader(); updateFab(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', updateHeader);

  /* ======================================================================
     One click handler for shared actions (pages add their own below)
     ====================================================================== */
  const clickHandlers = [];
  document.addEventListener('click', (e) => {
    for (const fn of clickHandlers) if (fn(e) === true) return;
    const t = e.target.closest('[data-add],[data-remove],[data-open-drawer],[data-close-drawer],[data-goto-quote],.mobile-nav a');
    if (!t) return;
    if (t.matches('.mobile-nav a')) { setMenu(false); return; }
    if (t.dataset.add) { toggleQuote(t.dataset.add); return; }
    if (t.dataset.remove) { quote.delete(t.dataset.remove); saveQuote(); syncQuote(); return; }
    if (t.hasAttribute('data-open-drawer')) { $('#toast').classList.remove('show'); openDrawer(); return; }
    if (t.hasAttribute('data-goto-quote')) {
      if ($('#quote-form')) { e.preventDefault(); closeDrawer(false); goToQuote('Quote'); }
      return; // other pages follow the link to contact.html#quote
    }
    if (t.hasAttribute('data-close-drawer')) closeDrawer();
  });
  const keyHandlers = [];
  document.addEventListener('keydown', (e) => {
    if (drawer.classList.contains('open')) {
      if (e.key === 'Escape') closeDrawer();
      else if (e.key === 'Tab') trapTab(e, drawer);
      return;
    }
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); return; }
    keyHandlers.forEach((fn) => fn(e));
  });

  /* ======================================================================
     Animations: reveal on scroll, counters, hero tilt
     ====================================================================== */
  function countUp(el) {
    const target = Number(el.dataset.count);
    if (reduceMotion || !target) return;
    const start = performance.now(), dur = 1200;
    const tick = (now) => {
      const k = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  let io = null;
  function observeReveals(root = document) {
    const els = $$('.reveal:not(.in), [data-count]', root);
    if (!io) { els.forEach((el) => el.classList.add('in')); return; }
    els.forEach((el) => io.observe(el));
  }
  if ('IntersectionObserver' in window && !reduceMotion) {
    io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        if (en.target.dataset.count) countUp(en.target);
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
  }

  const igu = $('#igu');
  if (igu && hero && !reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let raf = null;
    hero.addEventListener('pointermove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const r = hero.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        igu.style.transform = `perspective(1400px) rotateY(${x * 7}deg) rotateX(${-y * 5}deg)`;
      });
    });
    hero.addEventListener('pointerleave', () => { igu.style.transform = ''; });
  }

  // card spotlight follows the pointer
  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest && e.target.closest('.card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });

  /* ======================================================================
     Quote form (contact page) — also used by the drawer button
     ====================================================================== */
  function goToQuote(type) {
    const form = $('#quote-form');
    if (!form) { location.href = `contact.html${type ? `?type=${type}` : ''}#quote`; return; }
    if (type) { const r = $(`input[name="type"][value="${type}"]`, form); if (r) r.checked = true; }
    $('#quote').scrollIntoView({ behavior: smooth });
    setTimeout(() => $('#f-name').focus({ preventScroll: true }), reduceMotion ? 0 : 700);
  }

  /* ======================================================================
     Page modules
     ====================================================================== */
  const PAGES = {};

  /* ---------- Home ---------- */
  PAGES.index = () => {
    const strip = (hidden) => PRODUCTS.map((p) =>
      `<a class="ps-item" href="${productUrl(p.id)}"${hidden ? ' tabindex="-1" aria-hidden="true"' : ''}>
        <img src="${p.photo}" alt="" loading="lazy" width="168" height="168"><span>${p.name}</span></a>`).join('');
    $('#photo-track').innerHTML = strip(false) + strip(true);
    renderCategoryTiles($('#cat-grid'));
    $('#app-teaser').innerHTML = APPLICATIONS.slice(0, 3).map(appTileHtml).join('');
  };

  /* ---------- Glass products ---------- */
  PAGES.products = () => {
    $('#glass-jump').innerHTML = GLASS.map((g) => `<a href="#${g.id}"><img src="${g.photo}" alt="" loading="lazy">${g.name}</a>`).join('');
    $('#glass-list').innerHTML = GLASS.map((g, i) => `
      <article class="glass-item reveal" id="${g.id}" style="--d:${(i % 3) * 70}ms">
        <div class="gi-media"><img src="${g.photo}" alt="${esc(g.name)}" loading="lazy" width="740" height="600"><span class="gi-n">${pad2(i + 1)}</span></div>
        <div class="gi-body">
          <h3>${g.name}</h3>
          <p>${g.text}</p>
          <ul class="gi-facts">${g.facts.map((f) => `<li>${f}</li>`).join('')}</ul>
          <h4>Typical uses</h4>
          <ul class="check-list">${g.uses.map((u) => `<li>${icon(I.check)}<span>${u}</span></li>`).join('')}</ul>
          <h4>Goes well with</h4>
          <div class="gi-pairs">${g.pairs.map((id) => `<a href="${productUrl(id)}"><img src="${prodById[id].photo}" alt="" loading="lazy">${prodById[id].name}</a>`).join('')}</div>
          <div class="gi-actions">
            ${addBtn(g.id, '#4F7CFF')}
            <a class="link-btn" href="contact.html?type=Question#quote">Ask about it ${icon(I.arrow)}</a>
          </div>
        </div>
      </article>`).join('');
  };

  /* ---------- Applications ---------- */
  PAGES.applications = () => {
    $('#app-jump').innerHTML = APPLICATIONS.map((a) => `<a href="#${a.id}"><img src="${a.img}" alt="" loading="lazy">${a.name}</a>`).join('');
    $('#app-sections').innerHTML = APPLICATIONS.map((a, i) => {
      const c = CREDITS[a.img];
      return `
      <section class="section app-section${i % 2 ? '' : ' section-white'}" id="${a.id}" aria-labelledby="app-${a.id}">
        <div class="container app-row${i % 2 ? ' flip' : ''}">
          <figure class="app-photo reveal">
            <img src="${a.img}" alt="" loading="lazy">
            ${c ? `<figcaption><a href="${c.source}" target="_blank" rel="noopener">Photo: ${esc(c.author)} · ${c.license}</a></figcaption>` : ''}
          </figure>
          <div class="app-copy reveal" style="--d:100ms">
            <span class="kicker">Application ${pad2(i + 1)}</span>
            <h2 id="app-${a.id}">${a.name}</h2>
            <p class="detail-text">${a.long}</p>
            <h3 class="detail-sub">What you'll need</h3>
            <div class="mini-grid">${a.products.map((id) => { const p = prodById[id]; return `
              <a class="mini" href="${productUrl(id)}" style="--accent:${catById[p.cat].color}">
                <img src="${p.photo}" alt="" loading="lazy">
                <span><b>${p.name}</b><small>${p.short}</small></span>
                ${icon(I.arrow)}
              </a>`; }).join('')}</div>
            <div class="ph-actions">
              <a class="btn btn-dark" href="accessories.html?app=${a.id}">Show in the catalogue</a>
              <a class="btn btn-light" href="contact.html?type=Question#quote">Ask about this job</a>
            </div>
          </div>
        </div>
      </section>`;
    }).join('');
  };

  /* ---------- Product details ---------- */
  PAGES.product = () => {
    const id = new URLSearchParams(location.search).get('id');
    const p = prodById[id];
    if (!p) {
      $('#p-main').innerHTML = `<div class="p-missing"><h1 id="p-title">We couldn't find that product.</h1>
        <p class="lead">It may have been renamed. Browse all accessories or search for what you need.</p>
        <div class="ph-actions"><a class="btn btn-primary" href="accessories.html">All accessories</a><a class="btn btn-ghost" href="contact.html">Contact us</a></div></div>`;
      $$('.subnav, #overview, #used-in, #related').forEach((el) => { el.hidden = true; });
      return;
    }
    const c = catById[p.cat];
    const idx = PRODUCTS.indexOf(p);
    document.title = `${p.name} | Accessories | Sailing International Trade`;
    const md = $('meta[name="description"]');
    if (md) md.setAttribute('content', `${p.name}: ${p.short}`);
    document.body.style.setProperty('--accent', c.color);

    $('#p-crumbs').insertAdjacentHTML('beforeend', `<span aria-hidden="true">/</span><a href="accessories.html?cat=${c.id}">${c.name}</a><span aria-hidden="true">/</span><span aria-current="page">${p.name}</span>`);
    $('#p-cat').innerHTML = `<i></i>${c.name} · ${pad2(idx + 1)} / ${PRODUCTS.length}`;
    $('#p-title').textContent = p.name;
    $('#p-short').textContent = p.short;
    $('#p-tags').innerHTML = p.tags.map((t) => `<li>${t}</li>`).join('');
    $('#p-quick').innerHTML = p.specs.slice(0, 3).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    const add = $('#p-add');
    add.dataset.add = p.id;

    const prev = PRODUCTS[(idx - 1 + PRODUCTS.length) % PRODUCTS.length];
    const next = PRODUCTS[(idx + 1) % PRODUCTS.length];
    $('#p-pager').innerHTML = `
      <a href="${productUrl(prev.id)}" rel="prev"><small>${icon(I.back)}Previous</small><b>${prev.name}</b></a>
      <a href="${productUrl(next.id)}" rel="next" class="next"><small>Next${icon(I.arrow)}</small><b>${next.name}</b></a>`;

    // gallery: product photo, illustrated diagram, then "in use" photos
    const gallery = [
      { type: 'photo', src: p.photo, alt: p.name, caption: `${p.name}: product photo`, label: 'Photo' },
      { type: 'diagram', caption: 'Illustrated diagram', label: 'Diagram' },
      ...p.extra.map((x) => ({ type: 'photo', src: x.src, alt: x.caption, caption: x.caption, label: 'In use' })),
    ];
    const stage = $('#g-stage');
    function showSlide(i) {
      const g = gallery[i];
      stage.classList.toggle('diagram', g.type === 'diagram');
      stage.innerHTML = g.type === 'diagram'
        ? p.svg
        : `<img src="${g.src}" alt="${esc(g.alt)}"><a class="g-zoom" href="${g.src}" target="_blank" rel="noopener">${icon(I.expand)}Full size</a>`;
      $('#g-caption').innerHTML = esc(g.caption) + (g.src ? creditHtml(g.src) : '');
      $$('.g-thumb').forEach((t, j) => t.setAttribute('aria-pressed', String(j === i)));
    }
    $('#g-thumbs').innerHTML = gallery.map((g, i) =>
      `<button class="g-thumb" type="button" data-slide="${i}" aria-pressed="${i === 0}" aria-label="Show ${g.label.toLowerCase()} ${i + 1}">
        ${g.type === 'diagram' ? p.svg : `<img src="${g.src}" alt="" loading="lazy">`}<span class="lbl">${g.label}</span></button>`).join('');
    showSlide(0);
    clickHandlers.push((e) => {
      const t = e.target.closest('[data-slide]');
      if (!t) return false;
      showSlide(Number(t.dataset.slide));
      return true;
    });

    $('#ov-title').textContent = `About ${p.name.toLowerCase().startsWith('the ') ? p.name : 'the ' + p.name}`;
    $('#p-desc').textContent = p.desc;
    $('#p-uses').innerHTML = p.uses.map((u) => `<li>${icon(I.check)}<span>${u}</span></li>`).join('');
    $('#p-specs').innerHTML = p.specs.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join('');
    $('#p-options').innerHTML = p.options.map((o) => `<span>${o}</span>`).join('');
    $('#p-apps').innerHTML = p.apps.map((aid, i) => appTileHtml(appById[aid], i)).join('');
    $('#p-related').innerHTML = p.related.map((rid, i) => cardHtml(prodById[rid], i)).join('');

    keyHandlers.push((e) => {
      if (/input|textarea|select/i.test(document.activeElement.tagName) || e.target.closest('.g-thumbs')) return;
      if (e.key === 'ArrowRight' && e.altKey) location.href = productUrl(next.id);
      if (e.key === 'ArrowLeft' && e.altKey) location.href = productUrl(prev.id);
    });
  };

  /* ---------- Accessories catalogue ---------- */
  PAGES.accessories = () => {
    renderCategoryTiles($('#cat-grid'));

    $('#side-cats').innerHTML = [{ id: 'all', name: 'All accessories', color: '#0B1526', icon: I.grid }, ...CATEGORIES].map((c) => `
      <button class="side-item" type="button" data-filter="${c.id}" aria-pressed="${c.id === 'all'}" style="--accent:${c.color}">
        <span class="ic">${icon(c.icon)}</span>${c.name}<span class="n">${c.id === 'all' ? PRODUCTS.length : countIn(c.id)}</span>
      </button>`).join('');
    $('#side-apps').innerHTML = `<button class="side-item" type="button" data-app="all" aria-pressed="true"><span class="ic">${icon(I.grid)}</span>Any application</button>` +
      APPLICATIONS.map((a) => `
      <button class="side-item" type="button" data-app="${a.id}" aria-pressed="false">
        <img class="thumb" src="${a.img}" alt="" loading="lazy">${a.name}<span class="n">${a.products.length}</span>
      </button>`).join('');
    $('#chips').innerHTML = [{ id: 'all', name: 'All' }, ...CATEGORIES].map((c) => `
      <button class="chip" type="button" data-filter="${c.id}" aria-pressed="${c.id === 'all'}"${c.color ? ` style="--accent:${c.color}"` : ''}>
        ${c.color ? '<span class="sw"></span>' : ''}${c.name}<span class="n">${c.id === 'all' ? PRODUCTS.length : countIn(c.id)}</span>
      </button>`).join('');

    const grid = $('#grid');
    grid.innerHTML = PRODUCTS.map(cardHtml).join('') + `
      <div class="empty" hidden>
        ${icon(I.search)}
        <strong>No accessories match</strong>
        <span>Try a different word, or <button class="link-btn" type="button" data-reset>clear all filters</button>.</span>
      </div>`;
    $('.empty svg', grid).style.cssText = 'width:32px;height:32px;color:#8A97A8';

    const params = new URLSearchParams(location.search);
    const state = {
      cat: catById[params.get('cat')] ? params.get('cat') : 'all',
      app: appById[params.get('app')] ? params.get('app') : 'all',
      q: params.get('q') || '',
      sort: ['featured', 'az', 'za', 'category'].includes(params.get('sort')) ? params.get('sort') : 'featured',
      view: store.get('sit-view', 'grid'),
    };
    const searchInput = $('#search');
    const sortSel = $('#sort');
    searchInput.value = state.q;
    $('#hero-q').value = state.q;
    sortSel.value = state.sort;

    const tokens = (q) => q.toLowerCase().split(/\s+/).filter(Boolean);
    const HAY = Object.fromEntries(PRODUCTS.map((p) => [p.id,
      [p.name, p.short, p.desc, p.tags.join(' '), p.uses.join(' '), p.specs.map((s) => s.join(' ')).join(' '), catById[p.cat].name].join(' ').toLowerCase()]));
    const matchesQuery = (p, q) => tokens(q).every((t) => HAY[p.id].includes(t));
    function sorted(list) {
      const idx = (p) => PRODUCTS.indexOf(p);
      const catIdx = (p) => CATEGORIES.findIndex((c) => c.id === p.cat);
      const by = {
        featured: (a, b) => idx(a) - idx(b),
        az: (a, b) => a.name.localeCompare(b.name),
        za: (a, b) => b.name.localeCompare(a.name),
        category: (a, b) => catIdx(a) - catIdx(b) || idx(a) - idx(b),
      };
      return list.slice().sort(by[state.sort] || by.featured);
    }
    function syncUrl() {
      const q = new URLSearchParams();
      if (state.cat !== 'all') q.set('cat', state.cat);
      if (state.app !== 'all') q.set('app', state.app);
      if (state.q.trim()) q.set('q', state.q.trim());
      if (state.sort !== 'featured') q.set('sort', state.sort);
      const s = q.toString();
      history.replaceState(null, '', location.pathname + (s ? `?${s}` : '') + location.hash);
    }
    function applyFilter(animate) {
      const shownList = sorted(PRODUCTS).filter((p) =>
        (state.cat === 'all' || p.cat === state.cat) &&
        (state.app === 'all' || p.apps.includes(state.app)) &&
        (!state.q.trim() || matchesQuery(p, state.q)));
      const show = new Set(shownList.map((p) => p.id));
      const cards = Object.fromEntries($$('.card', grid).map((el) => [el.dataset.id, el]));
      const empty = $('.empty', grid);
      sorted(PRODUCTS).forEach((p) => grid.insertBefore(cards[p.id], empty));
      PRODUCTS.forEach((p) => {
        const card = cards[p.id];
        const ok = show.has(p.id);
        card.hidden = !ok;
        if (ok && animate && !reduceMotion) {
          card.classList.remove('enter');
          void card.offsetWidth;
          card.style.setProperty('--i', shownList.indexOf(p));
          card.classList.add('enter');
        }
      });
      empty.hidden = shownList.length !== 0;
      $('#result-count').innerHTML = `Showing <b>${shownList.length}</b> of ${PRODUCTS.length} accessories`;
      $$('.chip[data-filter], .side-item[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === state.cat)));
      $$('.side-item[data-app]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.app === state.app)));
      $('#catalog-title').textContent = state.cat !== 'all' ? catById[state.cat].name : state.app !== 'all' ? appById[state.app].name : 'All accessories';

      const pills = [];
      if (state.cat !== 'all') pills.push(`<span class="af">${catById[state.cat].name}<button type="button" data-clear="cat" aria-label="Remove category filter">${icon(I.x)}</button></span>`);
      if (state.app !== 'all') pills.push(`<span class="af">Used in: ${appById[state.app].name}<button type="button" data-clear="app" aria-label="Remove application filter">${icon(I.x)}</button></span>`);
      if (state.q.trim()) pills.push(`<span class="af">“${esc(state.q.trim())}”<button type="button" data-clear="q" aria-label="Clear search">${icon(I.x)}</button></span>`);
      if (pills.length > 1) pills.push('<button class="af-clear" type="button" data-reset>Clear all</button>');
      $('#active-filters').innerHTML = pills.join('');
      syncUrl();
    }
    function setView(v) {
      state.view = v;
      grid.classList.toggle('list', v === 'list');
      $$('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
      store.set('sit-view', v);
    }
    const scrollToCatalog = (instant) => {
      if (!instant) { $('#catalog').scrollIntoView({ behavior: smooth }); return; }
      // 'instant' overrides the page's CSS smooth scrolling when jumping in from another page
      const top = $('#catalog').getBoundingClientRect().top + window.scrollY - header.offsetHeight - 12;
      window.scrollTo({ top, behavior: 'instant' });
    };
    sortSel.addEventListener('change', () => { state.sort = sortSel.value; applyFilter(true); });

    // search with suggestions
    const suggest = $('#suggest');
    let active = -1;
    function highlight(name, q) {
      const t = tokens(q)[0];
      if (!t) return esc(name);
      const i = name.toLowerCase().indexOf(t);
      return i < 0 ? esc(name) : esc(name.slice(0, i)) + '<mark>' + esc(name.slice(i, i + t.length)) + '</mark>' + esc(name.slice(i + t.length));
    }
    function hideSuggest() {
      suggest.hidden = true;
      searchInput.setAttribute('aria-expanded', 'false');
      searchInput.removeAttribute('aria-activedescendant');
    }
    function renderSuggest() {
      const q = searchInput.value.trim();
      active = -1;
      if (!q) { hideSuggest(); return; }
      const score = (p) => tokens(q).reduce((s, t) => {
        const name = p.name.toLowerCase();
        return s + (name.startsWith(t) ? 8 : name.includes(t) ? 5 : 0)
          + (p.tags.join(' ').toLowerCase().includes(t) ? 4 : 0)
          + (p.short.toLowerCase().includes(t) ? 3 : 0)
          + (p.uses.join(' ').toLowerCase().includes(t) ? 2 : 0);
      }, 0);
      const list = PRODUCTS.filter((p) => matchesQuery(p, q)).map((p) => [p, score(p)]).sort((a, b) => b[1] - a[1]).map(([p]) => p).slice(0, 6);
      suggest.innerHTML = list.length
        ? list.map((p, i) => `<a class="sg-item" href="${productUrl(p.id)}" role="option" id="sg-${i}" aria-selected="false" tabindex="-1">
            <img src="${p.photo}" alt="" loading="lazy"><span><b>${highlight(p.name, q)}</b><small>${catById[p.cat].name}</small></span></a>`).join('')
        : `<div class="sg-empty">No matches for “${esc(q)}”. Try “film”, “rack” or “polish”.</div>`;
      suggest.hidden = false;
      searchInput.setAttribute('aria-expanded', 'true');
    }
    function moveActive(d) {
      const opts = $$('.sg-item', suggest);
      if (!opts.length) return;
      active = (active + d + opts.length) % opts.length;
      opts.forEach((o, i) => o.setAttribute('aria-selected', String(i === active)));
      searchInput.setAttribute('aria-activedescendant', opts[active].id);
      opts[active].scrollIntoView({ block: 'nearest' });
    }
    let searchTimer;
    searchInput.addEventListener('input', () => {
      renderSuggest();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { state.q = searchInput.value; applyFilter(true); }, 140);
    });
    searchInput.addEventListener('focus', () => { if (searchInput.value.trim()) renderSuggest(); });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (suggest.hidden) renderSuggest(); moveActive(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const opt = $$('.sg-item', suggest)[active];
        if (opt && !suggest.hidden) { location.href = opt.getAttribute('href'); return; }
        hideSuggest(); state.q = searchInput.value; applyFilter(true);
      } else if (e.key === 'Escape' && !suggest.hidden) { e.stopPropagation(); hideSuggest(); }
    });
    document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#search-wrap')) hideSuggest(); });

    $('#hero-search').addEventListener('submit', (e) => {
      e.preventDefault();
      state.q = $('#hero-q').value.trim();
      searchInput.value = state.q;
      state.cat = 'all'; state.app = 'all';
      applyFilter(true);
      scrollToCatalog();
    });

    clickHandlers.push((e) => {
      const t = e.target.closest('[data-filter],[data-app],[data-clear],[data-reset],[data-view]');
      if (!t) return false;
      if (t.dataset.view) { setView(t.dataset.view); return true; }
      if (t.dataset.clear) {
        if (t.dataset.clear === 'q') { state.q = ''; searchInput.value = ''; $('#hero-q').value = ''; }
        else state[t.dataset.clear] = 'all';
        applyFilter(true);
        return true;
      }
      if (t.hasAttribute('data-reset')) {
        Object.assign(state, { cat: 'all', app: 'all', q: '' });
        searchInput.value = ''; $('#hero-q').value = '';
        applyFilter(true);
        return true;
      }
      if (t.dataset.filter) {
        e.preventDefault();
        state.cat = t.dataset.filter;
        applyFilter(true);
        if (!t.matches('.chip, .side-item')) scrollToCatalog();
        return true;
      }
      if (t.dataset.app) {
        state.app = t.dataset.app;
        if (state.app !== 'all') state.cat = 'all';
        applyFilter(true);
        return true;
      }
      return false;
    });
    keyHandlers.push((e) => {
      if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) {
        e.preventDefault();
        scrollToCatalog();
        searchInput.focus({ preventScroll: true });
      }
    });

    setView(state.view === 'list' ? 'list' : 'grid');
    applyFilter(false);
    // arriving from another page with a filter: jump straight to the results
    if (params.toString()) {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      scrollToCatalog(true);
      window.addEventListener('load', () => { if (window.scrollY < $('#catalog').offsetTop - 200) scrollToCatalog(true); }, { once: true });
    }
  };

  /* ---------- Contact ---------- */
  PAGES.contact = () => {
    const form = $('#quote-form');
    const type = new URLSearchParams(location.search).get('type');
    if (type) { const r = $(`input[name="type"][value="${type}"]`, form); if (r) r.checked = true; }

    function renderPicked() {
      const box = $('#picked');
      if (!quote.size) {
        box.innerHTML = `<span class="none">Nothing selected yet. Browse <a href="products.html">glass</a> or <a href="accessories.html">accessories</a>, or describe what you need below.</span>`;
        return;
      }
      box.innerHTML = Array.from(quote).map((id) => {
        const it = itemInfo(id);
        return `<span class="pick"><img src="${it.photo}" alt="">${it.name}<button type="button" data-remove="${id}" aria-label="Remove ${esc(it.name)}">${icon(I.x)}</button></span>`;
      }).join('');
    }
    quoteListeners.push(renderPicked);

    form.addEventListener('input', (e) => {
      const f = e.target.closest('.field');
      if (f && e.target.checkValidity()) f.classList.remove('invalid');
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let firstBad = null;
      $$('input[required]', form).forEach((inp) => {
        const ok = inp.checkValidity();
        inp.closest('.field').classList.toggle('invalid', !ok);
        if (!ok && !firstBad) firstBad = inp;
      });
      if (firstBad) { firstBad.focus(); firstBad.reportValidity(); return; }

      const d = new FormData(form);
      const kind = d.get('type') || 'Quote';
      const items = Array.from(quote).map((id) => { const it = itemInfo(id); return `  - ${it.name} (${it.sub})`; });
      const who = (d.get('company') || d.get('name') || '').toString().trim();
      const subject = `${kind === 'Quote' ? 'Free quote' : kind} request${who ? ` from ${who}` : ''}`;
      const body = [
        `Request type: ${kind}`,
        `Name: ${d.get('name')}`,
        d.get('company') ? `Company: ${d.get('company')}` : null,
        `Email: ${d.get('email')}`,
        d.get('phone') ? `Phone: ${d.get('phone')}` : null,
        '',
        'Items:',
        ...(items.length ? items : ['  (none selected)']),
        '',
        'Details:',
        (d.get('message') || '').toString().trim() || '(none)',
      ].filter((l) => l !== null).join('\n');

      window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const ok = $('#form-success');
      ok.hidden = false;
      ok.textContent = `Your email app should now open with the request filled in. If it doesn't, email ${EMAIL} or call 437-477-8897.`;
    });
  };

  /* ---------- init ---------- */
  if (PAGES[page]) PAGES[page]();
  observeReveals();
  syncQuote();
  updateHeader();
})();
